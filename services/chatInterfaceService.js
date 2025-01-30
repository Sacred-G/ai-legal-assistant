import OpenAI from 'openai';
import dotenv from 'dotenv';
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

class ChatInterfaceService {
    constructor() {
        this.assistantId = null;
        this.vectorStoreId = null;
        this.fileIds = [];
    }

    setAssistantType(type) {
        if (type === 'rate') {
            this.assistantId = process.env.OPENAI_RATING_ASSISTANT_ID;
            this.vectorStoreId = process.env.OPENAI_RATING_VECTORSTORE_ID;
        } else {
            this.assistantId = process.env.OPENAI_ASSISTANT_ID;
            this.vectorStoreId = process.env.OPENAI_VECTORSTORE_ID;
        }
    }

    async initializeResources(type = 'chat') {
        // Set the correct assistant type
        this.setAssistantType(type);

        // Ensure Assistant
        if (!this.assistantId) {
            console.log('No assistant ID found. Creating a new assistant.');
            try {
                const assistant = await openai.beta.assistants.create({
                    name: "Medical Report Assistant",
                    instructions: `You are an expert at analyzing medical reports. Follow this exact format and replace the placeholders with actual information:

1. PATIENT DEMOGRAPHICS AND EMPLOYMENT
MMI Status: [State if achieved]
Patient Name: [Name]
Age/DOB: [Age/Date]
Employer: [Name]
Occupation: [Title]
Employment Duration: [Time]
Insurance Carrier: [Name]
Claim Number: [Number]
Incident Date: [Date]
Current Work Status: [Status]

2. INJURY CLAIMS
Cumulative Trauma:
  Dates: [Dates]
  Body Parts: [List]
  Description: [Details]

Specific Trauma:
  Date: [Date]
  Body Parts: [List]
  Mechanism: [Description]
  WPI Ratings: [Percentages by body part]

3. CURRENT COMPLAINTS
List by body part:
  [Body Part]:
    Symptoms: [List]
    Pain Level/Description: [Details]
    Activity Impact: [Description]

4. CLINICAL DIAGNOSES
Primary:
  Diagnosis: [Condition]
  Description: [Details]
Secondary:
  [List additional diagnoses]

5. APPORTIONMENT
Percentages: [List breakdowns]
Reasoning: [Explanation]

6. WORK RESTRICTIONS
Physical Limitations: [List]
Activity Restrictions: [List]

7. FUTURE MEDICAL CARE
Recommended Treatments: [List]
Ongoing Care Needs: [Details]

8. VOCATIONAL FINDINGS
Current Capacity: [Details]
Recommendations: [List]`,
                    model: "gpt-4o",
                    tools: [{
                        type: "file_search",
                        config: {
                            chunk_size: 1000,
                            chunk_overlap: 500,
                            max_chunks: 30,
                            score_threshold: 0.7
                        }
                    }],
                });
                this.assistantId = assistant.id;
                console.log('New assistant created successfully:', {
                    id: this.assistantId,
                    model: assistant.model,
                    created_at: assistant.created_at
                });
            } catch (error) {
                console.error('Failed to create assistant:', error);
                throw new Error(`Failed to create assistant: ${error.message}`);
            }
        } else {
            try {
                // Verify the assistant exists
                const assistant = await openai.beta.assistants.retrieve(this.assistantId);
                console.log('Using existing assistant:', {
                    id: assistant.id,
                    model: assistant.model,
                    created_at: assistant.created_at
                });
            } catch (error) {
                console.error('Failed to retrieve assistant:', error);
                this.assistantId = null; // Reset so we can create a new one
                return this.initializeResources(type); // Retry with creation
            }
        }

        // Ensure Vector Store
        if (!this.vectorStoreId) {
            console.log('No vector store ID found in .env. Creating a new vector store.');
            const vectorStore = await openai.beta.vectorStores.create({
                name: `VectorStore_${Date.now()}`,
            });
            this.vectorStoreId = vectorStore.id;
            console.log('New vector store created:', this.vectorStoreId);
        } else {
            console.log('Using vector store ID from .env:', this.vectorStoreId);
        }
    }

