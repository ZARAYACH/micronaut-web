---
id: server
order: 10
label: HTTP server
title: Non-Blocking HTTP Server Based on Netty
description: Create an endpoint with familiar annotations and a compact controller.
---

```java
import io.micronaut.http.annotation.*;

import java.util.Collections;
import java.util.Map;

@Controller("/hello")
class HelloController {

    @Get
    Map<String, String> index() {
        return Collections.singletonMap("message", "Hello World");
    }
}
```

```kotlin
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Get

@Controller("/hello")
class HelloController {

    @Get
    fun index(): Map<String, String> {
        return mapOf("message" to "Hello World")
    }
}
```

```groovy
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Get

@Controller('/hello')
class HelloController {

    @Get
    Map<String, String> index() {
        [message: 'Hello World']
    }
}
```
