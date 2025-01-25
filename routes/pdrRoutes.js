import express from 'express';
import PDRService from '../services/pdrService.js';

const router = express.Router();

// Calculate rating
router.post('/calculate-rating', async (req, res) => {
    try {
        const result = await PDRService.calculateRating(req.body);
        res.json(result);
    } catch (error) {
        console.error('Error calculating rating:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get occupation group
router.get('/occupation-group/:occupation', async (req, res) => {
    try {
        const occupation = req.params.occupation;
        const result = await PDRService.getOccupationalAdjustment(occupation);
        res.json(result);
    } catch (error) {
        console.error('Error getting occupation group:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get impairment details
router.get('/impairment/:code', async (req, res) => {
    try {
        const code = req.params.code;
        const result = await PDRService.getImpairmentDetails(code);
        if (!result) {
            return res.status(404).json({ error: 'Impairment code not found' });
        }
        res.json(result);
    } catch (error) {
        console.error('Error getting impairment details:', error);
        res.status(500).json({ error: error.message });
    }
});

// Save medical input and get rating results
router.post('/medical-input', async (req, res) => {
    try {
        // Calculate rating first
        const ratingResult = await PDRService.calculateRating(req.body);

        // Store in history table
        const historyEntry = {
            file_name: req.body.name || 'Unknown',
            result_summary: JSON.stringify(ratingResult),
            final_pd_percent: Math.max(
                ratingResult.no_apportionment.total,
                ratingResult.with_apportionment.total
            ),
            occupation: req.body.occupation,
            age: req.body.age
        };

        // Insert into history
        await PDRService.dbRun(
            `INSERT INTO history (
                file_name,
                result_summary,
                final_pd_percent,
                occupation,
                age
            ) VALUES (?, ?, ?, ?, ?)`,
            [
                historyEntry.file_name,
                historyEntry.result_summary,
                historyEntry.final_pd_percent,
                historyEntry.occupation,
                historyEntry.age
            ]
        );

        // Get the inserted history entry
        const result = await PDRService.dbGet(
            'SELECT * FROM history ORDER BY id DESC LIMIT 1'
        );

        res.json({
            id: result.id,
            ...ratingResult
        });
    } catch (error) {
        console.error('Error processing medical input:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get rating history
router.get('/history', async (req, res) => {
    try {
        const history = await PDRService.dbAll('SELECT * FROM history ORDER BY timestamp DESC');
        res.json(history);
    } catch (error) {
        console.error('Error getting history:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
