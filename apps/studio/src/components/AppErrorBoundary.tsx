import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  public override state: AppErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Aster UI rendering failed", error, info.componentStack);
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="app-error" role="alert">
          <div className="app-error__panel">
            <p className="app-error__eyebrow">Aster UI</p>
            <h1>Studio could not be loaded</h1>
            <p>
              Saved review and rehearsal records will be restored. Unsaved screen
              state may be reset.
            </p>
            <button type="button" onClick={() => window.location.reload()}>
              Reload Studio
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
