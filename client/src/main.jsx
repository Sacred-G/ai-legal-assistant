import React from 'react';
import ReactDOM from 'react-dom/client';
import { GlobalWorkerOptions } from 'pdfjs-dist';
import { MantineProvider } from '@mantine/core';
import App from './App';
import './index.css';
import '@mantine/core/styles.css';

// Configure PDF.js worker
// Ensure PDF.js worker is loaded from the correct path
const pdfjsWorkerPath = new URL('/pdf.worker.min.mjs', window.location.origin).href;
GlobalWorkerOptions.workerSrc = pdfjsWorkerPath;

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('React Error Boundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-100">
                    <div className="bg-white p-8 rounded-lg shadow-md">
                        <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
                        <p className="text-gray-600">The application encountered an error. Please refresh the page.</p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

const root = document.getElementById('root');
if (root) {
    ReactDOM.createRoot(root).render(
        <React.StrictMode>
            <ErrorBoundary>
                <MantineProvider
                    theme={{
                        primaryColor: 'blue',
                        colors: {
                            blue: [
                                '#e6f2ff',
                                '#bfdfff',
                                '#99ccff',
                                '#73b9ff',
                                '#4da6ff',
                                '#2563eb',
                                '#1d4ed8',
                                '#1a44b8',
                                '#163a98',
                                '#133078'
                            ]
                        }
                    }}
                >
                    <App />
                </MantineProvider>
            </ErrorBoundary>
        </React.StrictMode>
    );
} else {
    console.error('Root element not found');
}
