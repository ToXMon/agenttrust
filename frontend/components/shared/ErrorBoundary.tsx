"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="rounded-lg border border-[#ea2261]/20 bg-[#ea2261]/5 p-6 text-center">
          <p className="text-sm text-[#ea2261]">Something went wrong</p>
          <p className="mt-1 font-mono text-[12px] text-[#64748d]">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-3 rounded-md bg-purple px-4 py-2 text-sm text-white hover:bg-purple-hover transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
