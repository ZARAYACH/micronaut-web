"use client";

import * as React from "react";

import { Check, ChevronsUpDown, GalleryVerticalEnd } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  withBasePath,
  withBasePathForBase,
  withSurfacePath,
} from "@/lib/base-path";

export type DocsVersionOption = {
  label: string;
  href: string;
  current?: boolean;
};

type DocsVersionSwitcherProps = {
  label: string;
  options: DocsVersionOption[];
  surface?: "main" | "docs" | "guides" | "launch";
  className?: string;
  versionManifestHref?: string;
};

export function DocsVersionSwitcher({
  label,
  options,
  surface,
  className,
  versionManifestHref,
}: DocsVersionSwitcherProps) {
  const [resolvedOptions, setResolvedOptions] = React.useState(options);
  const current =
    resolvedOptions.find((option) => option.current) || resolvedOptions[0];
  const [selectedHref, setSelectedHref] = React.useState(current?.href || "");
  const selectedOption =
    resolvedOptions.find((option) => option.href === selectedHref) || current;
  const route = React.useCallback(
    (href: string) =>
      surface ? withSurfacePath(surface, href) : withBasePath(href),
    [surface],
  );

  React.useEffect(() => {
    setResolvedOptions(options);
  }, [options]);

  React.useEffect(() => {
    if (!versionManifestHref) {
      return;
    }
    let cancelled = false;
    fetch(
      withBasePathForBase(versionManifestHref, import.meta.env.BASE_URL || "/"),
    )
      .then((response) => (response.ok ? response.json() : undefined))
      .then((payload) => {
        if (!cancelled && Array.isArray(payload?.versions)) {
          setResolvedOptions(payload.versions);
        }
      })
      .catch(() => {
        // The checked-in options keep the switcher usable before publication.
      });
    return () => {
      cancelled = true;
    };
  }, [versionManifestHref]);

  React.useEffect(() => {
    const match = resolvedOptions.find((option) =>
      pathMatchesCurrentLocation(route(option.href)),
    );
    setSelectedHref((match || current)?.href || "");
  }, [current, resolvedOptions, route]);

  if (!current || resolvedOptions.length < 2) {
    return null;
  }

  return (
    <SidebarMenu className={className}>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <GalleryVerticalEnd className="size-4" />
              </div>
              <div className="grid min-w-0 flex-1 gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">{label}</span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {selectedOption?.label}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 w-(--radix-dropdown-menu-trigger-width)"
            align="start"
          >
            {resolvedOptions.map((option) => (
              <DropdownMenuItem
                key={option.href}
                onSelect={() => {
                  setSelectedHref(option.href);
                  window.location.href = route(option.href);
                }}
              >
                <span className="truncate">{option.label}</span>
                {option.href === selectedHref ? (
                  <Check className="ml-auto size-4" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function pathMatchesCurrentLocation(href: string) {
  const destination = normalizedPathname(href);
  const current = normalizedPathname(window.location.href);
  return (
    current === destination ||
    current.startsWith(`${destination.replace(/\/$/, "")}/`)
  );
}

function normalizedPathname(href: string) {
  return new URL(href, window.location.href).pathname.replace(
    /\/index\.html$/,
    "/",
  );
}
