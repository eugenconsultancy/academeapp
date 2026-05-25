import { Component } from 'react';
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi';
import Button from '../ui/Button'; // Import your optimized UI button

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        // Log to error tracking service (e.g., Sentry, LogRocket, or local console analytics)
        console.error('[ErrorBoundary caught a crash]:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    handleRefresh = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // Use custom fallback UI if provided via props
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-[60vh] flex items-center justify-center p-8 bg-transparent">
                    <div className="text-center max-w-md w-full animate-fadeIn">
                        {/* Alert Icon Header */}
                        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-200 dark:border-red-800/50 shadow-sm">
                            <FiAlertTriangle className="w-10 h-10 text-red-500 dark:text-red-400" />
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
                            Something went wrong
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            The application encountered an unexpected processing error. Try resetting the page state below.
                        </p>

                        {/* Error Details Log View */}
                        {this.state.error && (
                            <details className="text-left mb-6 bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700 max-h-48 overflow-y-auto transition-all group">
                                <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer font-semibold select-none outline-none hover:text-gray-700 dark:hover:text-gray-200">
                                    View Technical Diagnostics Log
                                </summary>
                                <pre className="text-[11px] font-mono text-red-500 dark:text-red-400 mt-3 whitespace-pre-wrap leading-relaxed bg-red-50/50 dark:bg-red-900/10 p-2.5 rounded-lg border border-red-100/50 dark:border-red-900/20">
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}

                        {/* UI Buttons consumption */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                            <Button
                                variant="primary"
                                size="md"
                                onClick={this.handleRetry}
                                icon={FiRefreshCw}
                                className="w-full sm:w-auto"
                            >
                                Try Again
                            </Button>

                            <Button
                                variant="secondary"
                                size="md"
                                onClick={this.handleRefresh}
                                className="w-full sm:w-auto"
                            >
                                Refresh Page
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

Button.displayName = 'ErrorBoundary';