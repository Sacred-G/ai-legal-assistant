import OpenAI from 'openai';
import dotenv from 'dotenv';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

class AssistantsService {
    constructor() {
        this.assistants = {};
    }

    async createAssistant(type = 'chat') {
        try {
            let assistant;

            // Check if we already have an assistant for this type
            if (this.assistants[type]) {
                assistant = this.assistants[type];
            } else {
                // Create new assistant based on type
                const assistantConfig = {
                    tools: [{ type: "file_search" }]
                };

                if (type === 'rate') {
                    assistantConfig.name = "Medical Report Assistant";
                    assistantConfig.instructions = "You are an expert at analyzing medical reports and extracting key information including: demographics, dates, body parts and WPI ratings, work restrictions, future medical needs, job duties and apportionment. Process the uploaded medical reports based on the type of request:\n\n1. For requests containing keywords like 'rate', 'rating', 'calculate PD', or 'permanent disability', provide detailed PD calculations using the California Permanent Disability rating schedule. Use 1.4 FEC multiplier for each body part instead of rank, factor in occupation and age-related factors, and display rating strings in this format: 'Hand: 16.05.01.00 – 10 – [1]11 – 351G – 13 – 11 PD'\n\n2. For general analysis or summary requests, provide a structured overview with these sections:\n• Summary of Injuries and Claims\n• Medical Evaluations and Findings\n• Treatment and Recommendations\n\nFormat all responses without markdown, using clear headings, bullet points (•), and minimal line spacing.";
                    assistantConfig.model = "gpt-4o-mini";
                } else {
                    assistantConfig.name = "Chat Assistant";
                    assistantConfig.instructions = "You are a helpful assistant that can analyze documents and answer questions.";
                    assistantConfig.model = "gpt-4o-mini";
                }

                assistant = await openai.beta.assistants.create(assistantConfig);
                this.assistants[type] = assistant;
            }

            // Create a thread
            const thread = await openai.beta.threads.create();

            return {
                assistantId: assistant.id,
                threadId: thread.id
            };
        } catch (error) {
            console.error('Error creating assistant:', error);
            throw error;
        }
    }

