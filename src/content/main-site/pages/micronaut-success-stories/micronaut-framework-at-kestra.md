---
order: 39
title: Micronaut framework at Kestra
eyebrow: Success story
description: Kestra uses Micronaut for REST APIs, HTTP clients, OpenAPI generation, cloud readiness, and reactive workloads.
sourceUrl: https://micronaut.io/micronaut-success-stories/micronaut-framework-at-kestra/
intro: Kestra's public Micronaut success story for workflow orchestration services.
sections:
  - title: Workflow platform
    body: The story gives a concrete public example of Micronaut used in a workflow orchestration product.
    icon: workflow
  - title: Production services
    body: It reinforces the framework's fit for modular backend services.
    icon: boxes
  - title: Further reading
    body: Use the success-story index for the broader set of public production references.
    icon: book-open
contentSource: micronaut-public-markdown
storyOrder: 3
organization: Kestra
label: Workflow orchestration
summary: Kestra uses Micronaut for REST APIs, HTTP clients, OpenAPI generation, cloud readiness, and reactive workloads.
detail: >-
  The article covers Kubernetes probes, environment-specific configuration, observability, modularity, SSE log
  streaming, and a plugin system with hundreds of plugins.
proofs:
  - OpenAPI generation
  - Kubernetes readiness
scenario: Workflow orchestration platform
challenge: >-
  Build a modular orchestration service with REST APIs, generated contracts, observability, streaming logs, and plugin
  extension points.
micronautUse: >-
  Micronaut powers APIs, HTTP clients, OpenAPI generation, probes, configuration, reactive workloads, and SSE log
  streaming.
outcome: A cloud-ready orchestration platform with modular services and a large plugin ecosystem.
technologies:
  - REST APIs
  - OpenAPI
  - Kubernetes
  - SSE
logo: /micronaut-assets/main-site/wp-content/uploads/2025/01/Kestra.full_.logo_.dark_.svg
logoDark: /micronaut-assets/main-site/wp-content/uploads/2025/01/Kestra.full_.logo_.light-text.svg
logoClass: h-8 w-auto
---

# Micronaut framework at Kestra

Micronaut framework’s lightweight, reactive foundation lets us focus on what matters—building a robust, scalable orchestration platform that developers trust.

