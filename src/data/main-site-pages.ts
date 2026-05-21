export type MainSitePage = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  sourceUrl: string;
  primaryCta?: {
    label: string;
    href: string;
    external?: boolean;
  };
  secondaryCta?: {
    label: string;
    href: string;
    external?: boolean;
  };
  sections: Array<{
    title: string;
    body: string;
    icon: string;
  }>;
};

export type MainSitePageContent = {
  intro?: string;
  blocks: Array<{
    title: string;
    body?: string;
    items?: string[];
    links?: Array<{
      label: string;
      href: string;
      external?: boolean;
    }>;
    code?: string;
  }>;
};

export const mainSitePages: MainSitePage[] = [
  {
    slug: "download",
    title: "Download Micronaut",
    eyebrow: "Start",
    description: "Get Micronaut through Launch, the CLI, or your build tool and start a JVM application with the stack that matches your project.",
    sourceUrl: "https://micronaut.io/download/",
    primaryCta: { label: "Launch a project", href: "/launch/" },
    secondaryCta: { label: "View documentation", href: "/docs/" },
    sections: [
      { title: "Launch", body: "Generate a project from the Micronaut Starter backend with language, build tool, JDK, test framework, and features selected up front.", icon: "rocket" },
      { title: "CLI workflow", body: "Use the Micronaut CLI when you want a terminal-first workflow for creating applications and adding features.", icon: "terminal" },
      { title: "Build-tool ready", body: "Generated applications are ready for Gradle or Maven and fit naturally into existing JVM build pipelines.", icon: "code" }
    ]
  },
  {
    slug: "learn",
    title: "Learn Micronaut",
    eyebrow: "Learn",
    description: "Follow documentation, guides, training, microcasts, and webinars to move from first application to production-ready services.",
    sourceUrl: "https://micronaut.io/learn/",
    primaryCta: { label: "Browse guides", href: "/guides/" },
    secondaryCta: { label: "View documentation", href: "/docs/" },
    sections: [
      { title: "Documentation", body: "Use the platform documentation to understand core concepts, modules, APIs, and configuration references.", icon: "book-open" },
      { title: "Guides", body: "Work through task-oriented tutorials by language, build tool, cloud provider, runtime, and feature area.", icon: "route" },
      { title: "Training and video", body: "Use training, microcasts, and webinars when a guided learning path is a better fit than reference material.", icon: "users" }
    ]
  },
  {
    slug: "professional-training",
    title: "Professional Training",
    eyebrow: "Learn",
    description: "Training resources help teams learn Micronaut fundamentals and production practices through structured material.",
    sourceUrl: "https://micronaut.io/professional-training/",
    primaryCta: { label: "Micronaut Fundamentals", href: "https://mylearn.oracle.com/ou/course/micronaut-fundamentals/151938/", external: true },
    secondaryCta: { label: "Browse guides", href: "/guides/" },
    sections: [
      { title: "Fundamentals", body: "Start with core Micronaut concepts before moving into integrations, testing, data access, and cloud deployment.", icon: "book-open" },
      { title: "Team enablement", body: "Structured training supports teams that need a common baseline before adopting a framework broadly.", icon: "users" },
      { title: "Practice-driven", body: "Pair training with guides and Launch-generated projects to reinforce the material in working applications.", icon: "test-tube-2" }
    ]
  },
  {
    slug: "category/microcast",
    title: "Microcasts",
    eyebrow: "Learn",
    description: "Short Micronaut videos and episodes focused on framework features, ecosystem updates, and practical developer workflows.",
    sourceUrl: "https://micronaut.io/category/microcast/",
    primaryCta: { label: "Open original archive", href: "https://micronaut.io/category/microcast/", external: true },
    secondaryCta: { label: "Browse guides", href: "/guides/" },
    sections: [
      { title: "Short format", body: "Microcasts are useful when a concise walkthrough is faster than reading a complete reference page.", icon: "video" },
      { title: "Feature focused", body: "Episodes generally map to concrete framework features, integrations, or release-era capabilities.", icon: "sparkles" },
      { title: "Learning companion", body: "Use microcasts alongside guides to see the same concepts demonstrated visually.", icon: "book-open" }
    ]
  },
  {
    slug: "category/webinar",
    title: "Webinars",
    eyebrow: "Learn",
    description: "Micronaut webinar content provides deeper talks, demos, and framework education for teams evaluating or adopting Micronaut.",
    sourceUrl: "https://micronaut.io/category/webinar/",
    primaryCta: { label: "Open original archive", href: "https://micronaut.io/category/webinar/", external: true },
    secondaryCta: { label: "View documentation", href: "/docs/" },
    sections: [
      { title: "Longer sessions", body: "Webinars are suited to deeper topics that need more context than a short guide or microcast.", icon: "users" },
      { title: "Architecture context", body: "Use webinar material to understand how Micronaut fits into cloud-native JVM architecture decisions.", icon: "workflow" },
      { title: "Follow-up path", body: "After a session, continue with documentation, guides, and Launch to build the demonstrated stack.", icon: "rocket" }
    ]
  },
  {
    slug: "resources",
    title: "Resources",
    eyebrow: "Resources",
    description: "Find announcements, events, roadmap information, support options, FAQs, contact paths, and public success stories.",
    sourceUrl: "https://micronaut.io/resources/",
    primaryCta: { label: "Read success stories", href: "/micronaut-success-stories/" },
    secondaryCta: { label: "Contact", href: "/contact/" },
    sections: [
      { title: "News and releases", body: "Use resource archives to follow project announcements, releases, security updates, and roadmap communication.", icon: "logs" },
      { title: "Support", body: "Choose commercial or community support depending on whether you need vendor assistance or peer community help.", icon: "message-square" },
      { title: "Success stories", body: "Public stories show how teams use Micronaut in production and where the framework fits.", icon: "check-circle" }
    ]
  },
  {
    slug: "upcoming-events",
    title: "Upcoming Events",
    eyebrow: "Resources",
    description: "Track upcoming Micronaut events, talks, webinars, and community opportunities from the project site.",
    sourceUrl: "https://micronaut.io/upcoming-events/",
    primaryCta: { label: "Open original events page", href: "https://micronaut.io/upcoming-events/", external: true },
    secondaryCta: { label: "Contact", href: "/contact/" },
    sections: [
      { title: "Events", body: "Use the events page to find project appearances, community sessions, and learning opportunities.", icon: "calendar" },
      { title: "Community", body: "Events are a practical way to meet Micronaut users, maintainers, and ecosystem contributors.", icon: "users" },
      { title: "Follow-up", body: "Pair event content with docs and guides to turn talks into working examples.", icon: "book-open" }
    ]
  },
  {
    slug: "blog",
    title: "Blog",
    eyebrow: "Resources",
    description: "Read Micronaut project news, technical articles, release posts, community updates, and ecosystem announcements.",
    sourceUrl: "https://micronaut.io/blog/",
    primaryCta: { label: "Open original blog", href: "https://micronaut.io/blog/", external: true },
    secondaryCta: { label: "Release announcements", href: "/category/release-announcements/" },
    sections: [
      { title: "Project news", body: "The blog is the main public channel for broader project updates and technical announcements.", icon: "logs" },
      { title: "Technical articles", body: "Posts provide context around features, integrations, practices, and ecosystem changes.", icon: "file-json" },
      { title: "Release context", body: "Use release posts alongside documentation when upgrading or evaluating new capabilities.", icon: "package" }
    ]
  },
  {
    slug: "category/release-announcements",
    title: "Release Announcements",
    eyebrow: "Resources",
    description: "Follow Micronaut release announcements for framework and ecosystem updates.",
    sourceUrl: "https://micronaut.io/category/release-announcements/",
    primaryCta: { label: "Open original archive", href: "https://micronaut.io/category/release-announcements/", external: true },
    secondaryCta: { label: "View documentation", href: "/docs/" },
    sections: [
      { title: "Release notes", body: "Announcement posts summarize important framework and module changes for each release cycle.", icon: "package" },
      { title: "Upgrade context", body: "Use release content to understand why a version matters before moving into project-specific documentation.", icon: "route" },
      { title: "Ecosystem coverage", body: "Release announcements often connect core framework changes with companion project updates.", icon: "boxes" }
    ]
  },
  {
    slug: "micronaut-roadmap",
    title: "Micronaut Roadmap",
    eyebrow: "Resources",
    description: "Review the project roadmap to understand planned direction, major themes, and areas of framework investment.",
    sourceUrl: "https://micronaut.io/micronaut-roadmap/",
    primaryCta: { label: "Open original roadmap", href: "https://micronaut.io/micronaut-roadmap/", external: true },
    secondaryCta: { label: "View docs", href: "/docs/" },
    sections: [
      { title: "Direction", body: "The roadmap communicates where the framework and ecosystem are headed.", icon: "radar" },
      { title: "Planning", body: "Teams can use roadmap context when evaluating adoption, upgrades, and platform investments.", icon: "workflow" },
      { title: "Project visibility", body: "Roadmap communication helps connect public project work with user-facing capabilities.", icon: "check-circle" }
    ]
  },
  {
    slug: "category/security-announcements",
    title: "Security Announcements",
    eyebrow: "Resources",
    description: "Track Micronaut security announcements and related project updates.",
    sourceUrl: "https://micronaut.io/category/security-announcements/",
    primaryCta: { label: "Open original archive", href: "https://micronaut.io/category/security-announcements/", external: true },
    secondaryCta: { label: "Security docs", href: "/docs/security/" },
    sections: [
      { title: "Announcements", body: "Security announcement archives are the public source for security-related project communication.", icon: "shield" },
      { title: "Operational awareness", body: "Teams should follow security updates alongside dependency management and release notes.", icon: "radar" },
      { title: "Security module", body: "Micronaut Security documentation covers authentication, authorization, and framework security integrations.", icon: "lock" }
    ]
  },
  {
    slug: "support",
    title: "Commercial Support",
    eyebrow: "Resources",
    description: "Commercial support paths help organizations get assistance for production Micronaut adoption and operations.",
    sourceUrl: "https://micronaut.io/support/",
    primaryCta: { label: "Contact support", href: "/contact/" },
    secondaryCta: { label: "Community support", href: "/resources/community-support/" },
    sections: [
      { title: "Production help", body: "Commercial support is the path for organizations that need accountable assistance around production usage.", icon: "shield" },
      { title: "Adoption guidance", body: "Support can help teams evaluate architecture decisions, upgrades, and framework integration questions.", icon: "workflow" },
      { title: "Community alternative", body: "Community channels remain available for open discussion, peer help, and project participation.", icon: "message-square" }
    ]
  },
  {
    slug: "resources/community-support",
    title: "Community Support",
    eyebrow: "Resources",
    description: "Use community support channels to ask questions, discuss Micronaut usage, and connect with other developers.",
    sourceUrl: "https://micronaut.io/resources/community-support/",
    primaryCta: { label: "Join Discord", href: "https://discord.com/invite/9xRFsHv98T", external: true },
    secondaryCta: { label: "GitHub projects", href: "https://github.com/micronaut-projects/", external: true },
    sections: [
      { title: "Discussion", body: "Community support is best for peer questions, project discussion, and learning from other users.", icon: "message-square" },
      { title: "Open source", body: "Micronaut development happens in public across the project repositories and issue trackers.", icon: "folder-git-2" },
      { title: "Social channels", body: "Use community channels to follow announcements, events, and project updates.", icon: "users" }
    ]
  },
  {
    slug: "faq",
    title: "FAQ",
    eyebrow: "Resources",
    description: "Frequently asked questions about Micronaut, its design goals, and how to use the framework.",
    sourceUrl: "https://micronaut.io/faq/",
    primaryCta: { label: "View documentation", href: "/docs/" },
    secondaryCta: { label: "Ask the community", href: "/resources/community-support/" },
    sections: [
      { title: "Framework basics", body: "FAQ content helps answer common questions before users dive into reference documentation.", icon: "book-open" },
      { title: "Adoption questions", body: "Use FAQ material to clarify framework positioning, supported languages, and expected workflows.", icon: "check-circle" },
      { title: "Next step", body: "When a question needs implementation detail, continue into documentation, guides, or Launch.", icon: "route" }
    ]
  },
  {
    slug: "contact",
    title: "Contact",
    eyebrow: "Resources",
    description: "Contact the Micronaut project or foundation for sponsorship, support, and project-related inquiries.",
    sourceUrl: "https://micronaut.io/contact/",
    primaryCta: { label: "Email Micronaut", href: "mailto:info@micronaut.io", external: true },
    secondaryCta: { label: "Community support", href: "/resources/community-support/" },
    sections: [
      { title: "General inquiries", body: "Use contact paths for project, foundation, sponsorship, and support questions.", icon: "mail" },
      { title: "Community questions", body: "Technical questions that benefit from public discussion are usually better suited to community channels.", icon: "message-square" },
      { title: "Sponsorship", body: "Foundation sponsorship questions can start through the project contact path.", icon: "gem" }
    ]
  },
  {
    slug: "micronaut-success-stories",
    title: "Micronaut Success Stories",
    eyebrow: "Resources",
    description: "Read public stories from teams and projects using Micronaut in production.",
    sourceUrl: "https://micronaut.io/micronaut-success-stories/",
    primaryCta: { label: "Open original stories", href: "https://micronaut.io/micronaut-success-stories/", external: true },
    secondaryCta: { label: "Launch a project", href: "/launch/" },
    sections: [
      { title: "Production usage", body: "Success stories provide concrete examples of organizations using Micronaut for real systems.", icon: "check-circle" },
      { title: "Architecture context", body: "Stories help evaluators understand where Micronaut fits across microservices, data, and cloud workloads.", icon: "workflow" },
      { title: "Evaluation path", body: "Use stories for confidence, then move into docs, guides, and Launch for hands-on evaluation.", icon: "rocket" }
    ]
  },
  {
    slug: "foundation",
    title: "Micronaut Foundation",
    eyebrow: "Foundation",
    description: "The Micronaut Foundation supports the open source framework, community, governance, and long-term project health.",
    sourceUrl: "https://micronaut.io/foundation/",
    primaryCta: { label: "Sponsorship", href: "/foundation/corporate-sponsorship/" },
    secondaryCta: { label: "Sponsors", href: "/foundation/sponsors/" },
    sections: [
      { title: "Open governance", body: "Foundation pages explain the organization and support structure behind the Micronaut project.", icon: "gem" },
      { title: "Community", body: "The foundation supports community participation, sponsorship, and project visibility.", icon: "users" },
      { title: "Sustainability", body: "Sponsorship helps sustain framework development, infrastructure, and community activity.", icon: "check-circle" }
    ]
  },
  {
    slug: "foundation/corporate-sponsorship",
    title: "Corporate Sponsorship",
    eyebrow: "Foundation",
    description: "Corporate sponsorship supports Micronaut Foundation work and gives organizations a way to invest in the project ecosystem.",
    sourceUrl: "https://micronaut.io/foundation/corporate-sponsorship/",
    primaryCta: { label: "Contact sponsorship", href: "mailto:info@micronaut.io", external: true },
    secondaryCta: { label: "View sponsors", href: "/foundation/sponsors/" },
    sections: [
      { title: "Project support", body: "Corporate sponsorship helps fund project work, community resources, and foundation operations.", icon: "gem" },
      { title: "Organization visibility", body: "Sponsors are connected with the public project and its ecosystem audience.", icon: "users" },
      { title: "Contact path", body: "Sponsorship inquiries should start through the foundation contact channel.", icon: "mail" }
    ]
  },
  {
    slug: "foundation/community-sponsorship",
    title: "Community Sponsorship",
    eyebrow: "Foundation",
    description: "Community sponsorship provides another path for supporting the Micronaut Foundation and open source project work.",
    sourceUrl: "https://micronaut.io/foundation/community-sponsorship/",
    primaryCta: { label: "Contact sponsorship", href: "mailto:info@micronaut.io", external: true },
    secondaryCta: { label: "Community support", href: "/resources/community-support/" },
    sections: [
      { title: "Community support", body: "Community sponsorship is aimed at people and groups who want to support the project directly.", icon: "users" },
      { title: "Foundation work", body: "Support helps sustain the framework, documentation, communication, and community infrastructure.", icon: "gem" },
      { title: "Participation", body: "Sponsorship complements open source contribution, issue reporting, documentation, and community help.", icon: "message-square" }
    ]
  },
  {
    slug: "foundation/sponsors",
    title: "Sponsors",
    eyebrow: "Foundation",
    description: "Micronaut Foundation sponsors support the project and its community.",
    sourceUrl: "https://micronaut.io/foundation/sponsors/",
    primaryCta: { label: "Become a sponsor", href: "/foundation/corporate-sponsorship/" },
    secondaryCta: { label: "Foundation overview", href: "/foundation/" },
    sections: [
      { title: "Sponsor recognition", body: "The sponsors page recognizes organizations and supporters contributing to project sustainability.", icon: "gem" },
      { title: "Ecosystem health", body: "Sponsorship helps fund ongoing work that benefits users across the Micronaut ecosystem.", icon: "check-circle" },
      { title: "Support options", body: "Corporate and community sponsorship routes provide different ways to participate.", icon: "route" }
    ]
  },
  {
    slug: "meeting-minutes",
    title: "Meeting Minutes",
    eyebrow: "Foundation",
    description: "Meeting minutes provide public foundation governance and project communication records.",
    sourceUrl: "https://micronaut.io/meeting-minutes/",
    primaryCta: { label: "Open original minutes", href: "https://micronaut.io/meeting-minutes/", external: true },
    secondaryCta: { label: "Foundation overview", href: "/foundation/" },
    sections: [
      { title: "Governance record", body: "Meeting minutes help make foundation activity visible to the community.", icon: "logs" },
      { title: "Project transparency", body: "Public records are part of a sustainable open source governance model.", icon: "check-circle" },
      { title: "Foundation context", body: "Use the foundation overview and sponsorship pages for broader project-support information.", icon: "gem" }
    ]
  },
  {
    slug: "brand-guidelines",
    title: "Brand Guidelines",
    eyebrow: "Legal and brand",
    description: "Brand guidelines explain correct Micronaut brand usage, including logo treatment and project identity.",
    sourceUrl: "https://micronaut.io/brand-guidelines/",
    primaryCta: { label: "Open original guidelines", href: "https://micronaut.io/brand-guidelines/", external: true },
    secondaryCta: { label: "Foundation", href: "/foundation/" },
    sections: [
      { title: "Logo usage", body: "Use official Micronaut logo variants and avoid recoloring or altering the mark.", icon: "layout-template" },
      { title: "Brand consistency", body: "Brand rules keep the framework identity consistent across sites, docs, talks, and community material.", icon: "check-circle" },
      { title: "Implementation", body: "This Astro site uses the local black and white logo assets to preserve brand-safe rendering.", icon: "code" }
    ]
  },
  {
    slug: "community-guidelines",
    title: "Community Code of Conduct",
    eyebrow: "Legal and community",
    description: "Community guidelines define expectations for participating in Micronaut project spaces.",
    sourceUrl: "https://micronaut.io/community-guidelines/",
    primaryCta: { label: "Open original guidelines", href: "https://micronaut.io/community-guidelines/", external: true },
    secondaryCta: { label: "Community support", href: "/resources/community-support/" },
    sections: [
      { title: "Community expectations", body: "Guidelines define the standards expected in public project and community channels.", icon: "users" },
      { title: "Participation", body: "Healthy participation supports open source collaboration, issue discussion, documentation, and user support.", icon: "message-square" },
      { title: "Shared spaces", body: "The same expectations apply across community support, events, and public collaboration spaces.", icon: "check-circle" }
    ]
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    eyebrow: "Legal",
    description: "The privacy policy documents how the Micronaut site handles privacy-related matters.",
    sourceUrl: "https://micronaut.io/privacy-policy/",
    primaryCta: { label: "Open original policy", href: "https://micronaut.io/privacy-policy/", external: true },
    secondaryCta: { label: "Contact", href: "/contact/" },
    sections: [
      { title: "Policy source", body: "The canonical privacy policy remains the source document for privacy-related questions.", icon: "shield" },
      { title: "Contact", body: "Use the contact page for questions related to site policies or foundation communication.", icon: "mail" },
      { title: "Policy navigation", body: "This page keeps policy navigation visible while preserving a link to the canonical policy.", icon: "route" }
    ]
  },
  {
    slug: "our-team",
    title: "Our Team",
    eyebrow: "Foundation",
    description: "Meet the people and project structure behind the Micronaut framework and its ecosystem.",
    sourceUrl: "https://micronaut.io/our-team/",
    primaryCta: { label: "Foundation overview", href: "/foundation/" },
    secondaryCta: { label: "Community support", href: "/resources/community-support/" },
    sections: [
      { title: "Project contributors", body: "The team page introduces the people and groups involved in maintaining and growing Micronaut.", icon: "users" },
      { title: "Open source work", body: "Micronaut development happens across public repositories, documentation, guides, and community channels.", icon: "folder-git-2" },
      { title: "Foundation context", body: "Foundation pages explain governance, sponsorship, and the long-term support model around the framework.", icon: "gem" }
    ]
  },
  {
    slug: "quick-start",
    title: "Quick Start",
    eyebrow: "Start",
    description: "Start a Micronaut application quickly with the starter workflow, documentation, and task-oriented guides.",
    sourceUrl: "https://micronaut.io/quick-start/",
    primaryCta: { label: "Launch a project", href: "/launch/" },
    secondaryCta: { label: "Browse guides", href: "/guides/" },
    sections: [
      { title: "Generate", body: "Use Launch to choose a language, build tool, JDK, test framework, and features before downloading a project.", icon: "rocket" },
      { title: "Run", body: "Generated applications are ready for local development with the selected build tool and project structure.", icon: "terminal" },
      { title: "Learn next", body: "Follow guides after generating a project to add HTTP endpoints, data access, cloud integrations, and tests.", icon: "route" }
    ]
  },
  {
    slug: "resources/community-support/event-publication-request",
    title: "Event Publication Request",
    eyebrow: "Resources",
    description: "Request publication of a Micronaut-related event through the canonical project site flow.",
    sourceUrl: "https://micronaut.io/resources/community-support/event-publication-request/",
    primaryCta: { label: "Open request page", href: "https://micronaut.io/resources/community-support/event-publication-request/", external: true },
    secondaryCta: { label: "Upcoming events", href: "/upcoming-events/" },
    sections: [
      { title: "Event details", body: "The original request page remains the right place for form submission and event-specific fields.", icon: "calendar" },
      { title: "Community visibility", body: "Event publication helps Micronaut users find talks, webinars, meetups, and related learning opportunities.", icon: "users" },
      { title: "Follow-up", body: "Use the events page to review published event information and related announcements.", icon: "logs" }
    ]
  },
  {
    slug: "payment-confirmation",
    title: "Payment Confirmation",
    eyebrow: "Foundation",
    description: "Confirmation page for payment-related flows on the Micronaut Foundation site.",
    sourceUrl: "https://micronaut.io/payment-confirmation/",
    primaryCta: { label: "Foundation overview", href: "/foundation/" },
    secondaryCta: { label: "Contact", href: "/contact/" },
    sections: [
      { title: "Transaction flow", body: "Payment confirmation is preserved as a route for foundation and sponsorship workflows.", icon: "check-circle" },
      { title: "Sponsorship", body: "Foundation sponsorship pages explain corporate and community support options.", icon: "gem" },
      { title: "Questions", body: "Use the contact page for payment, sponsorship, or foundation-related questions.", icon: "mail" }
    ]
  },
  {
    slug: "payment-failed",
    title: "Payment Failed",
    eyebrow: "Foundation",
    description: "Failure page for payment-related flows on the Micronaut Foundation site.",
    sourceUrl: "https://micronaut.io/payment-failed/",
    primaryCta: { label: "Contact", href: "/contact/" },
    secondaryCta: { label: "Foundation overview", href: "/foundation/" },
    sections: [
      { title: "Payment status", body: "This route is preserved for payment flows that need a failure destination.", icon: "shield" },
      { title: "Retry path", body: "Use foundation sponsorship pages to restart or review the relevant support path.", icon: "route" },
      { title: "Support", body: "Contact the project if a payment, sponsorship, or foundation flow needs follow-up.", icon: "mail" }
    ]
  },
  {
    slug: "professional-training/event-driven-microservices-with-micronaut",
    title: "Event-Driven Microservices with Micronaut",
    eyebrow: "Training",
    description: "Training material for building event-driven microservices with Micronaut and related messaging patterns.",
    sourceUrl: "https://micronaut.io/professional-training/event-driven-microservices-with-micronaut/",
    primaryCta: { label: "Open original training page", href: "https://micronaut.io/professional-training/event-driven-microservices-with-micronaut/", external: true },
    secondaryCta: { label: "Training overview", href: "/professional-training/" },
    sections: [
      { title: "Event-driven design", body: "The course page focuses on applying Micronaut to message-driven service architectures.", icon: "workflow" },
      { title: "Microservices", body: "Training complements the guides and docs for teams adopting distributed application patterns.", icon: "boxes" },
      { title: "Hands-on path", body: "Use Launch and guides to reinforce the same concepts in a generated application.", icon: "rocket" }
    ]
  },
  {
    slug: "professional-training/micronaut-data",
    title: "Micronaut Data Training",
    eyebrow: "Training",
    description: "Training material focused on Micronaut Data and compile-time repository access.",
    sourceUrl: "https://micronaut.io/professional-training/micronaut-data/",
    primaryCta: { label: "Open original training page", href: "https://micronaut.io/professional-training/micronaut-data/", external: true },
    secondaryCta: { label: "View Micronaut Data docs", href: "/docs/data/" },
    sections: [
      { title: "Repository APIs", body: "Micronaut Data training focuses on repository patterns without runtime model scanning.", icon: "database" },
      { title: "Data access", body: "The material supports teams building service data layers with compile-time query and model support.", icon: "code" },
      { title: "Docs companion", body: "Use the docs and guides for implementation details after reviewing training material.", icon: "book-open" }
    ]
  },
  {
    slug: "professional-training/micronaut-essentials",
    title: "Micronaut Essentials",
    eyebrow: "Training",
    description: "Essentials training helps teams build a practical baseline across the framework's core workflows.",
    sourceUrl: "https://micronaut.io/professional-training/micronaut-essentials/",
    primaryCta: { label: "Open original training page", href: "https://micronaut.io/professional-training/micronaut-essentials/", external: true },
    secondaryCta: { label: "Training overview", href: "/professional-training/" },
    sections: [
      { title: "Core concepts", body: "Essentials content is a starting point for dependency injection, HTTP, testing, configuration, and application structure.", icon: "book-open" },
      { title: "Team baseline", body: "Training helps teams align on vocabulary and development patterns before deeper adoption.", icon: "users" },
      { title: "Practice path", body: "Generated starter applications and task-oriented guides provide a hands-on path after training.", icon: "test-tube-2" }
    ]
  },
  {
    slug: "brand-guidelines/micronaut-trademark-policy",
    title: "Micronaut Trademark Policy",
    eyebrow: "Legal and brand",
    description: "Trademark policy information for using the Micronaut name, marks, and related identity.",
    sourceUrl: "https://micronaut.io/brand-guidelines/micronaut-trademark-policy/",
    primaryCta: { label: "Open original policy", href: "https://micronaut.io/brand-guidelines/micronaut-trademark-policy/", external: true },
    secondaryCta: { label: "Brand guidelines", href: "/brand-guidelines/" },
    sections: [
      { title: "Trademark source", body: "The original policy remains canonical for legal and trademark usage questions.", icon: "shield" },
      { title: "Brand use", body: "Use official names, logos, and marks consistently when referencing Micronaut.", icon: "layout-template" },
      { title: "Questions", body: "Contact the project for questions that require legal or foundation follow-up.", icon: "mail" }
    ]
  },
  {
    slug: "brand-guidelines/micronaut-logos",
    title: "Micronaut Logos",
    eyebrow: "Legal and brand",
    description: "Official Micronaut logo assets and usage guidance for the framework brand.",
    sourceUrl: "https://micronaut.io/brand-guidelines/micronaut-logos/",
    primaryCta: { label: "Open original logo page", href: "https://micronaut.io/brand-guidelines/micronaut-logos/", external: true },
    secondaryCta: { label: "Brand guidelines", href: "/brand-guidelines/" },
    sections: [
      { title: "Official assets", body: "Use approved Micronaut logo variants rather than altered or recolored artwork.", icon: "layout-template" },
      { title: "Local rendering", body: "This Astro site uses checked-in black and white horizontal logo assets for the web shell.", icon: "code" },
      { title: "Trademark context", body: "Logo usage should be read together with the trademark policy and brand guidelines.", icon: "shield" }
    ]
  },
  {
    slug: "micronaut-success-stories/from-monolith-to-microservices-with-the-micronaut-framework",
    title: "From Monolith to Microservices with Micronaut",
    eyebrow: "Success story",
    description: "A public success story about moving from a monolith to microservices with the Micronaut framework.",
    sourceUrl: "https://micronaut.io/micronaut-success-stories/from-monolith-to-microservices-with-the-micronaut-framework/",
    primaryCta: { label: "Open original story", href: "https://micronaut.io/micronaut-success-stories/from-monolith-to-microservices-with-the-micronaut-framework/", external: true },
    secondaryCta: { label: "All success stories", href: "/micronaut-success-stories/" },
    sections: [
      { title: "Modernization", body: "The story is part of Micronaut's public production adoption material.", icon: "workflow" },
      { title: "Microservices", body: "It highlights Micronaut's fit for modular services and cloud application architectures.", icon: "boxes" },
      { title: "Evaluation", body: "Use success stories for confidence, then continue into docs, guides, and Launch.", icon: "rocket" }
    ]
  },
  {
    slug: "responding-to-unexpected-disruption-with-agility-and-speed",
    title: "Responding to Unexpected Disruption with Agility and Speed",
    eyebrow: "Success story",
    description: "A public Micronaut story about responding to disruption with faster application delivery.",
    sourceUrl: "https://micronaut.io/responding-to-unexpected-disruption-with-agility-and-speed/",
    primaryCta: { label: "Open original story", href: "https://micronaut.io/responding-to-unexpected-disruption-with-agility-and-speed/", external: true },
    secondaryCta: { label: "All success stories", href: "/micronaut-success-stories/" },
    sections: [
      { title: "Application delivery", body: "The story connects production agility with application delivery and links to the source page.", icon: "rocket" },
      { title: "Operational agility", body: "It supports the homepage message around fast, modular JVM services.", icon: "gauge" },
      { title: "Next step", body: "Continue with docs and guides to evaluate the same capabilities hands-on.", icon: "route" }
    ]
  },
  {
    slug: "micronaut-success-stories/caribou-success-story",
    title: "Caribou Success Story",
    eyebrow: "Success story",
    description: "A public success story showing Micronaut usage in a production organization.",
    sourceUrl: "https://micronaut.io/micronaut-success-stories/caribou-success-story/",
    primaryCta: { label: "Open original story", href: "https://micronaut.io/micronaut-success-stories/caribou-success-story/", external: true },
    secondaryCta: { label: "All success stories", href: "/micronaut-success-stories/" },
    sections: [
      { title: "Production story", body: "This page keeps the story reachable from the main website route structure.", icon: "check-circle" },
      { title: "Architecture context", body: "Success stories help teams understand where Micronaut fits in real applications.", icon: "workflow" },
      { title: "Evaluation path", body: "Use stories as proof, then move into documentation, guides, and generated starters.", icon: "rocket" }
    ]
  },
  {
    slug: "micronaut-success-stories/seamless-microservices-upgrade",
    title: "Seamless Microservices Upgrade",
    eyebrow: "Success story",
    description: "A public success story about upgrading microservices with the Micronaut framework.",
    sourceUrl: "https://micronaut.io/micronaut-success-stories/seamless-microservices-upgrade/",
    primaryCta: { label: "Open original story", href: "https://micronaut.io/micronaut-success-stories/seamless-microservices-upgrade/", external: true },
    secondaryCta: { label: "All success stories", href: "/micronaut-success-stories/" },
    sections: [
      { title: "Upgrade path", body: "The story supports evaluation of Micronaut for service modernization and framework upgrades.", icon: "route" },
      { title: "Microservices", body: "It belongs with the public production stories surfaced by the main website.", icon: "boxes" },
      { title: "Canonical source", body: "Open the original page for the full story content and media.", icon: "logs" }
    ]
  },
  {
    slug: "micronaut-success-stories/micronaut-framework-at-kestra",
    title: "Micronaut Framework at Kestra",
    eyebrow: "Success story",
    description: "Kestra's public Micronaut success story for workflow orchestration services.",
    sourceUrl: "https://micronaut.io/micronaut-success-stories/micronaut-framework-at-kestra/",
    primaryCta: { label: "Open original story", href: "https://micronaut.io/micronaut-success-stories/micronaut-framework-at-kestra/", external: true },
    secondaryCta: { label: "All success stories", href: "/micronaut-success-stories/" },
    sections: [
      { title: "Workflow platform", body: "The story gives a concrete public example of Micronaut used in a workflow orchestration product.", icon: "workflow" },
      { title: "Production services", body: "It reinforces the framework's fit for modular backend services.", icon: "boxes" },
      { title: "Further reading", body: "Use the success-story index for the broader set of public production references.", icon: "book-open" }
    ]
  },
  {
    slug: "micronaut-success-stories/agorapulse-micronaut-journey",
    title: "Agorapulse Micronaut Journey",
    eyebrow: "Success story",
    description: "Agorapulse's public story about a production application journey with Micronaut.",
    sourceUrl: "https://micronaut.io/micronaut-success-stories/agorapulse-micronaut-journey/",
    primaryCta: { label: "Open original story", href: "https://micronaut.io/micronaut-success-stories/agorapulse-micronaut-journey/", external: true },
    secondaryCta: { label: "All success stories", href: "/micronaut-success-stories/" },
    sections: [
      { title: "Production journey", body: "The story adds public adoption context for teams evaluating Micronaut.", icon: "check-circle" },
      { title: "Data and services", body: "It sits alongside the framework's data-access and microservice positioning.", icon: "database" },
      { title: "Hands-on path", body: "Follow a guide or launch a starter project after reviewing the story.", icon: "rocket" }
    ]
  },
  {
    slug: "using-micronaut-framework-at-sonar",
    title: "Using Micronaut Framework at Sonar",
    eyebrow: "Success story",
    description: "Sonar's public story about using the Micronaut framework.",
    sourceUrl: "https://micronaut.io/using-micronaut-framework-at-sonar/",
    primaryCta: { label: "Open original story", href: "https://micronaut.io/using-micronaut-framework-at-sonar/", external: true },
    secondaryCta: { label: "All success stories", href: "/micronaut-success-stories/" },
    sections: [
      { title: "Production reference", body: "This story is kept reachable as part of the main website content.", icon: "check-circle" },
      { title: "Developer tooling", body: "It provides another public example of Micronaut in a developer-focused organization.", icon: "code" },
      { title: "Canonical story", body: "Open the original story for full media, detail, and source copy.", icon: "logs" }
    ]
  },
  {
    slug: "category/case-studies",
    title: "Case Studies",
    eyebrow: "Resources",
    description: "Archive of Micronaut case studies and production usage stories.",
    sourceUrl: "https://micronaut.io/category/case-studies/",
    primaryCta: { label: "Open original archive", href: "https://micronaut.io/category/case-studies/", external: true },
    secondaryCta: { label: "Success stories", href: "/micronaut-success-stories/" },
    sections: [
      { title: "Case-study archive", body: "The original archive remains canonical for the current list of case-study posts.", icon: "logs" },
      { title: "Production proof", body: "Case studies support framework evaluation with examples from real teams.", icon: "check-circle" },
      { title: "Next step", body: "Use success-story pages, docs, and Launch to move from reading to hands-on evaluation.", icon: "rocket" }
    ]
  },
  {
    slug: "category/guest-post",
    title: "Guest Posts",
    eyebrow: "Resources",
    description: "Archive of guest posts from the Micronaut community and ecosystem.",
    sourceUrl: "https://micronaut.io/category/guest-post/",
    primaryCta: { label: "Open original archive", href: "https://micronaut.io/category/guest-post/", external: true },
    secondaryCta: { label: "Community support", href: "/resources/community-support/" },
    sections: [
      { title: "Community writing", body: "Guest posts provide community perspectives and ecosystem examples.", icon: "users" },
      { title: "Archive source", body: "The original archive remains canonical for the current post list.", icon: "logs" },
      { title: "Follow-up", body: "Use docs and guides to turn community articles into working examples.", icon: "book-open" }
    ]
  },
  {
    slug: "category/micronaut-4",
    title: "Micronaut 4",
    eyebrow: "Resources",
    description: "Archive of Micronaut 4 posts, announcements, and related project updates.",
    sourceUrl: "https://micronaut.io/category/micronaut-4/",
    primaryCta: { label: "Open original archive", href: "https://micronaut.io/category/micronaut-4/", external: true },
    secondaryCta: { label: "Release announcements", href: "/category/release-announcements/" },
    sections: [
      { title: "Version archive", body: "The category keeps Micronaut 4 posts grouped for upgrade and historical context.", icon: "package" },
      { title: "Upgrade context", body: "Use release posts together with documentation when planning a framework upgrade.", icon: "route" },
      { title: "Canonical list", body: "Open the original archive for the complete and current post list.", icon: "logs" }
    ]
  },
  {
    slug: "category/micronaut-5",
    title: "Micronaut 5",
    eyebrow: "Resources",
    description: "Archive of Micronaut 5 posts, announcements, and forward-looking project updates.",
    sourceUrl: "https://micronaut.io/category/micronaut-5/",
    primaryCta: { label: "Open original archive", href: "https://micronaut.io/category/micronaut-5/", external: true },
    secondaryCta: { label: "Roadmap", href: "/micronaut-roadmap/" },
    sections: [
      { title: "Version archive", body: "The category groups posts related to the next major framework direction.", icon: "package" },
      { title: "Planning", body: "Use roadmap and release content together when evaluating future adoption or upgrades.", icon: "radar" },
      { title: "Canonical list", body: "Open the original archive for the complete and current post list.", icon: "logs" }
    ]
  },
  {
    slug: "category/micronaut-framework-2",
    title: "Micronaut Framework 2",
    eyebrow: "Resources",
    description: "Archive of Micronaut Framework 2 posts and historical release-era material.",
    sourceUrl: "https://micronaut.io/category/micronaut-framework-2/",
    primaryCta: { label: "Open original archive", href: "https://micronaut.io/category/micronaut-framework-2/", external: true },
    secondaryCta: { label: "Release announcements", href: "/category/release-announcements/" },
    sections: [
      { title: "Historical context", body: "Older framework categories are preserved for users researching release history.", icon: "logs" },
      { title: "Upgrade path", body: "Release-era content can help explain why newer framework capabilities changed.", icon: "route" },
      { title: "Docs next", body: "Use current documentation for implementation details after reading historical posts.", icon: "book-open" }
    ]
  },
  {
    slug: "category/sponsor",
    title: "Sponsor",
    eyebrow: "Foundation",
    description: "Archive of sponsor-related posts and foundation support announcements.",
    sourceUrl: "https://micronaut.io/category/sponsor/",
    primaryCta: { label: "Open original archive", href: "https://micronaut.io/category/sponsor/", external: true },
    secondaryCta: { label: "Sponsorship", href: "/foundation/corporate-sponsorship/" },
    sections: [
      { title: "Sponsor updates", body: "Sponsor posts connect foundation support with public project communication.", icon: "gem" },
      { title: "Foundation support", body: "Sponsorship helps sustain project infrastructure, community activity, and framework work.", icon: "check-circle" },
      { title: "Canonical archive", body: "Open the original archive for the latest sponsor-related posts.", icon: "logs" }
    ]
  },
  {
    slug: "category/town-hall-meetings",
    title: "Town Hall Meetings",
    eyebrow: "Foundation",
    description: "Archive of Micronaut town hall meeting posts and community governance communication.",
    sourceUrl: "https://micronaut.io/category/town-hall-meetings/",
    primaryCta: { label: "Open original archive", href: "https://micronaut.io/category/town-hall-meetings/", external: true },
    secondaryCta: { label: "Meeting minutes", href: "/meeting-minutes/" },
    sections: [
      { title: "Community meetings", body: "Town hall posts support public communication around project direction and community topics.", icon: "users" },
      { title: "Governance context", body: "Meeting minutes and foundation pages provide adjacent governance material.", icon: "gem" },
      { title: "Canonical archive", body: "Open the original archive for the current post list.", icon: "logs" }
    ]
  },
  {
    slug: "category/uncategorized",
    title: "Uncategorized Posts",
    eyebrow: "Resources",
    description: "Archive of Micronaut posts that are not assigned to a more specific category.",
    sourceUrl: "https://micronaut.io/category/uncategorized/",
    primaryCta: { label: "Open original archive", href: "https://micronaut.io/category/uncategorized/", external: true },
    secondaryCta: { label: "Blog", href: "/blog/" },
    sections: [
      { title: "Archive route", body: "This route keeps the WordPress-era category URL available in the Astro main site.", icon: "logs" },
      { title: "Canonical source", body: "The original archive remains canonical for the current list of uncategorized posts.", icon: "route" },
      { title: "Resource path", body: "Use the blog and resource pages for higher-level navigation.", icon: "book-open" }
    ]
  },
  {
    slug: "meeting-minutes/2020-10-09",
    title: "Meeting Minutes: 2020-10-09",
    eyebrow: "Meeting minutes",
    description: "Public Micronaut meeting minutes for October 9, 2020.",
    sourceUrl: "https://micronaut.io/meeting-minutes/2020-10-09/",
    primaryCta: { label: "Open original minutes", href: "https://micronaut.io/meeting-minutes/2020-10-09/", external: true },
    secondaryCta: { label: "All meeting minutes", href: "/meeting-minutes/" },
    sections: [
      { title: "Governance record", body: "This page preserves the public meeting-minutes route in the main site.", icon: "logs" },
      { title: "Foundation context", body: "Meeting minutes sit alongside foundation pages and project-support material.", icon: "gem" },
      { title: "Canonical source", body: "Open the original page for the full minutes text.", icon: "book-open" }
    ]
  },
  {
    slug: "meeting-minutes/2021-03-12",
    title: "Meeting Minutes: 2021-03-12",
    eyebrow: "Meeting minutes",
    description: "Public Micronaut meeting minutes for March 12, 2021.",
    sourceUrl: "https://micronaut.io/meeting-minutes/2021-03-12/",
    primaryCta: { label: "Open original minutes", href: "https://micronaut.io/meeting-minutes/2021-03-12/", external: true },
    secondaryCta: { label: "All meeting minutes", href: "/meeting-minutes/" },
    sections: [
      { title: "Governance record", body: "This page preserves the public meeting-minutes route in the main site.", icon: "logs" },
      { title: "Foundation context", body: "Meeting minutes sit alongside foundation pages and project-support material.", icon: "gem" },
      { title: "Canonical source", body: "Open the original page for the full minutes text.", icon: "book-open" }
    ]
  },
  {
    slug: "meeting-minutes/2021-06-18",
    title: "Meeting Minutes: 2021-06-18",
    eyebrow: "Meeting minutes",
    description: "Public Micronaut meeting minutes for June 18, 2021.",
    sourceUrl: "https://micronaut.io/meeting-minutes/2021-06-18/",
    primaryCta: { label: "Open original minutes", href: "https://micronaut.io/meeting-minutes/2021-06-18/", external: true },
    secondaryCta: { label: "All meeting minutes", href: "/meeting-minutes/" },
    sections: [
      { title: "Governance record", body: "This page preserves the public meeting-minutes route in the main site.", icon: "logs" },
      { title: "Foundation context", body: "Meeting minutes sit alongside foundation pages and project-support material.", icon: "gem" },
      { title: "Canonical source", body: "Open the original page for the full minutes text.", icon: "book-open" }
    ]
  },
  {
    slug: "meeting-minutes/technology-advisory-board-meeting-minutes",
    title: "Technology Advisory Board Meeting Minutes",
    eyebrow: "Meeting minutes",
    description: "Public Technology Advisory Board meeting minutes for the Micronaut project.",
    sourceUrl: "https://micronaut.io/meeting-minutes/technology-advisory-board-meeting-minutes/",
    primaryCta: { label: "Open original minutes", href: "https://micronaut.io/meeting-minutes/technology-advisory-board-meeting-minutes/", external: true },
    secondaryCta: { label: "All meeting minutes", href: "/meeting-minutes/" },
    sections: [
      { title: "Advisory board", body: "The route preserves public Technology Advisory Board meeting records.", icon: "users" },
      { title: "Governance context", body: "Meeting minutes sit alongside foundation pages and sponsorship information.", icon: "gem" },
      { title: "Canonical source", body: "Open the original page for the full minutes text.", icon: "book-open" }
    ]
  },
  {
    slug: "meeting-minutes/2022-03-25",
    title: "Meeting Minutes: 2022-03-25",
    eyebrow: "Meeting minutes",
    description: "Public Micronaut meeting minutes for March 25, 2022.",
    sourceUrl: "https://micronaut.io/meeting-minutes/2022-03-25/",
    primaryCta: { label: "Open original minutes", href: "https://micronaut.io/meeting-minutes/2022-03-25/", external: true },
    secondaryCta: { label: "All meeting minutes", href: "/meeting-minutes/" },
    sections: [
      { title: "Governance record", body: "This page preserves the public meeting-minutes route in the main site.", icon: "logs" },
      { title: "Foundation context", body: "Meeting minutes sit alongside foundation pages and project-support material.", icon: "gem" },
      { title: "Canonical source", body: "Open the original page for the full minutes text.", icon: "book-open" }
    ]
  },
  {
    slug: "meeting-minutes/2022_11_15",
    title: "Meeting Minutes: 2022-11-15",
    eyebrow: "Meeting minutes",
    description: "Public Micronaut meeting minutes for November 15, 2022.",
    sourceUrl: "https://micronaut.io/meeting-minutes/2022_11_15/",
    primaryCta: { label: "Open original minutes", href: "https://micronaut.io/meeting-minutes/2022_11_15/", external: true },
    secondaryCta: { label: "All meeting minutes", href: "/meeting-minutes/" },
    sections: [
      { title: "Governance record", body: "This page preserves the public meeting-minutes route in the main site.", icon: "logs" },
      { title: "Foundation context", body: "Meeting minutes sit alongside foundation pages and project-support material.", icon: "gem" },
      { title: "Canonical source", body: "Open the original page for the full minutes text.", icon: "book-open" }
    ]
  },
  {
    slug: "meeting-minutes/technology-advisory-board-minutes",
    title: "Technology Advisory Board Minutes",
    eyebrow: "Meeting minutes",
    description: "Public Technology Advisory Board minutes for the Micronaut project.",
    sourceUrl: "https://micronaut.io/meeting-minutes/technology-advisory-board-minutes/",
    primaryCta: { label: "Open original minutes", href: "https://micronaut.io/meeting-minutes/technology-advisory-board-minutes/", external: true },
    secondaryCta: { label: "All meeting minutes", href: "/meeting-minutes/" },
    sections: [
      { title: "Advisory board", body: "The route preserves public Technology Advisory Board meeting records.", icon: "users" },
      { title: "Governance context", body: "Meeting minutes sit alongside foundation pages and sponsorship information.", icon: "gem" },
      { title: "Canonical source", body: "Open the original page for the full minutes text.", icon: "book-open" }
    ]
  },
  {
    slug: "meeting-minutes/4_24_2024",
    title: "Meeting Minutes: 2024-04-24",
    eyebrow: "Meeting minutes",
    description: "Public Micronaut meeting minutes for April 24, 2024.",
    sourceUrl: "https://micronaut.io/meeting-minutes/4_24_2024/",
    primaryCta: { label: "Open original minutes", href: "https://micronaut.io/meeting-minutes/4_24_2024/", external: true },
    secondaryCta: { label: "All meeting minutes", href: "/meeting-minutes/" },
    sections: [
      { title: "Governance record", body: "This page preserves the public meeting-minutes route in the main site.", icon: "logs" },
      { title: "Foundation context", body: "Meeting minutes sit alongside foundation pages and project-support material.", icon: "gem" },
      { title: "Canonical source", body: "Open the original page for the full minutes text.", icon: "book-open" }
    ]
  }
];

