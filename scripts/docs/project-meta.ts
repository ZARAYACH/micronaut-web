import path from "node:path";

export function renderAttributes(
  project: any,
  platformVersion: any,
  submoduleDirectory: any,
  sourceDocsDirectory: any,
  projectProperties: any,
): any {
  const attributes = {
    ...projectProperties,
    title: project.displayName,
    version: platformVersion,
    safe: "UNSAFE",
    imagesdir: "../img",
    sourcedir: submoduleDirectory,
    sourceDir: submoduleDirectory,
    includedir: `${path.join(submoduleDirectory, "build", "working", "01-includes")}${path.sep}`,
    testsuitejava: path.join(
      submoduleDirectory,
      "test-suite",
      "src",
      "test",
      "java",
      "io",
      "micronaut",
      "docs",
    ),
    testsuitegroovy: path.join(
      submoduleDirectory,
      "test-suite-groovy",
      "src",
      "test",
      "groovy",
      "io",
      "micronaut",
      "docs",
    ),
    testsuitekotlin: path.join(
      submoduleDirectory,
      "test-suite-kotlin",
      "src",
      "test",
      "kotlin",
      "io",
      "micronaut",
      "docs",
    ),
    sourceRepo: sourceDocsEditUrl(project),
    docdir: submoduleDirectory,
  };
  if (!attributes.api) {
    attributes.api = `assets/${project.slug}/docs/api`;
  }
  if (!attributes.githubSlug && project.repositoryUrl.includes("github.com/")) {
    attributes.githubSlug = project.repositoryUrl
      .replace(/^.*github\.com\//, "")
      .replace(/\.git$/, "");
  }
  if (!attributes.projectGroup && attributes.projectGroupId) {
    attributes.projectGroup = attributes.projectGroupId;
  }
  return attributes;
}

export function sourceDocsEditUrl(project: any): any {
  const branch = project.branch || "HEAD";
  return `${project.repositoryUrl.replace(/\.git$/, "")}/edit/${branch}/src/main/docs`;
}