[![Kestra](/micronaut-assets/main-site/wp-content/uploads/2025/01/Kestra.full_.logo_.dark_.svg)](http://kestra.io)

> “At the time, Micronaut framework was relatively new, but it showed immense promise. Unlike legacy frameworks that relied heavily on runtime reflection (a performance bottleneck), Micronaut framework generated the necessary metadata at compile time, ensuring better efficiency. This was crucial for Kestra, where every CPU cycle matters when orchestrating large-scale tasks.”

*– Ludovic Dehon Co-Founder and CTO of Kestra*

## REST API and HTTP Clients

Micronaut framework powers Kestra’s REST APIs, exposing our orchestration capabilities to users and systems alike. Its HTTP client integration ensures that external calls—for triggers, task execution, or inter-service communication—remain efficient and reactive.

## OpenAPI for API-First Design

Kestra is **API-first**, and Micronaut framework’s OpenAPI support makes this approach simple.

With just a few annotations:

- - We generate a full OpenAPI spec directly from our controllers.
  - Micronaut framework handles much of this automatically, so we don’t need to clutter our codebase with repetitive annotations.

This means cleaner code for us and comprehensive documentation for Kestra users.

## Cloud-Native Readiness

Kestra is designed to run in public clouds and container orchestration platforms like Kubernetes. Micronaut framework provides:

- - - - Health probes for Kubernetes readiness and liveness checks.
      - Environment-specific configurations, simplifying deployments.
      - Extensive observability tools for metrics, logs, and traces.

For a platform like Kestra, Micronaut framework’s cloud-native features ensure smooth operations at scale.

> “Micronaut framework’s ability to combine a small memory footprint, fast startup times, and modern reactive principles made it an ideal match for Kestra’s needs. It gave us the freedom to focus on building an orchestration platform that could tackle the most demanding workflows while delivering a top-notch developer experience.”

*– Ludovic Dehon Co-Founder and CTO of Kestra*

## Dependency Injection and Modularity

Micronaut framework’s Inversion of Control (IoC) and configuration management handle our dependency injection. Instead of relying on runtime reflection (which can hurt performance), Micronaut framework generates necessary metadata at compile time, reducing overhead. This is a major advantage for a platform like Kestra, where modularity and performance go hand in hand.

Its modularity has been a game-changer for us, especially in [**Kestra Enterprise**](https://kestra.io/enterprise), where:

- We often customize functionality using `@ReplaceBean`.
- New features are added without impacting the core system.

## Reactive Core

At the heart of Micronaut framework lies [**Netty**](https://netty.io), which supports non-blocking, reactive operations. This allows us to:

- **Stream logs in real-time** using Server-Sent Events (SSE), delivering task execution data directly to the UI.
- **Build event-driven features** using reactive programming patterns. For example, Kestra relies on Flux to manage concurrent task execution and observability without resource bottlenecks.

Micronaut framework’s reactive design ensures Kestra scales workloads efficiently without bottlenecks.

## The Plugin System: Micronaut framework Under the Hood

[Kestra’s plugin](https://kestra.io/plugins) system is a key part of its extensibility. Plugins allow users to integrate external systems or add custom functionality, and we now have over **600 plugins** available.

Interestingly, Kestra’s Plugin API abstracts away Micronaut framework entirely. This design decision was intentional:

- It lowers the entry barrier for users who want to build plugins without understanding Micronaut framework.
- It ensures that we can upgrade Micronaut framework independently, without breaking existing plugins.

This is all thanks to Micronaut framework’s clean and modular design. It provides the foundation we need without leaking its internal details into user-facing APIs.

The development process was smooth, implementation of the solution was seamless, and the application’s performance is exceptional.

- The developer was unfamiliar with the Micronaut framework, but the well-written and thorough documentation and freely available source code on GitHub provided everything he needed to get started and build the solution quickly.
- The application was developed in only 4 weeks.
- Initial load of the page is sub-second.
- Most interactive features of the application are handled in the browser. The remaining interactive features require calls to microservices, which respond sub-second.
- Updates are deployed with under 10 seconds down time because the Micronaut application starts in under 3 seconds.
- There were zero unplanned outages during development and implementation.

## Logs, SSE, and Advanced Tasks

- **Log Streaming**: Logs are critical for monitoring workflows. Kestra uses Micronaut framework’s reactive support to stream execution logs to the UI in real-time using SSE. This ensures low-latency observability, even for complex workflows.
- **Task Execution**: Task orchestration involves significant concurrency, especially for large-scale workloads. With Micronaut framework’s Netty-based architecture and support for non-blocking I/O, we can optimize resource usage while handling thousands of tasks simultaneously.
- **Custom HTTP Integrations**: Tasks often require calls to external APIs. Micronaut framework’s HTTP client allows us to build integrations that are efficient, reactive, and easy to test.

## Community and Documentation

A framework’s success depends on more than its code. Micronaut framework has proven to be reliable, well-documented, and backed by its community:

- **Documentation**: Micronaut framework’s documentation is practical and to the point, with examples that address most of our needs. When edge cases arise, Micronaut framework’s flexibility—where everything can be customized or replaced—is a lifesaver.
- **Community**: Although smaller than some competitors, the Micronaut framework community is welcoming and responsive. We’ve worked directly with core contributors on several occasions, and their willingness to help has been invaluable.

Kestra’s team has even contributed to Micronaut framework itself. The clean, well-organized codebase makes it approachable, even when we need to dive deep to resolve edge cases or customize behavior.
