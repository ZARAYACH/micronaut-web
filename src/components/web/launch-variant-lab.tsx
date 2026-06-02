"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Bot,
  Boxes,
  Check,
  CircleCheck,
  Cloud,
  Copy,
  Database,
  FileCode2,
  FileJson,
  Gauge,
  GitBranch,
  Globe2,
  Layers3,
  ListChecks,
  Lock,
  MessageSquare,
  PackageCheck,
  Rocket,
  Search,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  Zap,
  type LucideIcon
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { LaunchFeature, LaunchInitialData, LaunchOption } from "@/components/web/launch-app";

type VariantId =
  | "one-click"
  | "preset-wizard"
  | "goal-wizard"
  | "data-quick-path"
  | "beginner-assistant"
  | "advanced-stepper"
  | "feature-browser"
  | "architecture-canvas"
  | "team-templates"
  | "power-console";

type LaunchDraft = {
  presetId: string;
  goalId: string;
  templateId: string;
  type: string;
  appName: string;
  basePackage: string;
  javaVersion: string;
  lang: string;
  build: string;
  test: string;
  database: string;
  dataAccess: string;
  packaging: "jar" | "native" | "docker";
  deployTarget: "local" | "kubernetes" | "function";
  features: string[];
};

type PresetOption = {
  id: string;
  title: string;
  summary: string;
  badge: string;
  typeValue: string;
  features: string[];
  Icon: LucideIcon;
};

type GoalOption = {
  id: string;
  title: string;
  summary: string;
  level: string;
  typeValue: string;
  features: string[];
  Icon: LucideIcon;
};

type NamedFeatureOption = {
  id: string;
  title: string;
  summary: string;
  featureName?: string;
  badge?: string;
  Icon: LucideIcon;
};

const wizardProgressWidthClasses = [
  "w-1/5",
  "w-2/5",
  "w-3/5",
  "w-4/5",
  "w-full"
] as const;

type FlowContext = {
  draft: LaunchDraft;
  initialData: LaunchInitialData;
  activeVariant: VariantId;
  availableFeatures: LaunchFeature[];
  selectedFeatures: LaunchFeature[];
  selectedFeatureNames: Set<string>;
  featureQuery: string;
  activeCategory: string;
  categories: string[];
  createUrl: string;
  previewUrl: string;
  command: string;
  curlCommand: string;
  jsonConfig: string;
  update: (next: Partial<LaunchDraft>) => void;
  updateType: (typeValue: string) => void;
  updateLanguage: (langValue: string) => void;
  selectPreset: (preset: PresetOption) => void;
  selectGoal: (goal: GoalOption) => void;
  selectDatabase: (database: NamedFeatureOption) => void;
  selectDataAccess: (dataAccess: NamedFeatureOption) => void;
  toggleFeature: (featureName: string) => void;
  setFeatureQuery: (query: string) => void;
  setActiveCategory: (category: string) => void;
};

const DEFAULT_FEATURES = ["serialization-jackson", "validation", "openapi", "management"];

const VARIANTS: Array<{
  id: VariantId;
  title: string;
  level: string;
  summary: string;
  Icon: LucideIcon;
}> = [
  {
    id: "one-click",
    title: "One-click presets",
    level: "Basic",
    summary: "Fast preset cards with minimal fields and a direct generate action.",
    Icon: Zap
  },
  {
    id: "preset-wizard",
    title: "Preset wizard",
    level: "Basic+",
    summary: "Three guided frames for project basics, preset questions, and review.",
    Icon: ListChecks
  },
  {
    id: "goal-wizard",
    title: "Goal-first wizard",
    level: "Guided",
    summary: "A five-step architecture flow that starts with what the developer is building.",
    Icon: Rocket
  },
  {
    id: "data-quick-path",
    title: "Data quick path",
    level: "Guided",
    summary: "Database-first setup for CRUD and persistence-heavy projects.",
    Icon: Database
  },
  {
    id: "beginner-assistant",
    title: "Beginner assistant",
    level: "Guided",
    summary: "Question-led defaults with visible recommendations and low decision load.",
    Icon: Sparkles
  },
  {
    id: "advanced-stepper",
    title: "Advanced stepper",
    level: "Advanced",
    summary: "A dense step-by-step configuration board for full manual control.",
    Icon: SlidersHorizontal
  },
  {
    id: "feature-browser",
    title: "Feature browser",
    level: "Advanced",
    summary: "Searchable catalog with categories, selected states, and feature metadata.",
    Icon: Search
  },
  {
    id: "architecture-canvas",
    title: "Architecture canvas",
    level: "Advanced",
    summary: "Visual stack composition across entry point, runtime, persistence, and operations.",
    Icon: GitBranch
  },
  {
    id: "team-templates",
    title: "Team templates",
    level: "Enterprise",
    summary: "Repeatable organization presets, governance defaults, and template handoff.",
    Icon: ShieldCheck
  },
  {
    id: "power-console",
    title: "Power console",
    level: "Expert",
    summary: "Compact command-center view with CLI, JSON, feature search, and preview endpoints.",
    Icon: Terminal
  }
];

const PRESETS: PresetOption[] = [
  {
    id: "rest",
    title: "REST API",
    summary: "JSON API with validation, OpenAPI, management, and tests.",
    badge: "Beginner",
    typeValue: "DEFAULT",
    features: ["serialization-jackson", "validation", "openapi", "management"],
    Icon: Globe2
  },
  {
    id: "crud",
    title: "REST API + Database",
    summary: "Controller, validation, JDBC, PostgreSQL, Flyway, and Testcontainers.",
    badge: "Popular",
    typeValue: "DEFAULT",
    features: ["serialization-jackson", "validation", "openapi", "management", "jdbc-hikari", "postgres", "data-jdbc", "flyway", "testcontainers"],
    Icon: Database
  },
  {
    id: "secure-api",
    title: "Secure API",
    summary: "REST API with authentication, JWT, validation, and documented endpoints.",
    badge: "Secure",
    typeValue: "DEFAULT",
    features: ["serialization-jackson", "validation", "openapi", "management", "security-jwt", "problem-json"],
    Icon: Lock
  },
  {
    id: "messaging",
    title: "Messaging / Kafka",
    summary: "Event-driven service with Kafka, serialization, and health endpoints.",
    badge: "Async",
    typeValue: "MESSAGING",
    features: ["serialization-jackson", "management", "kafka", "micrometer"],
    Icon: MessageSquare
  },
  {
    id: "function",
    title: "Serverless Function",
    summary: "Small function app with cloud-native packaging and a lean dependency set.",
    badge: "Cloud",
    typeValue: "FUNCTION",
    features: ["serialization-jackson", "validation"],
    Icon: Cloud
  },
  {
    id: "ai-mcp",
    title: "AI / MCP Service",
    summary: "API service ready for AI integrations, OpenAPI, and observability.",
    badge: "New",
    typeValue: "DEFAULT",
    features: ["serialization-jackson", "validation", "openapi", "management", "mcp-http", "langchain4j-openai"],
    Icon: Bot
  }
];

