import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

function Bomb(): never {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  it('renders children normally when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>all good</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('all good')).toBeInTheDocument()
  })

  it('catches a render error and shows a fallback instead of unmounting the whole tree', () => {
    // React logs the error to console.error during the throw — silence it for this test.
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary section="Test">
        <Bomb />
      </ErrorBoundary>
    )

    expect(screen.getByText(/une erreur est survenue dans test/i)).toBeInTheDocument()
    expect(screen.getByText('boom')).toBeInTheDocument()

    consoleErrorSpy.mockRestore()
  })

  it('lets the user retry via the reset button', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    )

    fireEvent.click(screen.getByRole('button', { name: /réessayer/i }))
    // Bomb still throws on re-render, so the fallback should still be shown
    // (this mainly asserts the reset handler doesn't itself crash).
    expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument()

    consoleErrorSpy.mockRestore()
  })
})
