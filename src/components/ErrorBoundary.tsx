import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <p className="font-semibold mb-1">Erreur de rendu</p>
          <pre className="text-xs whitespace-pre-wrap">{this.state.error.message}</pre>
        </div>
      )
    }
    return this.props.children
  }
}