export const mainSiteFooterGroups = [
  {
    title: "Start",
    links: [
      { label: "Main", href: "/" },
      { label: "Download", href: "/download/" },
      { label: "Quick Start", href: "/quick-start/" },
      { label: "Launch", href: "/launch/" }
    ]
  },
  {
    title: "Learn",
    links: [
      { label: "Overview", href: "/learn/" },
      { label: "Docs", href: "/docs/" },
      { label: "Guides", href: "/guides/" },
      { label: "Training", href: "/professional-training/" },
      { label: "Microcasts", href: "/category/microcast/" },
      { label: "Webinars", href: "/category/webinar/" }
    ]
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "/blog/" },
      { label: "Events", href: "/upcoming-events/" },
      { label: "Releases", href: "/category/release-announcements/" },
      { label: "Roadmap", href: "/micronaut-roadmap/" },
      { label: "Security", href: "/category/security-announcements/" },
      { label: "FAQ", href: "/faq/" },
      { label: "Contact", href: "/contact/" }
    ]
  },
  {
    title: "Foundation",
    links: [
      { label: "Overview", href: "/foundation/" },
      { label: "Team", href: "/our-team/" },
      { label: "Corporate Sponsorship", href: "/foundation/corporate-sponsorship/" },
      { label: "Community Sponsorship", href: "/foundation/community-sponsorship/" },
      { label: "Sponsors", href: "/foundation/sponsors/" },
      { label: "Meeting Minutes", href: "/meeting-minutes/" }
    ]
  },
  {
    title: "Legal",
    links: [
      { label: "Brand Guidelines", href: "/brand-guidelines/" },
      { label: "Logos", href: "/brand-guidelines/micronaut-logos/" },
      { label: "Trademark Policy", href: "/brand-guidelines/micronaut-trademark-policy/" },
      { label: "Code of Conduct", href: "/community-guidelines/" },
      { label: "Privacy Policy", href: "/privacy-policy/" }
    ]
  }
];

