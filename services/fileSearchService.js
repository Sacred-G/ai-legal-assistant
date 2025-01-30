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

class FileSearchService {
    constructor() {
        this.assistantId = null;
        this.vectorStoreId = null;
        this.threadIds = new Map(); // Store threadIds for each user session
    }

    async initializeAssistant() {
        if (!this.assistantId) {
            // Create a new vector store for file search
            const vectorStore = await openai.beta.vectorStores.create({
                name: "Document Search Store",
            });
            this.vectorStoreId = vectorStore.id;

            // Create a new assistant with file search capability
            const assistant = await openai.beta.assistants.create({
                name: "Document Search Assistant",
                instructions: `You are a medical-legal report analyzer. Format your response in a clean, structured manner following these guidelines:

FORMATTING RULES:
1. Use clear section headers with numbers (e.g., "1. PATIENT DEMOGRAPHICS")
2. Add a blank line between sections for readability
3. Use consistent indentation (2 spaces) for all subsections
4. Present information in a key-value format where applicable
5. Avoid special characters, markdown, or decorative elements
6. Use plain text formatting only

REPORT SECTIONS:

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

4. CURRENT COMPLAINTS
  List by body part:
    [Body Part]:
      Symptoms: [List]
      Pain Level/Description: [Details]
      Activity Impact: [Description]

5. CLINICAL DIAGNOSES
  Primary:
    Diagnosis: [Condition]
    Description: [Details]
  Secondary:
    [List additional diagnoses]

6. APPORTIONMENT
  Percentages: [List breakdowns]
  Reasoning: [Explanation]

7. WORK RESTRICTIONS
  Physical Limitations: [List]
  Activity Restrictions: [List]

8. FUTURE MEDICAL CARE
  Recommended Treatments: [List]
  Ongoing Care Needs: [Details]

9. VOCATIONAL FINDINGS
  Current Capacity: [Details]
  Recommendations: [List]
                
                Do not perform any ratings or evaluations - focus only on search and summarization.`,
                model: "gpt-4o",
                tools: [{ type: "file_search" }],
                tool_resources: {
                    file_search: {
                        vector_store_ids: [this.vectorStoreId]
                    }
                }
            });
            this.assistantId = assistant.id;
        }
        return this.assistantId;
    }

    async processFile(file) {
        const tempPath = path.join(uploadsDir, file.originalname);
        await fs.promises.writeFile(tempPath, file.buffer);

        try {
            // Upload file to OpenAI
            const fileUpload = await openai.files.create({
                file: fs.createReadStream(tempPath),
                purpose: 'assistants',
            });

            // Add file to vector store
            await openai.beta.vectorStores.files.createAndPoll(
                this.vectorStoreId,
                fileUpload.id
            );

            return fileUpload.id;
        } finally {
            // Clean up temp file
            await fs.promises.unlink(tempPath);
        }
    }

    async getOrCreateThread(sessionId) {
        if (!this.threadIds.has(sessionId)) {
            const thread = await openai.beta.threads.create();
            this.threadIds.set(sessionId, thread.id);
        }
        return this.threadIds.get(sessionId);
    }

    async searchAndSummarize(query, fileId, sessionId) {
        await this.initializeAssistant();
        const threadId = await this.getOrCreateThread(sessionId);

        // Add the message to the thread
        await openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: query,
            file_ids: [fileId]
        });

        // Create a run
        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: this.assistantId
        });

        // Poll for completion
        let response;
        while (true) {
            const runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
            if (runStatus.status === 'completed') {
                const messages = await openai.beta.threads.messages.list(threadId);
                response = messages.data[0].content[0].text.value;
                break;
            } else if (runStatus.status === 'failed') {
                throw new Error('Run failed: ' + runStatus.last_error?.message);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return response;
    }

    async cleanupFiles() {
        // Clean up threads
        for (const [sessionId, threadId] of this.threadIds) {
            try {
                await openai.beta.threads.del(threadId);
            } catch (error) {
                console.error(`Error deleting thread ${threadId}:`, error);
            }
        }
        this.threadIds.clear();

        // Delete the vector store
        if (this.vectorStoreId) {
            try {
                await openai.beta.vectorStores.del(this.vectorStoreId);
            } catch (error) {
                console.error(`Error deleting vector store ${this.vectorStoreId}:`, error);
            }
            this.vectorStoreId = null;
        }
    }
}

export default new FileSearchService();
