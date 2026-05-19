import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:top-6">
      <div className="pointer-events-auto flex h-16 w-full max-w-3xl items-center justify-between rounded-full border border-[var(--pickwise-glass-border)] bg-[var(--pickwise-glass)] px-5 pl-7 shadow-[var(--pickwise-glass-shadow)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[var(--pickwise-glass)] sm:px-6 sm:pl-8">
        <a href="#" className="text-[1.65rem] font-extrabold leading-none tracking-normal">
          <span className="text-[var(--pickwise-navy)]">pick</span>
          <span className="bg-gradient-to-r from-[var(--pickwise-blue)] to-[var(--pickwise-cyan)] bg-clip-text text-transparent">
            wise
          </span>
        </a>
        <ThemeToggle />
      </div>
    </header>
  );
}
