import express from 'express';
import multer from 'multer';
import fileSearchService from '../services/fileSearchService.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload a file for searching
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Initialize the assistant if not already done
        await fileSearchService.initializeAssistant();

        const fileId = await fileSearchService.processFile(req.file);
        
        // Generate a new session ID for this file upload
        const sessionId = uuidv4();
        
        res.json({ fileId, sessionId });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: error.message });
    }
});

// Search and summarize content
router.post('/search', async (req, res) => {
    try {
        const { query, fileId, sessionId } = req.body;
        if (!query || !fileId || !sessionId) {
            return res.status(400).json({ error: 'Missing query, fileId, or sessionId' });
        }

        const response = await fileSearchService.searchAndSummarize(query, fileId, sessionId);
        res.json({ response });
    } catch (error) {
        console.error('Error searching content:', error);
        res.status(500).json({ error: error.message });
    }
});

// Cleanup endpoint
router.delete('/cleanup', async (req, res) => {
    try {
        await fileSearchService.cleanupFiles();
        res.json({ message: 'Files cleaned up successfully' });
    } catch (error) {
        console.error('Error in cleanup endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
