"use client";

import { Menu } from "lucide-react";

import {
  NavigationMenuContent,
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { MicronautLogo } from "@/components/web/micronaut-logo";
import { SearchDialog } from "@/components/web/search-dialog";
import type { ExperienceTheme } from "@/lib/experience-theme";
import { withBasePath, withSurfacePath } from "@/lib/base-path";
import { cn } from "@/lib/utils";

type SurfaceId = "main" | "docs" | "guides" | "launch";
type MainSiteSearchPage = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
};

const primaryLinks: Array<{ href: string; label: string; surface: SurfaceId }> = [
  { href: "/docs/", label: "Docs", surface: "docs" },
  { href: "/guides/", label: "Guides", surface: "guides" },
  { href: "/launch/", label: "Launch", surface: "launch" }
];

const menuGroups = [
  {
    label: "Learn",
    description: "Docs, guides, training, video, and starter paths.",
    links: [
      { href: "/learn/", label: "Learning overview", description: "All learning paths from the main site." },
      { href: "/download/", label: "Download", description: "Launch, CLI, and build-tool starter options." },
      { href: "/professional-training/", label: "Professional Training", description: "Structured training material for teams." },
      { href: "/category/microcast/", label: "Microcasts", description: "Short framework videos and episodes." },
      { href: "/category/webinar/", label: "Webinars", description: "Longer talks, demos, and framework sessions." }
    ]
  },
  {
    label: "Resources",
    description: "News, events, support, roadmap, and public proof.",
    links: [
      { href: "/resources/", label: "Resources overview", description: "Main index for resource pages." },
      { href: "/blog/", label: "Blog", description: "Project news and technical articles." },
      { href: "/foundation/", label: "Foundation", description: "Governance, sponsorship, brand, and community policy." },
      { href: "/upcoming-events/", label: "Upcoming Events", description: "Events, talks, webinars, and community sessions." },
      { href: "/category/release-announcements/", label: "Release Announcements", description: "Framework and ecosystem release updates." },
      { href: "/micronaut-roadmap/", label: "Roadmap", description: "Project direction and planned investment areas." },
      { href: "/category/security-announcements/", label: "Security Announcements", description: "Security-related project communication." },
      { href: "/support/", label: "Commercial Support", description: "Support paths for production adoption." },
      { href: "/resources/community-support/", label: "Community Support", description: "Community channels, repositories, and discussion." },
      { href: "/faq/", label: "FAQ", description: "Frequently asked questions." },
      { href: "/micronaut-success-stories/", label: "Success Stories", description: "Public production usage stories." }
    ]
  },
  {
    label: "Foundation",
    description: "Governance, sponsorship, brand, and community policy.",
    links: [
      { href: "/foundation/", label: "Foundation overview", description: "Project support, community, and governance." },
      { href: "/foundation/corporate-sponsorship/", label: "Corporate Sponsorship", description: "Organization support for project sustainability." },
      { href: "/foundation/community-sponsorship/", label: "Community Sponsorship", description: "Community support routes for the foundation." },
      { href: "/foundation/sponsors/", label: "Sponsors", description: "Organizations supporting the project." },
      { href: "/meeting-minutes/", label: "Meeting Minutes", description: "Public governance and advisory records." },
      { href: "/brand-guidelines/", label: "Brand Guidelines", description: "Logo, brand, and trademark usage." },
      { href: "/community-guidelines/", label: "Code of Conduct", description: "Community participation expectations." }
    ]
  }
];

const mobileGroups = [
  {
    label: "Primary",
    links: [
      { href: "/docs/", label: "Docs" },
      { href: "/guides/", label: "Guides" },
      { href: "/launch/", label: "Launch" }
    ]
  },
  ...menuGroups.map((group) => ({
    label: group.label,
    links: group.links.map((link) => ({ href: link.href, label: link.label }))
  })),
  {
    label: "Legal",
    links: [
      { href: "/brand-guidelines/micronaut-logos/", label: "Logos" },
      { href: "/brand-guidelines/micronaut-trademark-policy/", label: "Trademark Policy" },
      { href: "/privacy-policy/", label: "Privacy Policy" },
      { href: "/contact/", label: "Contact" }
    ]
  }
];

