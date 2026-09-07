import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Optional label shown in the fallback UI, e.g. "PhiVision" */
  section?: string
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Catches render-time errors in its subtree and shows a fallback UI instead of
 * letting React unmount the whole tree (which otherwise looks like a black
 * screen, since only the app's dark body background remains visible).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.section ? ` · ${this.props.section}` : ''}]`, error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex h-full min-h-[200px] w-full items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-400" />
          <p className="text-sm font-semibold text-white/90">
            {this.props.section ? `Une erreur est survenue dans ${this.props.section}` : 'Une erreur est survenue'}
          </p>
          <p className="mt-1 text-xs text-white/50 font-mono break-words">{error.message}</p>
          <button
            onClick={this.handleReset}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/20 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Réessayer
          </button>
        </div>
      </div>
    )
  }
}
