import { OpenAI } from 'openai';
import { AssistantStream } from "openai/lib/AssistantStream";
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

class AssistantsService {
    constructor() {
        console.log('Initializing AssistantsService...');

        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            defaultHeaders: { 'OpenAI-Beta': 'assistants=v2' }
        });
        console.log('OpenAI client initialized');
    }

    // Helper functions for medical report analysis
    calculateAge(dob, doi) {
        try {
            const dobDate = new Date(dob);
            const doiDate = new Date(doi);
            let age = doiDate.getFullYear() - dobDate.getFullYear();
            const m = doiDate.getMonth() - dobDate.getMonth();
            if (m < 0 || (m === 0 && doiDate.getDate() < dobDate.getDate())) {
                age--;
            }
            return age;
        } catch (error) {
            console.error('Error calculating age:', error);
            return null;
        }
    }

    getImpairmentCode(bodyPart) {
        try {
            const cleanBodyPart = bodyPart.toLowerCase().replace(/[^a-z0-9]/g, '');
            const mappings = {
                'lumbarspine': '15.03',
                'cervicalspine': '15.02',
                'thoracicspine': '15.04',
                'shoulder': '16.02',
                'knee': '17.05',
                'hip': '17.03',
                'ankle': '17.07',
                'wrist': '16.04',
                'elbow': '16.03',
                'hand': '16.05',
                'foot': '17.08'
            };

            for (const [key, code] of Object.entries(mappings)) {
                if (cleanBodyPart.includes(key)) {
                    return code;
                }
            }
            return '00.00';
        } catch (error) {
            console.error('Error getting impairment code:', error);
            return '00.00';
        }
    }

    // Core assistant functionality
    async createAssistant(type = 'chat') {
        try {
            // Configure assistant based on type
            const config = {
                chat: {
                    name: "Legal Research Assistant",
                    instructions: "You are a legal research assistant. Help users understand legal documents and answer questions about case law.",
                    tools: [{ type: "code_interpreter" }, { type: "file_search" }]
                },
                rate: {
                    id: "asst_Z5CE1IzyjMGakPphwT8MY3Nf",
                    name: "Medical Report Analyzer",
                    instructions: "You are a specialized medical report analyzer and disability rating calculator focused on workers' compensation cases.",
                    tools: [
                        { type: "code_interpreter" },
                        { type: "file_search" },
                        {
                            type: "function",
                            function: {
                                name: "extract_medical_data",
                                description: "Extracts structured medical report data for permanent disability rating calculations",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        patient: {
                                            type: "object",
                                            properties: {
                                                age: { type: "number" },
                                                occupation: { type: "string" },
                                                weeklyEarnings: { type: "number" }
                                            },
                                            required: ["age", "occupation"]
                                        },
                                        bodyParts: {
                                            type: "object",
                                            additionalProperties: {
                                                type: "object",
                                                properties: {
                                                    wpi: { type: "number" },
                                                    impairmentCode: { type: "string" },
                                                    painAdd: { type: "number" },
                                                    apportioned: { type: "boolean" },
                                                    ag: { type: "boolean" }
                                                },
                                                required: ["wpi", "impairmentCode"]
                                            }
                                        }
                                    },
                                    required: ["patient", "bodyParts"]
                                }
                            }
                        }
                    ]
                }
            }[type];

            if (!config) {
                throw new Error(`Invalid assistant type: ${type}`);
            }

            // Create or retrieve assistant based on type
            let assistant;
            if (type === 'rate' && config.id) {
                // For rate type, use the specific assistant ID
                assistant = await this.client.beta.assistants.retrieve(config.id);

                // Update assistant with vector store
                assistant = await this.client.beta.assistants.update(config.id, {
                    tools: config.tools
                });
            } else {
                // For other types, create new assistant
                assistant = await this.client.beta.assistants.create({
                    name: config.name,
                    instructions: config.instructions,
                    model: "gpt-4o",
                    tools: config.tools
                });
            }

            return {
                assistantId: assistant.id
            };
        } catch (error) {
            console.error('Error creating assistant:', error);
            throw error;
        }
    }

    // File handling
    async processFileWithThread(fileContent, prompt) {
        if (!fileContent) {
            throw new Error('File content is required');
        }

        if (!prompt) {
            throw new Error('Prompt is required');
        }

        let tempFilePath = null;
        let createdFileId = null;

        try {
            // Validate file content is a buffer or string
            if (!Buffer.isBuffer(fileContent) && typeof fileContent !== 'string') {
                throw new Error('File content must be a buffer or string');
            }

            // Create temporary file with appropriate extension
            const ext = Buffer.isBuffer(fileContent) ? '.pdf' : '.txt';
            tempFilePath = path.join(process.cwd(), `temp_${Date.now()}${ext}`);

            try {
                fs.writeFileSync(tempFilePath, fileContent);
            } catch (writeError) {
                throw new Error(`Failed to write temporary file: ${writeError.message}`);
            }

            // Create file in OpenAI using ReadStream
            try {
                const file = await this.client.files.create({
                    file: fs.createReadStream(tempFilePath),
                    purpose: 'assistants'
                });
                createdFileId = file.id;
            } catch (uploadError) {
                throw new Error(`Failed to upload file to OpenAI: ${uploadError.message}`);
            }

            // Create thread with file attached
            try {
                const thread = await this.client.beta.threads.create({
                    messages: [{
                        role: "user",
                        content: prompt,
                        attachments: [{
                            file_id: createdFileId,
                            tools: [{ type: "file_search" }]
                        }]
                    }]
                });

                return {
                    threadId: thread.id,
                    fileId: createdFileId
                };
            } catch (threadError) {
                if (createdFileId) {
                    try {
                        await this.client.files.del(createdFileId);
                    } catch (deleteError) {
                        console.error('Error deleting file after thread creation failed:', deleteError);
                    }
                }
                throw new Error(`Failed to create thread: ${threadError.message}`);
            }
        } catch (error) {
            console.error('Error in processFileWithThread:', {
                error: error.message,
                stack: error.stack,
                tempFile: tempFilePath,
                createdFileId
            });
            throw error;
        } finally {
            // Clean up temporary file
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                } catch (unlinkError) {
                    console.error('Error cleaning up temporary file:', unlinkError);
                }
            }
        }
    }

    async processFile(fileBuffer, fileName, assistantId) {
        try {
            let fileId, threadId;

            // Check if it's a PDF by filename
            if (fileName.toLowerCase().endsWith('.pdf')) {
                // Get PDF info
                const pdfData = await pdfParse(fileBuffer);
                const pageCount = pdfData.numpages;
                const text = pdfData.text;

                // For small PDFs (less than 100 pages), use direct text
                if (pageCount < 100) {
                    // Create thread with initial message containing the text
                    const thread = await this.client.beta.threads.create();
                    threadId = thread.id;

                    // Send the extracted text as a message
                    await this.client.beta.threads.messages.create(threadId, {
                        role: "user",
                        content: text
                    });
                } else {
                    // For large PDFs, use file upload and vector store
                    const uploadedFile = await this.client.files.create({
                        file: fileBuffer,
                        purpose: 'assistants'
                    });
                    fileId = uploadedFile.id;

                    // Create thread with file
                    const thread = await this.client.beta.threads.create();
                    threadId = thread.id;

                    // Add file to thread
                    await this.client.beta.threads.messages.create(threadId, {
                        role: "user",
                        content: "Please analyze this document",
                        file_ids: [fileId]
                    });
                }
            } else {
                throw new Error('Unsupported file type');
            }

            if (!threadId) {
                throw new Error('Failed to create thread');
            }

            // Run assistant
            const run = await this.client.beta.threads.runs.create(threadId, {
                assistant_id: assistantId
            });

            // Get streaming response
            return await this.getStreamingResponse(threadId, run.id);
        } catch (error) {
            console.error('Error in processFile:', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    // Thread management
    async createThread() {
        try {
            const thread = await this.client.beta.threads.create();
            return thread.id;
        } catch (error) {
            console.error('Error creating thread:', error);
            throw error;
        }
    }

    async addMessage(threadId, content) {
        try {
            await this.client.beta.threads.messages.create(threadId, {
                role: "user",
                content: content
            });
            return threadId;
        } catch (error) {
            console.error('Error adding message:', error);
            throw error;
        }
    }

    // Run management
    async runAssistant(threadId, assistantId) {
        try {
            const run = await this.client.beta.threads.runs.create(threadId, {
                assistant_id: assistantId,
                stream: true
            });

            return run.id;
        } catch (error) {
            console.error('Error running assistant:', error);
            throw error;
        }
    }

    async getStreamingResponse(threadId, runId) {
        try {
            const stream = await this.client.beta.threads.runs.retrieve(threadId, runId, {
                stream: true
            });
            return AssistantStream.fromReadableStream(stream);
        } catch (error) {
            console.error('Error getting streaming response:', error);
            throw error;
        }
    }

    // High-level operations
    async processFileWithAssistant(fileContent, fileName, type = 'rate') {
        if (!fileContent) {
            throw new Error('File content is required');
        }

        try {
            // Create new session
            const { assistantId } = await this.createAssistant(type).catch(error => {
                console.error('Error creating assistant:', error);
                throw new Error(`Failed to create assistant: ${error.message}`);
            });

            // Process file and create thread
            let prompt = "Please analyze this document.";
            if (type === 'rate') {
                prompt = `Please analyze this medical report and return ONLY a JSON object with this structure:
                {
                    "demographics": {
                        "name": string,
                        "dateOfBirth": string (YYYY-MM-DD),
                        "dateOfInjury": string (YYYY-MM-DD),
                        "occupation": string,
                        "weeklyEarnings": number
                    },
                    "impairments": [
                        {
                            "bodyPart": string,
                            "description": string,
                            "wpi": number,
                            "apportionment": {
                                "industrial": number,
                                "nonIndustrial": number
                            },
                            "painAdd": boolean,
                            "ag": boolean
                        }
                    ]
                }`;
            }

            // Process file with thread creation
            const { threadId, fileId } = await this.processFileWithThread(fileContent, prompt).catch(error => {
                console.error('Error processing file with thread:', error);
                throw new Error(`Failed to process file: ${error.message}`);
            });

            if (!threadId || !fileId) {
                throw new Error('Failed to get valid thread or file ID');
            }

            // Run initial analysis
            const run = await this.client.beta.threads.runs.create(threadId, {
                assistant_id: assistantId
            });

            // Wait for completion
            let runStatus;
            do {
                await new Promise(resolve => setTimeout(resolve, 1000));
                runStatus = await this.client.beta.threads.runs.retrieve(threadId, run.id);
            } while (runStatus.status === 'in_progress');

            if (runStatus.status !== 'completed') {
                throw new Error(`Analysis failed with status: ${runStatus.status}`);
            }

            // Get analysis results
            const messages = await this.client.beta.threads.messages.list(threadId);
            const analysisResult = messages.data[0];

            try {
                // Parse the JSON response
                const extractedData = JSON.parse(analysisResult.content[0].text.value);

                // Transform data into calculator format
                const calculatorData = {
                    name: extractedData.demographics?.name || '',
                    dateOfInjury: extractedData.demographics?.dateOfInjury || '',
                    occupation: extractedData.demographics?.occupation || '',
                    age: this.calculateAge(
                        extractedData.demographics?.dateOfBirth,
                        extractedData.demographics?.dateOfInjury
                    ),
                    weeklyEarnings: extractedData.demographics?.weeklyEarnings || 0,
                    bodyParts: {}
                };

                // Process impairments
                if (Array.isArray(extractedData.impairments)) {
                    extractedData.impairments.forEach((imp, index) => {
                        const code = this.getImpairmentCode(imp.bodyPart);
                        calculatorData.bodyParts[code] = {
                            impairmentCode: code,
                            description: imp.description || imp.bodyPart,
                            wpi: imp.wpi || 0,
                            industrial: imp.apportionment?.industrial || 100,
                            nonIndustrial: imp.apportionment?.nonIndustrial || 0,
                            leftRight: 'None',
                            painAdd: imp.painAdd ? 3 : 0,
                            ag: imp.ag || false
                        };
                    });
                }

                return {
                    threadId,
                    assistantId,
                    fileId,
                    calculatorData,
                    rawData: analysisResult.content[0].text.value
                };
            } catch (parseError) {
                console.error('Error parsing analysis result:', parseError);
                throw new Error('Failed to parse medical report data');
            }
        } catch (error) {
            console.error('Error in processFile:', {
                error: error.message,
                stack: error.stack,
                type: error.name,
                fileName: fileName
            });
            throw error;
        }
    }

    async generateResponse(threadId, assistantId, message, fileId = null) {
        return this.sendMessageStream(message, threadId, assistantId, fileId);
    }

    async sendMessageStream(message, threadId, assistantId, fileId = null) {
        try {
            // Add message to thread
            await this.addMessage(threadId, message, fileId);

            // Run assistant
            const runId = await this.runAssistant(threadId, assistantId);

            // Get streaming response
            return await this.getStreamingResponse(threadId, runId);
        } catch (error) {
            console.error('Error sending message stream:', error);
            throw error;
        }
    }
}

export default new AssistantsService();
