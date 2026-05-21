"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, FileText, Rocket, Search, Tag } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { mainSitePages } from "@/data/main-site-pages";
import { searchItems, type SearchItem } from "@/lib/protocol";

function ResultIcon({ kind }: { kind: SearchItem["kind"] }) {
  if (kind === "Guide") return <BookOpen />;
  if (kind === "Tag") return <Tag />;
  return <FileText />;
}

export function SearchDialog({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const items = useMemo(() => searchItems(), []);
  const docs = useMemo(() => items.filter((item) => item.href.startsWith("/docs/")).slice(0, 80), [items]);
  const guides = useMemo(() => items.filter((item) => item.href.startsWith("/guides/")).slice(0, 80), [items]);
  const tags = useMemo(() => items.filter((item) => item.kind === "Tag").slice(0, 40), [items]);
  const pages = useMemo(() => mainSitePages.slice(0, 80), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={className}
        aria-label="Search Micronaut"
        onClick={() => setOpen(true)}
      >
        <Search />
        <span className="hidden min-w-36 text-left text-muted-foreground/90 sm:inline">Search</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 text-[0.7rem] text-muted-foreground md:inline">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search Micronaut"
        description="Search projects, guides, sections, and tags."
        className="max-w-2xl"
      >
        <CommandInput placeholder="Search projects, guides, sections, and tags..." />
        <CommandList className="max-h-[28rem]">
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem
              value="Launch create project application starter"
              onSelect={() => {
                window.location.href = "/launch/";
                setOpen(false);
              }}
            >
              <Rocket />
              <span className="grid min-w-0 gap-0.5">
                <span className="truncate font-medium">Launch a project</span>
                <span className="truncate text-xs text-muted-foreground">Choose features and generate a Micronaut application.</span>
              </span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Main site">
            {pages.map((page) => (
              <CommandItem
                key={page.slug}
                value={`Page ${page.title} ${page.eyebrow} ${page.description}`}
                onSelect={() => {
                  window.location.href = `/${page.slug}/`;
                  setOpen(false);
                }}
              >
                <FileText />
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate font-medium">{page.title}</span>
                  <span className="truncate text-xs text-muted-foreground">{page.description}</span>
                </span>
                <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[0.68rem] text-muted-foreground">
                  Page
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Docs and APIs">
            {docs.map((item) => (
              <CommandItem
                key={`${item.kind}-${item.href}-${item.title}`}
                value={`${item.kind} ${item.title} ${item.description} ${item.terms}`}
                onSelect={() => {
                  window.location.href = item.href;
                  setOpen(false);
                }}
              >
                <ResultIcon kind={item.kind} />
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate font-medium">{item.title}</span>
                  <span className="truncate text-xs text-muted-foreground">{item.description}</span>
                </span>
                <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[0.68rem] text-muted-foreground">
                  Docs
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Guides">
            {guides.map((item) => (
              <CommandItem
                key={`${item.kind}-${item.href}-${item.title}`}
                value={`${item.kind} ${item.title} ${item.description} ${item.terms}`}
                onSelect={() => {
                  window.location.href = item.href;
                  setOpen(false);
                }}
              >
                <ResultIcon kind={item.kind} />
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate font-medium">{item.title}</span>
                  <span className="truncate text-xs text-muted-foreground">{item.description}</span>
                </span>
                <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[0.68rem] text-muted-foreground">
                  Guide
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Tags">
            {tags.map((item) => (
              <CommandItem
                key={`${item.kind}-${item.href}-${item.title}`}
                value={`${item.kind} ${item.title} ${item.description} ${item.terms}`}
                onSelect={() => {
                  window.location.href = item.href;
                  setOpen(false);
                }}
              >
                <ResultIcon kind={item.kind} />
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate font-medium">{item.title}</span>
                  <span className="truncate text-xs text-muted-foreground">{item.description}</span>
                </span>
                <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[0.68rem] text-muted-foreground">
                  Tag
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
