import React, { createContext, useContext, useState, useEffect } from 'react';

const themes = {
    light: {
        primary: {
            main: '#2563eb', // Blue-600
            hover: '#1d4ed8', // Blue-700
            light: '#60a5fa', // Blue-400
        },
        background: {
            main: '#ffffff',
            secondary: '#f8fafc', // Slate-50
            tertiary: '#f1f5f9', // Slate-100
        },
        text: {
            primary: '#0f172a', // Slate-900
            secondary: '#475569', // Slate-600
            inverse: '#ffffff',
        },
        border: '#e2e8f0', // Slate-200
        shadow: {
            sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        },
    },
    dark: {
        primary: {
            main: '#3b82f6', // Blue-500
            hover: '#2563eb', // Blue-600
            light: '#60a5fa', // Blue-400
        },
        background: {
            main: '#0f172a', // Slate-900
            secondary: '#1e293b', // Slate-800
            tertiary: '#334155', // Slate-700
        },
        text: {
            primary: '#f8fafc', // Slate-50
            secondary: '#cbd5e1', // Slate-300
            inverse: '#0f172a', // Slate-900
        },
        border: '#334155', // Slate-700
        shadow: {
            sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
            md: '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
            lg: '0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
        },
    },
};

const animations = {
    transition: {
        fast: 'all 0.2s ease-in-out',
        normal: 'all 0.3s ease-in-out',
        slow: 'all 0.5s ease-in-out',
    },
    scale: {
        hover: 'scale(1.02)',
        active: 'scale(0.98)',
    },
};

// Initialize with default values
const defaultContext = {
    isDark: false,
    toggleTheme: () => { },
    theme: themes.light,
    animations,
};

const ThemeContext = createContext(defaultContext);

function getInitialTheme() {
    if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return savedTheme === 'dark' || (!savedTheme && prefersDark);
    }
    return false;
}

export function ThemeProvider({ children }) {
    const [isDark, setIsDark] = useState(getInitialTheme());
    const [theme, setTheme] = useState(isDark ? themes.dark : themes.light);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            const shouldBeDark = e.matches;
            setIsDark(shouldBeDark);
            setTheme(shouldBeDark ? themes.dark : themes.light);
            localStorage.setItem('theme', shouldBeDark ? 'dark' : 'light');
            document.documentElement.classList.toggle('dark', shouldBeDark);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    // Set initial dark mode class
    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark);
    }, []);

    const toggleTheme = () => {
        setIsDark(prev => {
            const newTheme = !prev;
            localStorage.setItem('theme', newTheme ? 'dark' : 'light');
            setTheme(newTheme ? themes.dark : themes.light);
            document.documentElement.classList.toggle('dark', newTheme);
            return newTheme;
        });
    };

    const value = {
        isDark,
        toggleTheme,
        theme,
        animations,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