    async processFileWithAssistant(fileBuffer, fileName, type = 'chat') {
        let tempFilePath = null;
        let openaiFile = null;
        let vectorStore = null;

        try {
            // Create temporary file path
            const randomSuffix = Math.random().toString(36).substring(7);
            const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
            tempFilePath = path.join(uploadsDir, `${path.parse(safeName).name}-${randomSuffix}${path.parse(safeName).ext}`);

            console.log('Writing file to temp path:', tempFilePath);
            await fs.promises.writeFile(tempFilePath, fileBuffer);

            console.log('Uploading file to OpenAI...');
            openaiFile = await openai.files.create({
                file: fs.createReadStream(tempFilePath),
                purpose: 'assistants'
            });
            console.log('File uploaded to OpenAI:', {
                fileId: openaiFile.id,
                filename: openaiFile.filename,
                purpose: openaiFile.purpose,
                status: openaiFile.status
            });

            console.log('Creating vector store...');
            vectorStore = await openai.beta.vectorStores.create({
                name: `${type}_analysis_${fileName}`
            });
            console.log('Vector store created:', {
                id: vectorStore.id,
                name: vectorStore.name
            });

            // Create and process file batch
            const fileBatch = await openai.beta.vectorStores.fileBatches.create(vectorStore.id);
            await openai.beta.vectorStores.fileBatches.files.create(
                vectorStore.id,
                fileBatch.id,
                [{ content: fileBuffer, name: fileName }]
            );

            // Poll for completion
            await openai.beta.vectorStores.fileBatches.createAndPoll(
                vectorStore.id,
                fileBatch.id
            );

            // Create assistant and thread
            const { assistantId, threadId } = await this.createAssistant(type);

            // Log file_ids for debugging
            console.log('Updating assistant with file_ids:', [openaiFile.id]);

            // Update assistant with vector store and file_ids
            await openai.beta.assistants.update(assistantId, {
                file_ids: [openaiFile.id],
                tool_resources: {
                    file_search: {
                        vector_store_ids: [vectorStore.id]
                    }
                }
            });

            // Create initial message for medical reports
            if (type === 'rate') {
                await openai.beta.threads.messages.create(threadId, {
                    role: "user",
                    content: "Please provide both a summary analysis and PD ratings for this medical report:\n\nFirst, provide a structured overview with:\n• Summary of Injuries and Claims (include dates and details)\n• Medical Evaluations and Findings (include diagnoses and WPI values)\n• Treatment and Recommendations\n\nThen, calculate and display PD ratings for each affected body part using:\n• California Permanent Disability rating schedule\n• 1.4 FEC multiplier instead of rank\n• Occupation and age factors\n• Rating string format: [Body Part]: [Code] – [WPI] – [FEC] – [Occupation] – [Age] – [Final PD]"
                });

                // Create and run the initial analysis
                const run = await openai.beta.threads.runs.create(threadId, {
                    assistant_id: assistantId
                });

                // Wait for completion
                let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
                while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
                }

                // Get the assistant's response
                const messages = await openai.beta.threads.messages.list(threadId);
                const summary = messages.data[0].content[0].text.value;

                return {
                    fileId: openaiFile.id,
                    threadId,
                    assistantId,
                    vectorStoreId: vectorStore.id,
                    summary
                };
            }

            return {
                fileId: openaiFile.id,
                threadId,
                assistantId,
                vectorStoreId: vectorStore.id
            };

        } catch (error) {
            // Clean up resources in case of error
            if (openaiFile) {
                try {
                    await openai.files.del(openaiFile.id);
                } catch (cleanupError) {
                    console.error('Error cleaning up file:', cleanupError);
                }
            }
            if (vectorStore) {
                try {
                    await openai.beta.vectorStores.del(vectorStore.id);
                } catch (cleanupError) {
                    console.error('Error cleaning up vector store:', cleanupError);
                }
            }
            throw error;
        } finally {
            // Clean up temporary file
            if (tempFilePath) {
                try {
                    await fs.promises.unlink(tempFilePath);
                } catch (cleanupError) {
                    console.error('Error cleaning up temporary file:', cleanupError);
                }
            }
        }
    }

    async sendMessageStream(message, threadId, assistantId, fileId = null) {
        try {
            // Create event emitter for streaming
            const emitter = new EventEmitter();

            // Add message to thread
            await openai.beta.threads.messages.create(threadId, {
                role: "user",
                content: message,
                ...(fileId && {
                    file_ids: [fileId]
                })
            });

            // Create run
            const run = await openai.beta.threads.runs.create(threadId, {
                assistant_id: assistantId
            });

            // Poll run status and emit events
            const pollInterval = setInterval(async () => {
                try {
                    const runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);

                    if (runStatus.status === 'completed') {
                        // Get messages since last user message
                        const messages = await openai.beta.threads.messages.list(threadId);
                        const assistantMessage = messages.data.find(msg =>
                            msg.role === 'assistant' && msg.run_id === run.id
                        );

                        if (assistantMessage) {
                            emitter.emit('textCreated');
                            emitter.emit('textDelta', { value: assistantMessage.content[0].text.value });
                        }

                        clearInterval(pollInterval);
                        emitter.emit('end');
                    } else if (runStatus.status === 'failed') {
                        clearInterval(pollInterval);
                        emitter.emit('error', new Error(runStatus.last_error?.message || 'Run failed'));
                    }
                } catch (error) {
                    clearInterval(pollInterval);
                    emitter.emit('error', error);
                }
            }, 1000);

            return emitter;
        } catch (error) {
            console.error('Error in sendMessageStream:', error);
            throw error;
        }
    }
}

export default new AssistantsService();
