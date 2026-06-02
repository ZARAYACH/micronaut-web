"use client";

import * as React from "react";

import { PanelLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function sidebarCookieOpen() {
  return !document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .some((cookie) => cookie === `${SIDEBAR_COOKIE_NAME}=false`);
}

function writeSidebarCookie(open: boolean) {
  document.cookie = `${SIDEBAR_COOKIE_NAME}=${open}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
}

function applyDesktopSidebarState(open: boolean) {
  const sidebar = document.querySelector<HTMLElement>("[data-docs-sidebar]");
  if (!sidebar) {
    return;
  }
  sidebar.dataset.state = open ? "expanded" : "collapsed";
  sidebar.dataset.collapsible = open ? "" : "icon";
}

export function DocsSidebarRailControl() {
  const [open, setOpen] = React.useState(true);

  React.useEffect(() => {
    const initialOpen = sidebarCookieOpen();
    setOpen(initialOpen);
    applyDesktopSidebarState(initialOpen);
  }, []);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "b" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => {
          const next = !current;
          applyDesktopSidebarState(next);
          writeSidebarCookie(next);
          return next;
        });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function toggleSidebar() {
    setOpen((current) => {
      const next = !current;
      applyDesktopSidebarState(next);
      writeSidebarCookie(next);
      return next;
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Toggle Sidebar"
      aria-expanded={open}
      title="Toggle Sidebar"
      onClick={toggleSidebar}
      className={cn(
        "absolute inset-y-0 z-20 hidden h-auto w-4 -translate-x-1/2 rounded-none p-0 transition-all ease-linear sm:flex",
        "group-data-[side=left]:-right-4 group-data-[side=right]:left-0",
        "after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border",
        "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
      )}
    >
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

export function DocsSidebarMobileSheet({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  function onContentClick(event: React.MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("a[href]")) {
      setOpen(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Open docs navigation"
        >
          <PanelLeftIcon />
          <span className="sr-only">Open docs navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-72 bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Docs navigation</SheetTitle>
          <SheetDescription>
            Displays the mobile documentation sidebar.
          </SheetDescription>
        </SheetHeader>
        <div className="flex h-full w-full flex-col" onClick={onContentClick}>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