const GOALS: GoalOption[] = [
  {
    id: "rest",
    title: "Expose an API",
    summary: "Controllers, validation, JSON serialization, and OpenAPI.",
    level: "Fast path",
    typeValue: "DEFAULT",
    features: ["serialization-jackson", "validation", "openapi", "management"],
    Icon: Globe2
  },
  {
    id: "data",
    title: "Persist data",
    summary: "SQL database, repository layer, migrations, and containerized tests.",
    level: "CRUD",
    typeValue: "DEFAULT",
    features: ["serialization-jackson", "validation", "jdbc-hikari", "postgres", "data-jdbc", "flyway", "testcontainers"],
    Icon: Database
  },
  {
    id: "integrate",
    title: "Call another service",
    summary: "HTTP client, error format, retries-ready foundation, and tests.",
    level: "Integration",
    typeValue: "DEFAULT",
    features: ["serialization-jackson", "validation", "http-client", "problem-json", "management"],
    Icon: Server
  },
  {
    id: "secure",
    title: "Secure endpoints",
    summary: "JWT security, validation, problem responses, and API docs.",
    level: "Production",
    typeValue: "DEFAULT",
    features: ["serialization-jackson", "validation", "openapi", "security-jwt", "problem-json", "management"],
    Icon: ShieldCheck
  },
  {
    id: "events",
    title: "Process events",
    summary: "Kafka messaging, serialization, observability, and integration tests.",
    level: "Async",
    typeValue: "MESSAGING",
    features: ["serialization-jackson", "kafka", "management", "micrometer", "testcontainers"],
    Icon: MessageSquare
  },
  {
    id: "blank",
    title: "Start blank",
    summary: "Minimal Micronaut project with only baseline serialization.",
    level: "Manual",
    typeValue: "DEFAULT",
    features: ["serialization-jackson"],
    Icon: Boxes
  }
];

const DATABASE_OPTIONS: NamedFeatureOption[] = [
  {
    id: "postgres",
    title: "PostgreSQL",
    summary: "Most common open source SQL database for production services.",
    featureName: "postgres",
    badge: "Popular",
    Icon: Database
  },
  {
    id: "mysql",
    title: "MySQL",
    summary: "Popular SQL database with broad cloud and hosting support.",
    featureName: "mysql",
    Icon: Database
  },
  {
    id: "h2",
    title: "H2",
    summary: "In-memory database for examples, local development, and tests.",
    featureName: "h2",
    badge: "Local",
    Icon: Database
  },
  {
    id: "oracle",
    title: "Oracle",
    summary: "Enterprise relational database option.",
    featureName: "oracle",
    Icon: Database
  },
  {
    id: "mongodb",
    title: "MongoDB",
    summary: "Document database path for non-relational persistence.",
    featureName: "data-mongodb",
    Icon: Database
  },
  {
    id: "none",
    title: "No database",
    summary: "Keep the app stateless for APIs, gateways, or functions.",
    Icon: CircleCheck
  }
];

const DATA_ACCESS_OPTIONS: NamedFeatureOption[] = [
  {
    id: "data-jdbc",
    title: "Micronaut Data JDBC",
    summary: "Compile-time repositories, low memory, and strong native-image fit.",
    featureName: "data-jdbc",
    badge: "Recommended",
    Icon: Gauge
  },
  {
    id: "data-jpa",
    title: "Hibernate (JPA)",
    summary: "Mature ORM path for richer relationships and existing JPA teams.",
    featureName: "data-jpa",
    Icon: Layers3
  },
  {
    id: "data-r2dbc",
    title: "R2DBC",
    summary: "Reactive relational database access for non-blocking data services.",
    featureName: "data-r2dbc",
    Icon: Zap
  },
  {
    id: "jdbc",
    title: "JDBC only",
    summary: "Connection pool and driver without repository abstractions.",
    featureName: "jdbc-hikari",
    Icon: Database
  }
];

const TEAM_TEMPLATES = [
  {
    id: "platform-rest",
    title: "Platform REST Standard",
    owner: "Platform Engineering",
    features: ["serialization-jackson", "validation", "openapi", "management", "problem-json", "testcontainers"],
    policy: "API docs, structured errors, health endpoints, and containerized tests."
  },
  {
    id: "data-service",
    title: "Data Service Baseline",
    owner: "Data Platform",
    features: ["serialization-jackson", "validation", "jdbc-hikari", "postgres", "data-jdbc", "flyway", "testcontainers"],
    policy: "PostgreSQL, migrations, repositories, and repeatable local test services."
  },
  {
    id: "secure-edge",
    title: "Secure Edge API",
    owner: "Security Guild",
    features: ["serialization-jackson", "validation", "openapi", "management", "security-jwt", "problem-json", "micrometer"],
    policy: "JWT, standard error contracts, docs, metrics, and production readiness."
  }
];

const ADVANCED_STEPS = [
  "Starting point",
  "Language & build",
  "Coordinates",
  "Application type",
  "Data access",
  "SQL database",
  "Features",
  "Integrations",
  "Configuration",
  "Testing",
  "Packaging",
  "Review"
];

const ARCHITECTURE_COLUMNS = [
  {
    title: "Entry point",
    items: ["REST controllers", "CLI command", "Function handler", "Kafka consumer"]
  },
  {
    title: "Runtime",
    items: ["Netty server", "Validation", "Serialization", "Problem JSON"]
  },
  {
    title: "Persistence",
    items: ["PostgreSQL", "Data JDBC", "Flyway", "Testcontainers"]
  },
  {
    title: "Operations",
    items: ["Management", "OpenAPI", "Micrometer", "Dockerfile"]
  }
];

function optionLabel(options: LaunchOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function cleanSegment(value: string, fallback: string) {
  const cleaned = value.trim().replace(/[^A-Za-z0-9_.-]/g, "");
  return cleaned || fallback;
}

function packageName(value: string) {
  return value
    .trim()
    .replace(/[^A-Za-z0-9_.]/g, "")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.\.+/g, ".") || "com.example";
}

function projectName(draft: LaunchDraft) {
  return `${packageName(draft.basePackage)}.${cleanSegment(draft.appName, "demo-service")}`;
}

function slugFromType(typeValue: string, data: LaunchInitialData) {
  return data.applicationTypes.find((type) => type.value === typeValue)?.name ?? "default";
}

function typeValueExists(typeValue: string, data: LaunchInitialData) {
  return data.selectOptions.type.options.some((option) => option.value === typeValue)
    || data.applicationTypes.some((option) => option.value === typeValue);
}

function safeTypeValue(typeValue: string, data: LaunchInitialData) {
  return typeValueExists(typeValue, data) ? typeValue : data.selectOptions.type.defaultOption.value;
}

function createQuery(draft: LaunchDraft) {
  const params = new URLSearchParams({
    lang: draft.lang,
    build: draft.build,
    test: draft.test,
    javaVersion: draft.javaVersion
  });

  if (draft.features.length > 0) {
    params.set("features", draft.features.join(","));
  }

  return params.toString();
}

