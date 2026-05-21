export type LaunchCatalogFeature = {
  name: string;
  title: string;
  description: string;
  category?: string;
};

export type DecisionChoiceMetadata = {
  id: string;
  featureName?: string;
  title: string;
  summary: string;
  impact: string;
  whenToUse: string;
  whenNotToUse: string;
  tradeoffs: string[];
  docsUrl?: string;
};

export type DecisionGroupMetadata = {
  id: string;
  title: string;
  question: string;
  description: string;
  defaultChoiceId?: string;
  recommendedChoiceId?: string;
  required?: boolean;
  choices: DecisionChoiceMetadata[];
};

export type ResolvedDecisionChoice = DecisionChoiceMetadata & {
  available: boolean;
  feature?: LaunchCatalogFeature;
};

export type ResolvedDecisionGroup = Omit<DecisionGroupMetadata, "choices"> & {
  choices: ResolvedDecisionChoice[];
  defaultChoice?: ResolvedDecisionChoice;
  activeChoice?: ResolvedDecisionChoice;
  selectedChoices: ResolvedDecisionChoice[];
  conflicted: boolean;
  resolved: boolean;
};

export const LAUNCH_DECISION_GROUPS: DecisionGroupMetadata[] = [
  {
    id: "configuration",
    title: "Configuration",
    question: "How should application configuration be represented?",
    description: "Choose the file format people will edit most often for environment-specific settings.",
    defaultChoiceId: "properties",
    recommendedChoiceId: "properties",
    choices: [
      {
        id: "properties",
        featureName: "properties",
        title: "Java properties",
        summary: "A compact key-value format and the smallest default choice.",
        impact: "Creates src/main/resources/application.properties.",
        whenToUse: "Use it for simple services where flat configuration and minimal files are preferred.",
        whenNotToUse: "Avoid it when the team expects nested configuration to be easy to scan and edit.",
        tradeoffs: ["Smallest file shape", "Easy for JVM teams", "Nested data is less readable"]
      },
      {
        id: "yaml",
        featureName: "yaml",
        title: "YAML",
        summary: "A readable nested configuration format for larger applications.",
        impact: "Replaces application.properties with src/main/resources/application.yml.",
        whenToUse: "Use it when configuration has nested sections or when the team already standardizes on YAML.",
        whenNotToUse: "Avoid it when strict whitespace-sensitive files are a concern.",
        tradeoffs: ["Readable hierarchy", "Common in cloud tooling", "Whitespace mistakes can be subtle"]
      },
      {
        id: "toml",
        featureName: "toml",
        title: "TOML",
        summary: "A structured configuration format with explicit sections.",
        impact: "Replaces application.properties with src/main/resources/application.toml.",
        whenToUse: "Use it when you want readable sections without YAML's indentation sensitivity.",
        whenNotToUse: "Avoid it when team tooling expects YAML or properties files.",
        tradeoffs: ["Explicit sections", "Readable for humans", "Less common across Micronaut examples"]
      }
    ]
  },
  {
    id: "reactive",
    title: "Reactive model",
    question: "Which reactive programming model should this project use?",
    description: "Pick a reactive library only when your service needs reactive APIs or integrations.",
    defaultChoiceId: "none",
    choices: [
      {
        id: "none",
        title: "No reactive library",
        summary: "Keep the project synchronous until a feature needs reactive APIs.",
        impact: "Adds no reactive dependency to the generated project.",
        whenToUse: "Use it for straightforward HTTP APIs, CLI tools, and services that do not need reactive composition.",
        whenNotToUse: "Avoid it when selected features or team standards require Reactor or RxJava.",
        tradeoffs: ["Small dependency footprint", "Simpler code path", "Can add a reactive option later"]
      },
      {
        id: "reactor",
        featureName: "reactor",
        title: "Reactor",
        summary: "Adds Project Reactor support.",
        impact: "Adds the Micronaut Reactor feature and Reactor dependencies.",
        whenToUse: "Use it when the team prefers Reactor APIs or when related Micronaut features use Reactor types.",
        whenNotToUse: "Avoid it if the project is intentionally simple and does not need reactive composition.",
        tradeoffs: ["Common reactive ecosystem", "Pairs with Reactor HTTP client", "Adds reactive concepts to the codebase"]
      },
      {
        id: "rxjava3",
        featureName: "rxjava3",
        title: "RxJava 3",
        summary: "Adds RxJava 3 support.",
        impact: "Adds the Micronaut RxJava 3 feature and RxJava dependencies.",
        whenToUse: "Use it when existing code or team experience is built around RxJava.",
        whenNotToUse: "Avoid it for new teams that already standardize on Reactor.",
        tradeoffs: ["Mature API surface", "Useful for RxJava teams", "Less common in newer Micronaut examples"]
      }
    ]
  },
  {
    id: "errors",
    title: "API errors",
    question: "How should API errors be represented?",
    description: "Decide whether generated APIs should use Micronaut defaults or structured problem responses.",
    defaultChoiceId: "default",
    recommendedChoiceId: "default",
    choices: [
      {
        id: "default",
        title: "Micronaut defaults",
        summary: "Use the framework's default error response behavior.",
        impact: "Adds no extra API error feature.",
        whenToUse: "Use it for prototypes and internal services where a formal error contract is not required yet.",
        whenNotToUse: "Avoid it when clients expect standardized problem details.",
        tradeoffs: ["No extra feature", "Fastest path", "Less explicit API error contract"]
      },
      {
        id: "problem-json",
        featureName: "problem-json",
        title: "Problem JSON",
        summary: "Adds application/problem+json style responses.",
        impact: "Adds problem-json support for structured API error responses.",
        whenToUse: "Use it for public APIs or client-heavy services that need structured, documented errors.",
        whenNotToUse: "Avoid it when the API contract intentionally stays minimal.",
        tradeoffs: ["Clearer client contract", "Standardized response shape", "Additional dependency and conventions"]
      }
    ]
  },
  {
    id: "http-client",
    title: "HTTP client",
    question: "How should this service call other HTTP services?",
    description: "Choose a client feature when the service will make outbound HTTP calls.",
    defaultChoiceId: "none",
    choices: [
      {
        id: "none",
        title: "No explicit client",
        summary: "Do not add an outbound HTTP client feature yet.",
        impact: "Adds no outbound HTTP client feature.",
        whenToUse: "Use it when this project only serves requests or the client need is not known.",
        whenNotToUse: "Avoid it when the service immediately needs to call another HTTP API.",
        tradeoffs: ["Smallest generated project", "No client API decision now", "Client setup happens later"]
      },
      {
        id: "http-client",
        featureName: "http-client",
        title: "Micronaut HTTP client",
        summary: "Adds the standard Micronaut HTTP client.",
        impact: "Adds the standard Micronaut HTTP client dependency.",
        whenToUse: "Use it for typical declarative or programmatic Micronaut HTTP client usage.",
        whenNotToUse: "Avoid it when you specifically need the JDK, Reactor, or RxJava variant.",
        tradeoffs: ["Canonical Micronaut client", "Good default for services", "Not tied to a reactive library choice"]
      },
      {
        id: "http-client-jdk",
        featureName: "http-client-jdk",
        title: "JDK HTTP client",
        summary: "Adds the JDK HTTP client integration.",
        impact: "Adds the JDK HTTP client integration feature.",
        whenToUse: "Use it when relying on the JDK client implementation is a project requirement.",
        whenNotToUse: "Avoid it when you want the standard Micronaut Netty-based client path.",
        tradeoffs: ["JDK-backed implementation", "Fewer external runtime assumptions", "Different behavior than Netty client"]
      },
      {
        id: "reactor-http-client",
        featureName: "reactor-http-client",
        title: "Reactor HTTP client",
        summary: "Adds the Reactor variation of the Micronaut HTTP client.",
        impact: "Adds Reactor HTTP client support and pairs best with Reactor.",
        whenToUse: "Use it when outbound calls should compose naturally with Reactor APIs.",
        whenNotToUse: "Avoid it if Reactor is not otherwise part of the stack.",
        tradeoffs: ["Fits Reactor code", "Pairs with Reactor feature", "Adds reactive client concepts"]
      },
      {
        id: "rxjava3-http-client",
        featureName: "rxjava3-http-client",
        title: "RxJava 3 HTTP client",
        summary: "Adds the RxJava 3 variation of the Micronaut HTTP client.",
        impact: "Adds RxJava 3 HTTP client support and pairs best with RxJava 3.",
        whenToUse: "Use it when outbound calls should compose with RxJava 3 APIs.",
        whenNotToUse: "Avoid it if RxJava is not otherwise part of the stack.",
        tradeoffs: ["Fits RxJava code", "Pairs with RxJava 3 feature", "Adds RxJava client concepts"]
      }
    ]
  }
];

