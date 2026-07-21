import { Component, type ErrorInfo, type ReactNode } from "react";
import "./ErrorBoundary.css";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Uncaught render error:", error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary__card">
          <span className="error-boundary__icon" aria-hidden="true">
            ⚠️
          </span>
          <h1 className="error-boundary__title">Something went wrong</h1>
          <p className="error-boundary__message">
            This part of the page failed to load. You can try again, or head back
            to the events list.
          </p>

          {import.meta.env.DEV && (
            <pre className="error-boundary__detail">{error.message}</pre>
          )}

          <div className="error-boundary__actions">
            <button
              type="button"
              className="error-boundary__btn"
              onClick={this.handleReset}
            >
              Try again
            </button>
            <a className="error-boundary__btn error-boundary__btn--ghost" href="/events">
              Browse events
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
