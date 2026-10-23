export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background px-4 py-10 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="leading-tight">
          <div className="text-sm font-bold text-foreground">
            ML Models Visualizer
          </div>
          <div className="text-xs text-muted-foreground">
            An interactive showcase of 9 foundational ML algorithms.
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          By Elias Pond · Interactive · Real-time
        </div>
      </div>
    </footer>
  );
}