export const mainSitePageContent: Record<string, MainSitePageContent> = {
  download: {
    intro: "For a quick and effortless start on macOS, Linux, or Windows, use SDKMAN! to download and configure any Micronaut version of your choice.",
    blocks: [
      {
        title: "Current release",
        body: "The source page lists Micronaut v5.0.0 with release notes and a binary download path, plus GitHub for historical release notes.",
        links: [
          { label: "Release announcements", href: "/category/release-announcements/" },
          { label: "Launch a project", href: "/launch/" }
        ]
      },
      {
        title: "Install with SDKMAN!",
        body: "SDKMAN! is the quick cross-platform route recommended by the original page for macOS, Linux, Cygwin, Solaris, and FreeBSD.",
        code: "curl -s https://get.sdkman.io | bash\nsource \"$HOME/.sdkman/bin/sdkman-init.sh\"\nsdk install micronaut\nmn --version"
      },
      {
        title: "Other install paths",
        items: [
          "Install with Homebrew when your macOS workflow is already Homebrew-based.",
          "Install with Chocolatey when you need a Windows package-manager workflow.",
          "Use Launch when you want a generated application instead of only the CLI."
        ],
        links: [
          { label: "Quick Start", href: "/quick-start/" },
          { label: "Documentation", href: "/docs/" }
        ]
      }
    ]
  },
  learn: {
    intro: "The Learn page is the main learning index from micronaut.io. It points users to reference docs, task-oriented guides, free fundamentals training, video material, and professional training.",
    blocks: [
      {
        title: "User Documentation",
        body: "Reference documentation gives developers the core concepts, APIs, configuration, and module details needed to build applications.",
        links: [{ label: "View docs", href: "/docs/" }]
      },
      {
        title: "Guides",
        body: "Micronaut guides are instructional tutorials written by the framework's core developers and organized around practical scenarios.",
        links: [{ label: "Browse guides", href: "/guides/" }]
      },
      {
        title: "Micronaut Fundamentals",
        body: "The source page points to a free video course on Oracle MyLearn with an OCI Free Learning Subscription.",
        links: [{ label: "Open MyLearn course", href: "https://mylearn.oracle.com/ou/course/micronaut-fundamentals/151938/", external: true }]
      },
      {
        title: "Webinars, microcasts, and training",
        items: [
          "On-demand webinars focus on practical, real-world examples and techniques.",
          "Microcasts are brief video tutorials for learning framework and ecosystem features.",
          "Professional training provides live, instructor-led workshops tailored for teams."
        ],
        links: [
          { label: "Microcasts", href: "/category/microcast/" },
          { label: "Webinars", href: "/category/webinar/" },
          { label: "Professional Training", href: "/professional-training/" }
        ]
      }
    ]
  },
  "professional-training": {
    intro: "Professional training pages support teams that want structured instruction from people close to the framework.",
    blocks: [
      {
        title: "Training formats",
        items: [
          "Live, instructor-led workshops help teams quickly master the Micronaut framework.",
          "Private engagements can be adapted, expanded, combined, and tailored to the skills a team needs.",
          "Open-enrollment courses are offered periodically for smaller teams and individual developers."
        ]
      },
      {
        title: "Course paths",
        body: "Professional training includes Micronaut Essentials, Micronaut Data, and event-driven microservices courses.",
        links: [
          { label: "Micronaut Essentials", href: "/professional-training/micronaut-essentials/" },
          { label: "Micronaut Data Training", href: "/professional-training/micronaut-data/" },
          { label: "Event-driven microservices", href: "/professional-training/event-driven-microservices-with-micronaut/" }
        ]
      }
    ]
  },
  "professional-training/event-driven-microservices-with-micronaut": {
    intro: "This training page is preserved for teams looking at event-driven service architecture with Micronaut.",
    blocks: [
      {
        title: "Training focus",
        items: [
          "Build event-driven microservices with Micronaut.",
          "Connect framework concepts with messaging and distributed application patterns.",
          "Use generated starters and guides to practice the same ideas hands-on."
        ],
        links: [
          { label: "Kafka docs", href: "/docs/kafka/" },
          { label: "RabbitMQ docs", href: "/docs/rabbitmq/" },
          { label: "Messaging guides", href: "/guides/" }
        ]
      }
    ]
  },
  "professional-training/micronaut-data": {
    intro: "This training page is for teams that want a focused path through Micronaut Data and compile-time repository access.",
    blocks: [
      {
        title: "Training focus",
        items: [
          "Use repository APIs without runtime model scanning.",
          "Understand data access patterns that fit microservice and serverless applications.",
          "Pair training with documentation for JDBC, R2DBC, MongoDB, and other persistence modules."
        ],
        links: [
          { label: "Micronaut Data docs", href: "/docs/data/" },
          { label: "Data guides", href: "/guides/" }
        ]
      }
    ]
  },
  "professional-training/micronaut-essentials": {
    intro: "Micronaut Essentials is the baseline training path for teams adopting the framework.",
    blocks: [
      {
        title: "Training focus",
        items: [
          "Dependency injection, HTTP, configuration, testing, and application structure.",
          "A shared vocabulary for teams moving into Micronaut development.",
          "A practical bridge from training to generated starter applications."
        ],
        links: [
          { label: "Quick Start", href: "/quick-start/" },
          { label: "Launch a project", href: "/launch/" }
        ]
      }
    ]
  },
  "resources/community-support": {
    intro: "The Community Support page is one of the densest source pages. It brings together getting started links, community channels, project contribution paths, troubleshooting, commercial support, and training.",
    blocks: [
      {
        title: "Getting started",
        items: [
          "Micronaut Launch is the easiest way to create a new project with a selected application type, language, build system, test framework, and features.",
          "The user guide and documentation cover the definitive framework reference material.",
          "Guides provide step-by-step tutorials written by the framework's core developers."
        ],
        links: [
          { label: "Launch", href: "/launch/" },
          { label: "Download", href: "/download/" },
          { label: "Docs", href: "/docs/" },
          { label: "Guides", href: "/guides/" }
        ]
      },
      {
        title: "Community engagement",
        items: [
          "Discord is the open forum for general questions and discussion with the development team and community.",
          "The blog, upcoming events, webinars, and microcasts keep users current on releases, events, and practical examples.",
          "The Foundation supports the framework's evolution and community ecosystem."
        ],
        links: [
          { label: "Join Discord", href: "https://discord.com/invite/9xRFsHv98T", external: true },
          { label: "Blog", href: "/blog/" },
          { label: "Upcoming events", href: "/upcoming-events/" },
          { label: "Foundation", href: "/foundation/" }
        ]
      },
      {
        title: "Contributing to the project",
        items: [
          "Contributors are asked to review and sign the Contributor License Agreement before getting started.",
          "Project source and issue tracking live on GitHub.",
          "Documentation updates are encouraged through the Improve this doc path in the reference documentation."
        ],
        links: [
          { label: "GitHub projects", href: "https://github.com/micronaut-projects/", external: true },
          { label: "Community guidelines", href: "/community-guidelines/" }
        ]
      },
      {
        title: "Troubleshooting and support",
        items: [
          "Use Stack Overflow for specific programming questions with the micronaut or micronaut-data tags.",
          "Use Discord when a question is broader and likely to involve discussion.",
          "Commercial support and professional training are available for organizations that need accountable assistance."
        ],
        links: [
          { label: "Commercial support", href: "/support/" },
          { label: "Professional training", href: "/professional-training/" },
          { label: "Contact", href: "/contact/" }
        ]
      }
    ]
  },
  faq: {
    intro: "The FAQ page answers licensing, contribution, support, training, documentation, trademark, and community questions.",
    blocks: [
      {
        title: "Licensing and trademarks",
        items: [
          "The Micronaut framework code and documentation in public repositories are licensed under the Apache License v2.",
          "The Micronaut name, logos, and trademarks are not granted by the Apache License.",
          "The framework is open source even though the Micronaut name and marks are trademarks of Object Computing, Inc."
        ],
        links: [
          { label: "Trademark Policy", href: "/brand-guidelines/micronaut-trademark-policy/" },
          { label: "Brand Guidelines", href: "/brand-guidelines/" }
        ]
      },
      {
        title: "Contributing and reporting issues",
        items: [
          "The project welcomes code contributions and recommends starting in the Discord community.",
          "Contributors should review the Micronaut Framework Individual CLA.",
          "Bugs, feature enhancements, and new features are reported and tracked with GitHub issues."
        ],
        links: [
          { label: "Community support", href: "/resources/community-support/" },
          { label: "GitHub projects", href: "https://github.com/micronaut-projects/", external: true }
        ]
      },
      {
        title: "Getting help",
        items: [
          "Start with docs.micronaut.io and the Micronaut Guides.",
          "Post specific programming questions on Stack Overflow using the micronaut tag.",
          "Use Discord for broader discussion with developers and users."
        ],
        links: [
          { label: "Docs", href: "/docs/" },
          { label: "Guides", href: "/guides/" },
          { label: "Discord", href: "https://discord.com/invite/9xRFsHv98T", external: true }
        ]
      },
      {
        title: "Documentation and training",
        items: [
          "Reference documentation contains language specification, user guides, a getting started tutorial, and more.",
          "JavaDoc APIs document the classes of the Micronaut code base.",
          "The Micronaut Foundation offers training courses developed and delivered by core framework developers."
        ],
        links: [
          { label: "Professional training", href: "/professional-training/" },
          { label: "Learn", href: "/learn/" }
        ]
      }
    ]
  },
  foundation: {
    intro: "The Foundation page explains the not-for-profit organization behind the framework, its contributing members, governance model, advisory board, sponsorship paths, and contact routes.",
    blocks: [
      {
        title: "Foundation purpose",
        items: [
          "Ensure technical innovation and advancement of Micronaut as a free and open public-use software development toolkit.",
          "Evangelize and promote Micronaut as a leading technology in the JVM space.",
          "Build and support an ecosystem of complementary documentation, functionality, and services."
        ]
      },
      {
        title: "Contributing members",
        body: "The source page describes Unity Foundation as steward of the Foundation and notes Object Computing's initial contribution to fund open source product development and evangelism for the framework."
      },
      {
        title: "Technology Advisory Board",
        body: "The Technology Advisory Board meets quarterly to discuss and make recommendations about the framework's roadmap and technical direction.",
        links: [{ label: "Meeting minutes", href: "/meeting-minutes/" }]
      },
      {
        title: "Sponsorship",
        items: [
          "Corporate sponsors help the Foundation continue technical innovation and advancement of the framework.",
          "Community member sponsorship gives individuals another way to support the Foundation.",
          "Tools and infrastructure partners provide development tools, infrastructure, and resources."
        ],
        links: [
          { label: "Corporate Sponsorship", href: "/foundation/corporate-sponsorship/" },
          { label: "Community Sponsorship", href: "/foundation/community-sponsorship/" },
          { label: "Sponsors", href: "/foundation/sponsors/" }
        ]
      },
      {
        title: "Contact",
        body: "The Foundation's Board of Managers can be reached at foundation@micronaut.io.",
        links: [{ label: "Contact", href: "/contact/" }]
      }
    ]
  },
  "foundation/corporate-sponsorship": {
    intro: "Corporate sponsorship is the organization-focused path for supporting Micronaut Foundation work.",
    blocks: [
      {
        title: "Why sponsor",
        items: [
          "Help ensure technical innovation and advancement of Micronaut as a free and open framework.",
          "Support documentation, communication, community activity, and project infrastructure.",
          "Connect your organization with the public Micronaut ecosystem."
        ],
        links: [
          { label: "Sponsors", href: "/foundation/sponsors/" },
          { label: "Contact", href: "/contact/" }
        ]
      }
    ]
  },
  "foundation/community-sponsorship": {
    intro: "Community sponsorship gives individuals and community groups a path to support the Micronaut Foundation.",
    blocks: [
      {
        title: "Community support path",
        items: [
          "Support the framework, documentation, communication, and community infrastructure.",
          "Complement open source contribution, issue reporting, documentation work, and community help.",
          "Keep the Foundation connected to the users who depend on the framework."
        ],
        links: [
          { label: "Foundation", href: "/foundation/" },
          { label: "Community support", href: "/resources/community-support/" }
        ]
      }
    ]
  },
  "foundation/sponsors": {
    intro: "The sponsors page recognizes organizations and supporters contributing to Micronaut project sustainability.",
    blocks: [
      {
        title: "Sponsor recognition",
        body: "The sponsors page recognizes organizations and supporters contributing to Micronaut project sustainability.",
        links: [
          { label: "Corporate Sponsorship", href: "/foundation/corporate-sponsorship/" },
          { label: "Open canonical sponsors page", href: "https://micronaut.io/foundation/sponsors/", external: true }
        ]
      }
    ]
  },
  support: {
    intro: "The Commercial Support source page is intentionally short: it points users to companies that offer commercial support for Micronaut Framework.",
    blocks: [
      {
        title: "Commercial support",
        body: "Use this route when an organization needs production support, adoption guidance, upgrade help, or a commercial support relationship around Micronaut.",
        links: [
          { label: "Contact", href: "/contact/" },
          { label: "Community Support", href: "/resources/community-support/" },
          { label: "Professional Training", href: "/professional-training/" }
        ]
      }
    ]
  },
  contact: {
    intro: "Contact routes cover general project, community, training, support, foundation, and sponsorship inquiries.",
    blocks: [
      {
        title: "Contact paths",
        items: [
          "General community and training questions: info@micronaut.io.",
          "Commercial support and consultation questions can start through the same contact path.",
          "Foundation questions can be sent to foundation@micronaut.io."
        ],
        links: [
          { label: "Community Support", href: "/resources/community-support/" },
          { label: "Foundation", href: "/foundation/" }
        ]
      }
    ]
  },
  "micronaut-success-stories": {
    intro: "The success stories index collects public examples of teams and products using Micronaut in production.",
    blocks: [
      {
        title: "Available stories",
        items: [
          "Samsung SmartThings: from monolith to microservices with Micronaut.",
          "Kestra: Micronaut framework at a workflow orchestration platform.",
          "Agorapulse: a public Micronaut application journey.",
          "Caribou, Sonar, and additional production references remain available as main-site routes."
        ],
        links: [
          { label: "Samsung SmartThings story", href: "/micronaut-success-stories/from-monolith-to-microservices-with-the-micronaut-framework/" },
          { label: "Kestra story", href: "/micronaut-success-stories/micronaut-framework-at-kestra/" },
          { label: "Agorapulse story", href: "/micronaut-success-stories/agorapulse-micronaut-journey/" },
          { label: "Sonar story", href: "/using-micronaut-framework-at-sonar/" }
        ]
      }
    ]
  },
  "brand-guidelines": {
    intro: "Brand pages preserve Micronaut logo, trademark, and usage guidance in the main-site structure.",
    blocks: [
      {
        title: "Brand usage",
        items: [
          "Use official logo variants and do not recolor or alter the mark.",
          "Read logo usage together with the trademark policy.",
          "This Astro site uses local black and white Micronaut logo assets for brand-safe rendering."
        ],
        links: [
          { label: "Micronaut Logos", href: "/brand-guidelines/micronaut-logos/" },
          { label: "Trademark Policy", href: "/brand-guidelines/micronaut-trademark-policy/" }
        ]
      }
    ]
  },
  "brand-guidelines/micronaut-logos": {
    intro: "The logo page is the canonical source for official Micronaut logo assets.",
    blocks: [
      {
        title: "Logo guidance",
        items: [
          "Use official logo variants rather than modified artwork.",
          "Keep clear space and contrast appropriate for the surface.",
          "Use the trademark policy for questions about permitted use."
        ],
        links: [
          { label: "Open canonical logo page", href: "https://micronaut.io/brand-guidelines/micronaut-logos/", external: true },
          { label: "Trademark Policy", href: "/brand-guidelines/micronaut-trademark-policy/" }
        ]
      }
    ]
  },
  "brand-guidelines/micronaut-trademark-policy": {
    intro: "The trademark policy governs use of the Micronaut name, logos, and related marks.",
    blocks: [
      {
        title: "Policy summary",
        items: [
          "The Apache License v2 covers framework code and documentation, not the Micronaut marks.",
          "Use of logos or marks can require permission from the Micronaut brand team.",
          "Use the canonical policy for legal decisions."
        ],
        links: [
          { label: "Open canonical policy", href: "https://micronaut.io/brand-guidelines/micronaut-trademark-policy/", external: true },
          { label: "Brand Guidelines", href: "/brand-guidelines/" }
        ]
      }
    ]
  },
  "community-guidelines": {
    intro: "Community guidelines define participation expectations for Micronaut community and project spaces.",
    blocks: [
      {
        title: "Participation expectations",
        items: [
          "Keep project spaces welcoming and supportive for contributors, users, and interested bystanders.",
          "Use community channels for discussion, help, and collaboration.",
          "Use the canonical guidelines page for the complete policy text."
        ],
        links: [
          { label: "Community Support", href: "/resources/community-support/" },
          { label: "Open canonical guidelines", href: "https://micronaut.io/community-guidelines/", external: true }
        ]
      }
    ]
  },
  "privacy-policy": {
    intro: "Privacy policy content remains available from the Micronaut site legal route.",
    blocks: [
      {
        title: "Policy source",
        body: "Use the original privacy policy for the complete and current legal text.",
        links: [
          { label: "Open canonical policy", href: "https://micronaut.io/privacy-policy/", external: true },
          { label: "Contact", href: "/contact/" }
        ]
      }
    ]
  }
};

