import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import api, { sendMessage, extractTextFromPDF, uploadFileToAssistants, sendAssistantMessage } from '../config/api';

const formatAIResponse = (message) => {
  if (!message) return '';

  // Handle string input
  if (typeof message === 'string') {
    return formatTextResponse(message);
  }

  let textContent = '';
  let annotations = [];

  // Handle OpenAI assistant message format
  if (message.role === 'assistant' && message.content && Array.isArray(message.content)) {
    const content = message.content[0];
    if (content?.type === 'text') {
      textContent = content.text.value || '';
      annotations = content.text.annotations || [];
    }
  }
  // Handle legacy assistant message format
  else if (message.content && Array.isArray(message.content)) {
    textContent = message.content[0]?.text?.value || '';
    annotations = message.content[0]?.text?.annotations || [];
  }
  // Handle plain text response
  else if (typeof message === 'string') {
    textContent = message;
  }

  if (!textContent) return '';

  // Process text with annotations
  let formattedText = textContent;

  // Sort annotations by start_index in descending order to process from end to start
  if (annotations.length > 0) {
    annotations.sort((a, b) => b.start_index - a.start_index);

    // Replace citations with styled spans
    annotations.forEach(annotation => {
      if (annotation.type === 'file_citation') {
        const citationText = textContent.substring(annotation.start_index, annotation.end_index);
        const replacement = `<span class="citation" title="File citation">${citationText}</span>`;
        formattedText = formattedText.substring(0, annotation.start_index) +
          replacement +
          formattedText.substring(annotation.end_index);
      }
    });
  }

  return formatTextResponse(formattedText);
};

const formatTextResponse = (text) => {
  if (!text) return '';
  const lines = text.split('\n');
  let formattedHtml = '';
  let inSubSection = false;
  let indentLevel = 0;

  lines.forEach(line => {
    const cleanLine = line.trim();

    if (cleanLine === '') {
      formattedHtml += '<br/>';
      return;
    }

    // Handle main section headers (numbered sections)
    if (cleanLine.match(/^\d+\.\s+[A-Z]/)) {
      if (inSubSection) {
        formattedHtml += '</div>';
        inSubSection = false;
      }
      const headingText = cleanLine.replace(/^\d+\.\s+/, '');
      formattedHtml += `
        <div class="mt-8 mb-6">
          <div class="flex items-center">
            <span class="text-2xl font-bold text-blue-600 dark:text-blue-400 mr-3">${cleanLine.split('.')[0]}.</span>
            <h2 class="text-xl font-bold tracking-wide text-gray-900 dark:text-gray-100">${headingText}</h2>
          </div>
          <div class="mt-2 border-b border-gray-200 dark:border-gray-700"></div>
        </div>`;
      indentLevel = 0;
      return;
    }

    // Handle key-value pairs - only if the line starts with a key pattern
    if (cleanLine.match(/^[A-Za-z][A-Za-z\s-]*:/) && !cleanLine.match(/^https?:/)) {
      const colonIndex = cleanLine.indexOf(':');
      const key = cleanLine.substring(0, colonIndex).trim();
      const value = cleanLine.substring(colonIndex + 1).trim();
      const indent = line.match(/^\s*/)[0].length;

      // Adjust indent level based on spacing
      if (indent > indentLevel) {
        formattedHtml += '<div class="ml-4">';
        inSubSection = true;
      } else if (indent < indentLevel && inSubSection) {
        formattedHtml += '</div>';
        inSubSection = false;
      }
      indentLevel = indent;

      formattedHtml += `
        <div class="mb-3 p-2 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <span class="font-semibold text-sm uppercase tracking-wide text-gray-700 dark:text-gray-300">${key}:</span>
          <span class="ml-2 text-sm text-gray-600 dark:text-gray-400">${value}</span>
        </div>`;
      return;
    }

    // Handle lines that have colons but aren't key-value pairs (like URLs or regular text)
    if (cleanLine.includes(':')) {
      formattedHtml += `<p class="mb-2 ${indentLevel > 0 ? 'ml-4' : ''} text-gray-700 dark:text-gray-300 leading-relaxed">${cleanLine}</p>`;
      return;
    }

    // Handle bold text with **
    if (cleanLine.match(/\*\*.*\*\*/)) {
      const boldText = cleanLine.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>');
      formattedHtml += `<p class="mb-2 ${indentLevel > 0 ? 'ml-4' : ''} text-gray-800 dark:text-gray-200 leading-relaxed text-lg">${boldText}</p>`;
      return;
    }

    // Handle bullet points
    if (cleanLine.startsWith('-')) {
      const bulletText = cleanLine.substring(1).trim();
      formattedHtml += `
        <div class="mb-3 ml-6">
          <div class="flex items-start">
            <span class="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-500 dark:bg-gray-400 flex-shrink-0"></span>
            <p class="text-gray-700 dark:text-gray-300 leading-relaxed">${bulletText}</p>
          </div>
        </div>`;
      return;
    }

    // Handle regular text
    formattedHtml += `<p class="mb-2 ${indentLevel > 0 ? 'ml-4' : ''} text-gray-700 dark:text-gray-300 leading-relaxed">${cleanLine}</p>`;
  });

  // Close any open subsections
  if (inSubSection) {
    formattedHtml += '</div>';
  }

  return formattedHtml;
};


