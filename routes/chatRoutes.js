import express from 'express';
import multer from 'multer';
import openaiService from '../services/openaiService.js';
import anthropicService from '../services/anthropicService.js';
import geminiService from '../services/geminiService.js';
import chatInterfaceService from '../services/chatInterfaceService.js';

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
        console.log('Calling Chat Interface service...');
        if (req.file) {
          // Process the uploaded file
          const { fileId, vectorStoreId } = await chatInterfaceService.processUploadedPDF({
            buffer: req.file.buffer,
            originalname: req.file.originalname
          });

          // Create a thread with initial message
          const thread = await chatInterfaceService.createThread(
            message || "Please analyze this document",
            vectorStoreId
          );

          // Set up SSE headers
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          });

          // Create streaming run
          const stream = await chatInterfaceService.createAndPollRun(thread.id);

          // Handle stream events
          stream.on('text', (data) => {
            if (data.type === 'text') {
              res.write(`data: ${JSON.stringify({ type: 'text', content: data.content })}\n\n`);
            } else if (data.type === 'delta') {
              res.write(`data: ${JSON.stringify({ type: 'delta', content: data.content })}\n\n`);
            }
          });

          stream.on('fileSearch', (results) => {
            res.write(`data: ${JSON.stringify({ type: 'fileSearch', content: results })}\n\n`);
          });

          stream.on('error', (error) => {
            res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
            res.end();
          });

          stream.on('end', () => {
            res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
            res.end();
          });

          // Send initial data
          res.write(`data: ${JSON.stringify({
            type: 'start',
            threadId: thread.id,
            fileId: fileId,
            vectorStoreId: vectorStoreId
          })}\n\n`);

          // Handle client disconnect
          req.on('close', () => {
            stream.removeAllListeners();
          });

          return; // Skip the normal JSON response
        } else {
          // For regular messages, we need a thread ID
          const { threadId, vectorStoreId } = req.body;
          if (!threadId) {
            throw new Error('Thread ID is required for chat messages');
          }

          // Add message to thread
          await chatInterfaceService.addMessageToThread(threadId, message, vectorStoreId);

          // Create and poll run
          const result = await chatInterfaceService.createAndPollRun(threadId);

          // Return messages
          response = result.messages;
        }
        console.log('Chat Interface response received');
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
      vectorStoreId: req.body.vectorStoreId
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

router.post('/chat-interface/upload', uploadMiddleware, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Process uploaded PDF
    const result = await chatInterfaceService.processUploadedPDF({
      buffer: req.file.buffer,
      originalname: req.file.originalname
    });

    // Create initial thread
    const thread = await chatInterfaceService.createThread(
      "Please analyze this document",
      result.vectorStoreId
    );

    // Return necessary IDs for future interactions
    res.json({
      fileId: result.fileId,
      threadId: thread.id,
      vectorStoreId: result.vectorStoreId
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

router.post('/chat-interface/message', async (req, res) => {
  try {
    const { message, threadId, vectorStoreId } = req.body;

    if (!message || !threadId) {
      return res.status(400).json({ error: 'Message and threadId are required' });
    }

    // Add message to thread
    await chatInterfaceService.addMessageToThread(threadId, message, vectorStoreId);

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Create streaming run
    const stream = await chatInterfaceService.createAndPollRun(threadId);

    // Handle stream events
    stream.on('text', (data) => {
      if (data.type === 'text') {
        res.write(`data: ${JSON.stringify({ type: 'text', content: data.content })}\n\n`);
      } else if (data.type === 'delta') {
        res.write(`data: ${JSON.stringify({ type: 'delta', content: data.content })}\n\n`);
      }
    });

    stream.on('fileSearch', (results) => {
      res.write(`data: ${JSON.stringify({ type: 'fileSearch', content: results })}\n\n`);
    });

    stream.on('error', (error) => {
      res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
      res.end();
    });

    stream.on('end', () => {
      res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
      res.end();
    });

    // Send initial data
    res.write(`data: ${JSON.stringify({
      type: 'start',
      threadId: threadId,
      vectorStoreId: vectorStoreId
    })}\n\n`);

    // Handle client disconnect
    req.on('close', () => {
      stream.removeAllListeners();
    });

    return; // Skip the normal JSON response
  } catch (error) {
    console.error('Error in chat interface message:', {
      error: error.message,
      status: error.status,
      type: error.type,
      response: error.response?.data,
      stack: error.stack,
      threadId,
      messageLength: message?.length,
      vectorStoreId
    });
    res.status(500).json({
      error: error.message || 'Error generating response',
      details: {
        apiError: error.response?.data?.error?.message,
        threadId,
        vectorStoreId
      }
    });
  }
});

export default router;
