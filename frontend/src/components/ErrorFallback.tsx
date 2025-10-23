import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';

interface ErrorFallbackProps {
  error: Error | null;
  resetError?: () => void;
}

/**
 * Error Fallback UI
 *
 * Displayed when an error is caught by the ErrorBoundary.
 * Provides user-friendly error message and recovery options.
 */
export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const handleReset = () => {
    if (resetError) {
      resetError();
    }
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl">Oops! Something went wrong</CardTitle>
          <CardDescription>
            We encountered an unexpected error. This has been logged and we'll look into it.
          </CardDescription>
        </CardHeader>

        {/* Show error details in development */}
        {import.meta.env.DEV && error && (
          <CardContent className="space-y-2">
            <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3">
              <p className="text-sm font-mono text-destructive break-all">
                {error.message}
              </p>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                    View stack trace
                  </summary>
                  <pre className="mt-2 text-xs overflow-auto max-h-40 text-muted-foreground">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          </CardContent>
        )}

        <CardFooter className="flex flex-col space-y-2">
          {resetError && (
            <Button
              onClick={handleReset}
              className="w-full"
              variant="default"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          <div className="flex gap-2 w-full">
            <Button
              onClick={handleGoHome}
              variant="outline"
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
            <Button
              onClick={handleReload}
              variant="outline"
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