    async processUploadedPDF(file) {
        let tempFilePath = null;
        let openaiFile = null;

        try {
            // Temporary file storage
            const randomSuffix = Math.random().toString(36).substring(7);
            const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
            tempFilePath = path.join(uploadsDir, `${path.parse(safeName).name}-${randomSuffix}${path.parse(safeName).ext}`);

            console.log('Writing file to temp path:', tempFilePath);
            await fs.promises.writeFile(tempFilePath, file.buffer);

            // First upload file to OpenAI
            console.log('Uploading file to OpenAI...');
            try {
                openaiFile = await openai.files.create({
                    file: fs.createReadStream(tempFilePath),
                    purpose: 'assistants'
                });

                if (!openaiFile || !openaiFile.id) {
                    throw new Error('Failed to get valid file ID from OpenAI file creation');
                }

                console.log('File uploaded to OpenAI:', {
                    fileId: openaiFile.id,
                    filename: openaiFile.filename,
                    purpose: openaiFile.purpose,
                    status: openaiFile.status
                });

                // Wait for file to be ready
                let fileStatus = await openai.files.retrieve(openaiFile.id);
                while (fileStatus.status !== 'processed') {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    fileStatus = await openai.files.retrieve(openaiFile.id);
                    console.log('File processing status:', fileStatus.status);
                }
            } catch (error) {
                console.error('Error uploading file to OpenAI:', error);
                throw error;
            }

            // Create vector store if needed
            if (!this.vectorStoreId) {
                console.log('Creating new vector store...');
                const vectorStore = await openai.beta.vectorStores.create({
                    name: `MedicalReports_${Date.now()}`
                });
                this.vectorStoreId = vectorStore.id;
                console.log('Vector store created:', this.vectorStoreId);
            }

            // Add file to vector store using files.create_and_poll
            console.log('Adding file to vector store...');
            const vectorStoreFile = await openai.beta.vectorStores.files.createAndPoll(
                this.vectorStoreId,
                { file_id: openaiFile.id }
            );

            console.log('Vector store file status:', vectorStoreFile.status);
            if (vectorStoreFile.status !== "completed") {
                throw new Error(`File processing failed: ${vectorStoreFile.status}`);
            }

            // Store file ID and update assistant
            console.log('Updating assistant configuration...');
            this.fileIds = [openaiFile.id];
            await openai.beta.assistants.update(this.assistantId, {
                file_ids: this.fileIds,
                tool_resources: {
                    file_search: {
                        vector_store_ids: [this.vectorStoreId]
                    }
                }
            });

            return {
                fileId: openaiFile.id,
                vectorStoreId: this.vectorStoreId,
                fileIds: this.fileIds
            };
        } catch (error) {
            console.error('Error processing PDF:', error);
            throw error;
        } finally {
            if (tempFilePath) {
                await fs.promises.unlink(tempFilePath).catch((e) => console.error('Error cleaning up temp file:', e));
            }
        }
    }

    async createThread(message) {
        try {
            // Create a thread
            const thread = await openai.beta.threads.create();

            // Add initial message if provided
            if (message) {
                await openai.beta.threads.messages.create(thread.id, {
                    role: "user",
                    content: message
                });
            }

            console.log('Thread created successfully:', thread.id);
            return thread;
        } catch (error) {
            console.error('Error creating thread:', error);
            throw error;
        }
    }

    async createAndPollRun(threadId) {
        try {
            // Create and run the initial analysis with polling
            const run = await openai.beta.threads.runs.createAndPoll(
                threadId,
                {
                    assistant_id: this.assistantId,
                    tool_resources: {
                        file_search: { vector_store_ids: [this.vectorStoreId] },
                    }
                }
            );

            if (run.status !== 'completed') {
                throw new Error(`Run failed with status: ${run.status}`);
            }

            // Get the assistant's response with citations
            const messages = await openai.beta.threads.messages.list(threadId);
            console.log('Run completed successfully');
            return { messages: messages.data };
        } catch (error) {
            console.error('Error summarizing file:', error);
            throw error;
        }
    }

    async getThreadMessages(threadId) {
        try {
            const messages = await openai.beta.threads.messages.list(threadId);
            return messages.data;
        } catch (error) {
            console.error('Error getting thread messages:', error);
            throw error;
        }
    }

    async addMessageToThread(threadId, message) {
        try {
            return await openai.beta.threads.messages.create(threadId, {
                role: "user",
                content: message
            });
        } catch (error) {
            console.error('Error adding message to thread:', error);
            throw error;
        }
    }

    async processFile(file) {
        try {
            await this.initializeResources(); // Ensure resources are ready
            await this.processUploadedPDF(file);
            const thread = await this.createThread();
            await this.createAndPollRun(thread.id);
        } catch (error) {
            console.error('Error in file processing workflow:', error);
            throw error;
        }
    }

    async cleanupVectorStore(vectorStoreId) {
        try {
            console.log('Cleaning up vector store:', vectorStoreId);
            await openai.beta.vectorStores.del(vectorStoreId);

            // If this was our current vector store, clear the ID
            if (this.vectorStoreId === vectorStoreId) {
                this.vectorStoreId = null;
                this.fileIds = [];
            }

            console.log('Vector store cleanup completed');
        } catch (error) {
            console.error('Error cleaning up vector store:', error);
            throw error;
        }
    }
}

export default new ChatInterfaceService();