export function resolveDecisionGroups(
  features: LaunchCatalogFeature[],
  selectedFeatureNames: string[],
  groups: DecisionGroupMetadata[] = LAUNCH_DECISION_GROUPS
): ResolvedDecisionGroup[] {
  const featureByName = new Map(features.map((feature) => [feature.name, feature]));
  const selected = new Set(selectedFeatureNames);

  return groups
    .map((group) => {
      const choices = group.choices
        .map((choice) => {
          const feature = choice.featureName ? featureByName.get(choice.featureName) : undefined;
          return {
            ...choice,
            feature,
            available: !choice.featureName || choice.id === group.defaultChoiceId || Boolean(feature)
          };
        })
        .filter((choice) => choice.available);
      const selectedChoices = choices.filter((choice) => choice.featureName && selected.has(choice.featureName));
      const defaultChoice = choices.find((choice) => choice.id === group.defaultChoiceId)
        ?? choices.find((choice) => !choice.featureName);

      return {
        ...group,
        choices,
        defaultChoice,
        activeChoice: selectedChoices[0] ?? defaultChoice,
        selectedChoices,
        conflicted: selectedChoices.length > 1,
        resolved: selectedChoices.length === 1 || choices.some((choice) => !choice.featureName)
      };
    })
    .filter((group) => group.choices.some((choice) => choice.featureName));
}

export function applyDecisionChoice(selectedFeatureNames: string[], group: ResolvedDecisionGroup, choice: ResolvedDecisionChoice) {
  const groupFeatureNames = new Set(group.choices.flatMap((item) => item.featureName ? [item.featureName] : []));
  const next = selectedFeatureNames.filter((featureName) => !groupFeatureNames.has(featureName));

  if (choice.featureName) {
    if (group.defaultChoice?.id === choice.id) {
      return Array.from(new Set(next)).sort();
    }
    next.push(choice.featureName);
  }

  return Array.from(new Set(next)).sort();
}
