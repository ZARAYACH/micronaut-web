import assert from "node:assert/strict";
import test from "node:test";

import { extractTaggedSource } from "../shared/tagged-source.ts";

test("extractTaggedSource removes nested tag directives from selected regions", (): any => {
  const source = `
// tag::repository[]
package example;

import io.micronaut.context.annotation.Parameter;
import io.micronaut.data.annotation.Fetch;
import io.micronaut.data.annotation.Id;
import io.micronaut.data.annotation.ParameterExpression;
import io.micronaut.data.annotation.Query;
import io.micronaut.data.annotation.QueryHint;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.model.Page;
import io.micronaut.data.model.Pageable;
import io.micronaut.data.model.Slice;
import io.micronaut.data.repository.CrudRepository;

import java.util.List;
import java.util.stream.Stream;

@Repository // <1>
public interface BookRepository extends CrudRepository<Book, Long> { // <2>
// end::repository[]

    // tag::simple-alt[]
    // tag::repository[]
    Book find(String title);
    // end::simple-alt[]
}
// end::repository[]
`;

  assert.equal(
    extractTaggedSource(source, "repository"),
    `package example;

import io.micronaut.context.annotation.Parameter;
import io.micronaut.data.annotation.Fetch;
import io.micronaut.data.annotation.Id;
import io.micronaut.data.annotation.ParameterExpression;
import io.micronaut.data.annotation.Query;
import io.micronaut.data.annotation.QueryHint;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.model.Page;
import io.micronaut.data.model.Pageable;
import io.micronaut.data.model.Slice;
import io.micronaut.data.repository.CrudRepository;

import java.util.List;
import java.util.stream.Stream;

@Repository // <1>
public interface BookRepository extends CrudRepository<Book, Long> { // <2>
    Book find(String title);
}`,
  );

  assert.equal(
    extractTaggedSource(source, "simple-alt"),
    "Book find(String title);",
  );
});

test("extractTaggedSource removes all tag directives when no tag is selected", (): any => {
  const source = `
class Example {
    // tag::method[]
    void run() {
    }
    // end::method[]
}
`;

  assert.equal(
    extractTaggedSource(source, ""),
    `class Example {
    void run() {
    }
}`,
  );
});

test("extractTaggedSource handles bracketless and trailing tag directives", (): any => {
  const source = `
class Example {
    // tag::method[]
    void run() {
    } // end::method[]

    // tag::other[]
    void other() {
    }
    // end::other
}
`;

  assert.equal(
    extractTaggedSource(source, "method"),
    `void run() {
    }`,
  );
  assert.equal(
    extractTaggedSource(source, "other"),
    `void other() {
    }`,
  );
  assert.equal(
    extractTaggedSource(source, ""),
    `class Example {
    void run() {
    }

    void other() {
    }
}`,
  );
});
