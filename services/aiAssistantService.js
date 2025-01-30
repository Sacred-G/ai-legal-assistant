import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

class AIAssistantService {
    async uploadFileToOpenAI(fileBuffer, filename) {
        try {
            console.log('Uploading file to OpenAI...');
            const file = await openai.files.create({
                file: fileBuffer,
                purpose: 'assistants'
            });
            console.log('File uploaded successfully:', file.id);
            return file.id;
        } catch (error) {
            console.error('Error uploading file to OpenAI:', error);
            throw error;
        }
    }

    async createAssistant(fileId) {
        try {
            console.log('Creating new assistant...');

            // Upload the reference pdrs.pdf file
            const pdrsPath = path.join(__dirname, '..', 'userpdf', 'pdrs.pdf');
            const pdrsFile = await openai.files.create({
                file: fs.createReadStream(pdrsPath),
                purpose: 'assistants'
            });

            const assistant = await openai.beta.assistants.create({
                model: "gpt-4o",
                tools: [{ type: "code_interpreter" }, { type: "file_search" }],
                name: "AI Legal Assistant",
                instructions: `You are an AI Legal Assistant specialized in analyzing legal and medical documents. When analyzing documents:
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
}`,
                file_ids: [fileId, pdrsFile.id]  // Attach both the uploaded file and pdrs reference
            });
            console.log('Assistant created successfully:', assistant.id);
            return assistant;
        } catch (error) {
            console.error('Error creating assistant:', error);
            throw error;
        }
    }

    async createThread() {
        try {
            console.log('Creating new thread...');
            const thread = await openai.beta.threads.create();
            console.log('Thread created successfully:', thread.id);
            return thread;
        } catch (error) {
            console.error('Error creating thread:', error);
            throw error;
        }
    }

    async processFileWithAssistant(fileBuffer, filename) {
        try {
            // Upload file
            const fileId = await this.uploadFileToOpenAI(fileBuffer, filename);

            // Create new assistant with file attached
            const assistant = await this.createAssistant(fileId);

            // Create new thread
            const thread = await this.createThread();

            // Get initial analysis
            const analysis = await this.getJsonAnalysis(thread.id, assistant.id);

            // Return all IDs and analysis
            return {
                success: true,
                assistantId: assistant.id,
                threadId: thread.id,
                fileId: fileId,
                analysis: analysis
            };
        } catch (error) {
            console.error('Error in processFileWithAssistant:', error);
            throw error;
        }
    }

    async getJsonAnalysis(threadId, assistantId) {
        try {
            console.log('Getting analysis...');

            // Add a message to the thread
            await openai.beta.threads.messages.create(threadId, {
                role: "user",
                content: `Please analyze this document and provide a detailed analysis in the following format:

RATINGS:
For each body part:
- Calculate base WPI and multiply by 1.4
- Apply occupational adjustments based on work category
- Apply pain add-on (3% standard) to base WPI before multiplying by 1.4
- Apply age adjustment additively to the rating

Format each rating as:
Body Part (Industrial%)
Industrial% - code - base WPI - [1.4] adjusted WPI - group/variant - occupational adjusted - final% Description

KEY POINTS:
• List key medical findings
• List diagnoses
• List work restrictions
• List future medical needs

CITATIONS:
• Include relevant page numbers and quotes

SUMMARY:
Provide a concise summary of the case`
            });

            // Run the assistant
            const run = await openai.beta.threads.runs.create(threadId, {
                assistant_id: assistantId
            });

            // Wait for the run to complete
            let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
            while (runStatus.status !== 'completed') {
                if (runStatus.status === 'failed') {
                    throw new Error('Assistant run failed: ' + JSON.stringify(runStatus.last_error));
                }
                if (runStatus.status === 'requires_action') {
                    throw new Error('Assistant requires action: ' + JSON.stringify(runStatus.required_action));
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
                runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
            }

            // Get the messages
            const messages = await openai.beta.threads.messages.list(threadId);
            const lastMessage = messages.data[0];

            return {
                status: 'success',
                analysis: lastMessage.content[0].text.value
            };
        } catch (error) {
            console.error('Error getting analysis:', error);
            throw error;
        }
    }
}

export default new AIAssistantService();
