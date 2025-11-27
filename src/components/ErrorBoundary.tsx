import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: string) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo: errorInfo.componentStack,
    });

    if (error.message.includes('Failed to load') || 
        error.message.includes('dynamically imported module')) {
      console.error('❌ Dynamic import failed. This may indicate a network issue or missing module.');
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo || '');
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
                </div>
              </div>
              
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Something went wrong
                </h1>
                
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  The application encountered an unexpected error. This could be due to:
                </p>
                
                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mb-6 space-y-1">
                  <li>Network connectivity issues</li>
                  <li>Browser compatibility problems</li>
                  <li>Memory constraints</li>
                  <li>Corrupted application state</li>
                </ul>

                <details className="mb-6">
                  <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 mb-2">
                    Technical Details
                  </summary>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-auto max-h-64">
                    <p className="text-xs font-mono text-red-600 dark:text-red-400 mb-2">
                      {this.state.error.toString()}
                    </p>
                    {this.state.errorInfo && (
                      <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {this.state.errorInfo}
                      </pre>
                    )}
                  </div>
                </details>

                <div className="flex gap-3">
                  <button
                    onClick={this.handleReset}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Try Again
                  </button>
                  
                  <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
