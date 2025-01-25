/**
 * Assistant Chat Service Implementation
 * 
 * This service manages interactions with OpenAI's assistant API for processing medical reports
 * and generating ratings. It handles file uploads, vector store management, and conversation threads.
 */

import { OpenAI } from 'openai';
import { AssistantStream } from "openai/lib/AssistantStream";
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

class AssistantChatService {
    constructor() {
        this.assistant = null;
        this.initializationPromise = this.initializeAssistant();
    }

    /**
     * Create a new thread for conversation
     */655
    async createThread() {
        try {
            console.log('Creating new thread');
            const vectorStoreId = process.env.OPENAI_VECTORSTORE_ID;
            const assistantId = process.env.OPENAI_ASSISTANT_ID;

            if (!vectorStoreId) {
                throw new Error('OPENAI_VECTORSTORE_ID environment variable is required');
            }
            if (!assistantId) {
                throw new Error('OPENAI_ASSISTANT_ID environment variable is required');
            }

            // Create thread with vector store configuration and associate with assistant
            const thread = await openai.beta.threads.create({
                tool_resources: {
                    file_search: {
                        vector_store_ids: [vectorStoreId]
                    }
                },
                metadata: {
                    assistant_id: assistantId
                }
            });

            console.log('Thread created with config:', {
                threadId: thread.id,
                hasVectorStore: !!thread.tool_resources?.file_search?.vector_store_ids?.length
            });

            return thread;
        } catch (error) {
            console.error('Error creating thread:', error);
            throw error;
        }
    }

