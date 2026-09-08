import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn, FOCUS_RING } from "@/lib/utils";

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("[ErrorBoundary] Render error", error, info);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background vignette text-foreground px-6">
        <div role="alert" className="max-w-md w-full text-center space-y-4 glass-panel border border-border rounded-2xl p-7 shadow-elevated relative z-10">
          <div className="mx-auto h-11 w-11 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-display">Something went wrong</h1>
          <p className="text-sm text-muted-foreground break-words">
            {this.state.error.message || "An unexpected error occurred while rendering the page."}
          </p>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={this.handleReload}
              className={cn("min-h-[40px] px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors duration-150", FOCUS_RING)}
            >
              Reload page
            </button>
            <button
              type="button"
              onClick={() => { window.location.href = "/"; }}
              className={cn("min-h-[40px] px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-accent transition-colors duration-150", FOCUS_RING)}
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