function apiUrl(baseUrl: string, action: "create" | "preview", typeSlug: string, draft: LaunchDraft) {
  return `${baseUrl}/${action}/${typeSlug}/${projectName(draft)}?${createQuery(draft)}`;
}

function cliCommand(typeSlug: string, draft: LaunchDraft) {
  const creator = typeSlug === "default" ? "create-app" : `create-${typeSlug}-app`;
  const featurePart = draft.features.length > 0 ? ` --features ${draft.features.join(",")}` : "";
  return `mn ${creator} ${projectName(draft)} --build ${draft.build.toLowerCase()} --lang ${draft.lang.toLowerCase()} --test ${draft.test.toLowerCase()} --jdk ${draft.javaVersion.replace("JDK_", "")}${featurePart}`;
}

function featureText(feature: LaunchFeature) {
  return [feature.name, feature.title, feature.description, feature.category ?? ""].join(" ").toLowerCase();
}

function toUniqueFeatures(features: string[], availableNames: Set<string>) {
  return Array.from(new Set(features)).filter((feature) => availableNames.has(feature)).sort();
}

function initialDraft(data: LaunchInitialData): LaunchDraft {
  const lang = data.selectOptions.lang.defaultOption.value;
  const langDefaults = data.selectOptions.lang.defaultOption.defaults;
  const type = data.selectOptions.type.defaultOption.value;
  const typeSlug = slugFromType(type, data);
  const availableNames = new Set((data.featuresByType[typeSlug] ?? data.featuresByType.default ?? []).map((feature) => feature.name));

  return {
    presetId: "rest",
    goalId: "rest",
    templateId: TEAM_TEMPLATES[0].id,
    type,
    appName: "demo-service",
    basePackage: "com.example",
    javaVersion: data.selectOptions.jdkVersion.defaultOption.value,
    lang,
    build: langDefaults?.build ?? data.selectOptions.build.defaultOption.value,
    test: langDefaults?.test ?? data.selectOptions.test.defaultOption.value,
    database: "none",
    dataAccess: "data-jdbc",
    packaging: "jar",
    deployTarget: "local",
    features: toUniqueFeatures(DEFAULT_FEATURES, availableNames)
  };
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-md border bg-card p-4 shadow-sm shadow-black/[0.03]", className)}>
      {children}
    </section>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="min-w-0">
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-normal text-brand">{eyebrow}</p>}
      <h2 className="mt-1 text-xl font-semibold leading-tight md:text-2xl">{title}</h2>
      {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>}
    </div>
  );
}

function RuntimeControls({
  draft,
  initialData,
  update,
  updateLanguage
}: {
  draft: LaunchDraft;
  initialData: LaunchInitialData;
  update: (next: Partial<LaunchDraft>) => void;
  updateLanguage: (langValue: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SelectField
        id="variant-language"
        label="Language"
        value={draft.lang}
        options={initialData.selectOptions.lang.options}
        onChange={updateLanguage}
      />
      <SelectField
        id="variant-build"
        label="Build"
        value={draft.build}
        options={initialData.selectOptions.build.options}
        onChange={(build) => update({ build })}
      />
      <SelectField
        id="variant-java"
        label="Java"
        value={draft.javaVersion}
        options={initialData.selectOptions.jdkVersion.options}
        onChange={(javaVersion) => update({ javaVersion })}
        labelPrefix="JDK "
      />
      <SelectField
        id="variant-test"
        label="Testing"
        value={draft.test}
        options={initialData.selectOptions.test.options}
        onChange={(test) => update({ test })}
      />
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  labelPrefix = ""
}: {
  id: string;
  label: string;
  value: string;
  options: LaunchOption[];
  onChange: (value: string) => void;
  labelPrefix?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {labelPrefix}{option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ProjectFields({ draft, update }: { draft: LaunchDraft; update: (next: Partial<LaunchDraft>) => void }) {
  const appName = cleanSegment(draft.appName, "demo-service");
  const basePackage = packageName(draft.basePackage);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="variant-app-name">Project name</Label>
        <Input
          id="variant-app-name"
          value={draft.appName}
          onChange={(event) => update({ appName: event.target.value })}
          aria-describedby="variant-app-name-result"
        />
        <p id="variant-app-name-result" className="text-xs leading-5 text-muted-foreground">
          Artifact: {appName}
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="variant-base-package">Base package</Label>
        <Input
          id="variant-base-package"
          value={draft.basePackage}
          onChange={(event) => update({ basePackage: event.target.value })}
          aria-describedby="variant-package-result"
        />
        <p id="variant-package-result" className="text-xs leading-5 text-muted-foreground">
          Package: {basePackage}
        </p>
      </div>
    </div>
  );
}

function SelectableCard({
  selected,
  onClick,
  title,
  description,
  badge,
  Icon,
  children,
  className
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  badge?: string;
  Icon: LucideIcon;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "grid min-h-32 gap-3 rounded-md border bg-background p-4 text-left transition hover:border-brand/70 hover:bg-brand-soft/45",
        selected && "border-brand bg-brand-soft",
        className
      )}
      aria-pressed={selected}
    >
      <span className="flex min-w-0 items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-card text-brand">
            <Icon className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block break-words text-sm font-semibold leading-5">{title}</span>
            {badge && <Badge variant={selected ? "default" : "secondary"} className="mt-1 rounded-md">{badge}</Badge>}
          </span>
        </span>
        {selected && <Check className="size-4 shrink-0 text-brand" />}
      </span>
      <span className="text-xs leading-5 text-muted-foreground">{description}</span>
      {children}
    </button>
  );
}

function FeatureToggle({
  feature,
  checked,
  onToggle,
  compact = false
}: {
  feature: LaunchFeature;
  checked: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-md border bg-background p-3 transition hover:border-brand/70",
        checked && "border-brand bg-brand-soft",
        compact && "p-2"
      )}
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} aria-label={`Select ${feature.title}`} />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="break-words text-sm font-medium leading-5">{feature.title}</span>
          {feature.category && <Badge variant="outline" className="rounded-md text-[0.68rem]">{feature.category}</Badge>}
        </span>
        {!compact && <span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted-foreground">{feature.description}</span>}
        <code className="mt-1 block truncate text-[0.68rem] text-muted-foreground">{feature.name}</code>
      </span>
    </label>
  );
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard?.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{label}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="max-h-48 overflow-auto rounded-md border bg-muted/60 p-3 text-xs leading-6">
        <code>{value}</code>
      </pre>
    </div>
  );
}

