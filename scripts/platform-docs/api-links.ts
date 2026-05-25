import { macroAttribute, macroText } from "./listing.ts";

export function apiLink(context: any, kind: any, target: any, attrs: any): any {
  const parsed = parseApiTarget(target);
  const library = apiLibrary(context, kind, attrs);
  let baseUri = apiBaseUri(context, library.attributeKey, library);
  const module = apiModule(parsed.classTarget, attrs);
  if (module) {
    baseUri = `${baseUri}/${module}`;
  }

  let label = macroText(attrs) || parsed.shortName;
  if (kind === "ann") {
    label = `@${label}`;
  }

  const href =
    `${baseUri}/${targetPathUrl(parsed.classTarget, library.packagePrefix)}.html${parsed.methodRef}${parsed.propRef}`.replaceAll(
      "$",
      ".",
    );
  return { href, label };
}

export function packageLink(context: any, target: any, attrs: any): any {
  let packageName = target;
  if (!packageName.startsWith("io.micronaut.")) {
    packageName = `io.micronaut.${packageName}`;
  }
  return {
    href: `assets/${context.project.slug}/docs/api/${packageName.replaceAll(".", "/")}/package-summary.html`,
    label: macroText(attrs) || packageName,
  };
}

function parseApiTarget(target: any): any {
  const methodIndex = target.lastIndexOf("(");
  const propIndex = target.lastIndexOf("#");
  let classTarget = target;
  let methodRef = "";
  let propRef = "";
  let shortName;

  if (methodIndex > -1 && target.endsWith(")")) {
    const signature = target.slice(methodIndex + 1, -1);
    const withoutSignature = target.slice(0, methodIndex);
    const methodSeparator = withoutSignature.lastIndexOf(".");
    if (methodSeparator < 0) {
      shortName = target;
    } else {
      const methodName = withoutSignature.slice(methodSeparator + 1);
      classTarget = withoutSignature.slice(0, methodSeparator);
      methodRef = `#${methodName}-${signature.split(",").join("-")}-`;
      shortName = `${simpleName(classTarget)}.${methodName}(${signature})`;
    }
  } else if (propIndex > -1) {
    propRef = target.slice(propIndex);
    classTarget = target.slice(0, propIndex);
    shortName = propRef.slice(1);
  } else {
    shortName = simpleName(target);
  }

  return { classTarget, methodRef, propRef, shortName };
}

function apiLibrary(context: any, kind: any, attrs: any): any {
  const localApi = `assets/${context.project.slug}/docs/api`;
  const libraries: Record<
    string,
    {
      defaultUri: string;
      packagePrefix: string | null;
      attributeKey: string | null;
    }
  > = {
    api: {
      defaultUri: localApi,
      packagePrefix: "io.micronaut.",
      attributeKey: null,
    },
    ann: {
      defaultUri: localApi,
      packagePrefix: "io.micronaut.",
      attributeKey: null,
    },
    mnapi: {
      defaultUri: "https://docs.micronaut.io/latest/api",
      packagePrefix: "io.micronaut.",
      attributeKey: "micronautApi",
    },
    jdk: {
      defaultUri: "https://docs.oracle.com/en/java/javase/21/docs/api",
      packagePrefix: null,
      attributeKey: "jdkapi",
    },
    jee: {
      defaultUri: "https://docs.oracle.com/javaee/6/api",
      packagePrefix: null,
      attributeKey: "jeeapi",
    },
    rs: {
      defaultUri:
        "https://www.reactive-streams.org/reactive-streams-1.0.3-javadoc",
      packagePrefix: "org.reactivestreams.",
      attributeKey: "rsapi",
    },
    rx: {
      defaultUri: "http://reactivex.io/RxJava/2.x/javadoc",
      packagePrefix: "io.reactivex.",
      attributeKey: "rxapi",
    },
    reactor: {
      defaultUri: "https://projectreactor.io/docs/core/release/api",
      packagePrefix: "reactor.core.publisher.",
      attributeKey: "reactorapi",
    },
  };
  const library = { ...libraries[kind] };
  const defaultUri = macroAttribute(attrs, "defaultUri");
  const packagePrefix = macroAttribute(attrs, "packagePrefix");
  if (defaultUri !== undefined) {
    library.defaultUri = defaultUri;
  }
  if (packagePrefix !== undefined) {
    library.packagePrefix = packagePrefix;
  }
  return library;
}

function apiBaseUri(context: any, attributeKey: any, library: any): any {
  if (attributeKey) {
    const configured =
      context.attributes[attributeKey] ||
      context.attributes[attributeKey.toLowerCase()];
    if (configured) {
      return configured;
    }
  }
  return library.defaultUri;
}

function apiModule(classTarget: any, attrs: any): any {
  const configured = macroAttribute(attrs, "module");
  if (configured !== undefined) {
    return configured;
  }
  return classTarget.startsWith("java") ? "java.base" : "";
}

function targetPathUrl(target: any, packagePrefix: any): any {
  let result = target;
  if (packagePrefix && !target.startsWith(packagePrefix)) {
    result = `${packagePrefix}${target}`;
  }
  return scapeDots(result);
}

function scapeDots(value: any): any {
  const tokens = value.split(".");
  let result = "";
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token) {
      continue;
    }
    result += token;
    if (/^[A-Z]/.test(token)) {
      if (index !== tokens.length - 1) {
        result += ".";
      }
    } else {
      result += "/";
    }
  }
  return result;
}

function simpleName(className: any): any {
  return className.split(".").filter(Boolean).at(-1) || className;
}