    /**
     * Upload a file to OpenAI
     */
    async uploadFile(fileBuffer, fileName) {
        try {
            console.log('Uploading file:', fileName);

            // Validate file
            if (!fileBuffer || !fileName) {
                throw new Error('File buffer and file name are required');
            }

            // Upload file
            const file = await openai.files.create({
                file: fileBuffer,
                purpose: 'assistants'
            });

            console.log('File uploaded:', file.id);
            return file;
        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    }

    /**
     * Step 1: Initialize Assistant
     * - Retrieves existing OpenAI assistant using environment ID
     * - Sets up initial connection and configuration
     */
    async initializeAssistant() {
        if (this.assistant) {
            return this.assistant;
        }

        try {
            // Get and validate environment variables
            console.log('Loading environment variables for assistant initialization:', {
                OPENAI_ASSISTANT_ID: process.env.OPENAI_ASSISTANT_ID,
                OPENAI_VECTORSTORE_ID: process.env.OPENAI_VECTORSTORE_ID
            });

            const envVars = {
                assistantId: process.env.OPENAI_ASSISTANT_ID,
                vectorStoreId: process.env.OPENAI_VECTORSTORE_ID
            };

            if (!envVars.assistantId || !envVars.vectorStoreId) {
                throw new Error('OPENAI_ASSISTANT_ID and OPENAI_VECTORSTORE_ID environment variables are required');
            }

            // Retrieve the assistant
            this.assistant = await openai.beta.assistants.retrieve(envVars.assistantId);

            // Update assistant configuration to use file_search and code_interpreter
            this.assistant = await openai.beta.assistants.update(envVars.assistantId, {
                tools: [
                    { type: "file_search" },
                    { type: "code_interpreter" }
                ],
                tool_resources: {
                    file_search: {
                        vector_store_ids: [envVars.vectorStoreId]
                    }
                }
            });

            console.log('Assistant initialized successfully:', {
                id: this.assistant.id,
                hasTools: !!this.assistant.tools?.length,
                hasVectorStore: !!this.assistant.tool_resources?.file_search?.vector_store_ids?.length
            });

            console.log('Assistant initialized with config:', {
                id: this.assistant.id,
                tools: this.assistant.tools,
                hasVectorStore: !!this.assistant.tool_resources?.file_search?.vector_store_ids?.length
            });

            return this.assistant;
        } catch (error) {
            console.error('Error initializing assistant:', error);
            throw error;
        }
    }

    /**
     * Step 2: File Processing
     * - Polls vector store to check file processing status
     * - Ensures all files are properly processed before proceeding
     * - Handles processing failures and timeouts
     */
    async waitForFileProcessing(vectorStoreId) {
        const maxAttempts = 60; // Maximum number of polling attempts
        const delayMs = 1000; // Delay between polling attempts

        for (let i = 0; i < maxAttempts; i++) {
            const vectorStore = await openai.beta.vector_stores.retrieve(vectorStoreId);

            // Check if all files are processed
            const { processed, in_progress, failed } = vectorStore.file_counts;
            if (in_progress === 0) {
                if (failed > 0) {
                    throw new Error(`${failed} files failed to process`);
                }
                return;
            }

            await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        throw new Error('File processing timed out');
    }

    /**
     * Step 3: Message Generation
     * - Creates or retrieves conversation threads
     * - Handles file uploads and vector store integration
     * - Manages assistant interactions and responses
     * - Performs cleanup of temporary resources
     */
    async generateResponse(threadId, assistantId, message, fileId, vectorStoreId = process.env.OPENAI_VECTORSTORE_ID) {
        let fileIds = [];

        if (fileId) {
            fileIds.push(fileId);
        }

        try {
            // Verify thread exists and get metadata
            const thread = await openai.beta.threads.retrieve(threadId);

            // Use provided assistantId or fallback to thread metadata
            const effectiveAssistantId = assistantId || thread.metadata?.assistant_id;

            if (!effectiveAssistantId) {
                throw new Error('No assistant ID provided or found in thread metadata');
            }

            // Add the message to the thread
            await openai.beta.threads.messages.create(thread.id, {
                role: "user",
                content: message,
                ...(fileIds.length > 0 && { file_ids: fileIds })
            });

            // Create a run with file_search and code_interpreter tools
            const run = await openai.beta.threads.runs.create(thread.id, {
                assistant_id: effectiveAssistantId,
                tools: [
                    { type: "file_search" },
                    { type: "code_interpreter" }
                ],
                tool_resources: vectorStoreId ? {
                    file_search: {
                        vector_store_ids: [vectorStoreId]
                    }
                } : undefined
            });

            console.log('Run created with config:', {
                threadId: thread.id,
                assistantId: effectiveAssistantId,
                hasVectorStore: !!vectorStoreId,
                runId: run.id
            });

            // Wait for run completion
            const runStatus = await this.waitForRunCompletion(thread.id, run.id);

            if (runStatus.status === 'completed') {
                // Get messages after completion
                const messages = await openai.beta.threads.messages.list(thread.id);
                const lastMessage = messages.data[0];
                if (lastMessage?.content?.[0]?.text?.value) {
                    return {
                        message: lastMessage.content[0].text.value,
                        threadId: thread.id
                    };
                }
            } else if (runStatus.status === 'failed') {
                throw new Error(runStatus.last_error?.message || 'Run failed');
            } else if (runStatus.status === 'expired') {
                throw new Error('Run expired');
            }

            // Return empty message if we didn't get a response
            return {
                message: '',
                threadId: thread.id
            };
        } catch (error) {
            console.error('Error in chat handling:', error);
            throw error;
        } finally {
            // Clean up resources
            try {
                // Delete files
                for (const fileId of fileIds) {
                    await openai.files.del(fileId).catch(err =>
                        console.error(`Error deleting file ${fileId}:`, err)
                    );
                }

                // Don't delete the vector store since we're using a persistent one from env
            } catch (cleanupError) {
                console.error('Error during cleanup:', cleanupError);
            }
        }
    }

    /**
     * Step 4: Run Management
     * - Polls for assistant run completion
     * - Handles various completion states (completed, failed, expired)
     * - Implements timeout protection
     */
    async waitForRunCompletion(threadId, runId) {
        const maxAttempts = 60; // Maximum number of polling attempts
        const delayMs = 1000; // Delay between polling attempts

        for (let i = 0; i < maxAttempts; i++) {
            const run = await openai.beta.threads.runs.retrieve(threadId, runId);

            if (run.status === 'completed' || run.status === 'failed' || run.status === 'expired') {
                return run;
            }

            await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        throw new Error('Run timed out');
    }

    /**
     * Step 5: Report Processing
     * - Validates uploaded PDF files
     * - Creates vector stores for document analysis
     * - Manages analysis threads and assistant runs
     * - Returns structured analysis results
     * 
     * This is the main entry point for processing medical reports and generating ratings.
     * It orchestrates the entire workflow from file upload to final analysis.
     */
    async processRatingFile(file) {
        try {
            const ratingAssistantId = process.env.OPENAI_RATING_ASSISTANT_ID;
            if (!ratingAssistantId) {
                throw new Error('OPENAI_RATING_ASSISTANT_ID not configured');
            }

            let fileId, threadId;

            if (!file.originalname.toLowerCase().endsWith('.pdf')) {
                throw new Error('Only PDF files are supported');
            }

            // Get PDF info
            const pdfData = await pdfParse(file.buffer);
            const pageCount = pdfData.numpages;
            const text = pdfData.text;

            // Create thread
            const thread = await openai.beta.threads.create();
            threadId = thread.id;

            if (pageCount < 100) {
                // For small PDFs, use direct text
                await openai.beta.threads.messages.create(thread.id, {
                    role: "user",
                    content: text
                });
            } else {
                // For large PDFs, use file upload and vector store
                const uploadedFile = await openai.files.create({
                    file: file.buffer,
                    purpose: 'assistants'
                });
                fileId = uploadedFile.id;

                // Add file to thread
                await openai.beta.threads.messages.create(thread.id, {
                    role: "user",
                    content: "Please analyze this medical report",
                    file_ids: [fileId]
                });
            }

            // Run initial analysis
            const run = await openai.beta.threads.runs.create(thread.id, {
                assistant_id: ratingAssistantId,
                tools: [
                    { type: pageCount >= 100 ? "file_search" : "code_interpreter" }
                ]
            });

            // Wait for completion
            const runStatus = await this.waitForRunCompletion(thread.id, run.id);

            if (runStatus.status === 'completed') {
                // Retrieve messages after completion
                const messages = await openai.beta.threads.messages.list(thread.id);
                const lastMessage = messages.data[0];
                if (lastMessage?.content?.[0]?.text?.value) {
                    return {
                        message: lastMessage.content[0].text.value,
                        threadId: thread.id
                    };
                }
            } else {
                throw new Error(`Run failed with status: ${runStatus.status}`);
            }
        } catch (error) {
            console.error('Error processing rate report:', {
                error: error.message,
                stack: error.stack,
                fileName: file?.originalname
            });
            throw error;
        }
    }
}

export default new AssistantChatService();