function ChatInterface() {
  const { isDark, theme, animations } = useTheme();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [context, setContext] = useState('');
  const [selectedModel, setSelectedModel] = useState('assistant');
  const [age, setAge] = useState('');
  const [occupation, setOccupation] = useState('');
  const [threadId, setThreadId] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [assistantId, setAssistantId] = useState(null);

  const models = [
    { id: 'openai', name: 'OpenAI o1' },
    { id: 'anthropic', name: 'Claude 3.5 Sonnet' },
    { id: 'gemini', name: 'Google Gemini' },
    { id: 'assistant', name: 'Medical Report Assistant' }
  ];

  const handleFileChange = async (event) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];

      // Validate file size (50MB limit)
      if (selectedFile.size > 50 * 1024 * 1024) {
        setMessages(prev => [...prev, {
          text: 'Error: File size must be less than 50MB',
          sender: 'error'
        }]);
        return;
      }

      setFile(selectedFile);
      setIsUploading(true);
      setMessages(prev => [...prev, {
        text: 'Processing medical report...',
        sender: 'system'
      }]);

      try {
        if (selectedModel === 'assistant') {
          // Use the assistants API
          const formData = new FormData();
          formData.append('file', selectedFile);
          const result = await uploadFileToAssistants(formData, true);
          setThreadId(result.threadId);
          setFileId(result.fileId);
          setAssistantId(result.assistantId);
          setContext(result);

          // Use the summary from the initial response
          if (result.summary) {
            setMessages(prev => [...prev, {
              text: 'Medical report processed. Here is the initial analysis:',
              sender: 'system'
            }, {
              text: result.summary,
              sender: 'ai'
            }]);
          }

        } else if (selectedModel === 'anthropic') {
          // For Anthropic, send raw file as base64
          const reader = new FileReader();
          reader.onloadend = async () => {
            // Remove data URL prefix and get pure base64
            const base64String = reader.result.replace(/^data:application\/pdf;base64,/, '');
            setContext({ base64: base64String }); // Set context as an object with base64 property

            // Process with Anthropic
            const contextObj = { base64: base64String };
            const response = await sendMessage(
              "Please provide both a summary analysis and PD ratings for this medical report. Include a structured overview with bullet points for injuries, medical findings, and recommendations, followed by detailed PD calculations for each affected body part.",
              selectedModel,
              contextObj
            );

            // Display initial summary
            setMessages(prev => [...prev, {
              text: 'Medical report processed. Here is the initial analysis:',
              sender: 'system'
            }, {
              text: response,
              sender: 'ai'
            }]);

            // Extract age and occupation
            const extractionResponse = await sendMessage(
              "Please extract the patient's age and occupation from this report. Return only a JSON object in this exact format: { \"age\": number, \"occupation\": string }",
              selectedModel,
              contextObj
            );

            try {
              const extractedData = JSON.parse(extractionResponse);
              if (extractedData.age) setAge(extractedData.age);
              if (extractedData.occupation) setOccupation(extractedData.occupation);
            } catch (error) {
              console.error('Error extracting age/occupation:', error);
            }
          };
          reader.readAsDataURL(selectedFile);
        } else {
          // For OpenAI and Gemini, send file directly
          const formData = new FormData();
          formData.append('file', selectedFile);
          formData.append('provider', selectedModel);
          formData.append('message', "Please provide both a summary analysis and PD ratings for this medical report. Include a structured overview with bullet points for injuries, medical findings, and recommendations, followed by detailed PD calculations for each affected body part.");

          const response = await api.post('/chat', formData);
          const extractedText = response.data.response;
          setContext(extractedText);

          // Display initial summary
          setMessages(prev => [...prev, {
            text: 'Medical report processed. Here is the initial analysis:',
            sender: 'system'
          }, {
            text: response.data.response,
            sender: 'ai'
          }]);

          // Extract age and occupation
          const extractionFormData = new FormData();
          extractionFormData.append('file', selectedFile);
          extractionFormData.append('provider', selectedModel);
          extractionFormData.append('message', "Please extract the patient's age and occupation from this report. Return only a JSON object in this exact format: { \"age\": number, \"occupation\": string }");

          const extractionResponse = await api.post('/chat', extractionFormData);

          try {
            // Parse the response from the JSON string
            const extractedData = JSON.parse(extractionResponse.data.response);
            if (extractedData.age) setAge(extractedData.age);
            if (extractedData.occupation) setOccupation(extractedData.occupation);
          } catch (error) {
            console.error('Error extracting age/occupation:', error);
          }
        }
      } catch (error) {
        console.error('Error processing file:', error);
        let errorMessage = 'Error processing file: ';
        if (error.response?.data?.error) {
          errorMessage += error.response.data.error;
        } else if (error.message) {
          errorMessage += error.message;
        } else {
          errorMessage += 'Unknown error occurred';
        }
        setMessages(prev => [...prev, {
          text: errorMessage,
          sender: 'error'
        }]);
        setFile(null);
        setContext('');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSubmit = async (e, overrideMessage = null) => {
    e?.preventDefault();

    const messageText = overrideMessage || inputText;
    if (!messageText.trim()) return;

    if (!overrideMessage) {
      setInputText('');
    }

    setMessages(prev => [...prev, {
      text: messageText,
      sender: 'user'
    }]);

    setIsLoading(true);

    try {
      if (selectedModel === 'assistant') {
        if (!threadId || !fileId || !assistantId) {
          throw new Error('Please upload a medical report first');
        }
      } else if (!context) {
        throw new Error('Please upload a medical report first');
      }

      // Regular question about the medical report
      let response;
      if (selectedModel === 'openai' || selectedModel === 'gemini') {
        // For OpenAI and Gemini, send file with message
        const formData = new FormData();
        formData.append('file', file);
        formData.append('provider', selectedModel);
        formData.append('message', messageText);
        const result = await api.post('/chat', formData);
        response = result.data.response;
      } else {
        // For Anthropic
        if (selectedModel === 'anthropic') {
          response = await sendMessage(messageText, selectedModel, context);
        } else {
          // For Assistant
          const result = await api.post('/chat-interface/thread/messages', {
            message: messageText,
            threadId,
            assistantId,
            fileId
          });
          // Get the last assistant message from the messages array
          const messages = result.data.messages;
          const assistantMessage = messages.find(msg => msg.role === 'assistant');
          if (!assistantMessage) {
            throw new Error('No assistant response found');
          }

          // Log the message structure for debugging
          console.log('Assistant message structure:', assistantMessage);

          if (!assistantMessage.content?.[0]?.text?.value) {
            throw new Error('Invalid message format received');
          }

          response = assistantMessage.content[0].text.value;
        }
      }
      setMessages(prev => [...prev, {
        text: response,
        sender: 'ai'
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        text: `Error: ${error.response?.data?.error || error.message}`,
        sender: 'error'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>Medical Report Analysis</h2>

      {/* Controls Section */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-6 mb-4 flex-shrink-0">
        <div>
          <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-2`}>Model</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className={`w-full py-2 px-4 border ${isDark
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
              } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
          >
            {models.map(model => (
              <option key={model.id} value={model.id}>{model.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-2`}>Age</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Enter age"
            className={`w-full py-2 px-4 border ${isDark
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
              } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
          />
        </div>

        <div>
          <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-2`}>Occupation</label>
          <input
            type="text"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            placeholder="Enter occupation"
            className={`w-full py-2 px-4 border ${isDark
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
              } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
          />
        </div>

        <div>
          <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-2`}>Upload File</label>
          <div className="relative">
            <input
              type="file"
              onChange={handleFileChange}
              disabled={isUploading}
              className={`w-full py-2 px-4 border ${isDark
                ? 'bg-gray-700 border-gray-600 text-white file:text-gray-200 file:bg-gray-600'
                : 'bg-white border-gray-300 text-gray-900'
                } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            />
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-md">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="rounded-full h-6 w-6 border-t-2 border-b-2 border-white"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Messages Section */}
      <div
        className={`${isDark ? 'bg-gray-800/80 backdrop-blur-sm' : 'bg-gray-50'} rounded-lg p-4 flex-1 overflow-y-auto scroll-smooth`}
        style={{
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          transition: animations.transition.normal
        }}
      >
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className={`mb-4 ${message.sender === 'user' ? 'flex justify-end' : 'flex justify-start'}`}
            >
              <motion.div
                whileHover={{ scale: 1.01 }}
                className={`max-w-full sm:max-w-[98%] rounded-lg p-2 relative ${message.sender === 'user'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white ml-4 backdrop-blur-sm'
                  : isDark
                    ? 'bg-gray-900/90 border-gray-700 text-gray-200 backdrop-blur-sm'
                    : 'bg-white'
                  }`}
                style={{
                  boxShadow: theme.shadow.md,
                  border: message.sender !== 'user' ? `1px solid ${theme.border}` : 'none',
                  transition: animations.transition.normal
                }}
              >
                {message.sender === 'ai' && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      navigator.clipboard.writeText(message.text)
                        .then(() => {
                          const button = document.activeElement;
                          if (button) {
                            const originalTitle = button.getAttribute('title');
                            button.setAttribute('title', 'Copied!');
                            setTimeout(() => {
                              button.setAttribute('title', originalTitle);
                            }, 1500);
                          }
                        })
                        .catch(err => console.error('Failed to copy text:', err));
                    }}
                    className={`absolute top-2 right-2 p-1.5 ${isDark
                      ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      } rounded-md`}
                    style={{ transition: animations.transition.fast }}
                    title="Copy to clipboard"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </motion.button>
                )}
                <div className={`text-sm ${message.sender === 'user' ? 'text-white' : isDark ? 'text-gray-200' : 'text-gray-800'} citations-container`}>
                  {message.sender === 'error' ? (
                    <div className="text-red-500">{message.text}</div>
                  ) : (
                    <div
                      className={isDark ? 'dark-mode-content' : ''}
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatAIResponse(message.text)) }}
                    />
                  )}
                </div>
              </motion.div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center items-center py-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="rounded-full h-8 w-8 border-t-2 border-b-2"
                style={{
                  borderColor: theme.primary.main
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Section */}
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => handleSubmit(null, "Please provide a summary analysis of the medical report.")}
          className={`px-4 py-2 text-sm rounded-md ${isDark
            ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
        >
          Get Summary
        </button>
        <button
          onClick={() => handleSubmit(null, "Please calculate and display PD ratings for all affected body parts.")}
          className={`px-4 py-2 text-sm rounded-md ${isDark
            ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
        >
          Calculate PD Ratings
        </button>
        <button
          onClick={() => handleSubmit(null, "Please provide both a summary analysis and PD ratings for this medical report.")}
          className={`px-4 py-2 text-sm rounded-md ${isDark
            ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
        >
          Full Analysis
        </button>
      </div>

      {/* Input Form */}
      <motion.form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-4 flex-shrink-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask a question about the medical report..."
          className={`flex-1 py-3 px-4 border ${isDark
            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
          disabled={isLoading}
        />
        <motion.button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
          style={{
            boxShadow: theme.shadow.md,
            transition: animations.transition.normal
          }}
        >
          Send
        </motion.button>
      </motion.form>
    </div>
  );
}

export default ChatInterface;
