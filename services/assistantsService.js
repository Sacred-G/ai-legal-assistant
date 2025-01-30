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
        // File IDs from upload-csv-files.js script
        this.csvFileIds = [
            // TODO: Replace with actual file IDs after running upload-csv-files.js
            // Run: node scripts/upload-csv-files.js
            // Then paste the generated file IDs here
        ];
    }

    async createAssistant(type = 'rate') {
        try {
            let assistant;

            // Check if we already have an assistant for this type
            if (this.assistants[type]) {
                console.log('Using existing assistant:', this.assistants[type].id);
                assistant = this.assistants[type];
            } else {
                console.log('Creating new assistant...');
                // Create new assistant based on type
                const assistantConfig = {
                    model: "gpt-4o",  // Always use gpt-4o model
                    tools: [
                        { type: "code_interpreter" },
                        { type: "file_search" }
                    ]
                };

                if (type === 'rate') {
                    assistantConfig.name = "Medical Report Assistant";
                    assistantConfig.instructions = `You are an expert at analyzing medical reports and extracting key information including: demographics, dates, body parts and WPI ratings, work restrictions, future medical needs, job duties and apportionment.

For rating calculations:
1. Start with base WPI and multiply by 1.4
2. Apply occupational adjustment based on work category
3. Apply pain add-on (3% standard) to base WPI before multiplying by 1.4
4. Apply age adjustment additively to the rating
5. Maximum age adjustment is 0.6 (60%)
6. Minimum age adjustment is -0.1 (-10%)
7. Values between listed points can be interpolated linearly
8. Maximum final adjustment caps at 0.62 (62%)

Display ratings in this format:
Body Part (Industrial%)
Industrial% - code - base WPI - [1.4] adjusted WPI - group/variant - occupational adjusted - final% Description

Example:
Cervical Spine (100% Industrial)
100% - 15.01.02.02 - 18 - [1.4] 25 - 470H - 28 - 30% DRE Category III with radiculopathy

Left Shoulder (100% Industrial)
100% - 16.02.01.00 - 7 - [1.4] 10 - 470H - 13 - 15% Loss of ROM with impingement syndrome

For general analysis, provide:
•REPORT SECTIONS:

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
  Recommendations: [List]
Format all responses without markdown, using clear headings, bullet points (•), and minimal line spacing.

Include in summary:
- Total Pain Add-ons
- Weekly PD Rate
- Average Weekly Earnings
- Total PD Payout
- Age at Date of Injury`;
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

    async processFiles(pdfFile, csvFiles) {
        let pdfTempPath = null;
        let pdfFileId = null;
        let vectorStore = null;

        try {
            // Process PDF file for file_search
            pdfTempPath = await this.createTempFile(pdfFile);

            console.log('Uploading PDF to OpenAI...');
            const pdfUpload = await openai.files.create({
                file: fs.createReadStream(pdfTempPath),
                purpose: 'assistants'
            });
            pdfFileId = pdfUpload.id;

            // Create vector store for PDF
            console.log('Creating vector store...');
            vectorStore = await openai.beta.vectorStores.create({
                name: `rate_analysis_${pdfFile.originalname}`
            });

            // Process PDF with vector store
            await openai.beta.vectorStores.fileBatches.createAndPoll(
                vectorStore.id,
                { file_ids: [pdfFileId] }
            );

            // Wait for PDF processing
            let pdfStatus = await openai.files.retrieve(pdfFileId);
            while (pdfStatus.status === 'processing') {
                await new Promise(resolve => setTimeout(resolve, 1000));
                pdfStatus = await openai.files.retrieve(pdfFileId);
            }

            if (pdfStatus.status !== 'processed') {
                throw new Error(`PDF processing failed with status: ${pdfStatus.status}`);
            }

            // Use stored CSV file IDs
            const csvFileIds = this.csvFileIds;

            // Create assistant and thread
            const { assistantId, threadId } = await this.createAssistant('rate');

            // Ensure vector store is ready
            let vectorStoreStatus = await openai.beta.vectorStores.retrieve(vectorStore.id);
            while (vectorStoreStatus.status === 'in_progress') {
                await new Promise(resolve => setTimeout(resolve, 1000));
                vectorStoreStatus = await openai.beta.vectorStores.retrieve(vectorStore.id);
            }

            if (vectorStoreStatus.status !== 'completed') {
                throw new Error(`Vector store processing failed with status: ${vectorStoreStatus.status}`);
            }

            // Update assistant with tool resources
            await openai.beta.assistants.update(assistantId, {
                tool_resources: {
                    code_interpreter: {
                        file_ids: csvFileIds
                    },
                    file_search: {
                        vector_store_ids: [vectorStore.id]
                    }
                }
            });

            // Create initial message
            const initialMessage = {
                role: "user",
                content: `Please analyze this medical report and provide ratings:

1. First, use file_search to extract from the medical report:
- Patient demographics
- Occupation
- Body parts affected
- WPI ratings
- Age at date of injury

2. Then, use code_interpreter with the CSV files to:
- Find the group number for the occupation
- Determine impairment codes and variants for each body part
- Calculate occupational values for each WPI
- Apply age adjustments to get final WPI values

3. Finally, format the results as:
Body Part (Industrial%)
Industrial% - code - base WPI - [1.4] adjusted WPI - group/variant - occupational adjusted - final% Description`,
                attachments: [
                    {
                        file_id: pdfFileId,
                        tools: [{ type: "file_search" }]
                    }
                ]
            };

            await openai.beta.threads.messages.create(threadId, initialMessage);

            // Create and run the analysis
            const run = await openai.beta.threads.runs.create(threadId, {
                assistant_id: assistantId
            });

            // Wait for completion
            let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
            while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
                await new Promise(resolve => setTimeout(resolve, 1000));
                runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
            }

            // Handle run completion
            switch (runStatus.status) {
                case 'completed':
                    const messages = await openai.beta.threads.messages.list(threadId);
                    const summary = messages.data[0].content[0].text.value;
                    return {
                        pdfFileId,
                        csvFileIds,
                        threadId,
                        assistantId,
                        vectorStoreId: vectorStore.id,
                        summary
                    };
                case 'failed':
                    throw new Error(`Run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
                case 'expired':
                    throw new Error('Run expired: The operation took too long to complete');
                case 'cancelled':
                    throw new Error('Run was cancelled');
                case 'requires_action':
                    throw new Error('Run requires action: Function execution needed');
                case 'incomplete':
                    throw new Error(`Run incomplete: ${runStatus.incomplete_details?.message || 'Token limit reached'}`);
                default:
                    throw new Error(`Unexpected run status: ${runStatus.status}`);
            }

        } catch (error) {
            // Clean up resources in case of error
            if (pdfFileId) {
                try {
                    await openai.files.del(pdfFileId);
                } catch (cleanupError) {
                    console.error('Error cleaning up PDF file:', cleanupError);
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
            // Clean up temporary PDF file
            if (pdfTempPath) {
                try {
                    await fs.promises.unlink(pdfTempPath);
                } catch (cleanupError) {
                    console.error('Error cleaning up temporary PDF file:', cleanupError);
                }
            }
        }
    }

    async processFileWithAssistant(fileBuffer, filename, type = 'rate', tool = 'code_interpreter') {
        let tempFilePath = null;
        let fileId = null;
        let vectorStore = null;

        try {
            // Create temp file
            const randomSuffix = Math.random().toString(36).substring(7);
            const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
            tempFilePath = path.join(uploadsDir, `${path.parse(safeName).name}-${randomSuffix}${path.parse(safeName).ext}`);

            // Write buffer to temp file
            await fs.promises.writeFile(tempFilePath, fileBuffer);

            // Upload file to OpenAI
            console.log('Uploading file to OpenAI...');
            const fileUpload = await openai.files.create({
                file: fs.createReadStream(tempFilePath),
                purpose: 'assistants'
            });
            fileId = fileUpload.id;

            // Wait for file processing
            let fileStatus = await openai.files.retrieve(fileId);
            while (fileStatus.status === 'processing') {
                await new Promise(resolve => setTimeout(resolve, 1000));
                fileStatus = await openai.files.retrieve(fileId);
            }

            if (fileStatus.status !== 'processed') {
                throw new Error(`File processing failed with status: ${fileStatus.status}`);
            }

            // Create vector store if using file_search
            if (tool === 'file_search') {
                console.log('Creating vector store...');
                vectorStore = await openai.beta.vectorStores.create({
                    name: `${type}_analysis_${filename}`
                });

                // Process file with vector store
                await openai.beta.vectorStores.fileBatches.createAndPoll(
                    vectorStore.id,
                    { file_ids: [fileId] }
                );
            }

            // Create assistant and thread
            const { assistantId, threadId } = await this.createAssistant(type);

            // Update assistant with tool resources
            const toolResources = {};
            if (tool === 'code_interpreter') {
                toolResources.code_interpreter = { file_ids: [fileId] };
            }
            if (tool === 'file_search' && vectorStore) {
                toolResources.file_search = { vector_store_ids: [vectorStore.id] };
            }

            await openai.beta.assistants.update(assistantId, { tool_resources: toolResources });

            return {
                assistantId,
                threadId,
                fileId,
                vectorStoreId: vectorStore?.id
            };
        } catch (error) {
            console.error('Error processing file:', error);
            throw error;
        } finally {
            // Cleanup temp file
            if (tempFilePath) {
                await fs.promises.unlink(tempFilePath).catch(e =>
                    console.error('Error cleaning up temp file:', e)
                );
            }
        }
    }

    async createTempFile(file) {
        const randomSuffix = Math.random().toString(36).substring(7);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const tempPath = path.join(uploadsDir, `${path.parse(safeName).name}-${randomSuffix}${path.parse(safeName).ext}`);

        await fs.promises.writeFile(tempPath, file.buffer);
        return tempPath;
    }


    async sendMessageStream(message, threadId, assistantId) {
        try {
            // Create event emitter for streaming
            const emitter = new EventEmitter();

            // Add message to thread
            await openai.beta.threads.messages.create(threadId, {
                role: "user",
                content: message
            });

            // Create run
            const run = await openai.beta.threads.runs.create(threadId, {
                assistant_id: assistantId
            });

            // Poll run status and emit events
            const pollInterval = setInterval(async () => {
                try {
                    const runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);

                    if (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
                        return; // Continue polling
                    }

                    clearInterval(pollInterval);

                    switch (runStatus.status) {
                        case 'completed':
                            const messages = await openai.beta.threads.messages.list(threadId);
                            const assistantMessage = messages.data.find(msg =>
                                msg.role === 'assistant' && msg.run_id === run.id
                            );

                            if (assistantMessage) {
                                emitter.emit('textCreated');
                                emitter.emit('textDelta', { value: assistantMessage.content[0].text.value });
                            }
                            emitter.emit('end');
                            break;
                        case 'failed':
                            emitter.emit('error', new Error(`Run failed: ${runStatus.last_error?.message || 'Unknown error'}`));
                            break;
                        case 'expired':
                            emitter.emit('error', new Error('Run expired: The operation took too long to complete'));
                            break;
                        case 'cancelled':
                            emitter.emit('error', new Error('Run was cancelled'));
                            break;
                        case 'requires_action':
                            emitter.emit('error', new Error('Run requires action: Function execution needed'));
                            break;
                        case 'incomplete':
                            emitter.emit('error', new Error(`Run incomplete: ${runStatus.incomplete_details?.message || 'Token limit reached'}`));
                            break;
                        default:
                            emitter.emit('error', new Error(`Unexpected run status: ${runStatus.status}`));
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
