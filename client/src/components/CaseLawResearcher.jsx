import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import api from '../config/api';

function CaseLawResearcher() {
  const { isDark } = useTheme();
  const [query, setQuery] = useState('');
  const [jurisdiction, setJurisdiction] = useState('California');
  const [timeFrame, setTimeFrame] = useState('2010-2024');
  const [sources, setSources] = useState('Case Law, Statutes');
  const [includeKeywords, setIncludeKeywords] = useState('');
  const [excludeKeywords, setExcludeKeywords] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults([]);

    try {
      const response = await api.post('/case-law-research', {
        query,
        jurisdiction,
        timeFrame,
        sources,
        includeKeywords,
        excludeKeywords
      }, {
        responseType: 'text',
        onDownloadProgress: (progressEvent) => {
          const text = progressEvent.event.target.responseText;
          if (!text) return;

          const lines = text.split('\n').filter(line => line.trim());

          const newResults = lines.map(line => {
            try {
              const parsed = JSON.parse(line);
              return parsed.results?.[0];
            } catch (e) {
              if (line.trim()) {
                console.error('Error parsing line:', e);
                console.log('Problematic line:', line);
              }
              return null;
            }
          }).filter(Boolean);

          setResults(prevResults => {
            const uniqueResults = [...(prevResults || [])];
            newResults.forEach(newResult => {
              if (newResult && !uniqueResults.some(r => r.url === newResult.url)) {
                uniqueResults.push(newResult);
              }
            });
            return uniqueResults;
          });
        }
      });
    } catch (error) {
      console.error('Error fetching results:', error);
      const errorMessage = error.response?.data?.error || error.message || 'An error occurred while fetching results';
      setResults([{ error: errorMessage }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`h-full overflow-hidden ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
      <div className="max-w-6xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">Case Law & Statute Researcher</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">Query:</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`w-full p-2 border rounded ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              required
              placeholder="Enter your search query"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Jurisdiction:</label>
            <input
              type="text"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              className={`w-full p-2 border rounded ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              placeholder="California"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Time Frame:</label>
            <input
              type="text"
              value={timeFrame}
              onChange={(e) => setTimeFrame(e.target.value)}
              className={`w-full p-2 border rounded ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              placeholder="2010-2024"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Sources:</label>
            <input
              type="text"
              value={sources}
              onChange={(e) => setSources(e.target.value)}
              className={`w-full p-2 border rounded ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              placeholder="Case Law, Statutes"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Keywords to Include:</label>
            <input
              type="text"
              value={includeKeywords}
              onChange={(e) => setIncludeKeywords(e.target.value)}
              className={`w-full p-2 border rounded ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Keywords to Exclude:</label>
            <input
              type="text"
              value={excludeKeywords}
              onChange={(e) => setExcludeKeywords(e.target.value)}
              className={`w-full p-2 border rounded ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              placeholder="Enter keywords to exclude (optional)"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className={`w-full p-2 text-white rounded ${loading || !query ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
              }`}
            disabled={loading || !query}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {loading && (
          <div className="mt-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2">Searching for relevant cases...</p>
          </div>
        )}

        {!loading && results && (
          <div className="mt-4">
            <h3 className="text-xl font-semibold mb-2">Results:</h3>
            <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg max-h-[calc(100vh-36rem)] overflow-y-auto`}>
              {results.error && <p className="text-red-500">{results.error}</p>}
              {!results.error && Array.isArray(results) && results.length === 0 && (
                <p>No results found</p>
              )}
              {!results.error && Array.isArray(results) && results.length > 0 && (
                <div className="space-y-4">
                  {results.map((result, index) => (
                    <div key={index} className={`${isDark ? 'bg-gray-900' : 'bg-white'} p-4 rounded-lg shadow-lg`}>
                      <h4 className="text-lg font-semibold text-blue-500 mb-2">{result.title}</h4>
                      <div className="mb-2">
                        <a href={result.url} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-blue-500 hover:underline break-all">
                          {result.url}
                        </a>
                      </div>
                      {result.publishedAt && (
                        <p className="text-sm opacity-75 mb-3">
                          Published: {new Date(result.publishedAt).toLocaleDateString()}
                        </p>
                      )}
                      {result.excerpts && (
                        <div className="text-sm">
                          <p className="font-medium mb-1">Excerpts:</p>
                          <p className="whitespace-pre-wrap break-words">{result.excerpts}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CaseLawResearcher;
