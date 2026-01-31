import { useState, useEffect } from 'react';
import { NotificationCenter } from '../Alerts/NotificationCenter';

export function Header() {
    const [darkMode, setDarkMode] = useState(() => {
        // Check localStorage or system preference first
        if (typeof window !== 'undefined') {
            return document.documentElement.classList.contains('dark') ||
                localStorage.getItem('theme') === 'dark';
        }
        return false;
    });

    useEffect(() => {
        // Sync React state with DOM and localStorage
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    const toggleDarkMode = () => setDarkMode(!darkMode);

    return (
        <header className="h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 transition-colors duration-200">
            <div className="flex items-center justify-between h-full px-6">
                {/* Search */}
                <div className="flex-1 max-w-lg">
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="Search sequences (e.g., A/Singapore/2024)..."
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 
                         bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100
                         placeholder-gray-400 dark:placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
                         transition-all duration-200"
                        />
                        <span className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-primary-500 transition-colors duration-200">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </span>
                        <div className="absolute right-3 top-2.5 hidden group-focus-within:block">
                            <span className="text-xs text-gray-400 border border-gray-200 dark:border-gray-600 rounded px-1.5 py-0.5">ESC</span>
                        </div>
                    </div>
                </div>

                {/* Right side actions */}
                <div className="flex items-center space-x-2">
                    {/* Notifications */}
                    {/* Notifications */}
                    <NotificationCenter />

                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

                    {/* Dark mode toggle */}
                    <button
                        onClick={toggleDarkMode}
                        className="p-2.5 text-gray-400 hover:text-warning-500 hover:bg-warning-50 dark:hover:bg-warning-500/10 rounded-xl transition-all duration-200"
                        aria-label="Toggle Dark Mode"
                    >
                        {darkMode ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                        )}
                    </button>

                    {/* User menu */}
                    <button className="flex items-center space-x-3 p-1.5 pl-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 group border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden md:block group-hover:text-primary-600 dark:group-hover:text-primary-400">Researcher</span>
                        <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300 shadow-sm border border-gray-200 dark:border-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                    </button>
                </div>
            </div>
        </header>
    );
}
