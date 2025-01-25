import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment variables
export const PORT = process.env.PORT || 4006;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const SUPABASE_CONFIG = {
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY
};

export function configureServer(app) {
  // Serve static files from public directory
  app.use(express.static(path.join(__dirname, '../public')));
  // Basic middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  
  // CORS configuration
  app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'content-type'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 86400
  }));

  return app;
}
