import React from 'react';
import { toast } from 'sonner';

import { ErrorDisplay } from '@/components/shared/LoadingComponents';

interface GlobalErrorBoundaryProps {
  children: React.ReactNode;
}

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  console.error('Global error caught:', error);
  
  React.useEffect(() => {
    toast.error('应用遇到了错误，请刷新页面重试');
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">出错了</h2>
        <p className="text-gray-600 mb-6">
          应用遇到了一个错误。我们已经记录了这个问题，请尝试刷新页面或重新加载。
        </p>
        <ErrorDisplay 
          error={error.message} 
          onRetry={resetErrorBoundary}
          retryText="重新加载"
        />
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || ErrorFallback;
      return (
        <FallbackComponent 
          error={this.state.error!} 
          resetErrorBoundary={() => {
            this.setState({ hasError: false, error: null });
          }}
        />
      );
    }

    return this.props.children;
  }
}

export function GlobalErrorBoundary({ children }: GlobalErrorBoundaryProps) {
  return (
    <ErrorBoundary
      onError={(error) => {
        console.error('Global error boundary caught:', error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// Hook for handling async operations with error boundaries
export function useAsyncOperation<T>(
  operation: () => Promise<T>,
  options: {
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: (result: T) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const execute = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await operation();
      
      if (options.successMessage) {
        toast.success(options.successMessage);
      }
      
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      
      const errorMessage = options.errorMessage || error.message || '操作失败';
      toast.error(errorMessage);
      
      options.onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [operation, options]);

  return {
    execute,
    isLoading,
    error,
    reset: () => setError(null),
  };
}