const archiveLabels: Record<string, string> = {
  "category/microcast": "Microcast archive",
  "category/webinar": "Webinar archive",
  "upcoming-events": "Events archive",
  blog: "Blog archive",
  "category/release-announcements": "Release announcement archive",
  "category/security-announcements": "Security announcement archive",
  "category/case-studies": "Case-study archive",
  "category/guest-post": "Guest-post archive",
  "category/micronaut-4": "Micronaut 4 archive",
  "category/micronaut-5": "Micronaut 5 archive",
  "category/micronaut-framework-2": "Micronaut Framework 2 archive",
  "category/sponsor": "Sponsor archive",
  "category/town-hall-meetings": "Town hall archive",
  "category/uncategorized": "Uncategorized archive",
  "micronaut-roadmap": "Roadmap",
  "meeting-minutes": "Meeting minutes",
  "our-team": "Team",
  "quick-start": "Quick Start"
};

for (const page of mainSitePages) {
  if (mainSitePageContent[page.slug]) {
    continue;
  }
  if (archiveLabels[page.slug]) {
    mainSitePageContent[page.slug] = {
      intro: page.description,
      blocks: [
        {
          title: archiveLabels[page.slug],
          body: page.description,
          links: [
            ...(page.primaryCta ? [page.primaryCta] : []),
            ...(page.secondaryCta ? [page.secondaryCta] : [])
          ]
        }
      ]
    };
    continue;
  }
  if (page.slug.startsWith("micronaut-success-stories/") || page.slug === "using-micronaut-framework-at-sonar" || page.slug === "responding-to-unexpected-disruption-with-agility-and-speed") {
    mainSitePageContent[page.slug] = {
      intro: page.description,
      blocks: [
        {
          title: page.title,
          body: page.description,
          links: [
            { label: "All success stories", href: "/micronaut-success-stories/" },
            { label: "Open canonical story", href: page.sourceUrl, external: true }
          ]
        }
      ]
    };
    continue;
  }
  if (page.slug.startsWith("meeting-minutes/")) {
    mainSitePageContent[page.slug] = {
      intro: page.description,
      blocks: [
        {
          title: "Meeting record",
          body: page.description,
          links: [
            { label: "All meeting minutes", href: "/meeting-minutes/" },
            { label: "Open canonical minutes", href: page.sourceUrl, external: true }
          ]
        }
      ]
    };
  }
}
