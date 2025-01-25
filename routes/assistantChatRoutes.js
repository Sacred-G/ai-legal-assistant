import express from 'express';
import assistantsService from '../services/assistantsService.js';
import multer from 'multer';

const router = express.Router();
const upload = multer();

// Create a new thread
router.post('/chat/assistants/create-thread', async (req, res) => {
    try {
        const { type = 'chat' } = req.body;
        const { assistantId, threadId, vectorStoreId } = await assistantsService.createAssistant(type);
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
router.post('/chat/assistants/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const type = req.body.type || 'chat';

        if (!file) {
            return res.status(400).json({ error: 'File is required' });
        }

        // Process file with assistant
        const session = await assistantsService.processFileWithAssistant(file.buffer, file.originalname, type);

        res.json({
            success: true,
            ...session
        });
    } catch (error) {
        console.error('Error uploading file:', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({
            error: error.message || 'Error uploading file'
        });
    }
});

// Handle chat messages with streaming
router.post('/assistants/message', async (req, res) => {
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
        const stream = await assistantsService.sendMessageStream(
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
