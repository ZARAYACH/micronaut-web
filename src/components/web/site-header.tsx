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
import { ThemeToggle } from "@/components/web/theme-toggle";
import { cn } from "@/lib/utils";

type SurfaceId = "main" | "docs" | "guides" | "launch";

const primaryLinks: Array<{ href: string; label: string; surface: SurfaceId }> = [
  { href: "/", label: "Main", surface: "main" },
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
      { href: "/quick-start/", label: "Quick Start", description: "Start quickly with Launch and guides." },
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
      { href: "/our-team/", label: "Our Team", description: "People and groups behind the framework." },
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
      { href: "/", label: "Main" },
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
  hideBrand = false
}: {
  surface?: SurfaceId;
  hideBrand?: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1240px] items-center gap-4 px-4 md:px-6">
        {!hideBrand ? (
          <a href="/" className="flex shrink-0 items-center gap-2 text-sm font-semibold text-foreground no-underline">
            <MicronautLogo />
          </a>
        ) : null}
        <NavigationMenu viewport={false} className="hidden md:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink
                href="/"
                active={surface === "main"}
                className={cn(
                  "rounded-md px-3 py-2 text-[0.92rem] transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                  surface === "main" && "bg-accent text-accent-foreground"
                )}
              >
                Main
              </NavigationMenuLink>
            </NavigationMenuItem>
            {menuGroups.map((group) => (
              <NavigationMenuItem key={group.label}>
                <NavigationMenuTrigger className="bg-transparent px-3 text-[0.92rem]">
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
                          href={link.href}
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
            {primaryLinks.filter((link) => link.surface !== "main" && link.surface !== "launch").map((link) => (
              <NavigationMenuItem key={link.href}>
                <NavigationMenuLink
                  href={link.href}
                  active={surface === link.surface}
                  className={cn(
                    "rounded-md px-3 py-2 text-[0.92rem] transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    surface === link.surface && "bg-accent text-accent-foreground"
                  )}
                >
                  {link.label}
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <SearchDialog className="h-10 w-10 justify-start px-2 sm:w-64 sm:px-3 lg:w-80" />
          <Button variant="outline" className="hidden md:inline-flex" asChild>
            <a href="/launch/">Launch</a>
          </Button>
          <ThemeToggle />
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
                          href={link.href}
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