export function SiteHeader({
  surface = "main",
  hideBrand = false,
  mainSitePages = [],
  theme = "default"
}: {
  surface?: SurfaceId;
  hideBrand?: boolean;
  mainSitePages?: MainSiteSearchPage[];
  theme?: ExperienceTheme;
}) {
  const desktopPrimaryLinks = primaryLinks.filter((link) => link.surface !== "main" && link.surface !== "launch");
  const desktopMenuGroups = menuGroups.filter((group) => group.label !== "Foundation");
  const effectiveTheme = theme;

  if (effectiveTheme !== "runtime") {
    return (
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[var(--page-max)] items-center gap-4 px-5 sm:px-6 xl:px-0">
          {!hideBrand ? (
            <a href={withSurfacePath("main", "/")} aria-label="Micronaut home" className="flex shrink-0 items-center gap-2 text-sm font-semibold text-foreground no-underline">
              <MicronautLogo className="h-11 w-[192px]" />
            </a>
          ) : null}
          <NavigationMenu viewport={false} className="hidden lg:flex">
            <NavigationMenuList>
              {desktopPrimaryLinks.map((link) => (
                <NavigationMenuItem key={link.href}>
                  <NavigationMenuLink
                    href={withSurfacePath(link.surface, link.href)}
                    active={surface === link.surface}
                    className={cn(
                      "h-8 rounded-md px-3 py-1.5 text-[0.88rem] transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                      surface === link.surface && "bg-accent text-accent-foreground"
                    )}
                  >
                    {link.label}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
              {desktopMenuGroups.map((group) => (
                <NavigationMenuItem key={group.label}>
                  <NavigationMenuTrigger className="h-8 bg-transparent px-3 text-[0.88rem]">
                    {group.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[560px] gap-2 p-2">
                      <div className="rounded-md bg-muted p-3">
                        <p className="text-sm font-semibold text-foreground">{group.label}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{group.description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {group.links.map((link) => (
                          <NavigationMenuLink
                            key={link.href}
                            href={withBasePath(link.href)}
                            className="min-h-20 rounded-md p-3"
                          >
                            <span className="font-medium">{link.label}</span>
                            <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {link.description}
                            </span>
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <SearchDialog
              className="h-9 w-9 justify-start px-2 text-sm sm:w-52 sm:px-3 xl:w-[280px]"
              mainSitePages={mainSitePages}
              mode={surface === "docs" ? "docs" : "site"}
            />
            <Button variant="outline" size="sm" className="hidden h-9 md:inline-flex" asChild>
              <a href={withSurfacePath("launch", "/launch/")}>Launch</a>
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden" aria-label="Open navigation">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[320px]">
                <SheetHeader>
                  <SheetTitle>Micronaut</SheetTitle>
                  <SheetDescription>Navigate main-site pages, documentation, guides, and Launch.</SheetDescription>
                </SheetHeader>
                <nav className="grid gap-5 overflow-y-auto px-4 pb-6">
                  {mobileGroups.map((group) => (
                    <div className="grid gap-2" key={group.label}>
                      <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {group.label}
                      </p>
                      {group.links.map((link) => (
                        <SheetClose asChild key={link.href}>
                          <a
                            href={withSurfacePath(primaryLinks.find((primaryLink) => primaryLink.href === link.href)?.surface || "main", link.href)}
                            className={cn(
                              "rounded-md px-3 py-2 text-[0.92rem] font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                              primaryLinks.some((primaryLink) => primaryLink.href === link.href && primaryLink.surface === surface) && "bg-accent"
                            )}
                          >
                            {link.label}
                          </a>
                        </SheetClose>
                      ))}
                    </div>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-mn-border/70 bg-mn-surface/85 shadow-sm shadow-slate-950/[0.03] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[var(--page-max)] items-center gap-4 px-5 sm:px-6 xl:px-0">
        {!hideBrand ? (
          <a href={withSurfacePath("main", "/")} aria-label="Micronaut home" className="flex shrink-0 items-center gap-2 text-sm font-semibold text-foreground no-underline">
            <MicronautLogo className="h-11 w-[192px]" />
          </a>
        ) : null}
        <NavigationMenu viewport={false} className="hidden lg:flex">
          <NavigationMenuList>
            {desktopPrimaryLinks.map((link) => (
              <NavigationMenuItem key={link.href}>
                <NavigationMenuLink
                  href={withSurfacePath(link.surface, link.href)}
                  active={surface === link.surface}
                  className={cn(
                    "h-9 rounded-full px-3.5 py-2 text-[0.88rem] text-mn-muted transition-colors hover:bg-mn-surface-raised hover:text-mn-text focus:bg-mn-surface-raised focus:text-mn-text",
                    surface === link.surface && "bg-mn-surface-raised text-mn-text ring-1 ring-mn-border"
                  )}
                >
                  {link.label}
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
            {desktopMenuGroups.map((group) => (
              <NavigationMenuItem key={group.label}>
                <NavigationMenuTrigger className="h-9 rounded-full bg-transparent px-3.5 text-[0.88rem] text-mn-muted hover:bg-mn-surface-raised hover:text-mn-text data-[state=open]:bg-mn-surface-raised data-[state=open]:text-mn-text">
                  {group.label}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid w-[560px] gap-2 p-2">
                    <div className="rounded-md border border-mn-border/70 bg-mn-surface-raised p-3">
                      <p className="text-sm font-semibold text-foreground">{group.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{group.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {group.links.map((link) => (
                        <NavigationMenuLink
                          key={link.href}
                          href={withBasePath(link.href)}
                          className="min-h-20 rounded-md p-3"
                        >
                          <span className="font-medium">{link.label}</span>
                          <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {link.description}
                          </span>
                        </NavigationMenuLink>
                      ))}
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <SearchDialog
            className="h-9 w-9 justify-start rounded-full border-mn-border bg-mn-surface/90 px-2 text-sm shadow-sm shadow-slate-950/[0.04] hover:bg-mn-surface-raised sm:w-56 sm:px-3 xl:w-[300px]"
            mainSitePages={mainSitePages}
            mode={surface === "docs" ? "docs" : "site"}
            buttonLabel="Command search..."
          />
          <Button variant="outline" size="sm" className="hidden h-9 rounded-full border-mn-red/30 bg-mn-red text-mn-bg shadow-sm shadow-mn-red/20 hover:bg-mn-red/90 hover:text-mn-bg md:inline-flex" asChild>
            <a href={withSurfacePath("launch", "/launch/")}>Launch</a>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Open navigation">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[320px]">
              <SheetHeader>
                <SheetTitle>Micronaut</SheetTitle>
                <SheetDescription>Navigate main-site pages, documentation, guides, and Launch.</SheetDescription>
              </SheetHeader>
              <nav className="grid gap-5 overflow-y-auto px-4 pb-6">
                {mobileGroups.map((group) => (
                  <div className="grid gap-2" key={group.label}>
                    <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </p>
                    {group.links.map((link) => (
                      <SheetClose asChild key={link.href}>
                        <a
                          href={withSurfacePath(primaryLinks.find((primaryLink) => primaryLink.href === link.href)?.surface || "main", link.href)}
                          className={cn(
                            "rounded-md px-3 py-2 text-[0.92rem] font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                            primaryLinks.some((primaryLink) => primaryLink.href === link.href && primaryLink.surface === surface) && "bg-accent"
                          )}
                        >
                          {link.label}
                        </a>
                      </SheetClose>
                    ))}
                  </div>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
