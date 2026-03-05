import { AlertTriangle, RefreshCw } from "lucide-react";
import React from "react";

interface ErrorBoundaryProps {
    children: React.ReactNode;
    /** Optional fallback label shown in the error card, e.g. "Chart" */
    label?: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Generic React error boundary.
 * Catches render errors in children and shows a recoverable error card
 * instead of white-screening the whole page.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error("ErrorBoundary caught:", error, info.componentStack);
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-8 text-center">
                    <div className="mb-3 rounded-full bg-red-100 p-3">
                        <AlertTriangle className="h-6 w-6 text-red-500" />
                    </div>
                    <h3 className="mb-1 text-sm font-bold text-red-800">
                        {this.props.label ? `${this.props.label} failed to load` : "Something went wrong"}
                    </h3>
                    <p className="mb-4 text-xs text-red-600/70">
                        {this.state.error?.message || "An unexpected error occurred."}
                    </p>
                    <button
                        onClick={this.handleRetry}
                        className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50"
                    >
                        <RefreshCw className="h-3 w-3" />
                        Retry
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
