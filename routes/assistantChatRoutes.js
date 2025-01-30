import express from 'express';
import chatInterfaceService from '../services/chatInterfaceService.js';
import multer from 'multer';

const router = express.Router();
const upload = multer();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const uploadMemory = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Create a new thread
router.post('/create-thread', async (req, res) => {
    try {
        const { type = 'chat', tool = 'file_search' } = req.body;
        const { assistantId, threadId, vectorStoreId } = await chatInterfaceService.createAssistant(type, tool);
        res.json({
            success: true,
            assistantId,
            threadId,
            vectorStoreId
        });
    } catch (error) {
        console.error('Error creating thread:', error);
        res.status(500).json({
            error: error.message || 'Error creating thread'
        });
    }
});

// Handle file uploads
router.post('/upload', uploadMemory.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'File is required' });
        }

        // Initialize resources
        await chatInterfaceService.initializeResources('rate');

        // Process the uploaded PDF
        const { fileId, vectorStoreId } = await chatInterfaceService.processUploadedPDF({
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype
        });

        // Create thread with initial message
        const initialPrompt = `Please analyze this medical report using the following format:

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
Recommendations: [List]`;

        const thread = await chatInterfaceService.createThread(initialPrompt);

        // Run the assistant and get response
        const result = await chatInterfaceService.createAndPollRun(thread.id);

        // Get messages from the thread
        const messages = await chatInterfaceService.getThreadMessages(thread.id);

        // Get the assistant's response
        const assistantMessage = messages.find(msg => msg.role === 'assistant');
        if (!assistantMessage || !assistantMessage.content?.[0]?.text?.value) {
            throw new Error('No valid response from assistant');
        }

        res.json({
            success: true,
            content: assistantMessage.content[0].text.value
        });
    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).json({ error: error.message || 'Error processing file' });
    }
});

// Handle chat messages with streaming
router.post('/message', async (req, res) => {
    try {
        const { message, threadId, assistantId, fileId } = req.body;

        if (!threadId || !assistantId) {
            return res.status(400).json({ error: 'ThreadId and assistantId are required' });
        }

        if (!message && !fileId) {
            return res.status(400).json({ error: 'Either message or fileId is required' });
        }

        // Set up streaming response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Get streaming response
        const stream = await chatInterfaceService.sendMessageStream(
            message || '',
            threadId,
            assistantId,
            fileId
        );

        // Handle stream events
        stream.on('textCreated', () => {
            res.write('event: textCreated\ndata: {}\n\n');
        });

        stream.on('textDelta', (delta) => {
            res.write(`event: textDelta\ndata: ${JSON.stringify(delta)}\n\n`);
        });

        stream.on('toolCallCreated', (toolCall) => {
            res.write(`event: toolCallCreated\ndata: ${JSON.stringify(toolCall)}\n\n`);
        });

        stream.on('toolCallDelta', (delta, snapshot) => {
            res.write(`event: toolCallDelta\ndata: ${JSON.stringify({ delta, snapshot })}\n\n`);
        });

        stream.on('error', (error) => {
            console.error('Stream error:', error);
            res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
            res.end();
        });

        stream.on('end', () => {
            res.write('event: done\ndata: {}\n\n');
            res.end();
        });

    } catch (error) {
        console.error('Error in assistants chat:', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({
            error: error.message || 'Error generating response'
        });
    }
});

export default router;
