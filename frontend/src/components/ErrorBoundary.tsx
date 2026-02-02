import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-6">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-xl max-w-md w-full text-center border border-slate-200 dark:border-slate-700">
                        <span className="text-6xl mb-4 block">😵</span>
                        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
                        <p className="text-slate-500 mb-6">
                            We encountered an unexpected error. Please try refreshing the page.
                        </p>
                        {this.state.error && (
                            <pre className="text-left bg-slate-100 dark:bg-slate-900 p-4 rounded text-xs text-red-500 overflow-auto max-h-40 mb-6">
                                {this.state.error.message}
                            </pre>
                        )}
                        <button
                            className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded transition-colors w-full"
                            onClick={() => window.location.reload()}
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
