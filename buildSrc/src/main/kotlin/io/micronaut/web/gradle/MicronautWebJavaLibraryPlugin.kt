package io.micronaut.web.gradle

import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.plugins.JavaPluginExtension
import org.gradle.api.publish.PublishingExtension
import org.gradle.api.publish.maven.MavenPublication
import org.gradle.api.credentials.PasswordCredentials
import org.gradle.jvm.toolchain.JavaLanguageVersion
import org.gradle.kotlin.dsl.configure
import org.gradle.kotlin.dsl.credentials
import org.gradle.kotlin.dsl.get
import org.gradle.kotlin.dsl.register
import org.gradle.kotlin.dsl.withType
import org.gradle.api.tasks.testing.Test

class MicronautWebJavaLibraryPlugin : Plugin<Project> {

    override fun apply(project: Project) {
        project.plugins.apply("java-library")
        project.plugins.apply("maven-publish")

        if (project.group.toString().isBlank() || project.group.toString() == "unspecified") {
            project.group = MicronautWebRootPlugin.DEFAULT_GROUP
        }
        if (project.version.toString().isBlank() || project.version.toString() == "unspecified") {
            project.version = MicronautWebRootPlugin.DEFAULT_VERSION
        }

        project.extensions.configure<JavaPluginExtension> {
            toolchain {
                languageVersion.set(JavaLanguageVersion.of(21))
            }
            withSourcesJar()
        }

        project.tasks.withType<Test>().configureEach {
            useJUnitPlatform()
        }

        project.extensions.configure<PublishingExtension> {
            publications {
                register<MavenPublication>("mavenJava") {
                    from(project.components["java"])
                    pom {
                        name.set(project.name)
                        description.set("Micronaut web static resources and template support.")
                    }
                }
            }

            val githubRepository = project.providers.gradleProperty("githubRepository")
                .orElse(project.providers.environmentVariable("GITHUB_REPOSITORY"))

            if (githubRepository.isPresent) {
                repositories {
                    maven {
                        name = "GitHubPackages"
                        url = project.uri("https://maven.pkg.github.com/${githubRepository.get()}")
                        credentials(PasswordCredentials::class) {
                            username = project.providers.gradleProperty("githubPackagesUsername")
                                .orElse(project.providers.environmentVariable("GITHUB_ACTOR"))
                                .orNull
                            password = project.providers.gradleProperty("githubPackagesToken")
                                .orElse(project.providers.environmentVariable("GITHUB_TOKEN"))
                                .orNull
                        }
                    }
                }
            }
        }
    }
}
