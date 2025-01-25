import React, { useState, useRef, useEffect } from 'react';
import { sendAssistantMessage, uploadFileToAssistants, createAssistantThread } from '../config/api';

const AssistantChat = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [files, setFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [threadId, setThreadId] = useState(null);
    const [assistantId, setAssistantId] = useState(null);
    const [error, setError] = useState(null);
    const [isRateReport, setIsRateReport] = useState(false);
    const messagesEndRef = useRef(null);
    const [currentMessage, setCurrentMessage] = useState('');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleFileUpload = async (e) => {
        const uploadedFiles = Array.from(e.target.files);
        setFiles([...files, ...uploadedFiles]);
    };

    useEffect(() => {
        const initializeThread = async () => {
            try {
                const type = isRateReport ? 'rate' : 'chat';
                const response = await createAssistantThread(type);
                if (response?.threadId && response?.assistantId) {
                    setThreadId(response.threadId);
                    setAssistantId(response.assistantId);
                    console.log('Thread initialized:', response);
                }
            } catch (error) {
                console.error('Error initializing thread:', error);
                setError(error.message);
            }
        };

        if (!threadId) {
            initializeThread();
        }
    }, [threadId, isRateReport]);

    const clearError = () => setError(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        clearError();
        if (!input.trim() && files.length === 0) return;

        setIsLoading(true);
        let cleanup = null;

        try {
            // Handle file upload first if there are files
            let fileId = null;
            if (files.length > 0) {
                const type = isRateReport ? 'rate' : 'chat';
                const uploadResponse = await uploadFileToAssistants(files[0], type);
                if (uploadResponse.success) {
                    fileId = uploadResponse.fileId;
                    setThreadId(uploadResponse.threadId);
                    setAssistantId(uploadResponse.assistantId);
                }
            }

            // Add user message
            setMessages(prev => [...prev, {
                role: 'user',
                content: input,
                files: files.map(f => f.name)
            }]);

            // Reset current message for streaming
            setCurrentMessage('');

            // Add placeholder assistant message
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '',
                streaming: true
            }]);

            // Stream the response
            cleanup = await sendAssistantMessage(
                input,
                threadId,
                assistantId,
                fileId,
                {
                    textCreated: () => {
                        console.log('Assistant started responding');
                    },
                    textDelta: (data) => {
                        setCurrentMessage(prev => prev + (data.value || ''));
                        // Update streaming message
                        setMessages(prev => {
                            const newMessages = [...prev];
                            const lastMessage = newMessages[newMessages.length - 1];
                            if (lastMessage.streaming) {
                                lastMessage.content = currentMessage + (data.value || '');
                            }
                            return newMessages;
                        });
                    },
                    toolCallCreated: (data) => {
                        console.log('Tool call created:', data);
                        if (data.type === 'code_interpreter') {
                            setMessages(prev => [...prev, {
                                role: 'code',
                                content: '',
                                streaming: true
                            }]);
                        }
                    },
                    toolCallDelta: (data) => {
                        if (data.type === 'code_interpreter' && data.code_interpreter?.input) {
                            setMessages(prev => {
                                const newMessages = [...prev];
                                const lastMessage = newMessages[newMessages.length - 1];
                                if (lastMessage.role === 'code' && lastMessage.streaming) {
                                    lastMessage.content += data.code_interpreter.input;
                                }
                                return newMessages;
                            });
                        }
                    },
                    error: (error) => {
                        setError(error.message);
                        setIsLoading(false);
                    },
                    done: () => {
                        // Update the last message with complete content
                        setMessages(prev => {
                            const newMessages = [...prev];
                            const lastMessage = newMessages[newMessages.length - 1];
                            if (lastMessage.streaming) {
                                lastMessage.streaming = false;
                            }
                            return newMessages;
                        });
                        setCurrentMessage('');
                        setIsLoading(false);
                    }
                }
            );

            setInput('');
            setFiles([]);
        } catch (error) {
            console.error('Error sending message:', error);
            setError(error.message);
            setIsLoading(false);
        }

        return () => {
            if (cleanup) cleanup();
        };
    };

    return (
        <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                    <button
                        className="absolute top-0 bottom-0 right-0 px-4 py-3"
                        onClick={clearError}
                    >
                        <span className="sr-only">Dismiss</span>
                        <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <title>Close</title>
                            <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" />
                        </svg>
                    </button>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
                <h2 className="text-2xl font-bold mb-4">AI Assistant</h2>
                <p className="text-gray-600 mb-4">
                    Upload files and chat with an AI assistant that can analyze documents.
                </p>
                <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={isRateReport}
                            onChange={(e) => setIsRateReport(e.target.checked)}
                            className="form-checkbox h-5 w-5 text-blue-600"
                        />
                        <span className="ml-2 text-gray-700">Rate Report Mode</span>
                    </label>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white rounded-lg shadow-lg p-6 mb-4">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
                    >
                        <div
                            className={`inline-block p-4 rounded-lg ${message.role === 'user'
                                    ? 'bg-blue-500 text-white'
                                    : message.role === 'code'
                                        ? 'bg-gray-800 text-green-400 font-mono'
                                        : 'bg-gray-100 text-gray-800'
                                }`}
                        >
                            <p style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
                            {message.files && message.files.length > 0 && (
                                <div className="text-sm mt-2">
                                    Files: {message.files.join(', ')}
                                </div>
                            )}
                            {message.streaming && (
                                <span className="inline-block animate-pulse">▊</span>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6">
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                        Upload Files
                    </label>
                    <input
                        type="file"
                        onChange={handleFileUpload}
                        className="w-full p-2 border rounded"
                        accept=".pdf,.txt,.doc,.docx"
                    />
                    {files.length > 0 && (
                        <div className="mt-2 text-sm text-gray-600">
                            Selected files: {files.map(f => f.name).join(', ')}
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 p-2 border rounded"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`px-4 py-2 rounded ${isLoading
                                ? 'bg-gray-400'
                                : 'bg-blue-500 hover:bg-blue-600'
                            } text-white`}
                    >
                        {isLoading ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AssistantChat;
