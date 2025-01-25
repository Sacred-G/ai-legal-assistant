import express from 'express';
import { searchTavily } from '../services/tavilyService.js';

const router = express.Router();

router.post('/search', async (req, res) => {
    try {
        const { query, ...options } = req.body;
        const results = await searchTavily(query, options);
        res.json(results);
    } catch (error) {
        res.status(500).json({
            error: error.response?.data?.message || error.message
        });
    }
});

export default router;
