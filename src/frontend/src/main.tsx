import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { InternetIdentityProvider } from "./hooks/useInternetIdentity";
import "./index.css";

BigInt.prototype.toJSON = function () {
  return this.toString();
};

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: "" };
  }
  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            background: "#000",
            color: "#fff",
            width: "100vw",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "sans-serif",
            padding: "2rem",
          }}
        >
          <h2 style={{ color: "#f55", marginBottom: "1rem" }}>
            Scoreboard Error
          </h2>
          <p
            style={{
              color: "#aaa",
              fontSize: "0.9rem",
              maxWidth: 500,
              textAlign: "center",
            }}
          >
            {this.state.error}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: "2rem",
              padding: "0.75rem 2rem",
              background: "#1a6cff",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <InternetIdentityProvider>
        <App />
      </InternetIdentityProvider>
    </QueryClientProvider>
  </ErrorBoundary>,
);
