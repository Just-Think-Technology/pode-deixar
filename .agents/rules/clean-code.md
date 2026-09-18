# Clean Code

**Scope:** All source code in the monorepo (backend, frontend, shared packages, configurations, and scripts).

**Enforcement:** Code review convention. Clean Code principles should be applied during development and verified during PR review.

**Philosophy:** Code should be easy to read, understand, test, modify, and maintain. Prefer simple and explicit solutions over clever or unnecessarily abstract ones.

---

## Core Principles

### 1. Write Code for Humans

Code is read far more often than it is written.

Prefer:

* Clear and descriptive names
* Small, focused functions
* Simple control flow
* Explicit behavior
* Consistent structure
* Minimal nesting
* Well-defined responsibilities

Avoid code that requires the reader to mentally reconstruct what it does.

```ts
// Good
const activeProviders = providers.filter((provider) => provider.isActive);

// Bad
const p = providers.filter((x) => x.a);
```

The goal is not to make code shorter. The goal is to make its intent obvious.

---

## Naming

Names must describe the domain concept or behavior they represent.

### Variables

Use meaningful nouns or noun phrases.

```ts
const serviceOrder = ...
const activeUsers = ...
const paymentAmount = ...
```

Avoid generic names:

```ts
const data = ...
const result = ...
const value = ...
const temp = ...
```

Generic names are acceptable only when their scope and meaning are immediately obvious.

### Functions

Function names should describe an action.

```ts
createServiceOrder()
calculateProviderEarnings()
findActiveProvider()
validatePayment()
```

Avoid vague names:

```ts
handle()
process()
execute()
doSomething()
```

Unless the abstraction genuinely represents that concept.

### Boolean Values

Boolean names should communicate a condition.

```ts
const isActive = ...
const hasPermission = ...
const canCancel = ...
const shouldNotify = ...
```

Avoid ambiguous names:

```ts
const active = ...
const permission = ...
const status = ...
```

### Classes

Class names should represent a concrete responsibility or domain concept.

```ts
ServiceOrderService
PaymentRepository
CreateServiceOrderDto
JwtAuthGuard
```

Do not use vague classes such as:

```ts
Helper
Manager
Utils
Processor
Handler
```

unless the name is part of an established framework or architectural pattern.

---

## Functions and Methods

### Single Responsibility

A function should have one clear responsibility.

Prefer:

```ts
async function createOrder(dto: CreateOrderDto) {
  const category = await categoryRepository.findByIdOrFail(dto.categoryId);
  const order = buildOrder(dto, category);

  return orderRepository.save(order);
}
```

Over a function that simultaneously:

* validates HTTP input
* queries the database
* applies business rules
* formats HTTP responses
* sends emails
* logs infrastructure details

Responsibilities should remain in their appropriate layers.

The project architecture defines:

1. **Controller** — HTTP concerns
2. **Service** — business rules and orchestration
3. **Repository** — Prisma/data access
4. **DTO** — input validation and API documentation

Controllers must not access Prisma directly, and services must not embed database queries outside repositories.

### Keep Functions Small

Prefer functions that can be understood without scrolling through large blocks of code.

If a function contains multiple independent logical steps, extract a function when the extraction improves readability or isolates a meaningful responsibility.

Do not extract functions merely to reduce line count.

### Avoid Excessive Parameters

Prefer a meaningful object when a function requires several related parameters.

```ts
createOrder({
  clientId,
  categoryId,
  title,
  description,
  priceCents,
});
```

Over:

```ts
createOrder(
  clientId,
  categoryId,
  title,
  description,
  priceCents,
);
```

Do not introduce objects solely to hide an otherwise simple function signature.

---

## Control Flow

Prefer simple control flow that makes the normal path obvious.

### Guard Clauses

Use early returns when they reduce nesting.

```ts
if (!user) {
  throw new UserNotFoundError();
}

if (!user.isActive) {
  throw new InactiveUserError();
}

return createSession(user);
```

Prefer this over deeply nested conditionals:

```ts
if (user) {
  if (user.isActive) {
    return createSession(user);
  }
}
```

### Avoid Deep Nesting

If logic requires several levels of `if`, loops, or callbacks, consider:

* Guard clauses
* Extracting a function
* Separating responsibilities
* Simplifying the condition

The objective is readable control flow, not a specific maximum nesting number.

### Avoid Clever One-Liners

Do not sacrifice readability to reduce lines.

Prefer:

```ts
const isEligible = user.isActive && user.role === 'PROVIDER';

if (!isEligible) {
  return;
}
```

when the condition represents an important business concept, rather than hiding the logic inside a complex expression.

---

## Error Handling

Errors should be explicit and meaningful.

