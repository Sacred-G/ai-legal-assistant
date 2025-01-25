import express from 'express';
import multer from 'multer';
import openaiService from '../services/openaiService.js';
import anthropicService from '../services/anthropicService.js';
import geminiService from '../services/geminiService.js';
import assistantsService from '../services/assistantsService.js';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    fieldSize: 50 * 1024 * 1024 // 50MB field size limit
  }
}).single('file');

// Wrap multer middleware to handle errors
const uploadMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      return res.status(400).json({ error: `File upload error: ${err.message}` });
    } else if (err) {
      console.error('Unknown upload error:', err);
      return res.status(500).json({ error: 'Unknown file upload error' });
    }
    next();
  });
};

const router = express.Router();

// Chat endpoint
router.post('/', uploadMiddleware, async (req, res) => {
  try {
    console.log('Chat endpoint called with:', {
      provider: req.body.provider,
      messageLength: req.body.message?.length,
      contextLength: typeof req.body.context === 'string' ? req.body.context.length : req.body.context?.base64?.length,
      contextPreview: typeof req.body.context === 'string'
        ? req.body.context.substring(0, 200) + '...'
        : req.body.context?.base64 ? '(base64 data)' : null,
      hasContext: !!req.body.context,
      hasFile: !!req.file,
      fileDetails: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null
    });

    const { message, provider = 'openai' } = req.body;
    let context = req.body.context;

    // Handle file uploads and context for Anthropic
    if (provider === 'anthropic') {
      if (req.file) {
        console.log('Converting file to base64 for Anthropic...');
        // Validate PDF first by attempting to read it
        const { getDocument } = await import('pdfjs-dist');
        const loadingTask = getDocument(new Uint8Array(req.file.buffer));
        await loadingTask.promise;

        // If PDF is valid, convert to base64
        const base64Data = Buffer.from(req.file.buffer).toString('base64');
        context = { base64: base64Data };
        console.log('Base64 conversion complete, length:', base64Data.length);
      } else if (typeof context === 'object' && context?.base64) {
        // Context is already in the correct format
        console.log('Using provided base64 data, length:', context.base64.length);
      }
    }

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let response;
    console.log('Processing with provider:', provider);

    switch (provider) {
      case 'openai':
      case 'gemini':
        console.log(`Calling ${provider} service...`);
        // Extract text from PDF if file is provided
        if (req.file) {
          const { getDocument } = await import('pdfjs-dist');
          const loadingTask = getDocument(new Uint8Array(req.file.buffer));
          const pdf = await loadingTask.promise;

          // Extract text from all pages
          const textContent = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const text = content.items.map(item => item.str).join(' ');
            textContent.push(text);
          }

          context = textContent.join('\n');
        }

        response = provider === 'openai'
          ? await openaiService.generateResponse(message, context)
          : await geminiService.generateResponse(message, context);
        console.log(`${provider} response received`);
        break;
      case 'anthropic':
        console.log('Calling Anthropic service with context type:', typeof context);
        response = await anthropicService.generateResponse(message, context);
        console.log('Anthropic response received:', {
          responseLength: response?.length,
          hasResponse: !!response
        });
        break;
      case 'assistant':
        console.log('Calling Assistant service...');
        if (req.file) {
          // If there's a file, process it first
          const result = await assistantsService.processFile(req.file.buffer, req.file.originalname);
          // Return the raw data as the response
          response = JSON.stringify(result.rawData, null, 2);
        } else {
          // For regular messages, we need a thread ID
          const { threadId, fileId, assistantId } = req.body;
          if (!threadId || !fileId || !assistantId) {
            throw new Error('Thread ID, File ID, and Assistant ID are required for assistant messages');
          }
          response = await assistantsService.generateResponse(threadId, assistantId, message, fileId);
        }
        console.log('Assistant response received');
        break;
      default:
        return res.status(400).json({ error: 'Invalid provider' });
    }

    res.json({ response });
  } catch (error) {
    console.error('Error in chat endpoint:', {
      error: error.message,
      status: error.status,
      type: error.type,
      response: error.response?.data,
      stack: error.stack,
      provider: req.body.provider,
      hasFile: !!req.file,
      fileDetails: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null,
      threadId: req.body.threadId,
      assistantId: req.body.assistantId
    });
    res.status(500).json({
      error: error.message || 'Error generating response',
      details: {
        provider: req.body.provider,
        apiError: error.response?.data?.error?.message,
        phase: error.phase
      }
    });
  }
});

// Assistants endpoints
router.post('/assistants/create-thread', async (req, res) => {
  try {
    const thread = await assistantsService.createThread();
    res.json({ threadId: thread.id });
  } catch (error) {
    console.error('Error creating thread:', {
      error: error.message,
      status: error.status,
      type: error.type,
      response: error.response?.data,
      stack: error.stack
    });
    res.status(500).json({
      error: error.message || 'Error creating thread',
      details: {
        apiError: error.response?.data?.error?.message,
        status: error.status
      }
    });
  }
});

router.post('/assistants/upload', uploadMiddleware, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Create file buffer with proper name
    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;

    // Process file with assistants service
    const result = await assistantsService.processFile(fileBuffer, fileName);

    // Return both the raw data and calculator-formatted data
    res.json({
      fileId: result.fileId,
      threadId: result.threadId,
      assistantId: result.assistantId,
      vectorStoreId: result.vectorStoreId,
      rawData: result.rawData,
      calculatorData: result.calculatorData
    });
  } catch (error) {
    console.error('Error uploading file to assistants:', {
      error: error.message,
      status: error.status,
      type: error.type,
      response: error.response?.data,
      stack: error.stack,
      phase: error.phase || 'unknown',
      fileDetails: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null
    });
    res.status(500).json({
      error: error.message || 'Error processing file',
      details: {
        phase: error.phase,
        apiError: error.response?.data?.error?.message
      }
    });
  }
});

router.post('/assistants/message', async (req, res) => {
  try {
    const { message, threadId, fileId, assistantId } = req.body;

    if (!message || !threadId || !fileId || !assistantId) {
      return res.status(400).json({ error: 'Message, threadId, fileId, and assistantId are required' });
    }

    const response = await assistantsService.generateResponse(threadId, assistantId, message, fileId);
    res.json({ response });
  } catch (error) {
    console.error('Error in assistants chat:', {
      error: error.message,
      status: error.status,
      type: error.type,
      response: error.response?.data,
      stack: error.stack,
      threadId,
      assistantId,
      messageLength: message?.length,
      hasFileId: !!fileId
    });
    res.status(500).json({
      error: error.message || 'Error generating response',
      details: {
        apiError: error.response?.data?.error?.message,
        threadId,
        assistantId
      }
    });
  }
});

export default router;
