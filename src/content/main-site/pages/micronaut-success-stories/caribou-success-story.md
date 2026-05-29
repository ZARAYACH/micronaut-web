---
order: 37
title: A Power Packed Combination Optimizes Productivity and Performance
eyebrow: Success story
description: Caribou combined Micronaut, GraalVM, Kotlin, and AWS Lambda to reduce cold-start pressure for a SaaS backend.
sourceUrl: https://micronaut.io/micronaut-success-stories/caribou-success-story/
intro: Caribou's public story about combining Micronaut, GraalVM, Kotlin, and AWS Lambda for a SaaS backend.
layoutVariant: public-markdown
storyOrder: 7
organization: Caribou
label: Serverless SaaS
summary: Caribou combined Micronaut, GraalVM, Kotlin, and AWS Lambda to reduce cold-start pressure for a SaaS backend.
detail: >-
  The article covers a REST API, GitHub integration, Lambda cold starts, GraalVM native images, fast tests, Swagger
  support, and developer productivity.
proofs:
  - GraalVM native images
  - AWS Lambda cold starts
scenario: Serverless SaaS backend
challenge: Keep a SaaS REST API productive while reducing Lambda cold-start pressure and supporting GitHub integration.
micronautUse: Micronaut combines Kotlin, fast testing, Swagger/OpenAPI support, and GraalVM native images for the backend.
outcome: A productive serverless SaaS architecture built around Micronaut, GraalVM, Kotlin, and AWS Lambda.
technologies:
  - GraalVM
  - Kotlin
  - AWS Lambda
  - Swagger
---

# A Power Packed Combination Optimizes Productivity and Performance

Caribou, a SaaS Startup, was able to effectively enhance productivity and performance by combining the Micronaut framework with GraalVM and AWS Lambda

JVM developers overcome cold-startup challenges on AWS Lambda by building their SaaS application with the Micronaut framework and GraalVM.

## Relevant Background

[Caribou](https://main.d7nb6ht9cm9ng.amplifyapp.com) is a SaaS application that helps engineering teams reduce their technical debt. It provides real-time metrics around refactorings happening in their GitHub repos, so they can align on tackling the debt that matters most.

### Technical Requirements

When the developers at Caribou set out to build their application, they identified three critical technical components:

- A web application that enables users to define migrations and see migration metrics around code changes as they’re introduced
- A backend with a REST API to serve the web application, along with a database to store metadata around defined migrations and their progress
- A mechanism for users to authenticate and provide Caribou access to their GitHub repositories, so it can monitor incoming pull requests and analyze them

The Caribou team selected AWS Lambda as its serverless service. In initial tests, they felt that the AWS serverless solution was “substantially more mature” than the other cloud providers they considered.

However, they also knew that an application’s first Lambda invocation can often take several seconds (up to 15 in some instances) while the system waits for the runtime environment to initialize, and this delay is particularly pronounced with applications written in JVM languages. Because they preferred to write their application in Kotlin, a JVM language they knew well, it was critical that they find a way around these typical slow cold startup times.

> “AWS Lambda + Micronaut is a great combination! I can’t think of any other way of building our backend other than Micronaut + AWS Lambda + Kotlin.”
>
> -Sakis Kaliakoudas, Caribou Co-Founder

## The Right Framework for the Job

When it came to designing the solution and making technical decisions, the most important criterion was development speed; Caribou wanted to get an MVP out quickly and then iterate from there based upon user feedback. This meant using technologies and tools they were already familiar with and prioritizing off-the-shelf products rather than building from scratch.

When selecting new technologies, they looked for those with a shallow learning curve, good documentation, and active communities that could help them get up to speed fast.

Caribou initially attempted to build the application using Spring. However, Spring failed to fulfill their requirements due to the following issues:

- Cold start times for lambda functions were too slow
- Sprint support AWS Lambda was limited at the time
- Spring offered no support for GraalVM native images at the time

They realized they needed to choose a different framework and focused their search on frameworks that offered fast startup times. They considered both Quarkus and Micronaut and decided to try Micronaut first. As it turned out, they were so happy with the Micronaut framework, they decided to move forward with it immediately.

The key reasons Caribou selected Micronaut were are follows:

- **Serverless Focus.** In their initial review of Quarkus and Micronaut materials, they found that Micronaut had a greater focus on serverless deployment.
- **Resources.** They were able to get their lambda functions up and running right away thanks to the Micronaut team’s clear AWS tutorials; they also found the friendly support they received through the Gitter community to be invaluable.
- **Speed.** Lambda functions run faster with Micronaut than they do with Spring; once they added GraalVM to the mix, they were able to overcome the cold startup challenges they faced.
- **Easy Testing.** Because Micronaut makes it extremely easy to run end-to-end tests, they were able to run hundreds of integration tests without impacting test execution time. In the words of one of Caribou’s developers, “Nothing beats running tests on the real framework without any mocks.”
- **Support for GraalVM.** GraalVM makes serverless deployments using JVM languages a viable option, and the Micronaut framework includes robust, out-of-the-box support for GraalVM.
- **IntelliJ IDEA Plugin.** The IntelliJ IDEA plugin helped the Caribou team improve productivity by streamlining the process of defining database queries.
- **Built-in Support for Swagger.** This made it easy to provide the necessary details about their API to the frontend team.

## Outcomes

By leveraging the Micronaut framework’s cloud-native features and unique sensible defaults, SmartThings has achieved the following business benefits:

In addition to experiencing exceptional productivity, thanks to the Micronaut framework’s shallow learning curve, excellent documentation, and efficient testing features, Caribou developers recognize the notable competitive advantages they’ve gained through the reduction in cold startup time to only 1.5 to 2 seconds made possible through the combination of Micronaut and GraalVM technologies.

[Learn more about how to deploy a Micronaut function as a GraalVM native image to AWS Lambda.](https://guides.micronaut.io/latest/mn-serverless-function-aws-lambda-graalvm.html)

Caribou is available [here](https://main.d7nb6ht9cm9ng.amplifyapp.com).
