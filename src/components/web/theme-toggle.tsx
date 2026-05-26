"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import {
  LEGACY_THEME_STORAGE_KEY,
  THEME_MODE_STORAGE_KEY,
  type ThemeMode,
} from "@/lib/experience-theme";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
  showLabels?: boolean;
};

const themeModes: Array<{
  mode: ThemeMode;
  label: string;
  icon: typeof Sun;
}> = [
  { mode: "light", label: "Light", icon: Sun },
  { mode: "dark", label: "Dark", icon: Moon },
];

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

export function ThemeToggle({
  className,
  showLabels = false,
}: ThemeToggleProps) {
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const rootMode = document.documentElement.dataset.themeMode;
    const initialMode = isThemeMode(rootMode) ? rootMode : "light";
    setThemeMode(initialMode);
    setDark(document.documentElement.classList.contains("dark"));

    function syncFromRoot() {
      const rootMode = document.documentElement.dataset.themeMode;
      const nextMode = isThemeMode(rootMode) ? rootMode : "light";
      setThemeMode(nextMode);
      setDark(document.documentElement.classList.contains("dark"));
    }

    function onThemeModeChange(event: Event) {
      const customEvent = event as CustomEvent<{
        mode?: ThemeMode;
        dark?: boolean;
      }>;
      const nextMode = isThemeMode(customEvent.detail?.mode)
        ? customEvent.detail.mode
        : "light";
      setThemeMode(nextMode);
      setDark(Boolean(customEvent.detail?.dark));
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
    setThemeMode(nextMode);
    setDark(applyThemeMode(nextMode));
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border p-1",
        "border-border bg-background text-muted-foreground shadow-xs",
        className,
      )}
      role="radiogroup"
      aria-label={`Color theme, ${dark ? "dark" : "light"} active`}
    >
      {themeModes.map((option) => {
        const Icon = option.icon;
        const active = themeMode === option.mode;

        return (
          <button
            key={option.mode}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${option.label} theme`}
            title={`${option.label} theme`}
            onClick={() => setMode(option.mode)}
            className={cn(
              "inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              active
                ? "bg-foreground text-background"
                : "hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            <span className={showLabels ? "inline" : "sr-only"}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
