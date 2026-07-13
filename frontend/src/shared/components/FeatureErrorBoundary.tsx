import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export interface FeatureErrorBoundaryProps {
  children: ReactNode;
  featureName?: string;
  onReset?: () => void;
  className?: string;
}

export interface FeatureErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class FeatureErrorBoundary extends Component<
  FeatureErrorBoundaryProps,
  FeatureErrorBoundaryState
> {
  constructor(props: FeatureErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): FeatureErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('FeatureErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const isDev = Boolean(
        typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV
      );

      return (
        <div className={`w-full py-12 px-4 flex items-center justify-center ${this.props.className || ''}`}>
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 md:p-8 shadow-md text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-accent-red/15 flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7 text-[var(--error)]" />
            </div>

            <h3 className="font-syne font-bold text-xl md:text-2xl text-[var(--text)] mb-2">
              {this.props.featureName
                ? `Unable to load ${this.props.featureName}`
                : 'Something went wrong'}
            </h3>

            <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-md">
              An unexpected error occurred while loading this section. Please try reloading or contact support if the problem continues.
            </p>

            {isDev && this.state.error && (
              <div className="w-full text-left bg-accent-red/15/60 border border-[var(--error)]/30 rounded-lg p-3 mb-6 overflow-x-auto max-h-48">
                <p className="text-xs font-mono font-bold text-[var(--error)] mb-1">
                  {this.state.error.name}: {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="text-[10px] font-mono text-[var(--error)]/80 whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--text)] text-[var(--bg)] font-bold text-sm hover:opacity-90 transition-opacity"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default FeatureErrorBoundary;
