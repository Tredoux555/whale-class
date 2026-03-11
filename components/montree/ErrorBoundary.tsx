// components/montree/ErrorBoundary.tsx
// React error boundary — catches render errors in child components
'use client';

import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
  title?: string;
  retryLabel?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="text-4xl mb-4">🌿</div>
            <h2 className="text-lg font-semibold text-white/80 mb-2">
              {this.props.title || 'Something went wrong'}
            </h2>
            <p className="text-sm text-white/50 mb-4">
              {this.props.fallbackMessage || 'An unexpected error occurred. Please try again.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: 'rgba(74,222,128,0.15)',
                border: '1px solid rgba(74,222,128,0.3)',
                color: '#4ADE80',
              }}
            >
              {this.props.retryLabel || 'Try Again'}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
