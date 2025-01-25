import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';

function TavilyDocs() {
    const { isDark, theme } = useTheme();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [results, setResults] = useState(null);
    const [searchOptions, setSearchOptions] = useState({
        search_depth: 'basic',
        topic: 'general',
        max_results: 5
    });

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post('/api/tavily/search', {
                query,
                ...searchOptions
            });
            setResults(response.data);
        } catch (error) {
            setError(error.response?.data?.error || error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOptionChange = (name, value) => {
        setSearchOptions(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div className={`p-6 ${isDark ? 'text-gray-200' : 'text-gray-800'} h-full overflow-y-auto`}>
            <h1 className="text-3xl font-bold mb-6">Tavily Search</h1>

            <form onSubmit={handleSearch} className="mb-8">
                <div className="flex flex-col space-y-4">
                    <div>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Enter your search query"
                            className={`w-full p-3 rounded-lg ${isDark
                                ? 'bg-gray-700 text-gray-200 placeholder-gray-400'
                                : 'bg-white text-gray-800 placeholder-gray-500'
                                } border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block mb-2">Search Depth</label>
                            <select
                                value={searchOptions.search_depth}
                                onChange={(e) => handleOptionChange('search_depth', e.target.value)}
                                className={`w-full p-2 rounded-lg ${isDark
                                    ? 'bg-gray-700 text-gray-200'
                                    : 'bg-white text-gray-800'
                                    } border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                            >
                                <option value="basic">Basic</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>

                        <div>
                            <label className="block mb-2">Topic</label>
                            <select
                                value={searchOptions.topic}
                                onChange={(e) => handleOptionChange('topic', e.target.value)}
                                className={`w-full p-2 rounded-lg ${isDark
                                    ? 'bg-gray-700 text-gray-200'
                                    : 'bg-white text-gray-800'
                                    } border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                            >
                                <option value="general">General</option>
                                <option value="news">News</option>
                            </select>
                        </div>

                        <div>
                            <label className="block mb-2">Max Results</label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={searchOptions.max_results}
                                onChange={(e) => handleOptionChange('max_results', parseInt(e.target.value))}
                                className={`w-full p-2 rounded-lg ${isDark
                                    ? 'bg-gray-700 text-gray-200'
                                    : 'bg-white text-gray-800'
                                    } border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className={`px-6 py-3 rounded-lg font-medium transition-colors ${loading || !query.trim()
                            ? 'bg-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
                            } text-white`}
                    >
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </div>
            </form>

            {error && (
                <div className="mb-8 p-4 rounded-lg bg-red-100 text-red-700 border border-red-300">
                    {error}
                </div>
            )}

            {results && (
                <div className="space-y-8">
                    {results.answer && (
                        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'
                            } border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                            <h2 className="text-xl font-semibold mb-3">Answer</h2>
                            <p>{results.answer}</p>
                        </div>
                    )}

                    {results.images && results.images.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold mb-3">Images</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {results.images.map((image, index) => (
                                    <div key={index} className="relative">
                                        <img
                                            src={typeof image === 'string' ? image : image.url}
                                            alt={typeof image === 'string' ? 'Search result' : image.description}
                                            className="w-full h-48 object-cover rounded-lg"
                                        />
                                        {typeof image !== 'string' && image.description && (
                                            <div className={`mt-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                                {image.description}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {results.results && results.results.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold mb-3">Search Results</h2>
                            <div className="space-y-4">
                                {results.results.map((result, index) => (
                                    <div
                                        key={index}
                                        className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'
                                            } border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
                                    >
                                        <h3 className="text-lg font-medium mb-2">
                                            <a
                                                href={result.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-500 hover:underline"
                                            >
                                                {result.title}
                                            </a>
                                        </h3>
                                        <p className={`mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                            {result.content}
                                        </p>
                                        {result.published_date && (
                                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                Published: {new Date(result.published_date).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default TavilyDocs;
