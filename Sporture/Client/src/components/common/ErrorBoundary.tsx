import { Component, type ErrorInfo, type ReactNode } from "react";
import "./ErrorBoundary.css";

interface Props {
  children: ReactNode;
  /** Optional override for the fallback UI. */
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time exceptions anywhere below it.
 *
 * Without this, a single thrown error unmounts the entire React tree and the
 * user is left staring at a blank white page with no indication anything went
 * wrong. That is not hypothetical here — a Leaflet call that threw during a
 * map update took the whole app down exactly this way during development.
 *
 * Must be a class: there is still no hook equivalent of componentDidCatch.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // In a deployed app this is where an error reporter (Sentry et al) would
    // be called. Logging keeps the stack reachable in the meantime.
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
            // Only in development: the message can carry internals that
            // shouldn't be shown to real users.
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
