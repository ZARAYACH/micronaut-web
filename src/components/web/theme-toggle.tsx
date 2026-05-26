"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import {
  LEGACY_THEME_STORAGE_KEY,
  THEME_MODE_STORAGE_KEY,
  type ThemeMode,
} from "@/lib/experience-theme";
import { cn } from "@/lib/utils";

type ThemeModeSwitchProps = {
  className?: string;
};

function isThemeMode(value: string | undefined): value is ThemeMode {
  return value === "light" || value === "dark";
}

function resolveDark(mode: ThemeMode) {
  return mode === "dark";
}

function applyThemeMode(mode: ThemeMode, persist = true) {
  const dark = resolveDark(mode);
  const root = document.documentElement;
  root.dataset.themeMode = mode;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  if (persist) {
    try {
      localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
      localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    } catch {
      // The root data attribute keeps the current page usable without storage.
    }
  }
  window.dispatchEvent(
    new CustomEvent("micronaut-web-theme-mode-change", {
      detail: { mode, dark },
    }),
  );
  return dark;
}

export function ThemeModeSwitch({ className }: ThemeModeSwitchProps) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));

    function syncFromRoot() {
      setDark(document.documentElement.classList.contains("dark"));
    }

    function onThemeModeChange(event: Event) {
      const customEvent = event as CustomEvent<{
        mode?: ThemeMode;
        dark?: boolean;
      }>;
      if (isThemeMode(customEvent.detail?.mode)) {
        setDark(Boolean(customEvent.detail?.dark));
      }
    }

    syncFromRoot();
    window.addEventListener(
      "micronaut-web-theme-mode-change",
      onThemeModeChange,
    );

    return () => {
      window.removeEventListener(
        "micronaut-web-theme-mode-change",
        onThemeModeChange,
      );
    };
  }, []);

  function setMode(nextMode: ThemeMode) {
    setDark(applyThemeMode(nextMode));
  }

  function toggleMode() {
    setMode(dark ? "light" : "dark");
  }

  const Icon = dark ? Moon : Sun;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
      title={`Switch to ${dark ? "light" : "dark"} theme`}
      onClick={toggleMode}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md border shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        className,
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}
