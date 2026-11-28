---
error: "org.hibernate.LazyInitializationException: could not initialize proxy - no Session"
error_full: |
  org.hibernate.LazyInitializationException: failed to lazily initialize a collection of role: com.example.shop.Customer.orders, could not initialize proxy - no Session
  	at org.hibernate.collection.spi.AbstractPersistentCollection.throwLazyInitializationException(AbstractPersistentCollection.java:635)
  	at org.hibernate.collection.spi.AbstractPersistentCollection.withTemporarySessionIfNeeded(AbstractPersistentCollection.java:218)
cat: java
description: "You accessed a lazy-loaded association (a @OneToMany collection or a lazy @ManyToOne proxy) after the Hibernate Session / transaction that loaded the entity was closed, so Hibernate can no longer query it. Load the data while the session is open, or return a DTO."
tldr: "Fetch what you need in the query: `@Query(\"select c from Customer c left join fetch c.orders where c.id = :id\")` or `@EntityGraph(attributePaths = \"orders\")` on the repository method. Or do the work inside a `@Transactional` service method and map to a DTO before returning. Avoid switching to `FetchType.EAGER` or enabling `hibernate.enable_lazy_load_no_trans`."
keywords: java hibernate jpa spring boot lazyinitializationexception could not initialize proxy no session failed to lazily initialize a collection of role fetch join entitygraph transactional open-in-view jackson dto lazy loading
related: [java-failed-to-load-applicationcontext, java-spring-field-required-a-bean-of-type-that-could-not-be-found, java-stackoverflowerror]
---
## What it means

With `FetchType.LAZY` (the default for `@OneToMany` and `@ManyToMany`, and common for `@ManyToOne`), Hibernate doesn't load the association with the entity. It puts a placeholder (a persistent collection or a proxy) there and runs the query the first time you touch it. That query needs the Session that loaded the entity. If the transaction has already ended, the entity is *detached* and Hibernate throws `LazyInitializationException`.

Typical places it happens:

- in a controller or view, after the `@Transactional` service method returned;
- during JSON serialization (Jackson walking `customer.getOrders()`);
- in `@Async` methods, scheduled jobs, Kafka/Rabbit listeners and tests without a transaction;
- in `toString()`, `equals()` or `hashCode()` that include lazy fields (including Lombok `@Data`).

## Fix 1: fetch it in the query

Load exactly what the use case needs, in one query:

```java
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    @Query("select c from Customer c left join fetch c.orders where c.id = :id")
    Optional<Customer> findWithOrders(@Param("id") Long id);

    @EntityGraph(attributePaths = {"orders"})
    List<Customer> findByCountry(String country);
}
```

Fetching more than one collection (bag) at once with `join fetch` fails with `MultipleBagFetchException`; fetch one collection per query, or use `Set` for the collections.

## Fix 2: do the work inside a transaction

Keep code that walks associations in a transactional service method, and return plain data:

```java
@Service
public class CustomerService {

    @Transactional(readOnly = true)
    public CustomerDto getCustomer(Long id) {
        Customer c = repo.findById(id).orElseThrow();
        return new CustomerDto(c.getName(),
                c.getOrders().stream().map(o -> o.getId()).toList());
    }
}
```

`@Transactional` only works on public methods called through the Spring proxy. Calling it from another method in the same class (`this.getCustomer(...)`) bypasses the proxy, so no transaction is started.

## Fix 3: don't serialize entities directly

Returning entities from REST controllers makes Jackson touch every lazy field. Return DTOs (Fix 2) or a Spring Data projection:

```java
public interface CustomerSummary {
    String getName();
    String getEmail();
}

List<CustomerSummary> findByCountry(String country);
```

This also avoids infinite recursion on bidirectional relationships.

## Fix 4: initialize explicitly

If you need the association later, initialize it while the session is still open:

```java
@Transactional(readOnly = true)
public Customer load(Long id) {
    Customer c = repo.findById(id).orElseThrow();
    Hibernate.initialize(c.getOrders());
    return c;
}
```

## Fix 5: fix toString / equals / hashCode

Exclude lazy associations from `toString()`, `equals()` and `hashCode()`. With Lombok, avoid `@Data` on entities, or use `@ToString.Exclude` and `@EqualsAndHashCode.Exclude` on association fields.

## What not to do

- **`FetchType.EAGER` everywhere**: hides the error but loads large object graphs on every query and causes N+1 queries.
- **`hibernate.enable_lazy_load_no_trans=true`**: opens a new session per lazy load, which is slow and hides transactional bugs.
- **Relying on Open Session in View**: Spring Boot enables `spring.jpa.open-in-view` by default (and logs a warning), which is why the same code may work in a controller but fail in an `@Async` method or a test. Many teams set `spring.jpa.open-in-view=false` and fetch explicitly as above.
