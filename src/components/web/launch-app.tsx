"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  Braces,
  ChevronRight,
  Check,
  Cloud,
  Code2,
  Copy,
  ExternalLink,
  File,
  FileCode2,
  FileJson,
  FileText,
  FileTerminal,
  Folder,
  FolderGit2,
  Link2,
  Package,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  TestTube2,
  type LucideIcon,
  X
} from "lucide-react";
import { Collapsible } from "radix-ui";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeBlock as UiCodeBlock } from "@/components/ui/code-block";
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
  DialogClose,
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
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarProvider
} from "@/components/ui/sidebar";
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
import { IconBadge } from "@/components/web/icon-badge";
import { withBasePath } from "@/lib/base-path";
import { cn } from "@/lib/utils";
import launchProjectConfig from "@/data/launch-project-config.json";

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
  micronautVersion: string;
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

type BuilderStepId = "settings" | "features" | "launch";

type FeatureCategoryId =
  | "most-popular"
  | "mcp"
  | "langchain4j"
  | "dev-and-test"
  | "build"
  | "data-access"
  | "database-migration"
  | "errors"
  | "serialization"
  | "messaging"
  | "logging"
  | "api"
  | "cloud"
  | "configuration"
  | "languages"
  | "cache"
  | "email"
  | "chatbots"
  | "misc"
  | "reactive"
  | "views"
  | "validation"
  | "other";

type LaunchProjectConfig = {
  defaults: {
    appName: string;
    basePackage: string;
    features: string[];
  };
  featureCategories: { id: FeatureCategoryId; label: string; icon: string; description: string }[];
  popularFeatures: string[];
  recommendedFeatures: string[];
  popularCapabilityGroups: string[];
  capabilityGroups: {
    id: string;
    title: string;
    icon?: string;
    description: string;
    featureNames: string[];
    matchPattern: string;
  }[];
};

type PreviewFile = {
  path: string;
  sourceSet: "Application" | "Tests" | "Resources" | "Build";
  description: string;
  language: string;
  content?: string | null;
};

type PreviewTreeNode = {
  name: string;
  path?: string;
  file?: PreviewFile;
  children?: PreviewTreeNode[];
};

type LaunchPreviewResponse = {
  contents?: Record<string, string | null>;
};

const projectConfig = launchProjectConfig as LaunchProjectConfig;
const featureCategories = projectConfig.featureCategories;
const popularFeatureNames = new Set(projectConfig.popularFeatures);
const recommendedFeatureNames = new Set(projectConfig.recommendedFeatures);
const capabilityGroupRank = new Map(projectConfig.popularCapabilityGroups.map((id, index) => [id, index]));

type CapabilityGroup = {
  id: string;
  title: string;
  icon?: string;
  description: string;
  featureNames: string[];
  match: RegExp;
  categoryId?: FeatureCategoryId;
};

type FeatureGroupResult = {
  group: CapabilityGroup;
  features: LaunchFeature[];
  matchedFeatures: LaunchFeature[];
};

function LaunchIconBadge({ name }: { name: string }) {
  return <IconBadge name={name} size="md" className="mt-0.5" />;
}

type CloudProviderId = "all" | "oracle" | "google" | "aws" | "azure" | "local" | "other";

type CloudProviderTab = {
  id: CloudProviderId;
  label: string;
  shortLabel: string;
  description: string;
  brandIcon?: string;
  textIcon?: string;
  Icon?: LucideIcon;
};

const cloudProviderTabs: CloudProviderTab[] = [
  {
    id: "all",
    label: "All cloud",
    shortLabel: "All",
    description: "All cloud-related starter features in this group.",
    Icon: Cloud
  },
  {
    id: "oracle",
    label: "Oracle Cloud",
    shortLabel: "Oracle",
    description: "OCI functions, SDK, vault, logging, database, and object storage features.",
    brandIcon: "oracle"
  },
  {
    id: "google",
    label: "Google Cloud",
    shortLabel: "Google",
    description: "Google Cloud functions, Cloud Run, trace, logging, secret manager, and storage features.",
    brandIcon: "googlecloud"
  },
  {
    id: "aws",
    label: "AWS",
    shortLabel: "AWS",
    description: "Amazon Web Services Lambda, CDK, SDK, secrets, parameters, storage, and observability features.",
    textIcon: "AWS"
  },
  {
    id: "azure",
    label: "Azure",
    shortLabel: "Azure",
    description: "Microsoft Azure functions, identity, logs, tracing, secrets, and storage features.",
    textIcon: "AZ"
  },
  {
    id: "local",
    label: "Local",
    shortLabel: "Local",
    description: "Local or development-time cloud-compatible implementations.",
    Icon: Package
  },
  {
    id: "other",
    label: "Other",
    shortLabel: "Other",
    description: "Cloud, container, discovery, and deployment features that are not provider-specific.",
    Icon: Cloud
  }
];

const capabilityGroups: CapabilityGroup[] = [
  ...projectConfig.capabilityGroups.map((group) => ({
    id: group.id,
    title: group.title,
    icon: group.icon,
    description: group.description,
    featureNames: group.featureNames,
    match: new RegExp(group.matchPattern),
    categoryId: featureCategories.some((category) => category.id === group.id)
      ? group.id as FeatureCategoryId
      : undefined
  })).sort((left, right) => {
    const leftRank = capabilityGroupRank.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = capabilityGroupRank.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    return leftRank - rightRank || left.title.localeCompare(right.title);
  })
];

function optionValueExists(options: LaunchOption[], value: string | null) {
  return Boolean(value && options.some((option) => option.value === value));
}

function slugFromType(typeValue: string, applicationTypes: LaunchOption[]) {
  return applicationTypes.find((type) => type.value === typeValue)?.name ?? "default";
}

