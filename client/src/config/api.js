import axios from 'axios';

const baseURL = process.env.NODE_ENV === 'production'
  ? '/api'
  : 'http://localhost:4006/api';

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

// Create a new assistant chat session
export const createAssistantThread = async (type = 'chat') => {
  try {
    const response = await api.post('/chat/assistants/create-thread', { type });
    return response.data;
  } catch (error) {
    console.error('Error creating assistant thread:', error);
    throw new Error(`Error creating assistant thread: ${error.response?.data?.error || error.message}`);
  }
};

// Upload file and create session
export const uploadFileToAssistants = async (formData, type = 'rate') => {
  try {
    // Add assistant type to form data
    formData.append('type', type);

    const response = await api.post('/chat/assistants/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Send message with streaming response
export const sendAssistantMessage = async (message, threadId, assistantId, fileId = null, onEvent = {}) => {
  try {
    // Validate required parameters
    if (!threadId) throw new Error('Thread ID is required');
    if (!assistantId) throw new Error('Assistant ID is required');
    if (!message && !fileId) throw new Error('Either message or file is required');

    // Create EventSource for streaming response
    const params = new URLSearchParams({
      threadId,
      assistantId,
      ...(message && { message }),
      ...(fileId && { fileId })
    });

    const eventSource = new EventSource(`${baseURL}/assistants/message?${params}`);

    // Handle different event types
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onEvent.message?.(data);
    };

    eventSource.addEventListener('textCreated', () => {
      onEvent.textCreated?.();
    });

    eventSource.addEventListener('textDelta', (event) => {
      const data = JSON.parse(event.data);
      onEvent.textDelta?.(data);
    });

    eventSource.addEventListener('toolCallCreated', (event) => {
      const data = JSON.parse(event.data);
      onEvent.toolCallCreated?.(data);
    });

    eventSource.addEventListener('toolCallDelta', (event) => {
      const data = JSON.parse(event.data);
      onEvent.toolCallDelta?.(data);
    });

    eventSource.addEventListener('error', (error) => {
      console.error('Stream error:', error);
      eventSource.close();
      onEvent.error?.(error);
    });

    eventSource.addEventListener('done', () => {
      eventSource.close();
      onEvent.done?.();
    });

    // Return cleanup function
    return () => {
      eventSource.close();
    };
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

export const API_URL = baseURL;
export default api;
