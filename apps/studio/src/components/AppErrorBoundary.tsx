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
            <h1>Studio를 불러오지 못했습니다</h1>
            <p>
              저장이 완료된 검토 및 리허설 기록은 다시 불러옵니다. 저장되지
              않은 화면 상태는 초기화될 수 있습니다.
            </p>
            <button type="button" onClick={() => window.location.reload()}>
              다시 불러오기
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