Prefer domain-specific errors:

```ts
throw new CategoryNotFoundError();
```

over generic errors:

```ts
throw new Error('Something went wrong');
```

Error handling should happen at the appropriate architectural layer.

* Services should enforce business rules.
* Repositories should handle persistence-specific concerns.
* Controllers should translate application results into HTTP responses.
* Shared infrastructure should provide common error handling where appropriate.

The project already provides shared Prisma error mapping and a global exception filter that prevents internal Prisma details from being exposed to clients.

Do not duplicate this infrastructure inside individual services.

---

## Avoid Duplication

### DRY — Don't Repeat Yourself

When the same logic appears more than once, determine whether it represents a genuinely shared responsibility.

Do not blindly abstract similar-looking code.

Extract shared code when:

* The behavior is actually the same.
* The abstraction has a clear name.
* The abstraction belongs to a shared responsibility.
* Maintaining multiple copies would create a consistency problem.

The project follows a **second-use rule**: code needed by a second service should be extracted to `backend/shared/` when the second usage is introduced. Do not create shared abstractions preemptively or maintain a third copy of the same logic.

### Avoid Copy-Paste Development

Do not copy an existing implementation and modify it slightly when the behavior should be shared.

Instead, determine whether the code belongs in:

* The current feature
* A service-level abstraction
* A shared package
* A framework-level utility

---

## Abstraction

### Prefer Simple Solutions

Do not introduce abstractions before they are necessary.

Avoid:

* Interfaces with only one implementation without a clear architectural reason
* Generic factories that solve a single case
* Utility layers that only forward calls
* Unnecessary design patterns
* Framework-independent abstractions without a concrete need

Abstraction should solve a real problem:

* Reuse
* Isolation
* Testability
* Replaceability
* Separation of responsibility

### Do Not Over-Engineer

A small feature does not need an elaborate architecture.

Prefer:

```text
Controller → Service → Repository
```

when that is sufficient.

Do not introduce additional layers simply because a pattern exists.

---

## Architecture Compliance

Clean Code must work together with the project's architecture.

### Controllers

Controllers should contain HTTP concerns only:

* Routes
* Authentication guards
* DTO validation
* HTTP status codes
* Request/response handling

Controllers must not contain business rules or direct Prisma access.

### Services

Services contain:

* Business rules
* Application orchestration
* Transaction boundaries
* Coordination between repositories and other application components

Avoid placing HTTP-specific behavior in services.

### Repositories

Repositories contain database access.

Prisma operations belong in repositories rather than controllers or services.

### DTOs

Every input must have an appropriate DTO using the project's validation conventions and Swagger documentation.

Do not accept unvalidated request objects directly in application logic.

---

## Comments and Documentation

Code should explain itself through naming and structure whenever possible.

Follow the rules defined in `comments.md`.

Comments should explain:

* Why a non-obvious decision exists
* Business rules
* Complex algorithms
* Framework or library workarounds
* Performance-related tradeoffs

Do not use comments to explain obvious code.

```ts
// Bad
// Check if user is active
if (user.isActive) {
```

Prefer:

```ts
// Inactive users cannot create new service orders
if (!user.isActive) {
```

Do not use comments to compensate for unclear code.

Avoid:

* `TODO`
* `FIXME`
* `NOTE`
* `HACK`
* Commented-out code
* Comments that simply translate code into English

## These rules are defined in the project's Comment Style Guide.

## Magic Numbers and Strings

Avoid unexplained values.

Bad:

```ts
if (order.priceCents > 100000) {
```

Prefer:

```ts
const MAX_ORDER_PRICE_CENTS = 100_000;

if (order.priceCents > MAX_ORDER_PRICE_CENTS) {
```

For domain values, prefer enums, constants, or named concepts when they improve readability.

Do not create constants for values that are already obvious and used only once.

---

## Boolean Logic

Complex boolean expressions should be made readable.

Bad:

```ts
if (user.isActive && !user.isBlocked && user.role === 'PROVIDER' && order.status !== 'CANCELLED') {
```

Prefer:

```ts
const canAcceptOrder =
  user.isActive &&
  !user.isBlocked &&
  user.role === 'PROVIDER' &&
  order.status !== 'CANCELLED';

if (canAcceptOrder) {
  ...
}
```

If the condition represents an important domain rule, consider extracting it into a named function.

```ts
if (canProviderAcceptOrder(user, order)) {
  ...
}
```

---

## Data and Domain Modeling

Prefer domain-specific types and structures over primitive values when they improve correctness and readability.

Use the existing domain vocabulary consistently:

```ts
ServiceOrder
Provider
Client
Payment
Review
```

Avoid introducing multiple names for the same concept.

