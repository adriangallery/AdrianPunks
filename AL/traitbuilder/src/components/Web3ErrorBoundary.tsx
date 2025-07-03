import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorType?: 'websocket' | 'rpc' | 'wallet' | 'general';
}

export class Web3ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    let errorType: 'websocket' | 'rpc' | 'wallet' | 'general' = 'general';
    
    if (error.message.includes('WebSocket') || error.message.includes('3000')) {
      errorType = 'websocket';
    } else if (error.message.includes('RPC') || error.message.includes('provider')) {
      errorType = 'rpc';
    } else if (error.message.includes('wallet') || error.message.includes('connection')) {
      errorType = 'wallet';
    }

    return { hasError: true, error, errorType };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Web3ErrorBoundary caught an error:', error, errorInfo);
  }

  private getErrorMessage() {
    switch (this.state.errorType) {
      case 'websocket':
        return 'Error de conexión WebSocket. Esto puede ser temporal.';
      case 'rpc':
        return 'Error de conexión RPC. Verificando conectividad...';
      case 'wallet':
        return 'Error de conexión wallet. Intenta reconectar.';
      default:
        return 'Ha ocurrido un error inesperado.';
    }
  }

  private getRetryAction() {
    switch (this.state.errorType) {
      case 'websocket':
      case 'rpc':
        return () => window.location.reload();
      case 'wallet':
        return () => {
          // Trigger wallet reconnection
          this.setState({ hasError: false, error: undefined, errorType: undefined });
        };
      default:
        return () => window.location.reload();
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="max-w-md w-full bg-black/20 backdrop-blur-sm rounded-lg border border-white/10 p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-500/20 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h3 className="text-lg font-medium text-white mb-2">
              Error de Conexión
            </h3>
            
            <p className="text-gray-300 text-sm mb-4">
              {this.getErrorMessage()}
            </p>

            {this.state.errorType === 'websocket' && (
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 mb-4">
                <p className="text-blue-300 text-xs">
                  💡 Tip: Los errores de WebSocket son temporales. Intenta recargar la página.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={this.getRetryAction()}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors"
              >
                {this.state.errorType === 'wallet' ? 'Reconectar' : 'Recargar Página'}
              </button>
              
              <button
                onClick={() => this.setState({ hasError: false, error: undefined, errorType: undefined })}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors"
              >
                Intentar de Nuevo
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 