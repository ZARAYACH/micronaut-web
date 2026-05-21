package io.micronaut.web.gradle

import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.tasks.Exec
import org.gradle.kotlin.dsl.register

class MicronautWebRootPlugin : Plugin<Project> {

    override fun apply(project: Project) {
        require(project == project.rootProject) {
            "The io.micronaut.web.root plugin must be applied to the root project."
        }

        project.group = DEFAULT_GROUP
        project.version = DEFAULT_VERSION
        project.plugins.apply("base")

        val projectVersion = project.providers.gradleProperty("micronautWebVersion")
            .orElse(project.providers.environmentVariable("MICRONAUT_WEB_VERSION"))
            .orElse(DEFAULT_VERSION)
            .get()

        project.subprojects {
            group = DEFAULT_GROUP
            version = projectVersion
        }

        project.version = projectVersion

        project.tasks.register<Exec>("npmBuild") {
            group = "build"
            description = "Builds the Astro static site and plain HTML template artifacts."
            workingDir = project.rootDir
            commandLine(npmExecutable(), "run", "build")

            inputs.file(project.layout.projectDirectory.file("package.json"))
            inputs.file(project.layout.projectDirectory.file("package-lock.json"))
            inputs.file(project.layout.projectDirectory.file("astro.config.mjs"))
            inputs.file(project.layout.projectDirectory.file("components.json"))
            inputs.file(project.layout.projectDirectory.file("postcss.config.mjs"))
            inputs.file(project.layout.projectDirectory.file("tsconfig.json"))
            inputs.dir(project.layout.projectDirectory.dir("public"))
            inputs.dir(project.layout.projectDirectory.dir("scripts"))
            inputs.dir(project.layout.projectDirectory.dir("src"))
            outputs.dir(project.layout.projectDirectory.dir("dist"))
        }
    }

    private fun npmExecutable(): String =
        if (System.getProperty("os.name").lowercase().contains("windows")) "npm.cmd" else "npm"

    companion object {
        const val DEFAULT_GROUP = "io.micronaut.web"
        const val DEFAULT_VERSION = "0.1.0"
    }
}
