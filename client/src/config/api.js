import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4006/api';

const api = axios.create({
  baseURL,
  withCredentials: true
});

// Add request interceptor to handle different content types

// Add request interceptor to handle different content types
api.interceptors.request.use(config => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
    config.headers['Accept'] = 'application/json';
  } else {
    config.headers['Content-Type'] = 'application/json';
    config.headers['Accept'] = 'application/json';
    if (typeof config.data === 'object') {
      config.data = JSON.stringify(config.data);
    }
  }
  return config;
});

// Handle API errors
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    throw new Error(`API Error: ${error.response?.data?.error || error.message}`);
  }
);

// Process PDF and create thread
export const uploadFileToAssistants = async (formData, type = 'rate') => {
  try {
    // Add message for medical report analysis if not already present
    if (type === 'rate' && !formData.get('message')) {
      formData.append('message', 'Please analyze this medical report and provide a summary focusing on: 1) Patient demographics and history 2) Key medical findings and diagnoses 3) Impairment ratings and WPI values 4) Work restrictions and limitations 5) Treatment recommendations.');
    }

    // Add type and tool parameters
    formData.append('type', type);
    formData.append('tool', 'file_search');  // Use file_search for vector search capability

    const response = await api.post('/chat/assistants/upload', formData);
    return response.data;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};
// Send message to assistant
export const sendAssistantMessage = async (message, threadId, assistantId, fileId = null) => {
  try {
    // Validate required parameters
    if (!threadId) throw new Error('Thread ID is required');
    if (!message && !fileId) throw new Error('Either message or file is required');

    const response = await api.post('/chat/assistants/message', {
      message,
      threadId,
      assistantId,
      fileId
    });

    return response.data;
  } catch (error) {
    console.error('Error sending message to assistant:', error);
    throw new Error(`Error sending message to assistant: ${error.response?.data?.error || error.message}`);
  }
};

// Legacy support for old API
export const sendMessage = async (message, provider = 'openai', context = null) => {
  try {
    const response = await api.post('/chat', {
      message,
      provider,
      context
    });
    return response.data.response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw new Error(`Error sending message: ${error.response?.data?.error || error.message}`);
  }
};

// Extract text from PDF
export const extractTextFromPDF = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/pdf/extract-text', formData);
    return response.data;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Error extracting text from PDF: ${error.response?.data?.error || error.message}`);
  }
};

// Calculate PDR ratings
export const calculatePDRRatings = async (data) => {
  try {
    const response = await api.post('/pdr/calculate-rating', data);
    return response.data;
  } catch (error) {
    console.error('Error calculating PDR ratings:', error);
    throw new Error(`Error calculating PDR ratings: ${error.response?.data?.error || error.message}`);
  }
};

// Create a new assistant thread
export const createAssistantThread = async (type = 'chat', tool = 'file_search') => {
  try {
    const response = await api.post('/chat/assistants/create-thread', { type, tool });
    return response.data;
  } catch (error) {
    console.error('Error creating assistant thread:', error);
    throw error;
  }
};

export const uploadFileForSearch = async (formData) => {
  const response = await api.post('/chat/file/upload', formData);
  return response.data;
};

export const searchAndSummarize = async (query, fileId, sessionId) => {
  const response = await api.post('/chat/file/search', { query, fileId, sessionId });
  return response.data.response;
};

export const API_URL = baseURL;
export default api;