function LaunchSummary({ context }: { context: FlowContext }) {
  const {
    draft,
    initialData,
    selectedFeatures,
    createUrl,
    previewUrl,
    command,
    curlCommand
  } = context;
  const runtime = [
    optionLabel(initialData.selectOptions.lang.options, draft.lang),
    optionLabel(initialData.selectOptions.build.options, draft.build),
    optionLabel(initialData.selectOptions.jdkVersion.options, draft.javaVersion),
    optionLabel(initialData.selectOptions.test.options, draft.test)
  ];

  return (
    <aside className="grid gap-4 rounded-md border bg-card p-4 shadow-sm shadow-black/[0.03] xl:sticky xl:top-20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-brand">Current request</p>
          <h2 className="mt-1 break-words text-lg font-semibold leading-tight">{projectName(draft)}</h2>
        </div>
        <Badge variant="secondary" className="rounded-md">{selectedFeatures.length} features</Badge>
      </div>
      <div className="grid gap-2 text-sm">
        {runtime.map((item) => (
          <div key={item} className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2">
            <span className="text-muted-foreground">{item.includes("JDK") || /^\d+$/.test(item) ? "Java" : "Stack"}</span>
            <span className="truncate text-right font-medium">{item}</span>
          </div>
        ))}
      </div>
      <div className="grid gap-2">
        <Button asChild size="lg">
          <a href={createUrl}>
            <ArrowDownToLine className="size-4" />
            Download ZIP
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={previewUrl} target="_blank" rel="noreferrer">
            <FileCode2 className="size-4" />
            Preview endpoint
          </a>
        </Button>
      </div>
      <Separator />
      <div className="grid gap-2">
        <p className="text-sm font-semibold">Selected features</p>
        <div className="flex max-h-28 flex-wrap gap-1.5 overflow-auto">
          {selectedFeatures.length === 0 ? (
            <span className="text-sm text-muted-foreground">No optional starter features selected.</span>
          ) : (
            selectedFeatures.map((feature) => (
              <Badge key={feature.name} variant="outline" className="max-w-full rounded-md">
                <span className="truncate">{feature.name}</span>
              </Badge>
            ))
          )}
        </div>
      </div>
      <CopyBlock label="Micronaut CLI" value={command} />
      <CopyBlock label="cURL" value={curlCommand} />
    </aside>
  );
}

function OneClickFlow({ context }: { context: FlowContext }) {
  const { draft, selectPreset, update, updateLanguage, initialData, createUrl } = context;

  return (
    <Panel className="grid gap-5">
      <SectionTitle
        eyebrow="Implementation 01"
        title="Fast preset creation flow"
        description="A low-friction launcher for developers who want a useful default and a ZIP immediately."
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {PRESETS.map((preset) => (
          <SelectableCard
            key={preset.id}
            selected={draft.presetId === preset.id}
            onClick={() => selectPreset(preset)}
            title={preset.title}
            description={preset.summary}
            badge={preset.badge}
            Icon={preset.Icon}
          />
        ))}
      </div>
      <div className="grid gap-4 rounded-md border bg-muted/30 p-4">
        <ProjectFields draft={draft} update={update} />
        <RuntimeControls draft={draft} initialData={initialData} update={update} updateLanguage={updateLanguage} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background p-4">
        <div className="min-w-0">
          <p className="font-medium">Ready for {projectName(draft)}</p>
          <p className="text-sm leading-6 text-muted-foreground">Preset selections remain editable in the other implementations.</p>
        </div>
        <Button asChild>
          <a href={createUrl}>
            Generate project
            <ArrowRight className="size-4" />
          </a>
        </Button>
      </div>
    </Panel>
  );
}

