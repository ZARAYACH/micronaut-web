---
order: 53
title: Technology Advisory Board Meeting Minutes
eyebrow: Meeting minutes
description: Board Members In Attendance Jason Schindler – Object Computing Inc., Partner and Groovy, Grails, and Micronaut Team Manager Graeme Rocher – Micronaut Foundation, co-founder and Director; Oracle, Architect Sergio del Amo – Object Computing, Micronaut Development Lead James Kleeh – Amazon, Software Development Engineer Neal Ford – ThoughtWorks, Director, Cloud Architect Ken Sipe – Edward Jones,...
sourceUrl: https://micronaut.io/meeting-minutes/technology-advisory-board-meeting-minutes/
intro: Public Technology Advisory Board meeting minutes for the Micronaut project.
layoutVariant: public-markdown
---

# Technology Advisory Board Meeting Minutes

# Technology Advisory Board Meeting Minutes - July 22, 2022

## Board Members In Attendance

- **Jason Schindler** – Object Computing Inc., Partner and Groovy, Grails, and Micronaut Team Manager
- **Graeme Rocher –** Micronaut Foundation, co-founder and Director; Oracle, Architect
- **Sergio del Amo** – Object Computing, Micronaut Development Lead
- **James Kleeh** – Amazon, Software Development Engineer
- **Neal Ford** – ThoughtWorks, Director, Cloud Architect
- **Ken Sipe** – Edward Jones, Department Leader – Application and Technology Architecture
- **Guillaume LaForge** – Google, Developer Advocate for Google Cloud Platform
- **Mark Sailes** – Amazon, Specialist Solution Architect for Serverless at AWS Cloud

## Board Members Not In Attendance

- **Zhamak Dehghani –** ThoughtWorks, Principal Consultant
- **Venkat Subramaniam** – Agile Developer Inc., Founder
- **Yuriy Artamonov** – JetBrains, Microservices Fellow
- **Bruno Borges** – Microsoft, Principal Product Manager for Java

## Others In Attendance

- **Jen Wiese** – Micronaut Foundation, Community Engagement Manager

## Meeting led by

- Jen Wiese

## Agenda

- Welcome
- Community Update
- Sponsorship Update
- Micronaut Framework Update
- Tech Talk
- Open Discussion
- Close Meeting

## Community Update

- Training Events Delivered to Date

  - Building Secure Applications with the Micronaut Framework
  - Micronaut Testing Tips & Tricks
  - Using Micronaut Features in a Grails Application
  - Micronaut Essentials
  - Jumpstart Your Micronaut Applications with AWS Lambda (x3)

    - Upcoming Scheduled Training Events

      - July – Micronaut Essentials (Spanish)
      - August – Micronaut Essentials
- Webinars Presented to Date

  - Micronaut for (P) IoT Projects
  - 2GM Town Hall Webinars
  - How the Micronaut Team Practices Developer Productivity Engineering Using Gradle Enterprise
- Meetup Talks Given At:

  - Manchester Java Community Meetup: Micronaut Presentation
  - Barcelona JUG
- Micronaut Presentations Given At These Conferences to Date:

  - Oracle Developer Live
  - JavaDay Lviv
  - J on the Beach
  - JFokus
  - Geecon
  - Devoxx Poland
  - JBCN Conference

    - Upcoming Conference Presentations
    - JCON
    - JavaOne
    - ApacheCon

## Sponsorship Update

- Current Sponsors of the Foundation

  - Tools and Infrastructure Partners

    - Gradle
    - JetBrains
  - Corporate Sponsorships

    - OCI
    - Safri.Net
    - Vizor Games
    - MicroStream – NEW
    - NEW Sponsor – announcement coming soon!
  - Community Sponsorships

    - Ongoing

## Micronaut Framework Update

- Micronaut 3.4.0

  - Micronaut Data MongoDB
  - Micronaut Serialization
  - Micronaut AOT

## Tech Talk

- Release Cadence

  - 3.4.0 to 3.5.0: 9 weeks
  - 3.5.0 to 3.6.0 (July 28th): 9 weeks
