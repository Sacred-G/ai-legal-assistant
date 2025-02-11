import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import chatInterfaceService from '../services/chatInterfaceService.js';

const router = express.Router();
// Configure multer to store files in memory
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Handle PDF upload and initial processing
router.post('/process-pdf', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const { message, type = 'chat' } = req.body;

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Initialize resources first with the correct type
        await chatInterfaceService.initializeResources(type);

        // Process the PDF and create vector store
        const { fileId, vectorStoreId } = await chatInterfaceService.processUploadedPDF({
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype
        });

        // Create a thread with the initial message
        const thread = await chatInterfaceService.createThread(message || 'Please analyze this document.');

        // Create and poll for run completion
        const result = await chatInterfaceService.createAndPollRun(thread.id);

        // Find the assistant's message
        const assistantMessage = result.messages.find(msg => msg.role === 'assistant');
        if (!assistantMessage) {
            throw new Error('No assistant response found');
        }

        // Format the message to ensure it's properly structured
        const formattedMessage = assistantMessage.content[0]?.text?.value || '';
        if (!formattedMessage) {
            throw new Error('Invalid message format received');
        }

        res.json({
            threadId: thread.id,
            messages: result.messages,
            vectorStoreId: vectorStoreId,
            fileId: fileId,
            assistantId: chatInterfaceService.assistantId,
            summary: formattedMessage
        });
    } catch (error) {
        console.error('Error in process-pdf endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add a new message to existing thread
router.post('/thread/:threadId/messages', async (req, res) => {
    try {
        const { threadId } = req.params;
        const { message, type = 'chat' } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Initialize resources first with the correct type
        await chatInterfaceService.initializeResources(type);

        // Add message to thread
        await chatInterfaceService.addMessageToThread(threadId, message);

        // Create and poll for run completion 
        const result = await chatInterfaceService.createAndPollRun(threadId);

        // Find the assistant's message
        const assistantMessage = result.messages.find(msg => msg.role === 'assistant');
        if (!assistantMessage) {
            throw new Error('No assistant response found');
        }

        if (!assistantMessage.content?.[0]?.text?.value) {
            throw new Error('Invalid message format received');
        }

        res.json({
            messages: result.messages,
            response: assistantMessage.content[0].text.value
        });
    } catch (error) {
        console.error('Error in add message endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

// Cleanup endpoint
router.delete('/cleanup/:vectorStoreId', async (req, res) => {
    try {
        const { vectorStoreId } = req.params;
        await chatInterfaceService.cleanupVectorStore(vectorStoreId);
        res.json({ message: 'Vector store cleaned up successfully' });
    } catch (error) {
        console.error('Error in cleanup endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