function typeValueFromSlug(typeSlug: string | null, data: LaunchInitialData) {
  if (!typeSlug) {
    return data.selectOptions.type.defaultOption.value;
  }
  return data.applicationTypes.find((type) => type.name === typeSlug)?.value
    ?? data.selectOptions.type.options.find((type) => type.value === typeSlug)?.value
    ?? data.selectOptions.type.defaultOption.value;
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

function defaultFeaturesSelected(state: FormState) {
  return state.features.join(",") === [...projectConfig.defaults.features].sort().join(",");
}

function publicLaunchUrl(state: FormState, micronautVersion: string, activity?: string, showing?: string) {
  const url = new URL("https://micronaut.io/launch/");
  url.searchParams.set("type", state.type);
  url.searchParams.set("name", cleanSegment(state.appName, "demo"));
  url.searchParams.set("package", packageName(state.basePackage));
  url.searchParams.set("javaVersion", state.javaVersion);
  url.searchParams.set("lang", state.lang);
  url.searchParams.set("build", state.build);
  url.searchParams.set("test", state.test);
  url.searchParams.set("version", micronautVersion);
  if (!defaultFeaturesSelected(state) && state.features.length > 0) {
    url.searchParams.set("features", state.features.join(","));
  }
  if (activity) {
    url.searchParams.set("activity", activity);
  }
  if (showing) {
    url.searchParams.set("showing", showing);
  }
  return url.toString();
}

function apiUrl(baseUrl: string, action: "create" | "preview" | "diff", typeSlug: string, state: FormState) {
  return `${baseUrl}/${action}/${typeSlug}/${projectName(state.appName, state.basePackage)}?${createQuery(state)}`;
}

function previewJsonUrl(previewUrl: string) {
  if (typeof window === "undefined") {
    return previewUrl;
  }
  if (!["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return previewUrl;
  }

  const url = new URL(previewUrl);
  return `/launch-preview-proxy${url.pathname}${url.search}`;
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

function sourceFolder(state: FormState) {
  if (state.lang === "KOTLIN") {
    return "kotlin";
  }
  return state.lang.toLowerCase();
}

function sourceExtension(state: FormState, data: LaunchInitialData) {
  return data.selectOptions.lang.options.find((option) => option.value === state.lang)?.extension
    ?? sourceFolder(state);
}

function testClassName(state: FormState) {
  const baseName = `${cleanSegment(state.appName, "demo").replace(/^[a-z]/, (letter) => letter.toUpperCase())}`;
  return state.test === "SPOCK" ? `${baseName}Spec` : `${baseName}Test`;
}

function buildFileNames(state: FormState) {
  if (state.build === "MAVEN") {
    return ["pom.xml"];
  }
  if (state.build === "GRADLE_KOTLIN") {
    return ["build.gradle.kts", "settings.gradle.kts", "gradle.properties"];
  }
  return ["build.gradle", "settings.gradle", "gradle.properties"];
}

function configurationFileName(state: FormState) {
  if (state.features.includes("yaml")) {
    return "application.yml";
  }
  if (state.features.includes("toml")) {
    return "application.toml";
  }
  return "application.properties";
}

function previewFiles(state: FormState, data: LaunchInitialData): PreviewFile[] {
  const source = sourceFolder(state);
  const extension = sourceExtension(state, data);
  const packagePath = packageName(state.basePackage).replace(/\./g, "/");
  const files: PreviewFile[] = [
    {
      path: `src/main/${source}/${packagePath}/Application.${extension}`,
      sourceSet: "Application",
      description: "Main application entry point generated by Micronaut Launch.",
      language: extension
    },
    {
      path: `src/test/${source}/${packagePath}/${testClassName(state)}.${extension}`,
      sourceSet: "Tests",
      description: `${optionLabel(data.selectOptions.test.options, state.test)} smoke test for the generated application.`,
      language: extension
    },
    {
      path: `src/main/resources/${configurationFileName(state)}`,
      sourceSet: "Resources",
      description: "Application configuration file selected by the configuration decision.",
      language: configurationFileName(state).split(".").pop() ?? "properties"
    },
    {
      path: "src/main/resources/logback.xml",
      sourceSet: "Resources",
      description: "Default logging configuration.",
      language: "xml"
    },
    {
      path: "micronaut-cli.yml",
      sourceSet: "Build",
      description: "Launch metadata containing application type, language, build tool, test framework, and resolved features.",
      language: "yaml"
    },
    {
      path: "README.md",
      sourceSet: "Build",
      description: "Generated project documentation and feature documentation links.",
      language: "markdown"
    }
  ];

  buildFileNames(state).forEach((path) => {
    files.push({
      path,
      sourceSet: "Build",
      description: "Build file generated by the selected build tool.",
      language: path.endsWith(".kts") ? "kotlin" : path.endsWith(".xml") ? "xml" : "groovy"
    });
  });

  if (state.build !== "MAVEN") {
    files.push(
      {
        path: "gradle/wrapper/gradle-wrapper.properties",
        sourceSet: "Build",
        description: "Gradle wrapper distribution configuration.",
        language: "properties"
      },
      {
        path: "gradlew",
        sourceSet: "Build",
        description: "Gradle wrapper script.",
        language: "bash"
      }
    );
  }

  return files;
}

function buildPreviewTree(files: PreviewFile[]) {
  const roots = new Map<PreviewFile["sourceSet"], PreviewTreeNode>();

  files.forEach((file) => {
    const root = roots.get(file.sourceSet) ?? {
      name: file.sourceSet,
      children: []
    };
    roots.set(file.sourceSet, root);

    let current = root;
    file.path.split("/").forEach((segment, index, segments) => {
      const last = index === segments.length - 1;
      const childPath = segments.slice(0, index + 1).join("/");
      const existing = current.children?.find((child) => child.name === segment);

      if (existing) {
        current = existing;
        return;
      }

      const next: PreviewTreeNode = last
        ? { name: segment, path: file.path, file }
        : { name: segment, path: childPath, children: [] };
      current.children = [...(current.children ?? []), next];
      current = next;
    });
  });

  return Array.from(roots.values());
}

function buildPreviewPathTree(files: PreviewFile[]) {
  const root: PreviewTreeNode = {
    name: "Project",
    children: []
  };

  files.forEach((file) => {
    let current = root;
    file.path.split("/").forEach((segment, index, segments) => {
      const last = index === segments.length - 1;
      const childPath = segments.slice(0, index + 1).join("/");
      const existing = current.children?.find((child) => child.name === segment);

      if (existing) {
        current = existing;
        return;
      }

      const next: PreviewTreeNode = last
        ? { name: segment, path: file.path, file }
        : { name: segment, path: childPath, children: [] };
      current.children = [...(current.children ?? []), next].sort((left, right) => {
        const leftFolder = Boolean(left.children?.length);
        const rightFolder = Boolean(right.children?.length);
        if (leftFolder !== rightFolder) {
          return leftFolder ? -1 : 1;
        }
        return left.name.localeCompare(right.name);
      });
      current = next;
    });
  });

  return root.children ?? [];
}

function sourceSetIcon(sourceSet: PreviewFile["sourceSet"]): LucideIcon {
  if (sourceSet === "Application") {
    return Package;
  }
  if (sourceSet === "Tests") {
    return TestTube2;
  }
  if (sourceSet === "Resources") {
    return Settings;
  }
  return FolderGit2;
}

function fileIcon(file: PreviewFile): LucideIcon {
  if (["java", "kt", "kotlin", "groovy"].includes(file.language)) {
    return Code2;
  }
  if (["json", "yaml", "yml", "toml", "properties", "xml"].includes(file.language)) {
    return FileJson;
  }
  if (file.language === "bash" || file.path.includes("gradlew")) {
    return FileTerminal;
  }
  if (file.language === "markdown") {
    return FileText;
  }
  return File;
}

function previewSourceSet(path: string): PreviewFile["sourceSet"] {
  if (path.startsWith("src/test/")) {
    return "Tests";
  }
  if (path.startsWith("src/main/resources/")) {
    return "Resources";
  }
  if (path.startsWith("src/main/")) {
    return "Application";
  }
  return "Build";
}

function previewLanguage(path: string) {
  if (path.endsWith(".gradle.kts")) {
    return "kotlin";
  }
  if (path.endsWith(".gradle")) {
    return "groovy";
  }
  if (path.endsWith(".properties")) {
    return "properties";
  }
  if (path.endsWith(".yml") || path.endsWith(".yaml")) {
    return "yaml";
  }
  if (path.endsWith(".toml")) {
    return "toml";
  }
  if (path.endsWith(".xml")) {
    return "xml";
  }
  if (path.endsWith(".json")) {
    return "json";
  }
  if (path.endsWith(".java")) {
    return "java";
  }
  if (path.endsWith(".kt") || path.endsWith(".kts")) {
    return "kotlin";
  }
  if (path.endsWith(".groovy")) {
    return "groovy";
  }
  if (path.endsWith(".md")) {
    return "markdown";
  }
  if (path === "gradlew" || path.endsWith(".sh")) {
    return "bash";
  }
  return "text";
}

function previewFilesFromContents(contents: Record<string, string | null>): PreviewFile[] {
  return Object.entries(contents)
    .map(([path, content]) => ({
      path,
      sourceSet: previewSourceSet(path),
      description: content === null
        ? "Binary file returned by the live Micronaut Launch preview."
        : "Generated file returned by the live Micronaut Launch preview.",
      language: previewLanguage(path),
      content
    }))
    .sort((left, right) => {
      const sourceOrder = ["Application", "Tests", "Resources", "Build"];
      return sourceOrder.indexOf(left.sourceSet) - sourceOrder.indexOf(right.sourceSet)
        || left.path.localeCompare(right.path);
    });
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
  const text = searchableFeatureText(feature);
  const backendCategory = (feature.category ?? "").toLowerCase();
  if (category === "most-popular") {
    return popularFeatureNames.has(feature.name);
  }
  if (category === "data-access") {
    return backendCategory === "database"
      || /data|database|jdbc|jpa|hibernate|jooq|mongo|redis|sql|r2dbc|coherence|cosmos/.test(text);
  }
  if (category === "database-migration") {
    return /flyway|liquibase|migration|schema/.test(text);
  }
  if (category === "errors") {
    return /problem-json|errors?|problem/.test(text);
  }
  if (category === "serialization") {
    return /serialization|serde|jackson|databind|bson|json-p|jsonp|xml|json-schema|json schema|object mapping|payload/.test(text);
  }
  if (category === "mcp") {
    return /mcp|model context protocol|tool integration|model-facing|model client/.test(text);
  }
  if (category === "langchain4j") {
    return /langchain4j|langchain|embedding|vector|openai|anthropic|ollama|bedrock|gemini|vertex|mistral|qdrant|pgvector|mongodb-atlas|neo4j|oracle vector/.test(text);
  }
  if (category === "dev-and-test") {
    return backendCategory === "testing"
      || /test|junit|spock|kotest|mock|testcontainers|localstack|jrebel/.test(text);
  }
  if (category === "build") {
    return /aot|aop|aspect-oriented|aspect oriented|graalvm|crac|shade|sourcegen|openrewrite|asciidoctor|kapt|ksp|lombok|buildless|develocity/.test(text);
  }
  if (category === "cloud") {
    return /cloud|aws|amazon|azure|gcp|google|oracle|oci|kubernetes|discovery|function|parameter store|secret|vault|object-storage/.test(text);
  }
  if (category === "messaging") {
    return /messaging|kafka|rabbit|jms|mqtt|nats|pulsar/.test(text);
  }
  if (category === "logging") {
    return /logging|logs?|observability|management|metrics|micrometer|tracing|health|jmx/.test(text);
  }
  if (category === "api") {
    return ["api", "server", "client", "view rendering"].includes(backendCategory)
      || /\b(api|server|http|openapi|graphql|websocket|spring|guice)\b/.test(text);
  }
  if (category === "configuration") {
    return /configuration|config|consul|archaius|config4k/.test(text);
  }
  if (category === "languages") {
    return /language|groovy|kotlin|graalpy/.test(text);
  }
  if (category === "cache") {
    return /cache|caching|caffeine|ehcache|hazelcast|infinispan|coherence cache/.test(text);
  }
  if (category === "email") {
    return /email|mail|ses|javamail|mailjet|mailtrap|postmark|sendgrid|email-template/.test(text);
  }
  if (category === "chatbots") {
    return /chatbot|chatbots|alexa|telegram|basecamp/.test(text);
  }
  if (category === "misc") {
    return /acme|picocli|session|multi-tenancy/.test(text);
  }
  if (category === "reactive") {
    return /reactive|reactor|rxjava/.test(text);
  }
  if (category === "views") {
    return /views?|view rendering|thymeleaf|freemarker|handlebars|jte|pebble|rocker|soy|velocity|htmx|turbo|rss/.test(text);
  }
  if (category === "validation") {
    return /validation|validator|http-validation|jspecify|nullaway/.test(text);
  }
  return true;
}

function featureIsRecommended(feature: LaunchFeature) {
  return recommendedFeatureNames.has(feature.name);
}

function featuresForCapabilityGroup(features: LaunchFeature[], group: CapabilityGroup) {
  const featureByName = new Map(features.map((feature) => [feature.name, feature]));
  const exactMatches = group.featureNames.flatMap((name) => {
    const feature = featureByName.get(name);
    return feature ? [feature] : [];
  });

  return exactMatches;
}

function featuresMatchingQuery(features: LaunchFeature[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  return features.filter((feature) => searchableFeatureText(feature).includes(normalizedQuery)).slice(0, 4);
}

function categoryFeatureGroups(features: LaunchFeature[], existingFeatureNames: Set<string>, hiddenCategoryIds: Set<FeatureCategoryId>): { group: CapabilityGroup; features: LaunchFeature[] }[] {
  const categories = featureCategories.filter((category) => !hiddenCategoryIds.has(category.id));

  return categories
    .map((category) => {
      const groupFeatures = features.filter((feature) => {
        if (existingFeatureNames.has(feature.name)) {
          return false;
        }
        const primaryCategory = categories.find((item) => featureMatchesCategory(feature, item.id));
        return primaryCategory?.id === category.id;
      });
      return {
        group: {
          id: `category-${category.id}`,
          title: category.label,
          icon: category.icon,
          description: category.description,
          featureNames: groupFeatures.map((feature) => feature.name),
          match: /.*/
        },
        features: groupFeatures
      };
    })
    .filter(({ features }) => features.length > 0);
}

function featureCountLabel(count: number) {
  return `${count} feature${count === 1 ? "" : "s"}`;
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
    appName: projectConfig.defaults.appName,
    basePackage: projectConfig.defaults.basePackage,
    javaVersion: data.selectOptions.jdkVersion.defaultOption.value,
    lang,
    build: langDefaults?.build ?? data.selectOptions.build.defaultOption.value,
    test: langDefaults?.test ?? data.selectOptions.test.defaultOption.value,
    features: [...projectConfig.defaults.features].sort()
  };
}

function stateFromSearchParams(data: LaunchInitialData, params: URLSearchParams): FormState {
  const fallback = initialState(data);
  const type = typeValueFromSlug(params.get("type"), data);
  const typeSlug = slugFromType(type, data.applicationTypes);
  const availableFeatureNames = new Set((data.featuresByType[typeSlug] ?? data.featuresByType.default ?? []).map((feature) => feature.name));
  const features = (params.get("features") ?? "")
    .split(",")
    .map((feature) => feature.trim())
    .filter((feature) => feature && availableFeatureNames.has(feature));
  const lang = optionValueExists(data.selectOptions.lang.options, params.get("lang")) ? params.get("lang")! : fallback.lang;
  const build = optionValueExists(data.selectOptions.build.options, params.get("build")) ? params.get("build")! : fallback.build;
  const test = optionValueExists(data.selectOptions.test.options, params.get("test")) ? params.get("test")! : fallback.test;
  const javaVersion = optionValueExists(data.selectOptions.jdkVersion.options, params.get("javaVersion")) ? params.get("javaVersion")! : fallback.javaVersion;

  return {
    type,
    appName: cleanSegment(params.get("name") ?? fallback.appName, fallback.appName),
    basePackage: packageName(params.get("package") ?? fallback.basePackage),
    javaVersion,
    lang,
    build,
    test,
    features: Array.from(new Set(features)).sort()
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
    await copyText(value);
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

async function copyText(value: string) {
  try {
    await navigator.clipboard?.writeText(value);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
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
          <SheetTitle className="break-words">{feature.title}</SheetTitle>
          <SheetDescription className="break-words">{feature.description}</SheetDescription>
        </SheetHeader>
        <div className="grid gap-5 px-4 text-sm leading-6">
          <div className="grid gap-2">
            <p className="font-semibold">Feature id</p>
            <code className="max-w-full break-all rounded-md border bg-muted px-2 py-1 text-xs">{feature.name}</code>
          </div>
          <Separator />
          <div className="grid gap-2">
            <p className="font-semibold">Generated impact</p>
            <p className="text-muted-foreground">
              Adds the <code className="break-all">{feature.name}</code> starter feature to the Micronaut Launch request. The backend resolves the exact dependencies, generated files, and configuration for the selected language and build tool.
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

function FeatureDetailsDialog({
  feature,
  checked,
  onToggle
}: {
  feature: LaunchFeature;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" aria-label={`View details for ${feature.title}`}>
          Details
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="break-words">{feature.title}</DialogTitle>
          <DialogDescription className="break-words">{feature.description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 text-sm">
          <div className="grid gap-2">
            <p className="font-semibold">Feature id</p>
            <code className="max-w-full break-all rounded-md border bg-muted px-2 py-1 text-xs">{feature.name}</code>
          </div>
          <div className="grid gap-2">
            <p className="font-semibold">Generated impact</p>
            <p className="leading-6 text-muted-foreground">
              Adds this starter feature to the Micronaut Launch request. The backend resolves the exact dependencies, generated files, and configuration for the selected project settings.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {feature.category && <Badge variant="outline">{feature.category}</Badge>}
            {feature.preview && <Badge variant="outline">Preview</Badge>}
            {feature.community && <Badge variant="outline">Community</Badge>}
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="button" variant={checked ? "outline" : "default"} onClick={onToggle}>
            {checked ? <X className="size-4" /> : <Check className="size-4" />}
            {checked ? "Remove feature" : "Add feature"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
        "grid gap-2 rounded-lg border bg-card p-3 transition hover:border-brand/60",
        checked && "border-brand bg-brand-soft"
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

function CapabilityGroupPanel({
  group,
  features,
  selectedFeatureNames,
  onToggle,
  showHeader = true
}: {
  group: CapabilityGroup;
  features: LaunchFeature[];
  selectedFeatureNames: string[];
  onToggle: (featureName: string) => void;
  showHeader?: boolean;
}) {
  const selectedCount = features.filter((feature) => selectedFeatureNames.includes(feature.name)).length;

  return (
    <Card className="gap-0">
      {showHeader && (
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            {group.icon && (
              <LaunchIconBadge name={group.icon} />
            )}
            <div className="min-w-0">
              <CardTitle className="text-sm leading-5">{group.title}</CardTitle>
              <CardDescription className="mt-0.5 line-clamp-2 text-xs leading-5">{group.description}</CardDescription>
            </div>
          </div>
          <Badge variant={selectedCount > 0 ? "default" : "secondary"} className="shrink-0">
            {selectedCount > 0 ? `${selectedCount} selected` : featureCountLabel(features.length)}
          </Badge>
        </CardHeader>
      )}
      <CardContent className={cn("grid gap-3", !showHeader && "pt-0")}>
        {features.length > 0 ? (
          <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => {
              const checked = selectedFeatureNames.includes(feature.name);
              return (
                <Card
                  key={feature.name}
                  className={cn(
                    "min-w-0 gap-0 py-0 transition hover:border-brand/60",
                    checked && "border-brand bg-brand-soft"
                  )}
                >
                  <CardHeader className="p-3 pb-2">
                    <label className="flex min-h-20 cursor-pointer items-start gap-3" data-testid={`feature-${feature.name}`}>
                      <Checkbox checked={checked} onCheckedChange={() => onToggle(feature.name)} aria-label={`Select ${feature.title}`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="min-w-0 break-words text-sm font-medium leading-5">{feature.title}</span>
                          {featureIsRecommended(feature) && <Badge variant="secondary" className="text-[0.68rem]">Default</Badge>}
                        </span>
                        <span className="mt-0.5 block line-clamp-2 break-words text-xs leading-5 text-muted-foreground">{feature.description}</span>
                      </span>
                    </label>
                  </CardHeader>
                  <CardContent className="grid gap-2 px-3 pb-3 pt-0">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <code className="min-w-0 flex-1 truncate text-[0.68rem] text-muted-foreground" title={feature.name}>{feature.name}</code>
                      <FeatureDetailsDialog feature={feature} checked={checked} onToggle={() => onToggle(feature.name)} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-dashed px-3 py-4 text-xs leading-5 text-muted-foreground">
            No matching backend features are available for the selected application type.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlatformOptionButtons({
  label,
  options,
  value,
  onChange,
  testIdPrefix
}: {
  label: string;
  options: LaunchOption[];
  value: string;
  onChange: (value: string) => void;
  testIdPrefix: string;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Button
              key={option.value}
              type="button"
              variant={selected ? "default" : "outline"}
              size="sm"
              onClick={() => onChange(option.value)}
              aria-pressed={selected}
              data-testid={`${testIdPrefix}-${option.value.toLowerCase().replace(/_/g, "-")}`}
            >
              {label === "Java version" ? `JDK ${option.label}` : option.label}
            </Button>
          );
        })}
      </div>
    </fieldset>
  );
}

function PlatformPinnedFeature({
  state,
  initialData,
  languageLabel,
  buildLabel,
  javaLabel,
  onUpdate,
  onLanguageChange
}: {
  state: FormState;
  initialData: LaunchInitialData;
  languageLabel: string;
  buildLabel: string;
  javaLabel: string;
  onUpdate: (next: Partial<FormState>) => void;
  onLanguageChange: (value: string) => void;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="grid min-h-24 gap-2 rounded-lg border border-brand-border bg-brand-soft p-3 text-left transition hover:border-brand/60"
          data-testid="pinned-platform"
        >
          <span className="flex items-start justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <LaunchIconBadge name="feature:polyglot-framework" />
              <span className="text-sm font-semibold leading-5">Platform</span>
            </span>
            <Badge variant="secondary" className="shrink-0 text-[0.68rem]">Pinned</Badge>
          </span>
          <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
            Language, build tool, and target JDK for the generated project.
          </span>
          <span className="truncate rounded-md bg-background px-2 py-1 text-xs font-medium">
            {languageLabel} / {buildLabel} / JDK {javaLabel}
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Platform</DialogTitle>
          <DialogDescription>
            Change the generated source language, build files, and Java compatibility.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5">
          <PlatformOptionButtons
            label="Language"
            value={state.lang}
            options={initialData.selectOptions.lang.options}
            onChange={onLanguageChange}
            testIdPrefix="platform-lang"
          />
          <PlatformOptionButtons
            label="Build tool"
            value={state.build}
            options={initialData.selectOptions.build.options}
            onChange={(value) => onUpdate({ build: value })}
            testIdPrefix="platform-build"
          />
          <PlatformOptionButtons
            label="Java version"
            value={state.javaVersion}
            options={initialData.selectOptions.jdkVersion.options}
            onChange={(value) => onUpdate({ javaVersion: value })}
            testIdPrefix="platform-jdk"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TestingPinnedFeature({
  testLabel,
  testValue,
  testOptions,
  group,
  selectedFeatureNames,
  onTestChange,
  onToggle
}: {
  testLabel: string;
  testValue: string;
  testOptions: LaunchOption[];
  group?: { group: CapabilityGroup; features: LaunchFeature[] };
  selectedFeatureNames: string[];
  onTestChange: (value: string) => void;
  onToggle: (featureName: string) => void;
}) {
  const features = group?.features ?? [];
  const selectedCount = features.filter((feature) => selectedFeatureNames.includes(feature.name)).length;
  const libraryGroup: CapabilityGroup = {
    id: "testing-libraries",
    title: "Libraries",
    icon: "feature:fast-easy-testing",
    description: "Assertions, containers, mock servers, REST Assured, and other testing helpers.",
    featureNames: features.map((feature) => feature.name),
    match: /.*/
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="grid min-h-24 gap-2 rounded-lg border border-brand-border bg-brand-soft p-3 text-left transition hover:border-brand/60"
          data-testid="pinned-testing"
        >
          <span className="flex items-start justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <LaunchIconBadge name="feature:fast-easy-testing" />
              <span className="text-sm font-semibold leading-5">Dev & Test</span>
            </span>
            <Badge variant="secondary" className="shrink-0 text-[0.68rem]">Pinned</Badge>
          </span>
          <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
            Test framework, local services, and optional test support libraries.
          </span>
          <span className="truncate rounded-md bg-background px-2 py-1 text-xs font-medium">
            {testLabel} / {selectedCount} libraries
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LaunchIconBadge name="feature:fast-easy-testing" />
            Dev & Test
          </DialogTitle>
          <DialogDescription>
            Choose the generated test framework, then add optional development and testing libraries.
          </DialogDescription>
        </DialogHeader>
        <PlatformOptionButtons
          label="Framework"
          value={testValue}
          options={testOptions}
          onChange={onTestChange}
          testIdPrefix="testing-framework"
        />
        <CapabilityGroupPanel
          group={libraryGroup}
          features={features}
          selectedFeatureNames={selectedFeatureNames}
          onToggle={onToggle}
        />
      </DialogContent>
    </Dialog>
  );
}

function CapabilityGroupDialog({
  group,
  features,
  matchedFeatures = [],
  selectedFeatureNames,
  onToggle
}: {
  group: CapabilityGroup;
  features: LaunchFeature[];
  matchedFeatures?: LaunchFeature[];
  selectedFeatureNames: string[];
  onToggle: (featureName: string) => void;
}) {
  const [query, setQuery] = useState("");
  const selectedCount = features.filter((feature) => selectedFeatureNames.includes(feature.name)).length;
  const filteredFeatures = query.trim()
    ? features.filter((feature) => searchableFeatureText(feature).includes(query.trim().toLowerCase()))
    : features;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "grid min-h-24 min-w-0 gap-2 overflow-hidden rounded-lg border bg-background p-3 text-left transition hover:border-brand/60",
            selectedCount > 0 && "border-brand bg-brand-soft"
          )}
          data-testid={`capability-${group.id}`}
        >
          <span className="flex min-w-0 items-center gap-2">
            {group.icon && (
              <LaunchIconBadge name={group.icon} />
            )}
            <span className="min-w-0 break-words text-sm font-semibold leading-5">{group.title}</span>
          </span>
          <span className="min-w-0 line-clamp-2 break-words text-xs leading-5 text-muted-foreground">{group.description}</span>
          <span className="flex flex-wrap gap-1.5">
            <Badge variant={selectedCount > 0 ? "default" : "secondary"}>
              {selectedCount > 0 ? `${selectedCount} selected` : featureCountLabel(features.length)}
            </Badge>
          </span>
          {matchedFeatures.length > 0 && (
            <span className="grid min-w-0 gap-1 border-t pt-2">
              <span className="text-[0.68rem] font-medium uppercase tracking-normal text-muted-foreground">Matches</span>
              <span className="flex min-w-0 flex-wrap gap-1">
                {matchedFeatures.map((feature) => (
                  <Badge key={feature.name} variant="outline" className="min-w-0 max-w-full overflow-hidden text-[0.68rem]">
                    <span className="min-w-0 truncate" title={feature.name}>{feature.name}</span>
                  </Badge>
                ))}
              </span>
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {group.icon && (
              <LaunchIconBadge name={group.icon} />
            )}
            {group.title}
          </DialogTitle>
          <DialogDescription>{group.description}</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Label htmlFor={`feature-search-${group.id}`} className="sr-only">Search {group.title} features</Label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={`feature-search-${group.id}`}
            type="search"
            className="pl-9"
            placeholder={`Find a ${group.title.toLowerCase()} feature`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <CapabilityGroupPanel
          group={group}
          features={filteredFeatures}
          selectedFeatureNames={selectedFeatureNames}
          onToggle={onToggle}
          showHeader={false}
        />
      </DialogContent>
    </Dialog>
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
  featureGroup,
  selectedFeatureNames,
  onSelect,
  onToggleFeature
}: {
  group: ResolvedDecisionGroup;
  featureGroup?: { group: CapabilityGroup; features: LaunchFeature[] };
  selectedFeatureNames: string[];
  onSelect: (group: ResolvedDecisionGroup, choice: ResolvedDecisionChoice) => void;
  onToggleFeature: (featureName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeChoice = group.activeChoice;
  const customized = group.selectedChoices.length > 0;
  const stateLabel = group.conflicted ? "Conflict" : customized ? "Selected" : "Default";
  const additionalConfigurationGroup: CapabilityGroup | undefined = featureGroup
    ? {
        ...featureGroup.group,
        title: "Additional options"
      }
    : undefined;
  const additionalConfigurationFeatures = featureGroup?.features ?? [];

  function selectChoice(choice: ResolvedDecisionChoice) {
    onSelect(group, choice);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "grid min-h-24 gap-2 rounded-lg border bg-background p-3 text-left transition hover:border-brand/60",
            group.conflicted && "border-destructive/70",
            customized && !group.conflicted && "border-brand bg-brand-soft"
          )}
          data-testid={`decision-row-${group.id}`}
        >
          <span className="flex items-start justify-between gap-2">
            <span className="flex min-w-0 items-start gap-2">
              <LaunchIconBadge name="feature:smooth-learning-curve" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-5">{group.title}</span>
                <span className="mt-0.5 block line-clamp-1 text-xs leading-5 text-muted-foreground">
                  {activeChoice?.title ?? "Review required"}
                </span>
              </span>
            </span>
            <Badge variant={group.conflicted ? "outline" : customized ? "default" : "secondary"} className="shrink-0">
              {stateLabel}
            </Badge>
          </span>
          <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
            {activeChoice?.summary ?? group.description}
          </span>
          <span className="text-xs font-medium text-brand">Change</span>
        </button>
      </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LaunchIconBadge name="feature:smooth-learning-curve" />
                {group.title}
              </DialogTitle>
              <DialogDescription>{group.description}</DialogDescription>
            </DialogHeader>
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
                    selected && "border-brand bg-brand-soft"
                  )}
                >
                  <label className="flex cursor-pointer items-start gap-3" data-testid={`decision-${group.id}-${choice.id}`}>
                    <input
                      type="radio"
                      className="mt-1 size-4 accent-primary"
                      name={`decision-${group.id}`}
                      checked={selected}
                      onChange={() => selectChoice(choice)}
                    />
                    <span className="grid gap-1">
                      <span className="flex flex-wrap items-center gap-2 font-semibold">
                        {choice.title}
                        {choice.featureName && <Badge variant="outline">{choice.featureName}</Badge>}
                        {defaultChoice && <Badge variant="secondary">Default</Badge>}
                        {!defaultChoice && selected && <Badge variant="secondary">Selected</Badge>}
                      </span>
                      <span className="text-sm leading-6 text-muted-foreground">{choice.summary}</span>
                      {group.id !== "configuration" && (
                        <span className="text-xs leading-5 text-muted-foreground">
                          Impact: {choice.impact}
                        </span>
                      )}
                    </span>
                  </label>
                  <DecisionChoiceDetails
                    group={group}
                    choice={choice}
                    selected={selected}
                    onSelect={() => selectChoice(choice)}
                  />
                </div>
              );
            })}
          </fieldset>
          {additionalConfigurationGroup && additionalConfigurationFeatures.length > 0 && (
            <>
              <Separator className="my-4" />
              <CapabilityGroupPanel
                group={additionalConfigurationGroup}
                features={additionalConfigurationFeatures}
                selectedFeatureNames={selectedFeatureNames}
                onToggle={onToggleFeature}
              />
            </>
          )}
          </DialogContent>
    </Dialog>
  );
}

function PreviewTree({
  node,
  selectedPath,
  onSelect,
  level
}: {
  node: PreviewTreeNode;
  selectedPath?: string;
  onSelect: (path: string) => void;
  level: number;
}) {
  const hasChildren = Boolean(node.children?.length);
  const containsSelectedPath = Boolean(selectedPath && (
    node.path === selectedPath
    || node.children?.some((child) => child.path === selectedPath || selectedPath.startsWith(`${child.path}/`))
  ));

  if (!hasChildren && node.file && node.path) {
    const Icon = fileIcon(node.file);
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          type="button"
          size="sm"
          isActive={selectedPath === node.path}
          className="h-7 rounded-sm px-1.5 font-normal data-[active=true]:bg-muted"
          onClick={() => onSelect(node.path!)}
          style={{ paddingLeft: `${Math.max(level, 0) * 1.05 + 0.35}rem` }}
        >
          <Icon className="size-4 shrink-0" />
          <span className="truncate">{node.name}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  const Icon = Folder;

  return (
    <SidebarMenuItem>
      <Collapsible.Root
        className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
        defaultOpen={level < 4 || containsSelectedPath}
      >
        <Collapsible.Trigger asChild>
          <SidebarMenuButton
            type="button"
            size="sm"
            className="h-7 rounded-sm px-1.5 font-semibold"
            style={{ paddingLeft: `${Math.max(level, 0) * 1.05 + 0.35}rem` }}
          >
            <ChevronRight className="size-3.5 shrink-0 transition-transform" />
            <Icon className="size-4 shrink-0 fill-current" />
            <span className="truncate">{node.name}</span>
          </SidebarMenuButton>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <SidebarMenuSub className="mx-0 border-l-0 pl-0">
            {(node.children ?? []).map((child) => (
              <PreviewTree
                key={`${child.path ?? node.name}/${child.name}`}
                node={child}
                selectedPath={selectedPath}
                onSelect={onSelect}
                level={level + 1}
              />
            ))}
          </SidebarMenuSub>
        </Collapsible.Content>
      </Collapsible.Root>
    </SidebarMenuItem>
  );
}

function SourceSetPreviewDialog({
  state,
  initialData,
  previewUrl,
  className
}: {
  state: FormState;
  initialData: LaunchInitialData;
  previewUrl: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [previewContents, setPreviewContents] = useState<Record<string, string | null> | null>(null);
  const [previewStatus, setPreviewStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [previewError, setPreviewError] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const fallbackFiles = previewFiles(state, initialData);
  const files = previewContents ? previewFilesFromContents(previewContents) : fallbackFiles;
  const [selectedPath, setSelectedPath] = useState(files[0]?.path ?? "");
  const selectedFile = files.find((file) => file.path === selectedPath) ?? files[0];
  const fileTree = buildPreviewPathTree(files);
  const previewTitle = `Previewing a ${optionLabel(initialData.selectOptions.lang.options, state.lang)} application using ${optionLabel(initialData.selectOptions.build.options, state.build)}`;
  const previewShareUrl = publicLaunchUrl(state, initialData.micronautVersion, "preview", selectedFile?.path);

  async function copyPreviewLink() {
    await copyText(previewShareUrl);
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 1800);
  }

  useEffect(() => {
    if (!files.some((file) => file.path === selectedPath)) {
      setSelectedPath(files[0]?.path ?? "");
    }
  }, [files, selectedPath]);

  useEffect(() => {
    setCopiedLink(false);
  }, [selectedPath]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const controller = new AbortController();
    setPreviewStatus("loading");
    setPreviewError("");

    fetch(previewJsonUrl(previewUrl), {
      headers: { Accept: "application/json" },
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Preview request returned ${response.status}`);
        }
        const payload = await response.json() as LaunchPreviewResponse;
        if (!payload.contents) {
          throw new Error("Preview response did not include file contents");
        }
        setPreviewContents(payload.contents);
        setPreviewStatus("loaded");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setPreviewContents(null);
        setPreviewStatus("error");
        setPreviewError(error instanceof Error ? error.message : "Preview request failed");
      });

    return () => controller.abort();
  }, [open, previewUrl]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className={className} data-testid="preview-project">
          <FileCode2 className="size-4" />
          Preview project
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="h-[86vh] max-h-[calc(100vh-3rem)] gap-0 overflow-hidden p-0 sm:max-w-[82vw]">
        <DialogHeader className="border-b bg-background px-5 py-4">
          <DialogTitle className="text-2xl font-semibold leading-tight">{previewTitle}</DialogTitle>
          <DialogDescription className="sr-only">
            Browse generated files and file contents from the Micronaut Launch preview response.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 grid-cols-[22rem_minmax(0,1fr)] overflow-hidden">
          <aside className="min-h-0 border-r bg-muted/10">
            <SidebarProvider className="h-full min-h-0 w-full">
              <Sidebar collapsible="none" className="h-full w-full overflow-hidden border-0 bg-muted/10">
                <SidebarContent className="overflow-y-auto px-3 py-3">
                  <SidebarGroup className="p-0">
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {fileTree.map((root) => (
                          <PreviewTree
                            key={root.name}
                            node={root}
                            selectedPath={selectedFile?.path}
                            onSelect={setSelectedPath}
                            level={0}
                          />
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </SidebarContent>
              </Sidebar>
            </SidebarProvider>
          </aside>
          <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-background">
            <div className="flex min-h-12 items-center justify-between gap-3 border-b bg-muted/20 px-4 py-2">
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-medium" title={selectedFile?.path}>
                  {selectedFile?.path ?? "No file selected"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {previewStatus === "loading" ? "Loading live preview contents" : selectedFile?.language ?? "text"}
                </p>
              </div>
              {previewStatus === "error" && (
                <Badge variant="destructive">Preview fallback</Badge>
              )}
            </div>
            {previewStatus === "loading" && !selectedFile?.content ? (
              <div className="p-5 text-sm text-muted-foreground">Loading preview JSON...</div>
            ) : previewStatus === "error" && !selectedFile?.content ? (
              <div className="grid gap-2 p-5 text-sm text-muted-foreground">
                <p className="font-medium text-destructive">Preview JSON unavailable</p>
                <p>{previewError}</p>
                <code className="break-all rounded-md border bg-background p-3 text-xs">{previewUrl}</code>
              </div>
            ) : selectedFile?.content === null ? (
              <div className="p-5 text-sm text-muted-foreground">Binary file content is not included in the preview JSON.</div>
            ) : selectedFile && selectedFile.content !== undefined ? (
              <UiCodeBlock
                code={selectedFile.content ?? ""}
                filename={selectedFile.path}
                language={selectedFile.language}
              />
            ) : (
              <div className="p-5 text-sm text-muted-foreground">Select a file to preview its contents.</div>
            )}
          </section>
        </div>
        <div className="flex items-center justify-end gap-6 border-t bg-background px-5 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => void copyPreviewLink()}
            aria-label="Copy link to this preview"
            data-testid="copy-preview-link"
          >
            {copiedLink ? <Check className="size-4" /> : <Link2 className="size-4" />}
            {copiedLink ? "Copied" : "Link to This"}
          </Button>
          <span className="sr-only" aria-live="polite">
            {copiedLink ? "Preview link copied" : ""}
          </span>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DiffProjectDialog({ diffUrl }: { diffUrl: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Braces className="size-4" />
          Diff
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Diff from default</DialogTitle>
          <DialogDescription>
            The diff is rendered by the live Micronaut Launch backend for the current settings.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="overflow-hidden rounded-lg border bg-background">
            <iframe
              title="Micronaut Launch diff"
              src={diffUrl}
              className="h-[520px] w-full bg-background"
              sandbox="allow-same-origin"
            />
          </div>
          <CodeBlock value={diffUrl} label="Diff endpoint" />
          <Button asChild variant="outline">
            <a href={diffUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
              Open live diff
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BuilderStepNav({
  previous,
  next,
  onPrevious,
  onNext
}: {
  previous?: string;
  next?: string;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
      {previous ? (
        <Button type="button" variant="outline" onClick={onPrevious}>
          Previous: {previous}
        </Button>
      ) : (
        <span aria-hidden="true" />
      )}
      {next && (
        <Button type="button" onClick={onNext}>
          Next: {next}
        </Button>
      )}
    </div>
  );
}

function LaunchPanel({
  state,
  initialData,
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
  initialData: LaunchInitialData;
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
    <Card className="min-h-full border-brand-border">
      <CardHeader className="gap-4">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Ready to generate</CardTitle>
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
          <SourceSetPreviewDialog
            state={state}
            initialData={initialData}
            previewUrl={previewUrl}
            className="w-full"
          />
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
                  <Badge key={feature.name} variant="secondary" className="min-w-0 max-w-full gap-1 py-1">
                    <span className="min-w-0 max-w-[18rem] truncate" title={feature.name}>{feature.name}</span>
                    <button type="button" className="shrink-0" aria-label={`Remove ${feature.title}`} onClick={() => onRemoveFeature(feature.name)}>
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
  const [shareHydrated, setShareHydrated] = useState(false);
  const [featureGroupQuery, setFeatureGroupQuery] = useState("");
  const [activeBuilderStep, setActiveBuilderStep] = useState<BuilderStepId>("settings");

  const typeSlug = slugFromType(state.type, initialData.applicationTypes);
  const availableFeatures = initialData.featuresByType[typeSlug] ?? initialData.featuresByType.default ?? [];
  const allDecisionGroups = useMemo(
    () => resolveDecisionGroups(availableFeatures, state.features),
    [availableFeatures, state.features]
  );
  const decisionGroups = allDecisionGroups.filter((group) => group.id === "configuration");
  const conflictedDecisionGroups = decisionGroups.filter((group) => group.conflicted);
  const capabilityGroupFeatures = useMemo(
    () => {
      const assignedFeatureNames = new Set<string>();
      return capabilityGroups
        .map((group) => {
          const features = featuresForCapabilityGroup(availableFeatures, group)
            .filter((feature) => {
              if (assignedFeatureNames.has(feature.name)) {
                return false;
              }
              assignedFeatureNames.add(feature.name);
              return true;
            });
          return {
            group,
            features
          };
        })
        .filter(({ features }) => features.length > 0);
    },
    [availableFeatures]
  );
  const testingFeatureGroup = capabilityGroupFeatures.find(({ group }) => group.id === "dev-and-test");
  const configurationFeatureGroup = capabilityGroupFeatures.find(({ group }) => group.id === "configuration");
  const capabilityFeatureNames = useMemo(
    () => new Set(capabilityGroupFeatures.flatMap(({ features }) => features.map((feature) => feature.name))),
    [capabilityGroupFeatures]
  );
  const categoryGroupFeatures = useMemo(
    () => categoryFeatureGroups(
      availableFeatures,
      capabilityFeatureNames,
      new Set(capabilityGroups.flatMap((group) => group.categoryId ? [group.categoryId] : []))
    ),
    [availableFeatures, capabilityFeatureNames]
  );
  const allFeatureGroupFeatures = useMemo(
    () => [
      ...capabilityGroupFeatures.filter(({ group }) => group.id !== "dev-and-test" && group.id !== "configuration"),
      ...categoryGroupFeatures
    ],
    [capabilityGroupFeatures, categoryGroupFeatures]
  );
  const filteredFeatureGroupFeatures = useMemo<FeatureGroupResult[]>(() => {
    const query = featureGroupQuery.trim().toLowerCase();
    if (!query) {
      return allFeatureGroupFeatures.map(({ group, features }) => ({
        group,
        features,
        matchedFeatures: []
      }));
    }
    return allFeatureGroupFeatures.flatMap(({ group, features }) => {
      const matchedFeatures = featuresMatchingQuery(features, query);
      const groupMatches = [group.title, group.description].join(" ").toLowerCase().includes(query);
      if (!groupMatches && matchedFeatures.length === 0) {
        return [];
      }
      return [{
        group,
        features,
        matchedFeatures
      }];
    });
  }, [allFeatureGroupFeatures, featureGroupQuery]);
  const decisionFeatureNames = useMemo(
    () => new Set(decisionGroups.flatMap((group) => group.choices.flatMap((choice) => choice.featureName ? [choice.featureName] : []))),
    [decisionGroups]
  );
  const selectedFeatures = availableFeatures.filter((feature) => state.features.includes(feature.name));
  const optionalSelectedFeatures = selectedFeatures.filter((feature) => !decisionFeatureNames.has(feature.name));

  const createUrl = apiUrl(initialData.apiBaseUrl, "create", typeSlug, state);
  const previewUrl = apiUrl(initialData.apiBaseUrl, "preview", typeSlug, state);
  const diffUrl = apiUrl(initialData.apiBaseUrl, "diff", typeSlug, state);
  const command = cliCommand(typeSlug, state);
  const curl = `curl --location --request GET '${createUrl}' --output ${cleanSegment(state.appName, "demo")}.zip`;
  const runtime = runtimeSummary(state, initialData);
  const testLabel = optionLabel(initialData.selectOptions.test.options, state.test);
  const languageLabel = optionLabel(initialData.selectOptions.lang.options, state.lang);
  const buildLabel = optionLabel(initialData.selectOptions.build.options, state.build);
  const javaLabel = optionLabel(initialData.selectOptions.jdkVersion.options, state.javaVersion);
  const shareUrl = publicLaunchUrl(state, initialData.micronautVersion);
  const defaultDecisionCount = decisionGroups.filter((group) => !group.conflicted && group.selectedChoices.length === 0).length;
  const customizedDecisionCount = decisionGroups.filter((group) => !group.conflicted && group.selectedChoices.length > 0).length;
  const sanitizedAppName = cleanSegment(state.appName, "demo");
  const sanitizedPackage = packageName(state.basePackage);
  const appNameAdjusted = sanitizedAppName !== state.appName.trim();
  const packageAdjusted = sanitizedPackage !== state.basePackage.trim();
  useEffect(() => {
    if (shareHydrated || typeof window === "undefined") {
      return;
    }
    if (window.location.search.length > 1) {
      setState(stateFromSearchParams(initialData, new URLSearchParams(window.location.search)));
    }
    setShareHydrated(true);
  }, [initialData, shareHydrated]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("feature-group-search")?.focus();
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
    <main className="flex h-[calc(100dvh-57px)] flex-col overflow-hidden">
      <section className="shrink-0 border-b bg-card">
        <div className="mx-auto grid max-w-[1440px] gap-1 px-4 py-2.5 md:px-6">
          <div className="flex flex-col gap-1">
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight text-foreground md:text-2xl">
                Build a Micronaut project
              </h1>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground md:text-sm">
                Configure project settings, choose stack decisions, add starter features, and generate a ZIP.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid min-h-0 w-full max-w-[1440px] flex-1 px-4 py-2 md:px-6">
        <Tabs value={activeBuilderStep} onValueChange={(value) => setActiveBuilderStep(value as BuilderStepId)} className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2" data-testid="builder-tabs">
            <TabsList className="grid h-auto w-full shrink-0 grid-cols-3 gap-1 p-1">
              <TabsTrigger value="settings" className="h-9 min-w-0 px-1 text-[0.68rem] sm:px-2 sm:text-sm">1 Project settings</TabsTrigger>
              <TabsTrigger value="features" className="h-9 min-w-0 px-1 text-[0.68rem] sm:px-2 sm:text-sm">2 Features</TabsTrigger>
              <TabsTrigger value="launch" className="h-9 min-w-0 px-1 text-[0.68rem] sm:px-2 sm:text-sm">3 Launch Panel</TabsTrigger>
            </TabsList>
            <TabsContent value="settings" className="mt-0 grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-3 overflow-hidden pr-1">
              <div className="min-h-0 overflow-y-auto pr-1">
                <div className="grid gap-3">
                  <Card>
                  <CardHeader>
                    <CardDescription>Set the generated project identity and application type.</CardDescription>
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
                  <OptionSelect
                    id="launch-type"
                    label="Application type"
                    value={state.type}
                    options={initialData.selectOptions.type.options}
                    onChange={(value) => update({ type: value, features: state.features.filter((name) => (initialData.featuresByType[slugFromType(value, initialData.applicationTypes)] ?? []).some((feature) => feature.name === name)) })}
                  />
                  </CardContent>
                  </Card>

                  <Card>
                  <CardHeader>
                    <CardTitle>Runtime</CardTitle>
                    <CardDescription>{runtime}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-5">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                  <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/40 p-4">
                      <Button type="button" variant={state.build === "GRADLE" ? "default" : "outline"} size="sm" onClick={() => update({ build: "GRADLE" })} aria-pressed={state.build === "GRADLE"} data-testid="build-gradle">
                        Gradle
                      </Button>
                      <Button type="button" variant={state.build === "GRADLE_KOTLIN" ? "default" : "outline"} size="sm" onClick={() => update({ build: "GRADLE_KOTLIN" })} aria-pressed={state.build === "GRADLE_KOTLIN"}>
                        Gradle Kotlin
                      </Button>
                      <Button type="button" variant={state.lang === "JAVA" ? "default" : "outline"} size="sm" onClick={() => update({ lang: "JAVA", test: "JUNIT" })} aria-pressed={state.lang === "JAVA"} data-testid="lang-java">
                        Java
                      </Button>
                      <Button type="button" variant={state.test === "JUNIT" ? "default" : "outline"} size="sm" onClick={() => update({ test: "JUNIT" })} aria-pressed={state.test === "JUNIT"} data-testid="test-junit">
                        JUnit
                      </Button>
                  </div>
                  </CardContent>
                  </Card>
                </div>
              </div>
              <BuilderStepNav
                next="Features"
                onNext={() => setActiveBuilderStep("features")}
              />
            </TabsContent>

            <TabsContent value="features" className="mt-0 grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-3 overflow-hidden pr-1">
          <Card className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
            <CardHeader className="shrink-0">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardDescription>Search groups or features, then open any box to change configuration or add backend starter capabilities.</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => update({ features: state.features.filter((name) => decisionFeatureNames.has(name)) })} disabled={optionalSelectedFeatures.length === 0}>
                  <X className="size-4" />
                  Clear optional
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-3">
                <div className="relative shrink-0">
                  <Label htmlFor="feature-group-search" className="sr-only">Search feature groups</Label>
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="feature-group-search"
                    type="search"
                    className="pl-9"
                    placeholder="Search groups or features"
                    value={featureGroupQuery}
                    onChange={(event) => setFeatureGroupQuery(event.target.value)}
                    data-testid="feature-group-search"
                  />
                </div>
                <div className="min-h-0 overflow-y-auto pr-1">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6" data-testid="decision-center">
                    <PlatformPinnedFeature
                      state={state}
                      initialData={initialData}
                      languageLabel={languageLabel}
                      buildLabel={buildLabel}
                      javaLabel={javaLabel}
                      onUpdate={update}
                      onLanguageChange={updateLanguage}
                    />
                    <TestingPinnedFeature
                      testLabel={testLabel}
                      testValue={state.test}
                      testOptions={initialData.selectOptions.test.options}
                      group={testingFeatureGroup}
                      selectedFeatureNames={state.features}
                      onTestChange={(value) => update({ test: value })}
                      onToggle={toggleFeature}
                    />
                    {decisionGroups.map((group) => (
                      <DecisionGroupPanel
                        key={group.id}
                        group={group}
                        featureGroup={group.id === "configuration" ? configurationFeatureGroup : undefined}
                        selectedFeatureNames={state.features}
                        onSelect={selectDecisionChoice}
                        onToggleFeature={toggleFeature}
                      />
                    ))}
                    {filteredFeatureGroupFeatures.map(({ group, features, matchedFeatures }) => (
                      <CapabilityGroupDialog
                        key={group.id}
                        group={group}
                        features={features}
                        matchedFeatures={matchedFeatures}
                        selectedFeatureNames={state.features}
                        onToggle={toggleFeature}
                      />
                    ))}
                    {filteredFeatureGroupFeatures.length === 0 && (
                      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground sm:col-span-2 lg:col-span-6">
                        No feature groups match this search.
                      </div>
                    )}
                    </div>
                </div>
            </CardContent>
          </Card>
              <BuilderStepNav
                previous="Project settings"
                next="Launch Panel"
                onPrevious={() => setActiveBuilderStep("settings")}
                onNext={() => setActiveBuilderStep("launch")}
              />
            </TabsContent>

            <TabsContent value="launch" className="mt-0 grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-3 overflow-hidden pr-1">
              <div className="min-h-0 overflow-y-auto pr-1">
                <LaunchPanel
                  state={state}
                  initialData={initialData}
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
              </div>
              <BuilderStepNav
                previous="Features"
                onPrevious={() => setActiveBuilderStep("features")}
              />
            </TabsContent>
          </Tabs>
      </section>
    </main>
  );
}
