import axios from 'axios';

const TAVILY_API_URL = 'https://api.tavily.com/search';

export const searchTavily = async (query, options = {}) => {
    if (!process.env.TAVILY_API_KEY) {
        throw new Error('TAVILY_API_KEY is not configured');
    }

    try {
        const response = await axios.post(TAVILY_API_URL, {
            api_key: process.env.TAVILY_API_KEY,
            query,
            include_images: true,
            include_answer: true,
            ...options
        });
        return response.data;
    } catch (error) {
        console.error('Tavily API Error:', error.response?.data || error.message);
        if (error.response?.data) {
            throw new Error(error.response.data.message || 'Tavily API request failed');
        }
        throw new Error('Failed to connect to Tavily API');
    }
};