- Release Planning

  - 3.6.0 28th July
  - 3.7.0 8th September
  - 3.8.0 20th October
  - 4.0.0 17th November
- Micronaut 3.6.0

  - Test Resources
  - OpenTelemetry
  - Hibernate Reactive
  - JOOQ R2DBC
  - Azure Vault
- Micronaut 3.7.0

  - NubesGen – Easy deployment of applications to Azure
  - Application Type: Library
  - CRaC Co-ordinated Restore at Checkpoint
  - Spring Integration
  - Chatbots Module
  - Object Storage Module
- Micronaut 3.8.0

  - Micronaut Data Multi-Tenancy support
  - Migrate Guides to Micronaut Serialization
- Micronaut 4.0.0 (Major Updates)

  - Update to Kotlin 1.7
  - Update to Groovy 4
  - Update to Ktor 2
  - Upgrade to Hibernate 6
  - Update versions of third-party integrations (e.g. Cache)
- Micronaut 4.0.0 – Baseline to Java 17

  - Drop 11 and 8
  - Use Sealed classes for @Internal
  - Updated to latest OSS JOOQ
  - Update build to baseline 17

    - Build will need to support Micronaut 3 with support for 8
- Micronaut 4.0.0 – Update Defaults

  - Remove SnakeYAML default to properties
  - Default to Micronaut Serialization
  - Move from SLF4J to Java 9+ System.Logger
  - Remove direct dependency on Jackson
  - Remove direct dependency on Reactive Stream if you use core/inject only
  - Starter will generate Micronaut 4 and Micronaut 3 apps.
  - Turn off environment auto detection
- Micronaut 4.0.0 – Jakarta transition

  - Move Servlet to Jakarta Servlet API
  - Upgrades Guides to Jakarta Bean Validation v3
  - Micronaut SQL and Data to Persistence Jakarta API
- Micronaut 4.0.0 – Spec Compliance

  - CDI Lite
  - Jakarta Bean Validation 3.0 TCK (goal not be 100% compliant but have awareness of how complete we are)
- Micronaut 4.0.0 – More decoupled modules

  - Decouple as much functionality as possible of Micronaut Security from HTTP
  - Decouple as much functionality as possible of Micronaut Views from HTTP
  - Micronaut Security with GRPC or with Serverless functions

## Open Discussion

- Java Baseline Discussion:

  - Jen shared the results of the Twitter poll and email campaign
  - Micronaut framework 4.0.0 should support a minimum Java version of:

    - 68% of the community responded in support of Java 17
    - 25% of the community responded in support of Java 11
    - 7% of the community responded in support of Java 8
  - James: Do we know when the cloud vendors will be updated to support Java 17?
  - Guillaume: I think what you described is a pragmatic approach and a good one
  - Graeme: I think even if the cloud vendors aren’t ready, people will still be able to use Micronaut 3 for some time
  - James: Is there a solid plan in place for the Micronaut 3 support after the move to Java 17?
  - James: I think that is an important message to the community in terms of what they can expect in terms of Micronaut 3 support
  - Sergio: Back-porting features to Micronaut 3 may be an important thing to do
- KSP Support

  - James – I’m hoping to get KSP support available by Micronaut 4 and I would love for it to be the default in Micronaut 4.  They have been receptive in terms of PRs
- Project Loom

  - Graeme – It would be nice to be able to configure the Micronaut executors to use a virtual thread pool.  Additionally we need to explore the Netty event loop using a virtual thread pool.  The benefit would be that even if you do i/o operations it wouldn’t block
  - James – Regarding loom, this is an article I read recently about thread fairness in CPU-bound workloads.  I think there still needs to be an option to not use Loom
  - Graeme – Loom is still a bit away in Java 19
  - James – Does Netty have a plan for Loom?  I think Netty 5 is coming out soon
  - Graeme – We’re keeping an eye on Netty 5, but it seems to be a long way off.  I don’t think it’ll make it for Micronaut 4
  - Graeme – I don’t think that Loom completely solves the need for reactive and I think we’ll be doing reactive side-by-side for some time

## Close Meeting
