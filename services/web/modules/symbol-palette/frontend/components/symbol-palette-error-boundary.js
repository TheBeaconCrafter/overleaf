import React from 'react'
import PropTypes from 'prop-types'

export default class SymbolPaletteErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    console.error('[Symbol Palette Error Boundary] Error caught:', error)
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Symbol Palette Error Boundary] Component stack:', errorInfo.componentStack)
    console.error('[Symbol Palette Error Boundary] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      toString: error.toString(),
    })

    // Log to window for browser console visibility
    if (typeof window !== 'undefined') {
      window.console.error('=== SYMBOL PALETTE ERROR ===')
      window.console.error('Error:', error.message)
      window.console.error('Stack:', error.stack)
      window.console.error('Component Stack:', errorInfo.componentStack)
      window.console.error('===========================')
    }

    this.setState({
      error,
      errorInfo,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="symbol-palette-error" style={{
          padding: '20px',
          background: '#ffebee',
          border: '1px solid #f44336',
          borderRadius: '4px',
          color: '#d32f2f',
          fontFamily: 'monospace',
        }}>
          <h3>Symbol Palette Error</h3>
          <p><strong>Error:</strong> {this.state.error?.toString()}</p>
          <details style={{ marginTop: '10px' }}>
            <summary style={{ cursor: 'pointer' }}>Stack Trace</summary>
            <pre style={{
              whiteSpace: 'pre-wrap',
              fontSize: '11px',
              marginTop: '10px',
              background: 'white',
              padding: '10px',
              overflow: 'auto',
              maxHeight: '300px',
            }}>
              {this.state.error?.stack}
            </pre>
          </details>
          <details style={{ marginTop: '10px' }}>
            <summary style={{ cursor: 'pointer' }}>Component Stack</summary>
            <pre style={{
              whiteSpace: 'pre-wrap',
              fontSize: '11px',
              marginTop: '10px',
              background: 'white',
              padding: '10px',
              overflow: 'auto',
              maxHeight: '300px',
            }}>
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
          <p style={{ marginTop: '15px', fontSize: '12px' }}>
            Check the browser console for detailed logs with [Symbol Palette] prefix
          </p>
        </div>
      )
    }

    return this.props.children
  }
}

SymbolPaletteErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
}
