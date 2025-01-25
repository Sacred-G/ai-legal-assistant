import OpenAI from 'openai';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

// Load existing environment variables
dotenv.config();

async function createAssistants() {
    console.log('Creating new assistants...');

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        defaultHeaders: { 'OpenAI-Beta': 'assistants=v2' }
    });

    async function testFileProcessing(assistant, vectorStoreId, fileContent, prompt) {
        console.log(`Testing file processing with ${assistant.id}...`);

        // Create a temporary file
        const tempFilePath = path.join(process.cwd(), 'temp.txt');
        fs.writeFileSync(tempFilePath, fileContent);

        // Create a test file
        const testFile = await openai.files.create({
            file: fs.createReadStream(tempFilePath),
            purpose: 'assistants'
        });

        // Clean up temp file
        fs.unlinkSync(tempFilePath);
        console.log(`Created file ${testFile.id}`);

        // Create a thread with the file attached
        const thread = await openai.beta.threads.create({
            messages: [{
                role: "user",
                content: prompt,
                attachments: [{
                    file_id: testFile.id,
                    tools: [{ type: "file_search" }]
                }]
            }]
        });
        console.log('Added message with file to thread');

        // Create a run
        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: assistant.id
        });
        console.log(`Created run ${run.id}`);

        // Wait for run to complete
        let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        while (runStatus.status !== 'completed') {
            if (runStatus.status === 'failed' || runStatus.status === 'expired') {
                throw new Error(`Run failed with status: ${runStatus.status}`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        }

        // Get messages
        const messages = await openai.beta.threads.messages.list(thread.id);
        console.log('Assistant response:', messages.data[0].content[0].text.value);

        return {
            threadId: thread.id,
            fileId: testFile.id
        };
    }

    async function testAssistant(assistant, message) {
        console.log(`Testing assistant ${assistant.id}...`);

        // Create a thread
        const thread = await openai.beta.threads.create();
        console.log(`Created thread ${thread.id}`);

        // Add a message to the thread
        await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: message
        });
        console.log('Added message to thread');

        // Create a run
        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: assistant.id
        });
        console.log(`Created run ${run.id}`);

        // Wait for run to complete
        let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        while (runStatus.status !== 'completed') {
            if (runStatus.status === 'failed' || runStatus.status === 'expired') {
                throw new Error(`Run failed with status: ${runStatus.status}`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        }

        // Get messages
        const messages = await openai.beta.threads.messages.list(thread.id);
        console.log('Assistant response:', messages.data[0].content[0].text.value);

        return thread.id;
    }


    try {
        // Create chat assistant and vector store
        console.log('Creating chat assistant...');
        const chatVectorStore = await openai.beta.vectorStores.create({
            name: `chat-store-${Date.now()}`
        });

        const chatAssistant = await openai.beta.assistants.create({
            name: "Legal Research Assistant",
            instructions: "You are a legal research assistant. Help users understand legal documents and answer questions about case law.",
            model: "gpt-4o",
            tools: [{ type: "code_interpreter" }, { type: "file_search" }],
            tool_resources: {
                file_search: {
                    vector_store_ids: [chatVectorStore.id]
                }
            }
        });

        // Create rating assistant and vector store
        console.log('Creating rating assistant...');
        const ratingVectorStore = await openai.beta.vectorStores.create({
            name: `rating-store-${Date.now()}`
        });

        // Use existing rating assistant
        const ratingAssistant = await openai.beta.assistants.retrieve("asst_Z5CE1IzyjMGakPphwT8MY3Nf");

        // Update rating assistant configuration
        await openai.beta.assistants.update("asst_Z5CE1IzyjMGakPphwT8MY3Nf", {
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
            ],
            tool_resources: {
                file_search: {
                    vector_store_ids: [ratingVectorStore.id]
                }
            }
        });

        // Read existing .env file
        const envPath = path.resolve(process.cwd(), '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');

        // Update assistant and vector store IDs while preserving other variables
        const updatedEnvContent = envContent
            .replace(/OPENAI_ASSISTANT_ID=.*/g, `OPENAI_ASSISTANT_ID=${chatAssistant.id}`)
            .replace(/OPENAI_VECTORSTORE_ID=.*/g, `OPENAI_VECTORSTORE_ID=${chatVectorStore.id}`)
            .replace(/OPENAI_RATING_ASSISTANT_ID=.*/g, `OPENAI_RATING_ASSISTANT_ID=${ratingAssistant.id}`)
            .replace(/OPENAI_RATING_VECTORSTORE_ID=.*/g, `OPENAI_RATING_VECTORSTORE_ID=${ratingVectorStore.id}`);

        // Write updated content back to .env file
        fs.writeFileSync(envPath, updatedEnvContent);

        // Test both assistants with basic queries
        console.log('\nTesting basic assistant capabilities...');

        const chatThreadId = await testAssistant(
            chatAssistant,
            "What legal research capabilities do you have?"
        );

        const ratingThreadId = await testAssistant(
            ratingAssistant,
            "What type of medical reports can you analyze?"
        );

        // Test file processing capabilities
        console.log('\nTesting file processing capabilities...');

        // Test legal document processing
        const legalDocument = `
CASE SUMMARY
Smith v. Johnson Corporation
Case No. 12345
Filed: January 15, 2024

FACTS:
Plaintiff John Smith alleges workplace discrimination...
`;

        const { threadId: chatFileThreadId, fileId: chatFileId } = await testFileProcessing(
            chatAssistant,
            chatVectorStore.id,
            legalDocument,
            "Please analyze this legal document and summarize the key points."
        );

        // Test medical report processing
        const medicalReport = `
MEDICAL EVALUATION REPORT
Patient: Jane Doe
DOB: 01/01/1980
Date of Injury: 06/15/2023
Occupation: Office Worker

DIAGNOSIS:
1. Lumbar spine strain with 5% WPI
2. Right shoulder impingement with 3% WPI
`;

        const { threadId: ratingFileThreadId, fileId: ratingFileId } = await testFileProcessing(
            ratingAssistant,
            ratingVectorStore.id,
            medicalReport,
            "Please analyze this medical report and extract the impairment ratings."
        );

        console.log('\nSuccessfully created and tested assistants');
        console.log('New IDs:');
        console.log(`Chat Assistant: ${chatAssistant.id}`);
        console.log(`Chat Vector Store: ${chatVectorStore.id}`);
        console.log(`Chat Thread: ${chatThreadId}`);
        console.log(`Chat File Thread: ${chatFileThreadId}`);
        console.log(`Chat File: ${chatFileId}`);
        console.log(`Rating Assistant: ${ratingAssistant.id}`);
        console.log(`Rating Vector Store: ${ratingVectorStore.id}`);
        console.log(`Rating Thread: ${ratingThreadId}`);
        console.log(`Rating File Thread: ${ratingFileThreadId}`);
        console.log(`Rating File: ${ratingFileId}`);

    } catch (error) {
        console.error('Error creating assistants:', error);
        process.exit(1);
    }
}

createAssistants();
