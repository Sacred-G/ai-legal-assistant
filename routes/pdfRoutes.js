import express from 'express';
import { extractTextFromPDF } from '../services/pdf/pdfService.js';
import medicalReportService from '../services/medicalReportService.js';
import { performCaseLawResearch } from '../services/wordwareService.js';

const router = express.Router();

// PDF text extraction endpoint (for chat interface)
router.post('/extract-text', async (req, res) => {
  if (!req.body.file) {
    return res.status(400).json({ error: 'No file data provided' });
  }

  try {
    console.log('Starting PDF text extraction...');
    const fileBuffer = Buffer.from(req.body.file, 'base64');
    const result = await extractTextFromPDF(fileBuffer);

    if (!result.text) {
      return res.status(400).json({ error: 'Could not extract text from PDF' });
    }

    console.log('PDF text extracted successfully:', {
      pages: result.pages,
      textLength: result.text.length
    });

    res.json(result);
  } catch (error) {
    console.error('PDF processing error:', error);
    res.status(500).json({
      error: error.message || 'Error processing PDF',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Medical report analysis endpoint (using Assistants API)
router.post('/analyze-report', async (req, res) => {
  if (!req.body.file) {
    return res.status(400).json({ error: 'No file data provided' });
  }

  try {
    // Process form data
    const formData = {
      occupation: req.body.occupation,
      age: req.body.age
    };

    const fileBuffer = Buffer.from(req.body.file, 'base64');
    const fileName = req.body.fileName || 'document.pdf';

    // Process report using Assistants API and Supabase
    const result = await medicalReportService.processReport(
      fileBuffer,
      fileName,
      formData
    );

    res.json(result);
  } catch (error) {
    console.error('Report analysis error:', error);
    res.status(500).json({
      error: 'Error analyzing report',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Case law research endpoint using Wordware API
router.post('/case-law-research', async (req, res) => {
  const { query, jurisdiction, timeFrame, sources, includeKeywords, excludeKeywords } = req.body;

  // Validate input
  if (!query || !jurisdiction || !timeFrame || !sources) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Call the Wordware API to fetch case law data
    const results = await wordwareService.fetchCaseLaw({
      query,
      jurisdiction,
      timeFrame,
      sources,
      includeKeywords,
      excludeKeywords
    });

    res.json(results);
  } catch (error) {
    console.error('Error processing case law research:', error);
    res.status(500).json({ error: 'Error processing case law research' });
  }
});

export default router;
