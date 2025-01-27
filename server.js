import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import pdfRoutes from './routes/pdfRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import tavilyRoutes from './routes/tavilyRoutes.js';
import pdrRoutes from './routes/pdrRoutes.js';
import assistantChatRoutes from './routes/assistantChatRoutes.js';
import chatInterfaceRoutes from './routes/chatInterfaceRoutes.js';
import { performCaseLawResearch, generateLegalDocument } from './services/wordwareService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment variables
export const PORT = process.env.PORT || 4006;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const SUPABASE_CONFIG = {
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY
};

function validateEnvironmentVariables() {
  // Log all OpenAI-related environment variables
  console.log('Environment variables at server startup:', {
    NODE_ENV: process.env.NODE_ENV,
    // OpenAI variables
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '[REDACTED]' : undefined,
    OPENAI_ASSISTANT_ID: process.env.OPENAI_ASSISTANT_ID,
    OPENAI_VECTORSTORE_ID: process.env.OPENAI_VECTORSTORE_ID,
    OPENAI_RATING_ASSISTANT_ID: process.env.OPENAI_RATING_ASSISTANT_ID,
    OPENAI_RATING_VECTORSTORE_ID: process.env.OPENAI_RATING_VECTORSTORE_ID,
    // Check if any Vite variables are present
    VITE_OPENAI_ASSISTANT_ID: process.env.VITE_OPENAI_ASSISTANT_ID,
    VITE_OPENAI_VECTORSTORE_ID: process.env.VITE_OPENAI_VECTORSTORE_ID
  });

  const requiredVars = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_ASSISTANT_ID: process.env.OPENAI_ASSISTANT_ID,
    OPENAI_VECTORSTORE_ID: process.env.OPENAI_VECTORSTORE_ID,
    OPENAI_RATING_ASSISTANT_ID: process.env.OPENAI_RATING_ASSISTANT_ID,
    OPENAI_RATING_VECTORSTORE_ID: process.env.OPENAI_RATING_VECTORSTORE_ID,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
  };

  const missingVars = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate OpenAI IDs format
  const idValidation = {
    OPENAI_ASSISTANT_ID: /^asst_[a-zA-Z0-9]+$/,
    OPENAI_VECTORSTORE_ID: /^vs_[a-zA-Z0-9]+$/,
    OPENAI_RATING_ASSISTANT_ID: /^asst_[a-zA-Z0-9]+$/,
    OPENAI_RATING_VECTORSTORE_ID: /^vs_[a-zA-Z0-9]+$/
  };

  const invalidIds = Object.entries(idValidation)
    .filter(([key, pattern]) => !pattern.test(requiredVars[key]))
    .map(([key]) => key);

  if (invalidIds.length > 0) {
    throw new Error(`Invalid format for environment variables: ${invalidIds.join(', ')}`);
  }
}

export function configureServer(app) {
  // Validate environment variables before starting server
  validateEnvironmentVariables();

  // Configure CORS
  app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }));

  // Serve static files from public directory
  app.use(express.static(path.join(__dirname, '../public')));
  // Basic middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, 'uploads');
  const uploadFilesDir = path.join(uploadsDir, 'files');
  const uploadThreadsDir = path.join(uploadsDir, 'threads');

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }
  if (!fs.existsSync(uploadFilesDir)) {
    fs.mkdirSync(uploadFilesDir);
  }
  if (!fs.existsSync(uploadThreadsDir)) {
    fs.mkdirSync(uploadThreadsDir);
  }

  // Request logging middleware
  app.use((req, res, next) => {
    const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    req.requestId = requestId;

    console.log(`[${new Date().toISOString()}] Request ${requestId}:`, {
      method: req.method,
      url: req.url,
      query: req.query,
      body: req.method === 'POST' ? {
        ...req.body,
        file: req.file ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        } : undefined
      } : undefined,
      headers: {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']
      }
    });

    // Track response
    const oldJson = res.json;
    res.json = function (data) {
      console.log(`[${new Date().toISOString()}] Response ${requestId}:`, {
        status: res.statusCode,
        data: data
      });
      return oldJson.apply(res, arguments);
    };

    next();
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Global error handler:', {
      error: err.message,
      status: err.status || 500,
      type: err.type,
      response: err.response?.data,
      stack: err.stack,
      path: req.path,
      method: req.method,
      query: req.query,
      body: req.body,
      headers: req.headers
    });

    // Handle OpenAI API errors
    if (err.response?.data?.error) {
      return res.status(err.response.status || 500).json({
        error: err.response.data.error.message || err.message,
        type: err.response.data.error.type,
        code: err.response.data.error.code
      });
    }

    // Handle other API errors
    if (err.status) {
      return res.status(err.status).json({
        error: err.message,
        type: err.type
      });
    }

    // Default error response
    res.status(500).json({
      error: err.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  // Register routes
  app.use('/api/pdf', pdfRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/tavily', tavilyRoutes);
  app.use('/api/pdr', pdrRoutes);
  app.use('/api/chat/assistants', assistantChatRoutes);
  app.use('/api/chat-interface', chatInterfaceRoutes);

  // Legal Document Generation endpoint
  app.post('/api/generate-legal-document', async (req, res) => {
    const { docName, purpose, law } = req.body;

    try {
      // Set up SSE headers for streaming
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Generate document using wordwareService
      await generateLegalDocument(docName, purpose, law, (chunk) => {
        res.write(chunk);
      });

      res.end();
    } catch (error) {
      console.error('Legal document generation error:', {
        error: error.message,
        status: error.status || 500,
        type: error.type,
        response: error.response?.data,
        stack: error.stack,
        docDetails: {
          name: docName,
          purpose,
          lawLength: law?.length
        }
      });
      res.status(error.status || 500).json({
        error: error.message || 'Error generating legal document',
        details: {
          type: error.type,
          apiError: error.response?.data?.error?.message
        }
      });
    }
  });

  // Case Law Research endpoint
  app.post('/case-law-research', async (req, res) => {
    const { query, jurisdiction, timeFrame, sources, includeKeywords, excludeKeywords } = req.body;

    try {
      // Set up SSE headers
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Stream results back to client
      await performCaseLawResearch(
        query,
        jurisdiction,
        timeFrame,
        sources,
        includeKeywords,
        excludeKeywords,
        (chunk) => {
          res.write(JSON.stringify(chunk) + '\n');
        }
      );

      res.end();
    } catch (error) {
      console.error('Case law research error:', {
        error: error.message,
        status: error.status || 500,
        type: error.type,
        response: error.response?.data,
        stack: error.stack,
        searchParams: {
          jurisdiction,
          timeFrame,
          sourcesCount: sources?.length,
          includeKeywordsCount: includeKeywords?.length,
          excludeKeywordsCount: excludeKeywords?.length
        }
      });
      res.status(error.status || 500).json({
        error: error.message || 'Error performing case law research',
        details: {
          type: error.type,
          apiError: error.response?.data?.error?.message
        }
      });
    }
  });

  return app;
}

const app = express();
configureServer(app);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
