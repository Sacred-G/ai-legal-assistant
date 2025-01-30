import express from 'express';
import multer from 'multer';
import aiAssistantService from '../services/aiAssistantService.js';

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Handle file uploads
router.post('/upload', upload.single('file'), async (req, res) => {
    console.log('AI Assistant file upload request received:', {
        file: req.file ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        } : undefined
    });

    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'File is required' });
        }

        // Process file with assistant
        const session = await aiAssistantService.processFileWithAssistant(
            file.buffer,
            file.originalname
        );

        // Get analysis
        const analysis = await aiAssistantService.getJsonAnalysis(
            session.threadId,
            session.assistantId,
            session.fileId
        );

        res.json({
            success: true,
            threadId: session.threadId,
            assistantId: session.assistantId,
            fileId: session.fileId,
            content: analysis
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({
            error: error.message || 'Error processing file'
        });
    }
});

export default router;
