"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  Braces,
  ChevronDown,
  Check,
  Copy,
  ExternalLink,
  FileCode2,
  FolderGit2,
  Link2,
  ListFilter,
  Search,
  ShieldAlert,
  Sparkles,
  X
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  applyDecisionChoice,
  resolveDecisionGroups,
  type ResolvedDecisionChoice,
  type ResolvedDecisionGroup
} from "@/lib/launch-decisions";
import { cn } from "@/lib/utils";

export type LaunchOption = {
  title?: string;
  description?: string;
  name: string;
  value: string;
  label: string;
  extension?: string;
  defaults?: {
    test?: string;
    build?: string;
  };
};

export type LaunchOptionGroup = {
  options: LaunchOption[];
  defaultOption: LaunchOption;
};

export type LaunchFeature = {
  name: string;
  title: string;
  description: string;
  category?: string;
  preview?: boolean;
  community?: boolean;
};

export type LaunchInitialData = {
  apiBaseUrl: string;
  generatedAt: string;
  source: "live" | "fallback";
  selectOptions: {
    type: LaunchOptionGroup;
    jdkVersion: LaunchOptionGroup;
    lang: LaunchOptionGroup;
    test: LaunchOptionGroup;
    build: LaunchOptionGroup;
  };
  applicationTypes: LaunchOption[];
  featuresByType: Record<string, LaunchFeature[]>;
};

type LaunchAppProps = {
  initialData: LaunchInitialData;
};

type FormState = {
  type: string;
  appName: string;
  basePackage: string;
  javaVersion: string;
  lang: string;
  build: string;
  test: string;
  features: string[];
};

type FeatureCategoryId =
  | "popular"
  | "web"
  | "data"
  | "cloud"
  | "messaging"
  | "security"
  | "serialization"
  | "testing"
  | "observability"
  | "all";

type FeatureScope = "compatible" | "selected" | "recommended";

const categoryOrder = ["API", "Server", "Database", "Messaging", "Cloud", "Security", "Serialization", "Testing", "Management", "Development Tools"];

const featureCategories: { id: FeatureCategoryId; label: string }[] = [
  { id: "popular", label: "Popular" },
  { id: "web", label: "Web" },
  { id: "data", label: "Data" },
  { id: "cloud", label: "Cloud" },
  { id: "messaging", label: "Messaging" },
  { id: "security", label: "Security" },
  { id: "serialization", label: "Serialization" },
  { id: "testing", label: "Testing" },
  { id: "observability", label: "Observability" },
  { id: "all", label: "All" }
];

const popularFeatureNames = new Set([
  "serialization-jackson",
  "validation",
  "management",
  "openapi",
  "data-jdbc",
  "data-hibernate-jpa",
  "jdbc-hikari",
  "security-jwt",
  "micrometer",
  "kafka"
]);

const recommendedFeatureNames = new Set([
  "serialization-jackson",
  "validation",
  "management",
  "openapi"
]);