function PresetWizardFlow({ context }: { context: FlowContext }) {
  const { draft, selectPreset, selectDatabase, update, updateLanguage, initialData } = context;
  const selectedPreset = PRESETS.find((preset) => preset.id === draft.presetId) ?? PRESETS[0];

  return (
    <Panel className="grid gap-5">
      <SectionTitle
        eyebrow="Implementation 02"
        title="Three-frame preset wizard"
        description="A beginner-safe path that keeps only the decisions that matter for the selected architecture."
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="grid gap-3 rounded-md border bg-background p-4">
          <StepHeader index={1} title="Project basics" active />
          <ProjectFields draft={draft} update={update} />
          <RuntimeControls draft={draft} initialData={initialData} update={update} updateLanguage={updateLanguage} />
        </div>
        <div className="grid gap-3 rounded-md border bg-background p-4">
          <StepHeader index={2} title="Preset questions" active />
          <div className="grid gap-2">
            {PRESETS.slice(0, 4).map((preset) => (
              <button
                type="button"
                key={preset.id}
                onClick={() => selectPreset(preset)}
                className={cn(
                  "flex items-start gap-3 rounded-md border p-3 text-left transition hover:border-brand/70",
                  selectedPreset.id === preset.id && "border-brand bg-brand-soft"
                )}
              >
                <preset.Icon className="mt-0.5 size-4 shrink-0 text-brand" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{preset.title}</span>
                  <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">{preset.summary}</span>
                </span>
              </button>
            ))}
          </div>
          <Separator />
          <div className="grid gap-2">
            <p className="text-sm font-semibold">Database option</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {DATABASE_OPTIONS.slice(0, 4).map((database) => (
                <SmallChoice
                  key={database.id}
                  selected={draft.database === database.id}
                  onClick={() => selectDatabase(database)}
                  title={database.title}
                  description={database.summary}
                  Icon={database.Icon}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="grid content-start gap-3 rounded-md border bg-background p-4">
          <StepHeader index={3} title="Review & generate" active />
          <SummaryRows
            rows={[
              ["Preset", selectedPreset.title],
              ["Project", projectName(draft)],
              ["Database", DATABASE_OPTIONS.find((item) => item.id === draft.database)?.title ?? "No database"],
              ["Packaging", draft.packaging],
              ["Features", `${draft.features.length} selected`]
            ]}
          />
          <div className="rounded-md border border-brand-border bg-brand-soft p-3 text-sm leading-6">
            {selectedPreset.summary}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function GoalWizardFlow({ context }: { context: FlowContext }) {
  const { draft, selectGoal, update, updateLanguage, initialData, toggleFeature, availableFeatures, selectedFeatureNames } = context;
  const recommended = availableFeatures.filter((feature) => DEFAULT_FEATURES.includes(feature.name) || selectedFeatureNames.has(feature.name)).slice(0, 6);

  return (
    <Panel className="grid gap-5">
      <SectionTitle
        eyebrow="Implementation 03"
        title="Goal-first five-step wizard"
        description="Architecture choices come before dependency names, with each step still editable."
      />
      <div className="grid gap-3 lg:grid-cols-5">
        {["Goal", "Platform", "Features", "Configure", "Review"].map((step, index) => (
          <div key={step} className="rounded-md border bg-background p-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-foreground">{index + 1}</span>
              <span className="text-sm font-semibold">{step}</span>
            </div>
            <div className="mt-3 h-1 rounded-full bg-muted">
              <div className={cn("h-full rounded-full bg-brand", wizardProgressWidthClasses[index] ?? "w-full")} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="grid gap-3 md:grid-cols-2">
          {GOALS.map((goal) => (
            <SelectableCard
              key={goal.id}
              selected={draft.goalId === goal.id}
              onClick={() => selectGoal(goal)}
              title={goal.title}
              description={goal.summary}
              badge={goal.level}
              Icon={goal.Icon}
            />
          ))}
        </div>
        <div className="grid content-start gap-4 rounded-md border bg-background p-4">
          <RuntimeControls draft={draft} initialData={initialData} update={update} updateLanguage={updateLanguage} />
          <div className="grid gap-2">
            <p className="text-sm font-semibold">Recommended features</p>
            <div className="grid gap-2">
              {recommended.map((feature) => (
                <FeatureToggle
                  key={feature.name}
                  feature={feature}
                  checked={selectedFeatureNames.has(feature.name)}
                  onToggle={() => toggleFeature(feature.name)}
                  compact
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function DataQuickPathFlow({ context }: { context: FlowContext }) {
  const { draft, selectDatabase, selectDataAccess, toggleFeature, availableFeatures, selectedFeatureNames } = context;
  const migrationFeatures = availableFeatures.filter((feature) => ["flyway", "liquibase", "testcontainers", "jdbc-hikari"].includes(feature.name));

  return (
    <Panel className="grid gap-5">
      <SectionTitle
        eyebrow="Implementation 04"
        title="Preset by data source"
        description="The database choice drives driver, repository, migration, and testing defaults."
      />
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {DATABASE_OPTIONS.map((database) => (
          <SelectableCard
            key={database.id}
            selected={draft.database === database.id}
            onClick={() => selectDatabase(database)}
            title={database.title}
            description={database.summary}
            badge={database.badge}
            Icon={database.Icon}
            className="min-h-36"
          />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_18rem]">
        <div className="grid gap-3 rounded-md border bg-background p-4">
          <p className="font-semibold">Data access technology</p>
          {DATA_ACCESS_OPTIONS.map((option) => (
            <SmallChoice
              key={option.id}
              selected={draft.dataAccess === option.id}
              onClick={() => selectDataAccess(option)}
              title={option.title}
              description={option.summary}
              Icon={option.Icon}
              badge={option.badge}
            />
          ))}
        </div>
        <div className="grid content-start gap-3 rounded-md border bg-background p-4">
          <p className="font-semibold">Additional options</p>
          {migrationFeatures.map((feature) => (
            <FeatureToggle
              key={feature.name}
              feature={feature}
              checked={selectedFeatureNames.has(feature.name)}
              onToggle={() => toggleFeature(feature.name)}
              compact
            />
          ))}
        </div>
        <div className="grid content-start gap-3 rounded-md border bg-brand-soft p-4">
          <p className="font-semibold">What you get</p>
          {["Production database driver", "Repository layer choice", "Migration-ready project", "Test resources path", "Docker-friendly defaults"].map((item) => (
            <div key={item} className="flex items-start gap-2 text-sm leading-6">
              <Check className="mt-1 size-4 shrink-0 text-brand" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function BeginnerAssistantFlow({ context }: { context: FlowContext }) {
  const { draft, selectGoal, selectDatabase, update } = context;
  const selectedGoal = GOALS.find((goal) => goal.id === draft.goalId) ?? GOALS[0];

  return (
    <Panel className="grid gap-5">
      <SectionTitle
        eyebrow="Implementation 05"
        title="Beginner assistant"
        description="A recommendation-led flow that translates project intent into starter choices."
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-4">
          <QuestionBlock number={1} question="What are you building?">
            <div className="grid gap-2 md:grid-cols-3">
              {GOALS.slice(0, 6).map((goal) => (
                <SmallChoice
                  key={goal.id}
                  selected={draft.goalId === goal.id}
                  onClick={() => selectGoal(goal)}
                  title={goal.title}
                  description={goal.summary}
                  Icon={goal.Icon}
                />
              ))}
            </div>
          </QuestionBlock>
          <QuestionBlock number={2} question="Do you need persistence?">
            <div className="grid gap-2 md:grid-cols-3">
              {DATABASE_OPTIONS.slice(0, 6).map((database) => (
                <SmallChoice
                  key={database.id}
                  selected={draft.database === database.id}
                  onClick={() => selectDatabase(database)}
                  title={database.title}
                  description={database.summary}
                  Icon={database.Icon}
                />
              ))}
            </div>
          </QuestionBlock>
          <QuestionBlock number={3} question="How will this run?">
            <div className="grid gap-2 md:grid-cols-3">
              {[
                { id: "local" as const, title: "JAR", summary: "Standard service packaging.", Icon: PackageCheck },
                { id: "kubernetes" as const, title: "Container", summary: "Dockerfile and cloud deploy path.", Icon: Cloud },
                { id: "function" as const, title: "Function", summary: "Serverless deployment target.", Icon: Zap }
              ].map((target) => (
                <SmallChoice
                  key={target.id}
                  selected={draft.deployTarget === target.id}
                  onClick={() => update({ deployTarget: target.id, packaging: target.id === "kubernetes" ? "docker" : target.id === "function" ? "native" : "jar" })}
                  title={target.title}
                  description={target.summary}
                  Icon={target.Icon}
                />
              ))}
            </div>
          </QuestionBlock>
        </div>
        <div className="grid content-start gap-4 rounded-md border bg-background p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-brand" />
            <p className="font-semibold">Recommendation</p>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{selectedGoal.summary}</p>
          <SummaryRows
            rows={[
              ["Goal", selectedGoal.title],
              ["Database", DATABASE_OPTIONS.find((item) => item.id === draft.database)?.title ?? "No database"],
              ["Packaging", draft.packaging],
              ["Features", `${draft.features.length} selected`]
            ]}
          />
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
            Recommendations are optional. Advanced views expose every feature choice.
          </div>
        </div>
      </div>
    </Panel>
  );
}

function AdvancedStepperFlow({ context }: { context: FlowContext }) {
  const { draft, initialData, update, updateType, updateLanguage, selectDatabase, selectDataAccess, toggleFeature, availableFeatures, selectedFeatureNames } = context;
  const visibleFeatures = availableFeatures.slice(0, 10);

  return (
    <Panel className="grid gap-5">
      <SectionTitle
        eyebrow="Implementation 06"
        title="Advanced flow - step by step"
        description="Full control without hiding deeper choices; every step shows current state and next decisions."
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {ADVANCED_STEPS.map((step, index) => (
          <div key={step} className="grid min-h-44 content-start gap-3 rounded-md border bg-background p-4">
            <StepHeader index={index + 1} title={step} active={index < 6 || index === 11} />
            {index === 0 && (
              <div className="grid gap-2">
                {PRESETS.slice(0, 3).map((preset) => (
                  <Badge key={preset.id} variant={draft.presetId === preset.id ? "default" : "outline"} className="rounded-md">{preset.title}</Badge>
                ))}
              </div>
            )}
            {index === 1 && <RuntimeControls draft={draft} initialData={initialData} update={update} updateLanguage={updateLanguage} />}
            {index === 2 && <ProjectFields draft={draft} update={update} />}
            {index === 3 && (
              <SelectField
                id="advanced-type"
                label="Type"
                value={draft.type}
                options={initialData.selectOptions.type.options}
                onChange={updateType}
              />
            )}
            {index === 4 && (
              <div className="grid gap-2">
                {DATA_ACCESS_OPTIONS.slice(0, 3).map((option) => (
                  <SmallChoice key={option.id} selected={draft.dataAccess === option.id} onClick={() => selectDataAccess(option)} title={option.title} description={option.summary} Icon={option.Icon} />
                ))}
              </div>
            )}
            {index === 5 && (
              <div className="grid gap-2">
                {DATABASE_OPTIONS.slice(0, 4).map((database) => (
                  <SmallChoice key={database.id} selected={draft.database === database.id} onClick={() => selectDatabase(database)} title={database.title} description={database.summary} Icon={database.Icon} />
                ))}
              </div>
            )}
            {index === 6 && (
              <div className="grid gap-2">
                {visibleFeatures.slice(0, 4).map((feature) => (
                  <FeatureToggle key={feature.name} feature={feature} checked={selectedFeatureNames.has(feature.name)} onToggle={() => toggleFeature(feature.name)} compact />
                ))}
              </div>
            )}
            {index === 7 && <SummaryPills items={["Kafka", "RabbitMQ", "OpenTelemetry", "Cloud discovery"]} />}
            {index === 8 && <SummaryPills items={["Properties", "YAML", "TOML", "Virtual threads"]} />}
            {index === 9 && <SummaryPills items={[optionLabel(initialData.selectOptions.test.options, draft.test), "Testcontainers", "Rest Assured", "Mock server"]} />}
            {index === 10 && <SummaryPills items={["JAR", "Dockerfile", "Native image", "Helm chart"]} />}
            {index === 11 && (
              <SummaryRows
                rows={[
                  ["Project", draft.appName],
                  ["Runtime", optionLabel(initialData.selectOptions.lang.options, draft.lang)],
                  ["Features", String(draft.features.length)]
                ]}
              />
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function FeatureBrowserFlow({ context }: { context: FlowContext }) {
  const {
    availableFeatures,
    selectedFeatureNames,
    toggleFeature,
    featureQuery,
    setFeatureQuery,
    activeCategory,
    setActiveCategory,
    categories
  } = context;
  const query = featureQuery.trim().toLowerCase();
  const filteredFeatures = availableFeatures
    .filter((feature) => activeCategory === "All" || (feature.category ?? "Other") === activeCategory)
    .filter((feature) => !query || featureText(feature).includes(query))
    .slice(0, 36);

  return (
    <Panel className="grid gap-5">
      <SectionTitle
        eyebrow="Implementation 07"
        title="Advanced feature browser"
        description="A catalog-first power-user experience with search, categories, selected states, and dependency impact."
      />
      <div className="grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)_18rem]">
        <aside className="grid content-start gap-2 rounded-md border bg-background p-3">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition hover:bg-muted",
                activeCategory === category && "bg-brand-soft text-brand"
              )}
            >
              <span className="truncate">{category}</span>
              <Badge variant="outline" className="rounded-md text-[0.68rem]">
                {category === "All" ? availableFeatures.length : availableFeatures.filter((feature) => (feature.category ?? "Other") === category).length}
              </Badge>
            </button>
          ))}
        </aside>
        <div className="grid content-start gap-3">
          <div className="relative">
            <Label htmlFor="variant-feature-search" className="sr-only">Search features</Label>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="variant-feature-search"
              value={featureQuery}
              onChange={(event) => setFeatureQuery(event.target.value)}
              className="pl-9"
              placeholder="Search features, tags, guides, or dependency names"
              type="search"
            />
          </div>
          <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
            {filteredFeatures.map((feature) => (
              <FeatureToggle
                key={feature.name}
                feature={feature}
                checked={selectedFeatureNames.has(feature.name)}
                onToggle={() => toggleFeature(feature.name)}
              />
            ))}
          </div>
        </div>
        <aside className="grid content-start gap-3 rounded-md border bg-background p-4">
          <p className="font-semibold">Selected</p>
          <div className="grid gap-2">
            {availableFeatures.filter((feature) => selectedFeatureNames.has(feature.name)).slice(0, 12).map((feature) => (
              <button
                type="button"
                key={feature.name}
                onClick={() => toggleFeature(feature.name)}
                className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-left text-xs"
              >
                <span className="truncate">{feature.name}</span>
                <Check className="size-3 shrink-0 text-brand" />
              </button>
            ))}
          </div>
        </aside>
      </div>
    </Panel>
  );
}

function ArchitectureCanvasFlow({ context }: { context: FlowContext }) {
  const { draft, selectGoal, selectDatabase, selectDataAccess, update, toggleFeature, availableFeatures, selectedFeatureNames } = context;
  const operationalFeatures = availableFeatures.filter((feature) => ["management", "openapi", "micrometer", "dockerfile", "testcontainers"].includes(feature.name));

  return (
    <Panel className="grid gap-5">
      <SectionTitle
        eyebrow="Implementation 08"
        title="Architecture canvas"
        description="A visual composition model for teams that think in service layers rather than form fields."
      />
      <div className="grid gap-3 xl:grid-cols-4">
        {ARCHITECTURE_COLUMNS.map((column, columnIndex) => (
          <div key={column.title} className="grid content-start gap-3 rounded-md border bg-background p-4">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-md bg-brand-soft text-brand">{columnIndex + 1}</span>
              <p className="font-semibold">{column.title}</p>
            </div>
            {column.items.map((item) => (
              <div key={item} className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                {item}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="grid gap-2 rounded-md border bg-background p-4">
          <p className="font-semibold">Entry point</p>
          {GOALS.slice(0, 4).map((goal) => (
            <SmallChoice key={goal.id} selected={draft.goalId === goal.id} onClick={() => selectGoal(goal)} title={goal.title} description={goal.summary} Icon={goal.Icon} />
          ))}
        </div>
        <div className="grid gap-2 rounded-md border bg-background p-4">
          <p className="font-semibold">Persistence</p>
          {DATABASE_OPTIONS.slice(0, 3).map((database) => (
            <SmallChoice key={database.id} selected={draft.database === database.id} onClick={() => selectDatabase(database)} title={database.title} description={database.summary} Icon={database.Icon} />
          ))}
          {DATA_ACCESS_OPTIONS.slice(0, 2).map((option) => (
            <SmallChoice key={option.id} selected={draft.dataAccess === option.id} onClick={() => selectDataAccess(option)} title={option.title} description={option.summary} Icon={option.Icon} />
          ))}
        </div>
        <div className="grid gap-2 rounded-md border bg-background p-4">
          <p className="font-semibold">Operations</p>
          {operationalFeatures.map((feature) => (
            <FeatureToggle key={feature.name} feature={feature} checked={selectedFeatureNames.has(feature.name)} onToggle={() => toggleFeature(feature.name)} compact />
          ))}
          <Separator />
          <div className="grid gap-2">
            <SmallChoice selected={draft.packaging === "jar"} onClick={() => update({ packaging: "jar" })} title="JAR" description="Standard build output." Icon={PackageCheck} />
            <SmallChoice selected={draft.packaging === "docker"} onClick={() => update({ packaging: "docker" })} title="Docker" description="Container-oriented output." Icon={Cloud} />
            <SmallChoice selected={draft.packaging === "native"} onClick={() => update({ packaging: "native" })} title="Native image" description="GraalVM-ready output." Icon={Zap} />
          </div>
        </div>
      </div>
    </Panel>
  );
}

function TeamTemplateFlow({ context }: { context: FlowContext }) {
  const { draft, update } = context;

  return (
    <Panel className="grid gap-5">
      <SectionTitle
        eyebrow="Implementation 09"
        title="Team template console"
        description="Enterprise-oriented launch flow for reusable standards, shared defaults, and policy-backed starter sets."
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-3 md:grid-cols-3">
          {TEAM_TEMPLATES.map((template) => (
            <button
              type="button"
              key={template.id}
              onClick={() => update({ templateId: template.id, features: template.features })}
              className={cn(
                "grid min-h-72 content-start gap-3 rounded-md border bg-background p-4 text-left transition hover:border-brand/70",
                draft.templateId === template.id && "border-brand bg-brand-soft"
              )}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-brand" />
                  <span className="font-semibold">{template.title}</span>
                </span>
                {draft.templateId === template.id && <Check className="size-4 text-brand" />}
              </span>
              <Badge variant="secondary" className="rounded-md">{template.owner}</Badge>
              <p className="text-sm leading-6 text-muted-foreground">{template.policy}</p>
              <div className="flex flex-wrap gap-1.5">
                {template.features.map((feature) => (
                  <Badge key={feature} variant="outline" className="rounded-md text-[0.68rem]">{feature}</Badge>
                ))}
              </div>
            </button>
          ))}
        </div>
        <aside className="grid content-start gap-3 rounded-md border bg-background p-4">
          <p className="font-semibold">Governance checks</p>
          {["Required API docs", "Security defaults", "Test resources", "Observability", "Shareable CLI"].map((item) => (
            <div key={item} className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <CircleCheck className="size-4 text-brand" />
              <span>{item}</span>
            </div>
          ))}
          <Separator />
          <div className="rounded-md border bg-brand-soft p-3 text-sm leading-6">
            Template selections can be copied into docs, onboarding guides, or internal developer portals.
          </div>
        </aside>
      </div>
    </Panel>
  );
}

function PowerConsoleFlow({ context }: { context: FlowContext }) {
  const {
    draft,
    initialData,
    update,
    updateType,
    updateLanguage,
    featureQuery,
    setFeatureQuery,
    availableFeatures,
    selectedFeatureNames,
    toggleFeature,
    command,
    jsonConfig,
    createUrl,
    previewUrl
  } = context;
  const query = featureQuery.trim().toLowerCase();
  const filteredFeatures = availableFeatures.filter((feature) => !query || featureText(feature).includes(query)).slice(0, 18);

  return (
    <Panel className="grid gap-5">
      <SectionTitle
        eyebrow="Implementation 10"
        title="Power-user command center"
        description="A dense control surface for experienced users who want direct visibility into generated commands and backend endpoints."
      />
      <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)_22rem]">
        <aside className="grid content-start gap-3 rounded-md border bg-background p-4">
          <ProjectFields draft={draft} update={update} />
          <SelectField id="power-type" label="Application type" value={draft.type} options={initialData.selectOptions.type.options} onChange={updateType} />
          <RuntimeControls draft={draft} initialData={initialData} update={update} updateLanguage={updateLanguage} />
        </aside>
        <div className="grid content-start gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={featureQuery}
              onChange={(event) => setFeatureQuery(event.target.value)}
              className="pl-9"
              placeholder="Filter the starter catalog"
              type="search"
            />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {filteredFeatures.map((feature) => (
              <FeatureToggle key={feature.name} feature={feature} checked={selectedFeatureNames.has(feature.name)} onToggle={() => toggleFeature(feature.name)} compact />
            ))}
          </div>
        </div>
        <aside className="grid content-start gap-4 rounded-md border bg-background p-4">
          <CopyBlock label="CLI command" value={command} />
          <CopyBlock label="JSON configuration" value={jsonConfig} />
          <div className="grid gap-2">
            <Button asChild>
              <a href={createUrl}>
                <ArrowDownToLine className="size-4" />
                Download ZIP
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={previewUrl} target="_blank" rel="noreferrer">
                <FileJson className="size-4" />
                Open preview JSON
              </a>
            </Button>
          </div>
        </aside>
      </div>
    </Panel>
  );
}

function StepHeader({ index, title, active }: { index: number; title: string; active?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        active ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground"
      )}>
        {index}
      </span>
      <p className="min-w-0 text-sm font-semibold leading-5">{title}</p>
    </div>
  );
}

function SmallChoice({
  selected,
  onClick,
  title,
  description,
  Icon,
  badge
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  Icon: LucideIcon;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-20 items-start gap-3 rounded-md border bg-background p-3 text-left transition hover:border-brand/70",
        selected && "border-brand bg-brand-soft"
      )}
      aria-pressed={selected}
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-brand" />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="break-words text-sm font-semibold leading-5">{title}</span>
          {badge && <Badge variant="secondary" className="rounded-md text-[0.68rem]">{badge}</Badge>}
        </span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

function QuestionBlock({ number, question, children }: { number: number; question: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 rounded-md border bg-background p-4">
      <StepHeader index={number} title={question} active />
      {children}
    </section>
  );
}

function SummaryRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="grid gap-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="min-w-0 truncate text-right font-medium">{value}</span>
        </div>
      ))}
    </div>
  );
}

function SummaryPills({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} variant="outline" className="rounded-md">{item}</Badge>
      ))}
    </div>
  );
}

function renderVariant(context: FlowContext) {
  switch (context.activeVariant) {
    case "one-click":
      return <OneClickFlow context={context} />;
    case "preset-wizard":
      return <PresetWizardFlow context={context} />;
    case "goal-wizard":
      return <GoalWizardFlow context={context} />;
    case "data-quick-path":
      return <DataQuickPathFlow context={context} />;
    case "beginner-assistant":
      return <BeginnerAssistantFlow context={context} />;
    case "advanced-stepper":
      return <AdvancedStepperFlow context={context} />;
    case "feature-browser":
      return <FeatureBrowserFlow context={context} />;
    case "architecture-canvas":
      return <ArchitectureCanvasFlow context={context} />;
    case "team-templates":
      return <TeamTemplateFlow context={context} />;
    case "power-console":
      return <PowerConsoleFlow context={context} />;
  }
}

export function LaunchVariantLab({ initialData }: { initialData: LaunchInitialData }) {
  const [activeVariant, setActiveVariant] = useState<VariantId>("one-click");
  const [draft, setDraft] = useState<LaunchDraft>(() => initialDraft(initialData));
  const [featureQuery, setFeatureQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const typeSlug = slugFromType(draft.type, initialData);
  const availableFeatures = initialData.featuresByType[typeSlug] ?? initialData.featuresByType.default ?? [];
  const availableFeatureNames = useMemo(() => new Set(availableFeatures.map((feature) => feature.name)), [availableFeatures]);
  const selectedFeatureNames = useMemo(() => new Set(draft.features), [draft.features]);
  const selectedFeatures = availableFeatures.filter((feature) => selectedFeatureNames.has(feature.name));
  const categories = useMemo(() => {
    const values = Array.from(new Set(availableFeatures.map((feature) => feature.category ?? "Other"))).sort();
    return ["All", ...values];
  }, [availableFeatures]);
  const createUrl = apiUrl(initialData.apiBaseUrl, "create", typeSlug, draft);
  const previewUrl = apiUrl(initialData.apiBaseUrl, "preview", typeSlug, draft);
  const command = cliCommand(typeSlug, draft);
  const curlCommand = `curl --location --request GET '${createUrl}' --output ${cleanSegment(draft.appName, "demo-service")}.zip`;
  const jsonConfig = JSON.stringify({
    applicationType: typeSlug,
    name: projectName(draft),
    language: draft.lang,
    build: draft.build,
    test: draft.test,
    javaVersion: draft.javaVersion,
    packaging: draft.packaging,
    database: draft.database,
    dataAccess: draft.dataAccess,
    features: draft.features
  }, null, 2);

  function update(next: Partial<LaunchDraft>) {
    setDraft((current) => ({ ...current, ...next }));
  }

  function featureNamesForType(typeValue: string) {
    const nextSlug = slugFromType(typeValue, initialData);
    return new Set((initialData.featuresByType[nextSlug] ?? initialData.featuresByType.default ?? []).map((feature) => feature.name));
  }

  function updateType(typeValue: string) {
    const safeType = safeTypeValue(typeValue, initialData);
    const nextFeatureNames = featureNamesForType(safeType);
    setDraft((current) => ({
      ...current,
      type: safeType,
      features: toUniqueFeatures(current.features, nextFeatureNames)
    }));
  }

  function updateLanguage(langValue: string) {
    const option = initialData.selectOptions.lang.options.find((item) => item.value === langValue);
    setDraft((current) => ({
      ...current,
      lang: langValue,
      build: option?.defaults?.build ?? current.build,
      test: option?.defaults?.test ?? current.test
    }));
  }

  function replaceFeatureFamily(current: string[], family: NamedFeatureOption[], selected?: string) {
    const familyNames = new Set(family.flatMap((item) => item.featureName ? [item.featureName] : []));
    return toUniqueFeatures([
      ...current.filter((name) => !familyNames.has(name)),
      ...(selected ? [selected] : [])
    ], availableFeatureNames);
  }

  function selectPreset(preset: PresetOption) {
    const safeType = safeTypeValue(preset.typeValue, initialData);
    const names = featureNamesForType(safeType);
    setDraft((current) => ({
      ...current,
      presetId: preset.id,
      goalId: preset.id === "crud" ? "data" : preset.id === "secure-api" ? "secure" : preset.id === "messaging" ? "events" : current.goalId,
      type: safeType,
      database: preset.id === "crud" ? "postgres" : current.database,
      dataAccess: preset.id === "crud" ? "data-jdbc" : current.dataAccess,
      features: toUniqueFeatures(preset.features, names)
    }));
  }

  function selectGoal(goal: GoalOption) {
    const safeType = safeTypeValue(goal.typeValue, initialData);
    const names = featureNamesForType(safeType);
    setDraft((current) => ({
      ...current,
      goalId: goal.id,
      presetId: goal.id === "data" ? "crud" : goal.id === "events" ? "messaging" : goal.id === "secure" ? "secure-api" : current.presetId,
      type: safeType,
      database: goal.id === "data" ? "postgres" : current.database,
      features: toUniqueFeatures(goal.features, names)
    }));
  }

  function selectDatabase(database: NamedFeatureOption) {
    setDraft((current) => ({
      ...current,
      database: database.id,
      features: replaceFeatureFamily(current.features, DATABASE_OPTIONS, database.featureName)
    }));
  }

  function selectDataAccess(dataAccess: NamedFeatureOption) {
    setDraft((current) => ({
      ...current,
      dataAccess: dataAccess.id,
      features: replaceFeatureFamily(current.features, DATA_ACCESS_OPTIONS, dataAccess.featureName)
    }));
  }

  function toggleFeature(featureName: string) {
    setDraft((current) => ({
      ...current,
      features: current.features.includes(featureName)
        ? current.features.filter((name) => name !== featureName)
        : toUniqueFeatures([...current.features, featureName], availableFeatureNames)
    }));
  }

  const context: FlowContext = {
    draft,
    initialData,
    activeVariant,
    availableFeatures,
    selectedFeatures,
    selectedFeatureNames,
    featureQuery,
    activeCategory,
    categories,
    createUrl,
    previewUrl,
    command,
    curlCommand,
    jsonConfig,
    update,
    updateType,
    updateLanguage,
    selectPreset,
    selectGoal,
    selectDatabase,
    selectDataAccess,
    toggleFeature,
    setFeatureQuery,
    setActiveCategory
  };

  return (
    <main className="min-h-[calc(100dvh-57px)] bg-background">
      <h1 className="sr-only">Micronaut Launch implementation variants</h1>
      <section className="border-b bg-card">
        <div className="mx-auto max-w-[1600px] px-4 py-3 md:px-6">
          <div className="overflow-x-auto rounded-md border bg-background">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <caption className="sr-only">Launch implementation variants</caption>
              <thead className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                <tr>
                  <th scope="col" className="w-16 px-3 py-2">No.</th>
                  <th scope="col" className="w-64 px-3 py-2">Implementation</th>
                  <th scope="col" className="w-28 px-3 py-2">Level</th>
                  <th scope="col" className="px-3 py-2">Flow</th>
                </tr>
              </thead>
              <tbody>
                {VARIANTS.map((variant, index) => {
                  const selected = activeVariant === variant.id;
                  return (
                    <tr
                      key={variant.id}
                      className={cn(
                        "border-b last:border-b-0",
                        selected ? "bg-brand-soft" : "hover:bg-muted/40"
                      )}
                    >
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</td>
                      <td className="px-3 py-2">
                        <button
                          id={`variant-tab-${variant.id}`}
                          type="button"
                          aria-current={selected ? "true" : undefined}
                          aria-controls={`variant-panel-${variant.id}`}
                          onClick={() => setActiveVariant(variant.id)}
                          className={cn(
                            "text-left font-semibold underline-offset-4 hover:text-brand hover:underline",
                            selected && "text-brand"
                          )}
                        >
                          {variant.title}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{variant.level}</td>
                      <td className="px-3 py-2 text-muted-foreground">{variant.summary}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-4 py-5 md:px-6">
        <div
          id={`variant-panel-${activeVariant}`}
          aria-labelledby={`variant-tab-${activeVariant}`}
        >
          {renderVariant(context)}
        </div>
      </section>
    </main>
  );
}
