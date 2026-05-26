"use client";

import type * as React from "react";

import { ChevronRight } from "lucide-react";
import { Collapsible } from "radix-ui";

import { IconGlyph } from "@/components/web/icon-glyph";
import { VersionSelector } from "@/components/web/version-selector";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { type DocsProjectCatalog, type ProtocolCategory } from "@/lib/protocol";
import docsVersions from "@/data/docs-versions.json";
import { withBasePath } from "@/lib/base-path";
import { cn } from "@/lib/utils";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  projectCatalog: DocsProjectCatalog;
  activeSlug?: string;
  activeSections?: Array<{
    id: string;
    label: string;
  }>;
};

export function AppSidebar({
  projectCatalog,
  activeSlug,
  activeSections = [],
  className,
  ...props
}: AppSidebarProps) {
  const activeProject = activeSlug
    ? projectCatalog.projects.find((project) => project.slug === activeSlug)
    : undefined;
  const activeCategorySlug = activeSlug
    ? projectCatalog.categories.find(
        (category) =>
          category.slug === activeProject?.primaryCategory &&
          category.projectSlugs?.includes(activeSlug),
      )?.slug ||
      projectCatalog.categories.find((category) =>
        category.projectSlugs?.includes(activeSlug),
      )?.slug
    : undefined;

  return (
    <Sidebar
      collapsible="icon"
      className={cn("top-0 h-svh", className)}
      {...props}
    >
      <SidebarHeader className="h-11 border-b border-sidebar-border px-2 py-1">
        <div className="flex h-full items-center justify-between gap-2">
          <span className="min-w-0 px-2 text-sm font-medium text-sidebar-foreground group-data-[collapsible=icon]:sr-only">
            Docs
          </span>
          <SidebarTrigger className="size-8 shrink-0" />
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-2 px-2 pb-2 pt-2">
        <div className="group-data-[collapsible=icon]:hidden">
          <VersionSelector
            label="Docs version"
            options={docsVersions.versions}
            versionManifestHref="/versions.json"
            surface="docs"
            className="rounded-md border border-sidebar-border bg-sidebar-accent/35 p-2"
          />
        </div>
        {projectCatalog.categories.map((category) => {
          const projects = docsCatalogProjectsByCategory(
            projectCatalog,
            category,
          );
          if (!projects.length) {
            return null;
          }
          const hasActiveProject = category.slug === activeCategorySlug;
          const categoryHeaderClassName = cn(
            "gap-1.5 px-2 text-[0.78rem] leading-4",
            hasActiveProject && "text-sidebar-foreground",
            !activeSlug &&
              "no-underline hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
          );
          return (
            <SidebarGroup key={category.slug} className="p-0">
              {!activeSlug ? (
                <SidebarGroupLabel asChild className={categoryHeaderClassName}>
                  <a
                    href={`#${category.slug}`}
                    data-docs-scroll-link
                    data-docs-target-id={category.slug}
                  >
                    <IconGlyph
                      name={category.icon}
                      className="size-3.5 shrink-0"
                    />
                    <span className="truncate">{category.name}</span>
                  </a>
                </SidebarGroupLabel>
              ) : (
                <SidebarGroupLabel className={categoryHeaderClassName}>
                  <IconGlyph
                    name={category.icon}
                    className="size-3.5 shrink-0"
                  />
                  <span className="truncate">{category.name}</span>
                </SidebarGroupLabel>
              )}
              <SidebarMenu>
                {projects.map((project) => {
                  const isActiveProject =
                    project.slug === activeSlug &&
                    category.slug === activeCategorySlug;
                  const hasActiveSections =
                    isActiveProject && activeSections.length > 0;
                  if (hasActiveSections) {
                    return (
                      <Collapsible.Root
                        key={project.slug}
                        asChild
                        defaultOpen={isActiveProject}
                      >
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            asChild
                            isActive
                            tooltip={project.displayName}
                            className="h-auto min-h-8 whitespace-normal px-2 py-1.5 text-[0.85rem] leading-[1.19rem]"
                          >
                            <a
                              href={withBasePath(project.href)}
                              aria-current="page"
                            >
                              <IconGlyph
                                name={project.icon}
                                className="size-4 shrink-0"
                              />
                              <span className="whitespace-normal break-words group-data-[collapsible=icon]:sr-only">
                                {project.displayName}
                              </span>
                            </a>
                          </SidebarMenuButton>
                          <Collapsible.Trigger asChild>
                            <SidebarMenuAction
                              className="data-[state=open]:rotate-90"
                              aria-label={`Toggle ${project.displayName} sections`}
                            >
                              <ChevronRight />
                              <span className="sr-only">
                                Toggle {project.displayName} sections
                              </span>
                            </SidebarMenuAction>
                          </Collapsible.Trigger>
                          <Collapsible.Content>
                            <SidebarMenuSub className="mb-2 ml-3 mr-0 mt-0.5 gap-0 border-l-0 px-0 py-0.5">
                              {activeSections.map((section) => {
                                const [, number, title] =
                                  /^(\S+)\s+(.+)$/.exec(section.label) || [];
                                return (
                                  <SidebarMenuSubItem key={section.id}>
                                    <SidebarMenuSubButton
                                      asChild
                                      className="my-px ml-[7px] mr-2 h-auto w-[calc(100%-15px)] items-start gap-2 whitespace-normal px-2 py-1.5 text-[0.82rem] leading-[1.18rem]"
                                    >
                                      <a
                                        href={`#${section.id}`}
                                        data-docs-scroll-link
                                        aria-label={section.label}
                                      >
                                        {number ? (
                                          <span className="w-4 shrink-0 text-sidebar-foreground/60">
                                            {number}
                                          </span>
                                        ) : null}
                                        <span className="whitespace-normal break-words">
                                          {title || section.label}
                                        </span>
                                      </a>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          </Collapsible.Content>
                        </SidebarMenuItem>
                      </Collapsible.Root>
                    );
                  }
                  return (
                    <SidebarMenuItem key={project.slug}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActiveProject}
                        tooltip={project.displayName}
                        className="h-auto min-h-8 whitespace-normal px-2 py-1.5 text-[0.85rem] leading-[1.19rem]"
                      >
                        <a
                          href={withBasePath(project.href)}
                          aria-current={isActiveProject ? "page" : undefined}
                        >
                          <IconGlyph
                            name={project.icon}
                            className="size-4 shrink-0"
                          />
                          <span className="whitespace-normal break-words group-data-[collapsible=icon]:sr-only">
                            {project.displayName}
                          </span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

function docsCatalogProjectsByCategory(
  projectCatalog: DocsProjectCatalog,
  category: ProtocolCategory,
) {
  const selected = new Set(category.projectSlugs || []);
  return projectCatalog.projects
    .filter((project) => selected.has(project.slug))
    .map((project) => ({
      ...project,
      href: `/docs/${project.slug}/`,
    }));
}
