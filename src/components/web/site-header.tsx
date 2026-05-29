"use client";

import { Menu } from "lucide-react";

import {
  NavigationMenuContent,
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MicronautLogo } from "@/components/web/micronaut-logo";
import { SearchDialog } from "@/components/web/search-dialog";
import { ThemeModeSwitch } from "@/components/web/theme-toggle";
import {
  withConfiguredBasePath,
  withConfiguredSurfacePath,
  type SiteSurfaceUrls,
} from "@/lib/base-path";
import { cn } from "@/lib/utils";

type SurfaceId = "main" | "docs" | "guides" | "launch";
type MainSiteSearchPage = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
};

const primaryLinks: Array<{ href: string; label: string; surface: SurfaceId }> =
  [
    { href: "/docs/", label: "Docs", surface: "docs" },
    { href: "/guides/", label: "Guides", surface: "guides" },
    { href: "/launch/", label: "Launch", surface: "launch" },
  ];

type MobileMenuLink = {
  href: string;
  label: string;
  surface?: SurfaceId;
};

const menuGroups = [
  {
    label: "Learn",
    description: "Docs, guides, training, video, and starter paths.",
    links: [
      {
        href: "/learn/",
        label: "Learning overview",
        description: "All learning paths from the main site.",
      },
      {
        href: "/download/",
        label: "Download",
        description: "Launch, CLI, and build-tool starter options.",
      },
      {
        href: "/professional-training/",
        label: "Professional Training",
        description: "Structured training material for teams.",
      },
      {
        href: "/category/microcast/",
        label: "Microcasts",
        description: "Short framework videos and episodes.",
      },
      {
        href: "/category/webinar/",
        label: "Webinars",
        description: "Longer talks, demos, and framework sessions.",
      },
    ],
  },
  {
    label: "Resources",
    description: "News, events, support, roadmap, and public proof.",
    links: [
      {
        href: "/resources/",
        label: "Resources overview",
        description: "Main index for resource pages.",
      },
      {
        href: "/blog/",
        label: "Blog",
        description: "Project news and technical articles.",
      },
      {
        href: "/foundation/",
        label: "Foundation",
        description: "Governance, sponsorship, brand, and community policy.",
      },
      {
        href: "/upcoming-events/",
        label: "Upcoming Events",
        description: "Events, talks, webinars, and community sessions.",
      },
      {
        href: "/category/release-announcements/",
        label: "Release Announcements",
        description: "Framework and ecosystem release updates.",
      },
      {
        href: "/micronaut-roadmap/",
        label: "Roadmap",
        description: "Project direction and planned investment areas.",
      },
      {
        href: "/category/security-announcements/",
        label: "Security Announcements",
        description: "Security-related project communication.",
      },
      {
        href: "/support/",
        label: "Commercial Support",
        description: "Support paths for production adoption.",
      },
      {
        href: "/resources/community-support/",
        label: "Community Support",
        description: "Community channels, repositories, and discussion.",
      },
      {
        href: "/faq/",
        label: "FAQ",
        description: "Frequently asked questions.",
      },
      {
        href: "/micronaut-success-stories/",
        label: "Success Stories",
        description: "Public production usage stories.",
      },
    ],
  },
  {
    label: "Foundation",
    description: "Governance, sponsorship, brand, and community policy.",
    links: [
      {
        href: "/foundation/",
        label: "Foundation overview",
        description: "Project support, community, and governance.",
      },
      {
        href: "/foundation/corporate-sponsorship/",
        label: "Corporate Sponsorship",
        description: "Organization support for project sustainability.",
      },
      {
        href: "/foundation/community-sponsorship/",
        label: "Community Sponsorship",
        description: "Community support routes for the foundation.",
      },
      {
        href: "/foundation/sponsors/",
        label: "Sponsors",
        description: "Organizations supporting the project.",
      },
      {
        href: "/meeting-minutes/",
        label: "Meeting Minutes",
        description: "Public governance and advisory records.",
      },
      {
        href: "/brand-guidelines/",
        label: "Brand Guidelines",
        description: "Logo, brand, and trademark usage.",
      },
      {
        href: "/community-guidelines/",
        label: "Code of Conduct",
        description: "Community participation expectations.",
      },
    ],
  },
];

const mobileGroups: Array<{ label: string; links: MobileMenuLink[] }> = [
  {
    label: "Browse",
    links: [
      { href: "/docs/", label: "Docs", surface: "docs" },
      { href: "/guides/", label: "Guides", surface: "guides" },
      { href: "/blog/", label: "Blog", surface: "main" },
      { href: "/launch/", label: "Launch", surface: "launch" },
    ],
  },
  ...menuGroups.map((group) => ({
    label: group.label,
    links: group.links.map((link) => ({ href: link.href, label: link.label })),
  })),
  {
    label: "Legal",
    links: [
      { href: "/brand-guidelines/micronaut-logos/", label: "Logos" },
      {
        href: "/brand-guidelines/micronaut-trademark-policy/",
        label: "Trademark Policy",
      },
      { href: "/privacy-policy/", label: "Privacy Policy" },
      { href: "/contact/", label: "Contact" },
    ],
  },
];

