import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          style={{
            padding: "2rem",
            fontFamily: "Inter, sans-serif",
            maxWidth: "600px",
            margin: "2rem auto",
          }}
        >
          <h2 style={{ color: "#D32F2F", marginBottom: "1rem" }}>Something went wrong</h2>
          <pre
            style={{
              background: "#f5f5f5",
              padding: "1rem",
              borderRadius: "8px",
              overflow: "auto",
              fontSize: "14px",
            }}
          >
            {this.state.error.message}
          </pre>
          <p style={{ color: "#666", marginTop: "1rem" }}>
            Check the browser console (F12) for more details. If Firebase env vars are missing, create a{" "}
            <code>.env</code> file with VITE_FIREBASE_* variables.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
