import React, { useEffect } from 'react';

const AdvancedChat = () => {
    useEffect(() => {
        // Open Streamlit in a new tab
        window.open('https://ezlegal.streamlit.app', '_blank');
        // Navigate back to home page
        window.location.href = '/';
    }, []);

    return (
        <div className="h-screen bg-gray-950 flex flex-col items-center justify-center">
            <div className="text-gray-200 text-center">
                <h3 className="text-xl mb-4">Opening Advanced Chat...</h3>
                <p>If nothing happens, <a href="https://ezlegal.streamlit.app" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">click here</a></p>
            </div>
        </div>
    );
};

export default AdvancedChat;