function MobileColorModeSwitch() {
  return (
    <div className="flex items-center justify-between px-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Color mode
      </p>
      <ThemeModeSwitch />
    </div>
  );
}

function isActiveMobileLink(link: MobileMenuLink, surface: SurfaceId) {
  return Boolean(
    link.surface && link.surface !== "main" && link.surface === surface,
  );
}

export function SiteHeader({
  docsSearchIndexUrl,
  surface = "main",
  hideBrand = false,
  mainSitePages = [],
  navigationUrls,
}: {
  docsSearchIndexUrl?: string;
  surface?: SurfaceId;
  hideBrand?: boolean;
  mainSitePages?: MainSiteSearchPage[];
  navigationUrls?: SiteSurfaceUrls;
}) {
  const surfaceHref = (targetSurface: SurfaceId, href: string) =>
    withConfiguredSurfacePath(targetSurface, href, navigationUrls);
  const mobileLinkHref = (link: MobileMenuLink) =>
    withConfiguredSurfacePath(
      link.surface || "main",
      link.href,
      navigationUrls,
    );
  const desktopPrimaryLinks = primaryLinks.filter(
    (link) => link.surface !== "main" && link.surface !== "launch",
  );
  const desktopMenuGroups = menuGroups.filter(
    (group) => group.label !== "Foundation",
  );

  return (
    <header className="border-b bg-card/95 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[var(--page-max)] items-center gap-2 px-4 sm:px-6 lg:gap-4 xl:px-0">
        {!hideBrand ? (
          <a
            href={surfaceHref("main", "/")}
            aria-label="Micronaut home"
            className="flex shrink-0 items-center gap-2 text-sm font-semibold text-foreground no-underline"
          >
            <MicronautLogo
              assetBaseUrl={navigationUrls?.main}
              className="h-9 w-[156px] sm:h-11 sm:w-[192px]"
            />
          </a>
        ) : null}
        <NavigationMenu viewport={false} className="hidden lg:flex">
          <NavigationMenuList>
            {desktopPrimaryLinks.map((link) => (
              <NavigationMenuItem key={link.href}>
                <NavigationMenuLink
                  href={surfaceHref(link.surface, link.href)}
                  active={surface === link.surface}
                  className={cn(
                    "h-8 rounded-md px-3 py-1.5 text-[0.88rem] transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    surface === link.surface &&
                      "bg-accent text-accent-foreground",
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
                      <p className="text-sm font-semibold text-foreground">
                        {group.label}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {group.description}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {group.links.map((link) => (
                        <NavigationMenuLink
                          key={link.href}
                          href={withConfiguredBasePath(
                            link.href,
                            navigationUrls,
                          )}
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
            navigationUrls={navigationUrls}
            docsSearchIndexUrl={docsSearchIndexUrl}
          />
          <Button
            variant="outline"
            size="sm"
            className="hidden h-9 lg:inline-flex"
            asChild
          >
            <a href={surfaceHref("launch", "/launch/")}>Launch</a>
          </Button>
          <ThemeModeSwitch className="hidden lg:inline-flex" />
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
                aria-label="Open navigation"
              >
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[calc(100vw-1rem)] max-w-sm overflow-hidden">
              <SheetHeader>
                <SheetTitle>Micronaut</SheetTitle>
                <SheetDescription>
                  Navigate main-site pages, documentation, guides, and Launch.
                </SheetDescription>
              </SheetHeader>
              <nav
                className="grid gap-5 overflow-y-auto px-4 pb-6"
                data-mobile-navigation
              >
                {mobileGroups.map((group) => {
                  const isBrowseGroup = group.label === "Browse";
                  return (
                    <div
                      className="grid gap-2"
                      key={group.label}
                      data-mobile-navigation-group={group.label}
                    >
                      <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {group.label}
                      </p>
                      <div
                        className={cn(
                          "grid gap-2",
                          isBrowseGroup && "grid-cols-2",
                        )}
                      >
                        {group.links.map((link) => (
                          <SheetClose asChild key={link.href}>
                            <a
                              href={mobileLinkHref(link)}
                              aria-current={
                                isActiveMobileLink(link, surface)
                                  ? "page"
                                  : undefined
                              }
                              className={cn(
                                "rounded-md text-[0.92rem] font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                                isBrowseGroup
                                  ? "flex min-h-14 items-center border bg-card px-3 py-3"
                                  : "px-3 py-2",
                                isActiveMobileLink(link, surface) &&
                                  "bg-accent",
                              )}
                            >
                              {link.label}
                            </a>
                          </SheetClose>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <MobileColorModeSwitch />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
