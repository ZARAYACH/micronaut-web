---
id: client
order: 20
label: Declarative client
title: Declarative, Reactive, Compile-Time HTTP Client
description: Generate a declarative HTTP client from the same application contract.
---

```java
import io.micronaut.http.annotation.Get;
import io.micronaut.http.client.annotation.Client;

import java.util.Map;

@Client("/hello")
interface HelloClient {

    @Get
    Map<String, String> index();
}
```

```kotlin
import io.micronaut.http.annotation.Get
import io.micronaut.http.client.annotation.Client

@Client("/hello")
interface HelloClient {

    @Get
    fun index(): Map<String, String>
}
```

```groovy
import io.micronaut.http.annotation.Get
import io.micronaut.http.client.annotation.Client

@Client('/hello')
interface HelloClient {

    @Get
    Map<String, String> index()
}
```