For monetary values, follow the existing convention of storing values in integer cents rather than floating-point amounts where applicable.

```ts
priceCents: number
```

This avoids floating-point precision problems.

---

## Side Effects

Keep side effects explicit.

Functions that:

* Write to the database
* Send emails
* Publish messages
* Modify external systems
* Write files
* Change application state

should make their side effects clear from their responsibility and naming.

Avoid functions that appear to only calculate a value but also modify state or perform external operations.

Prefer:

```ts
const earnings = calculateProviderEarnings(order);
await walletRepository.credit(providerId, earnings);
```

over hiding both operations inside a function with an ambiguous name.

---

## Immutability and Mutation

Prefer immutable operations when they improve readability and reduce unexpected state changes.

```ts
const activeUsers = users.filter((user) => user.isActive);
```

Avoid unnecessary mutation:

```ts
users.forEach((user) => {
  user.isActive = false;
});
```

Mutation is acceptable when it is local, intentional, and makes the code simpler.

Do not enforce immutability purely for its own sake.

---

## Dead Code

Do not keep unused code.

Remove:

* Unused imports
* Unused variables
* Unreachable branches
* Deprecated implementations that are no longer referenced
* Commented-out code
* Duplicate implementations

Git history is the archive. Code that is no longer needed should be removed rather than commented out.

This is also consistent with the project's comment guidelines.

---

## Refactoring

Refactor code when the change improves the code directly related to the task.

Good reasons to refactor:

* Remove duplication
* Clarify responsibilities
* Improve naming
* Reduce complexity
* Correct an architectural violation
* Make testing easier
* Improve maintainability

Do not perform unrelated large-scale refactors while implementing a feature.

Pre-existing code that does not follow the current architecture should not be retrofitted outside the task scope. The architecture documentation explicitly preserves this rule for the repository layer.

Prefer incremental improvement over broad rewrites.

---

## Tests and Testability

Code should be structured so that business rules can be tested independently.

Prefer small functions and services with explicit dependencies.

Avoid tightly coupling business logic to:

* HTTP request objects
* Framework internals
* Database implementation details
* Global state

The Controller → Service → Repository separation should make business logic easier to test without requiring HTTP or direct database interaction.

---

## Configuration and Environment

Do not hard-code environment-specific configuration into source code.

Configuration belongs in the appropriate environment configuration.

Secrets must never be committed to the repository. Real `.env.staging` and `.env.production` files remain outside git, with secrets managed through GitHub Environments.
Do not duplicate configuration logic across services when it belongs to shared infrastructure.

---

## Files and Modules

Each file should have a clear purpose.

Prefer files organized around a feature or responsibility:

```text
profiles/
├── profiles.controller.ts
├── profiles.service.ts
├── profiles.repository.ts
└── dto/
    └── update-profile.dto.ts
```

Avoid files that become unrelated collections of utilities or responsibilities.

The existing architecture organizes services into feature folders with controller, service, and DTO responsibilities. New code must follow this structure.

---

## Review Checklist

When reviewing a PR, verify:

* [ ] Names clearly describe their purpose.
* [ ] Functions have focused responsibilities.
* [ ] Business logic is in the service layer.
* [ ] Controllers contain HTTP concerns only.
* [ ] Prisma access is contained within repositories.
* [ ] Inputs use DTOs and validation.
* [ ] Control flow is simple and readable.
* [ ] Deep nesting is avoided where practical.
* [ ] No unnecessary abstractions were introduced.
* [ ] No meaningful logic is duplicated.
* [ ] Shared code follows the second-use rule.
* [ ] No magic values obscure business rules.
* [ ] Errors are explicit and meaningful.
* [ ] Side effects are clear.
* [ ] Unused or dead code is removed.
* [ ] Comments follow `comments.md`.
* [ ] No `TODO`, `FIXME`, `NOTE`, or `HACK` tags were introduced.
* [ ] No unrelated refactoring was included.
* [ ] Environment-specific configuration and secrets are handled correctly.
* [ ] The implementation follows the existing service boundaries and architecture.

---

## Guiding Principles

When making a design decision, prioritize:

1. **Clarity** — Can another developer understand it quickly?
2. **Simplicity** — Is there a simpler solution?
3. **Responsibility** — Does each component have a clear purpose?
4. **Consistency** — Does it follow existing project conventions?
5. **Maintainability** — Will it remain easy to change?
6. **Testability** — Can the important behavior be tested independently?
7. **Reuse** — Is duplication avoided without premature abstraction?
8. **Scope** — Is the change limited to what the task requires?

Clean Code is not about following arbitrary rules or minimizing line count. It is about making the system easier to understand and safer to evolve.