/* =============================================================
   ERROR BOUNDARY
   Without this, one thrown render takes the whole app to a blank
   page with no way back. This keeps the chrome, explains what
   happened in the interface's own voice, and offers a way out.
   ============================================================= */
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[makr] render failed:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="shell section">
        <div className="empty">
          <h1 className="h2">This page didn’t load</h1>
          <p className="lede muted" style={{ maxWidth: '48ch' }}>
            Something failed while rendering. Your bag and account are unaffected — nothing was lost.
          </p>

          <div className="center wrap" style={{ justifyContent: 'center', gap: 'var(--spacing-24)' }}>
            <button type="button" className="btn btn--gold" onClick={() => this.setState({ error: null })}>
              Try again
            </button>
            <a className="btn btn--ghost" href="/">Return to the shop</a>
          </div>

          {import.meta.env?.DEV && (
            <pre
              className="notice notice--error"
              style={{ textAlign: 'left', marginTop: 'var(--spacing-24)', whiteSpace: 'pre-wrap', maxWidth: '72ch' }}
            >
              {String(error?.stack || error)}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
