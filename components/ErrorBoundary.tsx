'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
          <p className="text-white font-semibold text-sm mb-1">
            {this.props.fallbackMessage ?? 'Something went wrong'}
          </p>
          <p className="text-gray-400 text-xs mb-4 max-w-xs">
            {this.state.error ?? 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm rounded-xl hover:bg-violet-500 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
