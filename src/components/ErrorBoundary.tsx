import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<any, any> {
  public state = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-theme-base flex items-center justify-center p-4">
          <div className="glassy-neumorphic rounded-2xl p-8 max-w-lg w-full text-center space-y-6">
            <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <h1 className="text-2xl font-bold text-theme-main">System Malfunction</h1>
            <p className="text-theme-muted text-sm">
              An unexpected error occurred in the TriMatrix core. Our autonomous systems have logged the issue.
            </p>
            
            {this.state.error && (
              <div className="bg-black/40 p-4 rounded-xl text-left overflow-auto max-h-40 border border-white/5">
                <code className="text-xs text-rose-400 font-mono">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-theme-primary hover:bg-theme-primary-hover text-white px-6 py-3 rounded-xl flex items-center justify-center transition-all font-medium"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Reboot System
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
