import React, { useState, useRef, useEffect } from 'react';
import api from '../config/api';

const AssistantChat = () => {
    const [messages, setMessages] = useState([]);
    const [files, setFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const clearError = () => setError(null);

    const handleResponse = async (response) => {
        if (response.content) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: response.content
            }]);
        }
    };

    const handleFileUpload = async (file) => {
        try {
            setIsLoading(true);
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await api.post('/chat/assistants/upload', formData);
            
            if (response.data.success && response.data.content) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: response.data.content
                }]);
            } else {
                throw new Error(response.data.error || 'Failed to process file');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const processFile = async (file) => {
        setIsLoading(true);
        clearError();

        try {
            // Add file upload message
            setMessages(prev => [...prev, {
                role: 'user',
                content: 'Please analyze this medical report.',
                files: [file.name]
            }]);

            await handleFileUpload(file);
        } catch (error) {
            console.error('Error processing file:', error);
            setError(error.message || 'Error processing file');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            processFile(file);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                    >
                        <div
                            className={`max-w-3xl rounded-lg p-4 font-mono whitespace-pre ${
                                message.role === 'assistant'
                                    ? 'bg-blue-100 dark:bg-blue-900 text-gray-800 dark:text-gray-200'
                                    : 'bg-green-100 dark:bg-green-900 text-gray-800 dark:text-gray-200'
                            }`}
                        >
                            {message.content}
                            {message.files && (
                                <div className="mt-2 text-sm text-gray-500">
                                    Files: {message.files.join(', ')}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                {error && (
                    <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded">
                        {error}
                    </div>
                )}
                <div className="flex items-center space-x-4">
                    <input
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf"
                        disabled={isLoading}
                        className="hidden"
                        id="file-upload"
                    />
                    <label
                        htmlFor="file-upload"
                        className={`flex-1 px-4 py-2 text-center rounded cursor-pointer ${
                            isLoading
                                ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                                : 'bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700'
                        } text-white font-medium transition-colors duration-200`}
                    >
                        {isLoading ? 'Processing...' : 'Upload Medical Report'}
                    </label>
                </div>
            </div>
        </div>
    );
};

export default AssistantChat;
