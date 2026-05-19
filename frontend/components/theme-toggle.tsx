"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

type Theme = "dark" | "light";

const storageKey = "pickwise-theme";

const getSystemTheme = (): Theme =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const getThemeSnapshot = (): Theme => {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = localStorage.getItem(storageKey);

  return storedTheme === "dark" || storedTheme === "light"
    ? storedTheme
    : getSystemTheme();
};

const applyTheme = (theme: Theme) => {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.classList.toggle("light", theme === "light");
};

const subscribeToTheme = (callback: () => void) => {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handleChange = () => callback();

  window.addEventListener("storage", handleChange);
  window.addEventListener("pickwise-theme-change", handleChange);
  media.addEventListener("change", handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener("pickwise-theme-change", handleChange);
    media.removeEventListener("change", handleChange);
  };
};

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    () => "light"
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";

    localStorage.setItem(storageKey, nextTheme);
    applyTheme(nextTheme);
    window.dispatchEvent(new Event("pickwise-theme-change"));
  };

  return (
    <button
      aria-label={
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
      className="grid size-10 place-items-center rounded-full text-[var(--pickwise-blue)] transition hover:bg-[var(--pickwise-glass-strong)] hover:text-[var(--pickwise-cyan)]"
      onClick={toggleTheme}
      type="button"
    >
      <Sun className="hidden size-4 dark:block" aria-hidden="true" />
      <Moon className="size-4 dark:hidden" aria-hidden="true" />
    </button>
  );
}
