import { Component, type ReactNode, type ErrorInfo } from "react";

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
        <div
          style={{
            padding: "2rem",
            fontFamily: "IBM Plex Mono, monospace",
            maxWidth: "600px",
            margin: "4rem auto",
          }}
        >
          <h1
            style={{
              fontFamily: "Playfair Display, serif",
              marginBottom: "1rem",
            }}
          >
            Something went wrong
          </h1>
          <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
            PromptArena encountered an unexpected error. Try refreshing the page.
          </p>
          <pre
            style={{
              fontSize: "12px",
              color: "#dc2626",
              background: "#f3f4f6",
              padding: "1rem",
              border: "1px solid #d1d5db",
            }}
          >
            {error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