function slugFromType(typeValue: string, applicationTypes: LaunchOption[]) {
  return applicationTypes.find((type) => type.value === typeValue)?.name ?? "default";
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

function projectName(appName: string, basePackage: string) {
  return `${packageName(basePackage)}.${cleanSegment(appName, "demo")}`;
}

function createQuery(state: FormState) {
  const params = new URLSearchParams({
    lang: state.lang,
    build: state.build,
    test: state.test,
    javaVersion: state.javaVersion
  });

  if (state.features.length > 0) {
    params.set("features", state.features.join(","));
  }

  return params.toString();
}

function apiUrl(baseUrl: string, action: "create" | "preview" | "diff", typeSlug: string, state: FormState) {
  return `${baseUrl}/${action}/${typeSlug}/${projectName(state.appName, state.basePackage)}?${createQuery(state)}`;
}

function cliCommand(typeSlug: string, state: FormState) {
  const creator = typeSlug === "default" ? "create-app" : `create-${typeSlug}-app`;
  const featurePart = state.features.length > 0 ? ` --features ${state.features.join(",")}` : "";
  return `mn ${creator} ${projectName(state.appName, state.basePackage)} --build ${state.build.toLowerCase()} --lang ${state.lang.toLowerCase()} --test ${state.test.toLowerCase()} --jdk ${state.javaVersion.replace("JDK_", "")}${featurePart}`;
}

function shellRunCommand(state: FormState) {
  if (state.build === "MAVEN") {
    return "./mvnw mn:run";
  }
  return "./gradlew run";
}

function optionLabel(options: LaunchOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function jdkLabel(value: string, options: LaunchOption[]) {
  const label = optionLabel(options, value);
  return label.startsWith("JDK_") ? label.replace("JDK_", "JDK ") : label.startsWith("JDK") ? label : `JDK ${label.replace("JDK_", "")}`;
}

function runtimeSummary(state: FormState, data: LaunchInitialData) {
  return [
    optionLabel(data.selectOptions.lang.options, state.lang),
    optionLabel(data.selectOptions.build.options, state.build),
    jdkLabel(state.javaVersion, data.selectOptions.jdkVersion.options),
    optionLabel(data.selectOptions.test.options, state.test)
  ].join(" / ");
}

function searchableFeatureText(feature: LaunchFeature) {
  return [
    feature.name,
    feature.title,
    feature.description,
    feature.category ?? ""
  ].join(" ").toLowerCase();
}

function featureMatchesCategory(feature: LaunchFeature, category: FeatureCategoryId) {
  if (category === "all") {
    return true;
  }
  const text = searchableFeatureText(feature);
  if (category === "popular") {
    return popularFeatureNames.has(feature.name);
  }
  if (category === "web") {
    return /api|server|http|openapi|graphql|websocket|views/.test(text);
  }
  if (category === "data") {
    return /data|database|jdbc|jpa|hibernate|jooq|mongo|redis|sql|r2dbc|cache/.test(text);
  }
  if (category === "cloud") {
    return /cloud|aws|azure|gcp|kubernetes|discovery|config|function/.test(text);
  }
  if (category === "messaging") {
    return /messaging|kafka|rabbit|jms|mqtt|nats|pulsar/.test(text);
  }
  if (category === "security") {
    return /security|auth|jwt|oauth|ldap|session/.test(text);
  }
  if (category === "serialization") {
    return /serialization|jackson|json|serde|xml|yaml/.test(text);
  }
  if (category === "testing") {
    return /test|junit|spock|kotest|mock|testcontainers/.test(text);
  }
  return /observability|management|metrics|micrometer|tracing|log|health/.test(text);
}

function featureIsRecommended(feature: LaunchFeature) {
  return recommendedFeatureNames.has(feature.name);
}

function isEditableShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

function initialState(data: LaunchInitialData): FormState {
  const lang = data.selectOptions.lang.defaultOption.value;
  const langDefaults = data.selectOptions.lang.defaultOption.defaults;

  return {
    type: data.selectOptions.type.defaultOption.value,
    appName: "demo",
    basePackage: "com.example",
    javaVersion: data.selectOptions.jdkVersion.defaultOption.value,
    lang,
    build: langDefaults?.build ?? data.selectOptions.build.defaultOption.value,
    test: langDefaults?.test ?? data.selectOptions.test.defaultOption.value,
    features: ["serialization-jackson"]
  };
}

function OptionSelect({
  id,
  label,
  value,
  options,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  options: LaunchOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} aria-label={label} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CodeBlock({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    await navigator.clipboard?.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{label}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void copyValue()}
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-md border bg-muted p-4 text-xs leading-6 text-foreground">
        <code>{value}</code>
      </pre>
      <span className="sr-only" aria-live="polite">
        {copied ? `${label} copied` : ""}
      </span>
    </div>
  );
}

function FeatureImpactSheet({ feature }: { feature: LaunchFeature }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="sm" aria-label={`View impact for ${feature.title}`}>
          View impact
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{feature.title}</SheetTitle>
          <SheetDescription>{feature.description}</SheetDescription>
        </SheetHeader>
        <div className="grid gap-5 px-4 text-sm leading-6">
          <div className="grid gap-2">
            <p className="font-semibold">Feature id</p>
            <code className="w-fit rounded-md border bg-muted px-2 py-1 text-xs">{feature.name}</code>
          </div>
          <Separator />
          <div className="grid gap-2">
            <p className="font-semibold">Generated impact</p>
            <p className="text-muted-foreground">
              Adds the {feature.name} starter feature to the Micronaut Launch request. The backend resolves the exact dependencies, generated files, and configuration for the selected language and build tool.
            </p>
          </div>
          <div className="grid gap-2">
            <p className="font-semibold">Category</p>
            <p className="text-muted-foreground">{feature.category ?? "Uncategorized"}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FeatureCard({
  feature,
  checked,
  recommended,
  onToggle
}: {
  feature: LaunchFeature;
  checked: boolean;
  recommended: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "grid gap-2 rounded-lg border bg-card p-3 transition hover:border-primary/60",
        checked && "border-primary bg-primary/5"
      )}
    >
      <label className="flex min-h-16 cursor-pointer items-start gap-3" data-testid={`feature-${feature.name}`}>
        <Checkbox checked={checked} onCheckedChange={onToggle} aria-label={`Select ${feature.title}`} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold leading-5">{feature.title}</span>
            {feature.category && <Badge variant="outline" className="text-[0.68rem]">{feature.category}</Badge>}
            {recommended && <Badge variant="secondary" className="text-[0.68rem]">Recommended</Badge>}
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{feature.description}</p>
        </div>
      </label>
      <div className="flex items-center justify-between gap-2 pl-7">
        <code className="truncate text-[0.72rem] text-muted-foreground">{feature.name}</code>
        <div className="flex items-center gap-1">
          {checked && <Badge variant="secondary">Selected</Badge>}
          {feature.preview && <Badge variant="outline">Preview</Badge>}
          {feature.community && <Badge variant="outline">Community</Badge>}
          <FeatureImpactSheet feature={feature} />
        </div>
      </div>
    </div>
  );
}

function DecisionChoiceDetails({
  group,
  choice,
  selected,
  onSelect
}: {
  group: ResolvedDecisionGroup;
  choice: ResolvedDecisionChoice;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="sm" aria-label={`View details for ${choice.title}`}>
          Details
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{choice.title}</SheetTitle>
          <SheetDescription>{group.question}</SheetDescription>
        </SheetHeader>
        <div className="grid gap-5 px-4">
          <div className="grid gap-2">
            <p className="text-sm font-semibold">Summary</p>
            <p className="text-sm leading-6 text-muted-foreground">{choice.summary}</p>
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-semibold">Generated impact</p>
            <p className="text-sm leading-6 text-muted-foreground">{choice.impact}</p>
          </div>
          <Separator />
          <div className="grid gap-2">
            <p className="text-sm font-semibold">When to use</p>
            <p className="text-sm leading-6 text-muted-foreground">{choice.whenToUse}</p>
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-semibold">When not to use</p>
            <p className="text-sm leading-6 text-muted-foreground">{choice.whenNotToUse}</p>
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-semibold">Tradeoffs</p>
            <ul className="grid gap-2 text-sm leading-6 text-muted-foreground">
              {choice.tradeoffs.map((tradeoff) => (
                <li key={tradeoff} className="flex gap-2">
                  <span aria-hidden="true">-</span>
                  <span>{tradeoff}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-semibold">Canonical feature</p>
            <code className="rounded-md border bg-muted px-2 py-1 text-xs">
              {choice.featureName ? `--features ${choice.featureName}` : "No feature is added"}
            </code>
          </div>
        </div>
        <SheetFooter>
          <Button type="button" onClick={onSelect} disabled={selected}>
            {selected ? <Check className="size-4" /> : <Sparkles className="size-4" />}
            {selected ? "Selected" : "Use this choice"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function DecisionGroupPanel({
  group,
  expanded,
  onToggle,
  onSelect
}: {
  group: ResolvedDecisionGroup;
  expanded: boolean;
  onToggle: () => void;
  onSelect: (group: ResolvedDecisionGroup, choice: ResolvedDecisionChoice) => void;
}) {
  const activeChoice = group.activeChoice;
  const customized = group.selectedChoices.length > 0;
  const stateLabel = group.conflicted ? "Conflict" : customized ? "Selected" : "Default";

  return (
    <div className={cn("overflow-hidden rounded-lg border bg-background", group.conflicted && "border-destructive/70")}>
      <button
        type="button"
        className="grid w-full gap-3 p-4 text-left transition hover:bg-muted/50 md:grid-cols-[minmax(9rem,0.8fr)_minmax(0,1fr)_auto] md:items-center"
        aria-expanded={expanded}
        onClick={onToggle}
        data-testid={`decision-row-${group.id}`}
      >
        <span className="flex items-center gap-2 font-semibold">
          <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
          {group.title}
        </span>
        <span className="min-w-0 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{activeChoice?.title ?? "Review required"}</span>
          <span className="hidden md:inline"> - {activeChoice?.summary ?? group.description}</span>
        </span>
        <Badge variant={group.conflicted ? "outline" : customized ? "default" : "secondary"}>
          {stateLabel}
        </Badge>
      </button>

      {expanded && (
        <div className="border-t p-4">
          <div className="mb-4 grid gap-1">
            <p className="text-sm font-medium">{group.question}</p>
            <p className="text-sm leading-6 text-muted-foreground">{group.description}</p>
          </div>
          {group.conflicted && (
            <Alert variant="destructive" className="mb-4">
              <ShieldAlert className="size-4" />
              <AlertTitle>Multiple choices selected</AlertTitle>
              <AlertDescription>
                Pick one {group.title.toLowerCase()} option. Selecting a choice removes the other features in this group.
              </AlertDescription>
            </Alert>
          )}
          <fieldset className="grid gap-3">
            <legend className="sr-only">{group.question}</legend>
            {group.choices.map((choice) => {
              const selected = activeChoice?.id === choice.id;
              const defaultChoice = group.defaultChoice?.id === choice.id;
              return (
                <div
                  key={choice.id}
                  className={cn(
                    "grid gap-3 rounded-lg border bg-card p-4 transition md:grid-cols-[minmax(0,1fr)_auto] md:items-center",
                    selected && "border-primary bg-primary/5"
                  )}
                >
                  <label className="flex cursor-pointer items-start gap-3" data-testid={`decision-${group.id}-${choice.id}`}>
                    <input
                      type="radio"
                      className="mt-1 size-4 accent-primary"
                      name={`decision-${group.id}`}
                      checked={selected}
                      onChange={() => onSelect(group, choice)}
                    />
                    <span className="grid gap-1">
                      <span className="flex flex-wrap items-center gap-2 font-semibold">
                        {choice.title}
                        {choice.featureName && <Badge variant="outline">{choice.featureName}</Badge>}
                        {defaultChoice && <Badge variant="secondary">Default</Badge>}
                        {!defaultChoice && selected && <Badge variant="secondary">Selected</Badge>}
                      </span>
                      <span className="text-sm leading-6 text-muted-foreground">{choice.summary}</span>
                      <span className="text-xs leading-5 text-muted-foreground">
                        Impact: {choice.impact}
                      </span>
                    </span>
                  </label>
                  <DecisionChoiceDetails
                    group={group}
                    choice={choice}
                    selected={selected}
                    onSelect={() => onSelect(group, choice)}
                  />
                </div>
              );
            })}
          </fieldset>
        </div>
      )}
    </div>
  );
}

function PreviewProjectDialog({
  previewUrl,
  diffUrl,
  createUrl,
  command,
  curl
}: {
  previewUrl: string;
  diffUrl: string;
  createUrl: string;
  command: string;
  curl: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <FileCode2 className="size-4" />
          Preview project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Preview project</DialogTitle>
          <DialogDescription>
            Inspect generated output endpoints and commands for the current Launch settings.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="files" className="gap-4">
          <TabsList className="grid h-auto w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="diff">Diff</TabsTrigger>
            <TabsTrigger value="json">Request JSON</TabsTrigger>
            <TabsTrigger value="commands">Commands</TabsTrigger>
          </TabsList>
          <TabsContent value="files" className="grid gap-4">
            <Alert>
              <FileCode2 className="size-4" />
              <AlertTitle>Live preview opens from Micronaut Launch</AlertTitle>
              <AlertDescription>
                The backend preview response lists generated files. This static page opens it directly because cross-origin reads are not available here.
              </AlertDescription>
            </Alert>
            <div className="grid gap-2 rounded-lg border bg-muted/40 p-4 text-sm">
              <div className="font-medium">Expected project shape</div>
              <code>build.gradle.kts or build.gradle</code>
              <code>src/main/&lt;language&gt;/...</code>
              <code>src/main/resources/application.properties</code>
              <code>micronaut-cli.yml</code>
            </div>
            <Button asChild>
              <a href={previewUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                Open live preview
              </a>
            </Button>
          </TabsContent>
          <TabsContent value="diff" className="grid gap-4">
            <CodeBlock value={diffUrl} label="Diff endpoint" />
            <Button asChild variant="outline">
              <a href={diffUrl} target="_blank" rel="noreferrer">
                <Braces className="size-4" />
                Open live diff
              </a>
            </Button>
          </TabsContent>
          <TabsContent value="json" className="grid gap-4">
            <CodeBlock value={previewUrl} label="Preview endpoint" />
            <CodeBlock value={createUrl} label="Create endpoint" />
          </TabsContent>
          <TabsContent value="commands" className="grid gap-4">
            <CodeBlock value={command} label="Micronaut CLI" />
            <CodeBlock value={curl} label="cURL" />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function LaunchPanel({
  state,
  runtime,
  testLabel,
  createUrl,
  previewUrl,
  diffUrl,
  command,
  curl,
  shareUrl,
  selectedFeatures,
  decisionGroups,
  catalogCount,
  conflictedDecisionGroups,
  source,
  generatedAt,
  onRemoveFeature
}: {
  state: FormState;
  runtime: string;
  testLabel: string;
  createUrl: string;
  previewUrl: string;
  diffUrl: string;
  command: string;
  curl: string;
  shareUrl: string;
  selectedFeatures: LaunchFeature[];
  decisionGroups: ResolvedDecisionGroup[];
  catalogCount: number;
  conflictedDecisionGroups: ResolvedDecisionGroup[];
  source: LaunchInitialData["source"];
  generatedAt: string;
  onRemoveFeature: (featureName: string) => void;
}) {
  const optionalFeatureCount = selectedFeatures.length;
  const defaultDecisionCount = decisionGroups.filter((group) => !group.conflicted && group.selectedChoices.length === 0).length;
  const customizedDecisionCount = decisionGroups.filter((group) => !group.conflicted && group.selectedChoices.length > 0).length;
  const readiness = conflictedDecisionGroups.length > 0 ? "Needs review" : "Ready";

  return (
    <Card className="border-primary/20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
      <CardHeader className="gap-4">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Launch Panel</CardTitle>
            <Badge variant={conflictedDecisionGroups.length > 0 ? "outline" : "secondary"}>
              {readiness}
            </Badge>
          </div>
          <CardDescription data-testid="project-coordinate">
            {projectName(state.appName, state.basePackage)}
          </CardDescription>
        </div>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Runtime</span>
            <span className="text-right font-medium">{runtime}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Tests</span>
            <span className="font-medium">{testLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Features</span>
            <span className="font-medium">{optionalFeatureCount} optional</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Conflicts</span>
            <span className="font-medium">{conflictedDecisionGroups.length === 0 ? "None" : conflictedDecisionGroups.length}</span>
          </div>
        </div>
        <div className="grid gap-2">
          <Button asChild size="lg" className="w-full">
            <a href={createUrl} data-testid="download-project">
              <ArrowDownToLine className="size-4" />
              Download ZIP
            </a>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <a href={previewUrl} target="_blank" rel="noreferrer" data-testid="preview-url">
              <FileCode2 className="size-4" />
              Preview project
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Textarea readOnly value={createUrl} data-testid="create-url" className="sr-only" tabIndex={-1} aria-hidden="true" />
        <Tabs defaultValue="summary" className="gap-4">
          <TabsList className="grid h-auto w-full grid-cols-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="commands">Commands</TabsTrigger>
            <TabsTrigger value="share">Share</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="grid gap-4">
            {conflictedDecisionGroups.length > 0 && (
              <Alert variant="destructive">
                <ShieldAlert className="size-4" />
                <AlertTitle>One-choice conflict</AlertTitle>
                <AlertDescription>
                  {conflictedDecisionGroups.map((group) => group.title).join(", ")} has multiple selected choices.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-md bg-muted/60 px-3 py-2">
                <span className="text-muted-foreground">Runtime</span>
                <span className="text-right font-medium">{runtime}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md bg-muted/60 px-3 py-2">
                <span className="text-muted-foreground">Decisions</span>
                <span className="font-medium">
                  {customizedDecisionCount > 0 ? `${customizedDecisionCount} customized` : `${defaultDecisionCount} defaults`}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md bg-muted/60 px-3 py-2">
                <span className="text-muted-foreground">Features</span>
                <span className="font-medium">{optionalFeatureCount} optional</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md bg-muted/60 px-3 py-2">
                <span className="text-muted-foreground">Conflicts</span>
                <span className="font-medium">{conflictedDecisionGroups.length === 0 ? "None" : conflictedDecisionGroups.length}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={source === "live" ? "default" : "outline"}>
                {source === "live" ? "Live backend" : "Fallback catalog"}
              </Badge>
              <Badge variant="outline">{catalogCount} feature options</Badge>
              <Badge variant="outline">{new Date(generatedAt).toLocaleDateString()}</Badge>
            </div>
          </TabsContent>

          <TabsContent value="features" className="grid gap-4">
            <div className="grid gap-2">
              <p className="text-sm font-semibold">Framework decisions</p>
              <div className="grid gap-2">
                {decisionGroups.map((group) => {
                  const selected = group.selectedChoices[0];
                  return (
                    <div key={group.id} className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 p-3 text-sm">
                      <span className="text-muted-foreground">{group.title}</span>
                      <Badge variant={group.conflicted ? "outline" : "secondary"}>
                        {group.conflicted ? "Conflict" : selected?.title ?? group.defaultChoice?.title ?? "Default"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
            <Separator />
            <div className="grid gap-2">
              <p className="text-sm font-semibold">Optional features</p>
              <div className="flex flex-wrap gap-2">
                {selectedFeatures.length === 0 && <p className="text-sm text-muted-foreground">No optional features selected.</p>}
                {selectedFeatures.map((feature) => (
                  <Badge key={feature.name} variant="secondary" className="gap-1 py-1">
                    {feature.name}
                    <button type="button" aria-label={`Remove ${feature.title}`} onClick={() => onRemoveFeature(feature.name)}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="commands" className="grid gap-4">
            <CodeBlock value={command} label="Micronaut CLI" />
            <CodeBlock value={curl} label="cURL" />
            <Separator />
            <CodeBlock value={`unzip ${cleanSegment(state.appName, "demo")}.zip\ncd ${cleanSegment(state.appName, "demo")}\n${shellRunCommand(state)}`} label="Next steps" />
          </TabsContent>

          <TabsContent value="share" className="grid gap-4">
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">
                Share this configuration or copy the backend create endpoint for issue reports.
              </p>
              <Textarea readOnly value={shareUrl} className="min-h-20 text-xs" aria-label="Share URL" />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <Button type="button" variant="outline" onClick={() => void navigator.clipboard?.writeText(shareUrl)}>
                  <Link2 className="size-4" />
                  Copy share link
                </Button>
                <Button type="button" variant="outline" onClick={() => void navigator.clipboard?.writeText(createUrl)}>
                  <Copy className="size-4" />
                  Copy create URL
                </Button>
              </div>
            </div>
            <Separator />
            <div className="grid gap-2">
              <p className="text-sm font-semibold">Backend endpoints</p>
              <Textarea readOnly value={createUrl} className="min-h-24 text-xs" aria-label="Create endpoint URL" />
              <div className="grid gap-2">
                <Button asChild variant="outline">
                  <a href={diffUrl} target="_blank" rel="noreferrer">
                    <Braces className="size-4" />
                    Open live diff
                  </a>
                </Button>
                <Button asChild variant="secondary">
                  <a href="https://github.com/micronaut-projects/micronaut-starter" target="_blank" rel="noreferrer">
                    <FolderGit2 className="size-4" />
                    Starter source
                  </a>
                </Button>
              </div>
            </div>
            <Alert>
              <Sparkles className="size-4" />
              <AlertTitle>Backend integration</AlertTitle>
              <AlertDescription>
                The page links directly to `launch.micronaut.io` for project generation. Preview and diff are opened as backend responses because cross-origin reads are not available from this static origin.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export function LaunchApp({ initialData }: LaunchAppProps) {
  const [state, setState] = useState<FormState>(() => initialState(initialData));
  const [featureQuery, setFeatureQuery] = useState("");
  const [featureCategory, setFeatureCategory] = useState<FeatureCategoryId>("popular");
  const [featureScope, setFeatureScope] = useState<FeatureScope>("compatible");
  const [openDecisionGroupId, setOpenDecisionGroupId] = useState("configuration");

  const typeSlug = slugFromType(state.type, initialData.applicationTypes);
  const availableFeatures = initialData.featuresByType[typeSlug] ?? initialData.featuresByType.default ?? [];
  const decisionGroups = useMemo(
    () => resolveDecisionGroups(availableFeatures, state.features),
    [availableFeatures, state.features]
  );
  const conflictedDecisionGroups = decisionGroups.filter((group) => group.conflicted);
  const decisionFeatureNames = useMemo(
    () => new Set(decisionGroups.flatMap((group) => group.choices.flatMap((choice) => choice.featureName ? [choice.featureName] : []))),
    [decisionGroups]
  );
  const selectedFeatures = availableFeatures.filter((feature) => state.features.includes(feature.name));
  const selectedDecisionFeatures = selectedFeatures.filter((feature) => decisionFeatureNames.has(feature.name));
  const optionalSelectedFeatures = selectedFeatures.filter((feature) => !decisionFeatureNames.has(feature.name));
  const explorableFeatures = availableFeatures.filter((feature) => !decisionFeatureNames.has(feature.name));
  const filteredFeatures = useMemo(() => {
    const query = featureQuery.trim().toLowerCase();
    const byScope = featureScope === "selected"
      ? explorableFeatures.filter((feature) => state.features.includes(feature.name))
      : featureScope === "recommended"
        ? explorableFeatures.filter(featureIsRecommended)
        : explorableFeatures;
    const byCategory = featureCategory === "all" || featureScope === "selected"
      ? byScope
      : byScope.filter((feature) => featureMatchesCategory(feature, featureCategory));
    const byQuery = query
      ? byCategory.filter((feature) => searchableFeatureText(feature).includes(query))
      : byCategory;

    return [...byQuery].sort((left, right) => {
      const leftSelected = state.features.includes(left.name) ? 0 : 1;
      const rightSelected = state.features.includes(right.name) ? 0 : 1;
      const leftCategory = categoryOrder.indexOf(left.category ?? "");
      const rightCategory = categoryOrder.indexOf(right.category ?? "");
      const leftRank = leftCategory === -1 ? categoryOrder.length : leftCategory;
      const rightRank = rightCategory === -1 ? categoryOrder.length : rightCategory;
      return leftSelected - rightSelected || leftRank - rightRank || left.title.localeCompare(right.title);
    });
  }, [explorableFeatures, featureCategory, featureQuery, featureScope, state.features]);

  const createUrl = apiUrl(initialData.apiBaseUrl, "create", typeSlug, state);
  const previewUrl = apiUrl(initialData.apiBaseUrl, "preview", typeSlug, state);
  const diffUrl = apiUrl(initialData.apiBaseUrl, "diff", typeSlug, state);
  const command = cliCommand(typeSlug, state);
  const curl = `curl --location --request GET '${createUrl}' --output ${cleanSegment(state.appName, "demo")}.zip`;
  const runtime = runtimeSummary(state, initialData);
  const testLabel = optionLabel(initialData.selectOptions.test.options, state.test);
  const shareUrl =
    typeof window === "undefined"
      ? "/launch/"
      : `${window.location.origin}/launch/?type=${typeSlug}&name=${encodeURIComponent(state.appName)}&package=${encodeURIComponent(state.basePackage)}&lang=${state.lang}&build=${state.build}&test=${state.test}&javaVersion=${state.javaVersion}&features=${encodeURIComponent(state.features.join(","))}`;
  const defaultDecisionCount = decisionGroups.filter((group) => !group.conflicted && group.selectedChoices.length === 0).length;
  const customizedDecisionCount = decisionGroups.filter((group) => !group.conflicted && group.selectedChoices.length > 0).length;
  const sanitizedAppName = cleanSegment(state.appName, "demo");
  const sanitizedPackage = packageName(state.basePackage);
  const appNameAdjusted = sanitizedAppName !== state.appName.trim();
  const packageAdjusted = sanitizedPackage !== state.basePackage.trim();

  useEffect(() => {
    if (openDecisionGroupId && decisionGroups.length > 0 && !decisionGroups.some((group) => group.id === openDecisionGroupId)) {
      setOpenDecisionGroupId(decisionGroups[0].id);
    }
  }, [decisionGroups, openDecisionGroupId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "/" && !isEditableShortcutTarget(event.target)) {
        event.preventDefault();
        document.getElementById("feature-search-input")?.focus();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setFeatureCategory("all");
        document.getElementById("feature-search-input")?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function update(next: Partial<FormState>) {
    setState((current) => ({ ...current, ...next }));
  }

  function toggleFeature(featureName: string) {
    setState((current) => ({
      ...current,
      features: current.features.includes(featureName)
        ? current.features.filter((name) => name !== featureName)
        : [...current.features, featureName].sort()
    }));
  }

  function selectDecisionChoice(group: ResolvedDecisionGroup, choice: ResolvedDecisionChoice) {
    setState((current) => ({
      ...current,
      features: applyDecisionChoice(current.features, group, choice)
    }));
    setOpenDecisionGroupId("");
  }

  function updateLanguage(value: string) {
    const option = initialData.selectOptions.lang.options.find((item) => item.value === value);
    update({
      lang: value,
      build: option?.defaults?.build ?? state.build,
      test: option?.defaults?.test ?? state.test
    });
  }

  return (
    <main>
      <section className="border-b bg-card">
        <div className="mx-auto grid max-w-[1440px] gap-3 px-4 py-5 md:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold leading-tight text-foreground md:text-4xl">
                Build a Micronaut project
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
                Configure project settings, choose stack decisions, add starter features, and generate a ZIP.
              </p>
            </div>
            <PreviewProjectDialog
              previewUrl={previewUrl}
              diffUrl={diffUrl}
              createUrl={createUrl}
              command={command}
              curl={curl}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={initialData.source === "live" ? "default" : "outline"}>
              {initialData.source === "live" ? "Live backend" : "Fallback catalog"}
            </Badge>
            <Badge variant="outline">{new Date(initialData.generatedAt).toLocaleDateString()}</Badge>
            <Badge variant="outline">{availableFeatures.length} feature options</Badge>
            <Badge variant={conflictedDecisionGroups.length > 0 ? "outline" : "secondary"}>
              {conflictedDecisionGroups.length > 0 ? `${conflictedDecisionGroups.length} conflict${conflictedDecisionGroups.length === 1 ? "" : "s"}` : "No conflicts"}
            </Badge>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 md:px-6 lg:grid-cols-[minmax(720px,1fr)_390px] lg:items-start">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Project settings</CardTitle>
              <CardDescription>Start with the project identity and runtime defaults. The Launch Panel updates immediately.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="launch-name">Name</Label>
                  <Input
                    id="launch-name"
                    value={state.appName}
                    onChange={(event) => update({ appName: event.target.value })}
                    data-testid="app-name"
                    aria-invalid={appNameAdjusted}
                  />
                  <p className={cn("text-xs text-muted-foreground", appNameAdjusted && "text-destructive")}>
                    Generated artifact: {sanitizedAppName}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="launch-package">Base package</Label>
                  <Input
                    id="launch-package"
                    value={state.basePackage}
                    onChange={(event) => update({ basePackage: event.target.value })}
                    data-testid="base-package"
                    aria-invalid={packageAdjusted}
                  />
                  <p className={cn("text-xs text-muted-foreground", packageAdjusted && "text-destructive")}>
                    Generated package: {sanitizedPackage}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <OptionSelect
                  id="launch-type"
                  label="Application type"
                  value={state.type}
                  options={initialData.selectOptions.type.options}
                  onChange={(value) => update({ type: value, features: state.features.filter((name) => (initialData.featuresByType[slugFromType(value, initialData.applicationTypes)] ?? []).some((feature) => feature.name === name)) })}
                />
                <OptionSelect
                  id="launch-java"
                  label="Java version"
                  value={state.javaVersion}
                  options={initialData.selectOptions.jdkVersion.options}
                  onChange={(value) => update({ javaVersion: value })}
                />
                <OptionSelect
                  id="launch-language"
                  label="Language"
                  value={state.lang}
                  options={initialData.selectOptions.lang.options}
                  onChange={updateLanguage}
                />
                <OptionSelect
                  id="launch-build"
                  label="Build tool"
                  value={state.build}
                  options={initialData.selectOptions.build.options}
                  onChange={(value) => update({ build: value })}
                />
                <OptionSelect
                  id="launch-test"
                  label="Test framework"
                  value={state.test}
                  options={initialData.selectOptions.test.options}
                  onChange={(value) => update({ test: value })}
                />
              </div>

              <div className="grid gap-3 rounded-lg border bg-muted/40 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-semibold">Runtime</span>
                  <span className="text-sm text-muted-foreground">{runtime}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant={state.build === "GRADLE" ? "default" : "outline"} size="sm" onClick={() => update({ build: "GRADLE" })} data-testid="build-gradle">
                    Gradle
                  </Button>
                  <Button type="button" variant={state.build === "GRADLE_KOTLIN" ? "default" : "outline"} size="sm" onClick={() => update({ build: "GRADLE_KOTLIN" })}>
                    Gradle Kotlin
                  </Button>
                  <Button type="button" variant={state.lang === "JAVA" ? "default" : "outline"} size="sm" onClick={() => update({ lang: "JAVA", test: "JUNIT" })} data-testid="lang-java">
                    Java
                  </Button>
                  <Button type="button" variant={state.test === "JUNIT" ? "default" : "outline"} size="sm" onClick={() => update({ test: "JUNIT" })} data-testid="test-junit">
                    JUnit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>Decision Center</CardTitle>
                  <CardDescription>
                    Review framework-wide choices without opening every default.
                  </CardDescription>
                </div>
                <Badge variant={conflictedDecisionGroups.length > 0 ? "outline" : "secondary"}>
                  {conflictedDecisionGroups.length > 0 ? `${conflictedDecisionGroups.length} conflict${conflictedDecisionGroups.length === 1 ? "" : "s"}` : "No conflicts"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4" data-testid="decision-center">
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                <span>{decisionGroups.length} decisions checked</span>
                <span aria-hidden="true">-</span>
                <span>{conflictedDecisionGroups.length} conflicts</span>
                <span aria-hidden="true">-</span>
                <span>{customizedDecisionCount > 0 ? `${customizedDecisionCount} customized` : `${defaultDecisionCount} defaults`}</span>
              </div>
              {conflictedDecisionGroups.length > 0 && (
                <Alert variant="destructive">
                  <ShieldAlert className="size-4" />
                  <AlertTitle>Resolve one-choice groups before sharing this stack</AlertTitle>
                  <AlertDescription>
                    Expert feature selection can still add conflicting features. Use the decision cards below to keep one option per group.
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid gap-3">
                {decisionGroups.map((group) => (
                  <DecisionGroupPanel
                    key={group.id}
                    group={group}
                    expanded={openDecisionGroupId === group.id}
                    onToggle={() => setOpenDecisionGroupId(openDecisionGroupId === group.id ? "" : group.id)}
                    onSelect={selectDecisionChoice}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>Starter features</CardTitle>
                  <CardDescription>Search features, browse by category, or review selected additions.</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => update({ features: state.features.filter((name) => decisionFeatureNames.has(name)) })}>
                  <X className="size-4" />
                  Clear optional
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="feature-search-input"
                  className="pl-9"
                  placeholder="Search features, categories, or descriptions"
                  value={featureQuery}
                  onChange={(event) => setFeatureQuery(event.target.value)}
                  data-testid="feature-search"
                />
              </div>
              <Tabs value={featureCategory} onValueChange={(value) => setFeatureCategory(value as FeatureCategoryId)} className="gap-3">
                <TabsList className="flex h-auto w-full flex-wrap justify-start">
                  {featureCategories.map((category) => (
                    <TabsTrigger key={category.id} value={category.id} className="flex-none">
                      {category.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant={featureScope === "compatible" ? "default" : "outline"} size="sm" onClick={() => setFeatureScope("compatible")}>
                  <ListFilter className="size-4" />
                  Compatible
                </Button>
                <Button type="button" variant={featureScope === "selected" ? "default" : "outline"} size="sm" onClick={() => setFeatureScope("selected")}>
                  Selected ({optionalSelectedFeatures.length})
                </Button>
                <Button type="button" variant={featureScope === "recommended" ? "default" : "outline"} size="sm" onClick={() => setFeatureScope("recommended")}>
                  Recommended
                </Button>
                {(featureQuery || featureCategory !== "popular" || featureScope !== "compatible") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFeatureQuery("");
                      setFeatureCategory("popular");
                      setFeatureScope("compatible");
                    }}
                  >
                    <X className="size-4" />
                    Clear filters
                  </Button>
                )}
              </div>
              {featureScope === "selected" && selectedDecisionFeatures.length > 0 && (
                <div className="grid gap-2 rounded-lg border bg-muted/40 p-4">
                  <p className="text-sm font-semibold">Framework decision features</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDecisionFeatures.map((feature) => (
                      <Badge key={feature.name} variant="outline">{feature.name}</Badge>
                    ))}
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Change these from the Decision Center so one-choice groups stay consistent.
                  </p>
                </div>
              )}
              <div className="grid max-h-[640px] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
                {filteredFeatures.slice(0, 80).map((feature) => (
                  <FeatureCard
                    key={feature.name}
                    feature={feature}
                    checked={state.features.includes(feature.name)}
                    recommended={featureIsRecommended(feature)}
                    onToggle={() => toggleFeature(feature.name)}
                  />
                ))}
                {filteredFeatures.length === 0 && (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <p className="font-semibold">No compatible features found for this filter.</p>
                    <p className="mt-2 text-sm text-muted-foreground">Clear filters or switch to All.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        setFeatureQuery("");
                        setFeatureCategory("all");
                        setFeatureScope("compatible");
                      }}
                    >
                      Show all features
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="self-start lg:sticky lg:top-20">
          <LaunchPanel
            state={state}
            runtime={runtime}
            testLabel={testLabel}
            createUrl={createUrl}
            previewUrl={previewUrl}
            diffUrl={diffUrl}
            command={command}
            curl={curl}
            shareUrl={shareUrl}
            selectedFeatures={optionalSelectedFeatures}
            decisionGroups={decisionGroups}
            catalogCount={availableFeatures.length}
            conflictedDecisionGroups={conflictedDecisionGroups}
            source={initialData.source}
            generatedAt={initialData.generatedAt}
            onRemoveFeature={toggleFeature}
          />
        </aside>
      </section>
    </main>
  );
}
