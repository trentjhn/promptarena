import { Component, type ReactNode, type ErrorInfo } from "react";
import "./AppErrorBoundary.css";

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("AppErrorBoundary caught a render error:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error !== null) {
      return (
        <div className="error-boundary">
          <h1 className="error-boundary__heading">Something went wrong</h1>
          <p className="error-boundary__message">
            PromptArena encountered an unexpected error. Try refreshing the page.
          </p>
          <pre className="error-boundary__detail">{error.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
