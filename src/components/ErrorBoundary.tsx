import { Component, type ReactNode } from 'react'

/** Keeps one broken section from blanking the whole site. */
export default class ErrorBoundary extends Component<{ children: ReactNode; label?: string }, { err: Error | null }> {
  state = { err: null as Error | null }
  static getDerivedStateFromError(err: Error) { return { err } }
  componentDidCatch(err: Error) { console.error(err) }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h2>Something broke{this.props.label ? ` in ${this.props.label}` : ''}</h2>
        <p className="sub">{this.state.err.message}</p>
        <button className="btn gold" onClick={() => this.setState({ err: null })}>Try again</button>
      </div>
    )
  }
}
