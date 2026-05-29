---
order: 41
title: Using Micronaut Framework at Sonar
eyebrow: Success story
description: >-
  Sonar uses Micronaut with AWS Lambda SnapStart and CRaC lifecycle support to improve API performance and keep
  serverless services responsive.
sourceUrl: https://micronaut.io/using-micronaut-framework-at-sonar/
intro: Sonar's public story about using the Micronaut framework.
layoutVariant: public-markdown
storyOrder: 1
organization: Sonar
label: API performance
summary: Sonar uses Micronaut with AWS Lambda SnapStart and CRaC-oriented lifecycle support.
detail: >-
  The story focuses on serverless readiness, application snapshotting, and SonarQube analysis for Micronaut code
  quality.
proofs:
  - AWS Lambda SnapStart
  - CRaC lifecycle support
scenario: Serverless API performance
challenge: >-
  Keep Lambda-based services responsive while coordinating startup work, static analysis, and production lifecycle
  behavior.
micronautUse: Micronaut provides the HTTP/API foundation and works with SnapStart and CRaC-oriented lifecycle hooks.
outcome: A production story around serverless readiness, snapshotting, and Micronaut code-quality analysis.
technologies:
  - AWS Lambda
  - SnapStart
  - CRaC
  - SonarQube
logo: /micronaut-assets/main-site/wp-content/uploads/2025/02/Sonar_Logo_Light-Backgrounds.svg
logoDark: /micronaut-assets/main-site/wp-content/uploads/2025/02/Sonar_Logo_Dark-Backgrounds.svg
logoClass: h-10 w-auto
redirectFrom:
  - /using-micronaut-framework-at-sonar/
---

# Using Micronaut Framework at Sonar

[![Sonar](/micronaut-assets/main-site/wp-content/uploads/2025/02/Sonar_Logo_Light-Backgrounds.svg)](https://aws.amazon.com/blogs/opensource/improving-api-performance-at-sonar-with-lambda-snapstart-and-micronaut/)

> “In Sonar’s journey towards building a robust, efficient and scalable microservices architecture, Micronaut has played an important role. Micronaut achieves this through its dedicated CraC module, which offers developers a straightforward way to incorporate state capture at a specific point in time. This advantage aligns well with the principles of open source development by promoting efficiency.”

*– Marcin Majewski*

## CRaC Compatible

> Micronaut framework offers seamless integration with the CRaC project through the Micronaut CRaC module. By including this module as a dependency in their build, Sonar engineers have taken advantage of the CRaC functionality within their Micronaut-based application.

## Serverless Ready

> The Micronaut framework was the preferred choice of Sonar engineers due to its strong integration with AWS Lambda and AWS Cloud Development Kit (AWS CDK), as well as its life cycle management features that support application snapshotting.

# Using SonarQube to develop Micronaut Framework

[![SonarQube](/micronaut-assets/main-site/wp-content/uploads/2025/02/SonarQube_Logo_Light-Backgrounds.svg)](https://www.sonarsource.com/solutions/commitment-to-open-source/)

> “We leverage the [open-source offering of SonarQube](https://www.sonarsource.com/solutions/commitment-to-open-source/). We run SonarQube analysis in every pull request to ensure framework code quality is up to a high standard.”

*– Sergio del Amo*
