"use client";

import type * as React from "react";
import { useEffect } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/web/site-header";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { DocsProjectCatalog } from "@/lib/protocol";

type DocsShellProps = {
  projectCatalog: DocsProjectCatalog;
  activeSlug?: string;
  activeSections?: Array<{
    id: string;
    label: string;
  }>;
  children: React.ReactNode;
};

export function DocsShell({
  projectCatalog,
  activeSlug,
  activeSections = [],
  children,
}: DocsShellProps) {
  useDocsScrollSpy();

  return (
    <SidebarProvider
      className="min-h-svh flex-col"
      style={
        {
          "--sidebar-width": "248px",
          "--sidebar-width-icon": "56px",
        } as React.CSSProperties
      }
    >
      <SiteHeader surface="docs" />
      <div className="flex min-h-0 flex-1">
        <AppSidebar
          projectCatalog={projectCatalog}
          activeSlug={activeSlug}
          activeSections={activeSections}
          className="top-14 bottom-auto h-[calc(100svh-3.5rem)]"
        />
        <SidebarInset className="min-w-0 bg-background">
          <div className="sticky top-14 z-30 flex h-11 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
            <span className="text-sm font-medium text-foreground">Docs</span>
            <SidebarTrigger className="size-8" />
          </div>
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function useDocsScrollSpy() {
  useEffect(() => {
    let animationFrame = 0;

    const readScrollOffset = () => {
      const value = window.getComputedStyle(
        document.documentElement,
      ).scrollPaddingTop;
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed + 8 : 88;
    };

    const targetIdForLink = (link: Element) => {
      const explicitTarget = link.getAttribute("data-docs-target-id");
      if (explicitTarget) {
        return explicitTarget;
      }
      const href = link.getAttribute("href");
      if (!href?.startsWith("#")) {
        return undefined;
      }
      return decodeURIComponent(href.slice(1));
    };

    const update = () => {
      const links = Array.from(
        document.querySelectorAll<HTMLElement>("[data-docs-scroll-link]"),
      );
      const ids = new Set(
        links.map(targetIdForLink).filter(Boolean) as string[],
      );
      const targets = Array.from(ids)
        .map((id) => document.getElementById(id))
        .filter(Boolean) as HTMLElement[];

      if (!links.length || !targets.length) {
        return;
      }

      const offset = readScrollOffset();
      const sortedTargets = targets.sort(
        (left, right) => left.offsetTop - right.offsetTop,
      );
      const activeTarget = sortedTargets.reduce<HTMLElement | undefined>(
        (current, target) => {
          const top = target.getBoundingClientRect().top;
          return top <= offset ? target : current;
        },
        sortedTargets[0],
      );
      const activeId = activeTarget?.id;

      let currentAssigned = false;
      for (const link of links) {
        const active = Boolean(activeId && targetIdForLink(link) === activeId);
        link.dataset.active = active ? "true" : "false";
        if (active && !currentAssigned) {
          link.setAttribute("aria-current", "location");
          currentAssigned = true;
        } else if (link.getAttribute("aria-current") === "location") {
          link.removeAttribute("aria-current");
        }
      }
    };

    const scheduleUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(update);
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("hashchange", scheduleUpdate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("hashchange", scheduleUpdate);
    };
  }, []);
}
