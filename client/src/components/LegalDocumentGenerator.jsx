import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';

const LegalDocumentGenerator = () => {
  const { isDark } = useTheme();
  const [docName, setDocName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [law, setLaw] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const resultContainerRef = useRef(null);

  // Auto-scroll effect
  useEffect(() => {
    if (resultContainerRef.current && result) {
      resultContainerRef.current.scrollTop = resultContainerRef.current.scrollHeight;
    }
  }, [result]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult('');

    console.log('Submitting form with values:', { docName, purpose, law });

    try {
      console.log('Making API request...');
      const response = await axios.post('/api/generate-legal-document', {
        docName,
        purpose,
        law
      }, {
        responseType: 'text',
        onDownloadProgress: (progressEvent) => {
          const text = progressEvent.event.target.responseText;
          setResult(text);
        }
      });
    } catch (err) {
      console.error('API request failed:', err);
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'An error occurred while generating the document'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`h-full overflow-hidden ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
      <div className="max-w-6xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">Legal Document Generator</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">Document Name:</label>
            <input
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              className={`w-full p-2 border rounded ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              required
              placeholder="Enter document name"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Purpose:</label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className={`w-full p-2 border rounded ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              rows="3"
              required
              placeholder="Enter document purpose"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Applicable Law:</label>
            <textarea
              value={law}
              onChange={(e) => setLaw(e.target.value)}
              className={`w-full p-2 border rounded ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              rows="3"
              required
              placeholder="Enter applicable law"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full p-2 text-white rounded ${loading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
              }`}
          >
            {loading ? 'Generating...' : 'Generate Document'}
          </button>
        </form>

        {loading && (
          <div className="mt-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2">Generating document...</p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4">
            <h3 className="text-xl font-semibold mb-2">Generated Document:</h3>
            <div
              ref={resultContainerRef}
              className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg h-[calc(100vh-36rem)] overflow-auto`}
            >
              <div className={`${isDark ? 'bg-gray-900' : 'bg-white'} p-4 rounded-lg shadow-lg`}>
                <div className="legal-content">
                  <style>
                    {`
                      .legal-content {
                        font-family: 'Times New Roman', Times, serif;
                        line-height: 1.6;
                      }
                      .legal-content h1 {
                        font-size: 24px;
                        font-weight: bold;
                        margin-bottom: 16px;
                        border-bottom: 2px solid ${isDark ? '#4a5568' : '#e5e5e5'};
                        padding-bottom: 8px;
                      }
                      .legal-content h2 {
                        font-size: 20px;
                        font-weight: bold;
                        margin-top: 20px;
                        margin-bottom: 12px;
                      }
                      .legal-content h3 {
                        font-size: 18px;
                        font-weight: bold;
                        margin-top: 16px;
                        margin-bottom: 8px;
                      }
                      .legal-content p {
                        margin-bottom: 12px;
                      }
                      .legal-content ul, .legal-content ol {
                        margin-left: 24px;
                        margin-bottom: 12px;
                      }
                      .legal-content li {
                        margin-bottom: 6px;
                      }
                      .legal-content strong {
                        font-weight: 600;
                      }
                    `}
                  </style>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: result
                        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/^- (.*$)/gm, '<ul><li>$1</li></ul>')
                        .replace(/^(\d+)\. (.*$)/gm, '<ol><li>$2</li></ol>')
                        .replace(/\n\n/g, '</p><p>')
                        .replace(/^(.+)$/gm, function (match) {
                          if (!match.startsWith('<')) {
                            return '<p>' + match + '</p>';
                          }
                          return match;
                        })
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LegalDocumentGenerator;
