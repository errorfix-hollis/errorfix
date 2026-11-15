---
error: "Property 'x' is missing in type '...' but required in type '...'. ts(2741)"
error_full: |
  error TS2741: Property 'email' is missing in type '{ id: number; name: string; }' but required in type 'User'.

  src/App.tsx:12:6 - error TS2741: Property 'onClose' is missing in type '{ title: string; }' but required in type 'ModalProps'.
cat: javascript
description: "You created or passed an object (or JSX props) that lacks a property the target type requires. Add the property, make it optional in the type, or build the object with the right type."
tldr: "Add the missing property (`{ id, name, email }`, or `<Modal title=\"x\" onClose={close} />`). If it really is optional, mark it in the type: `email?: string`. For partial objects use `Partial<User>`, and `Omit<User, 'id'>` for create payloads. Avoid `as User`, which hides the error."
keywords: typescript ts2741 property is missing in type but required in type react props missing optional property partial omit pick object literal jsx component props interface
related: [js-ts2322-type-is-not-assignable-to-type, js-ts2345-argument-of-type-is-not-assignable-to-parameter, js-ts2339-property-does-not-exist-on-type]
---
## What it means

TypeScript compared an object's type with the type it's assigned to, and the target has a **required** property the source lacks. The message names the missing property (`'email'`), the type you gave (`{ id: number; name: string; }`) and the type that was expected (`User`).

TS2741 is the single-property version. When several are missing you get `TS2739: Type '...' is missing the following properties from type 'User': email, role`. When many are missing you get the general [TS2322](/javascript/js-ts2322-type-is-not-assignable-to-type/). The fixes are the same.

## Cause 1: the object really is incomplete

```ts
interface User { id: number; name: string; email: string; }

const u: User = { id: 1, name: "Ann" };            // TS2741: 'email' is missing
const u: User = { id: 1, name: "Ann", email: "" };  // fixed
```

Spreads count too. `{ ...base, name }` errors if `base`'s type doesn't guarantee `email`.

## Cause 2: React component props

```tsx
type ModalProps = { title: string; onClose: () => void; };
function Modal({ title, onClose }: ModalProps) { /* ... */ }

<Modal title="Settings" />                        // TS2741: 'onClose' is missing
<Modal title="Settings" onClose={() => setOpen(false)} />
```

If the prop has a sensible default, make it optional and default it while destructuring:

```tsx
type ModalProps = { title: string; onClose?: () => void; };
function Modal({ title, onClose = () => {} }: ModalProps) { /* ... */ }
```

`children` must be declared as well (`children: React.ReactNode`) or you get `Property 'children' is missing` on components that require it. React 18 types no longer add `children` implicitly via `React.FC`.

## Cause 3: the property should be optional

If the data genuinely may not have it, say so in the type:

```ts
interface User { id: number; name: string; email?: string; }
```

Then handle `undefined` where you read it (`user.email ?? "n/a"`). See [TS2532 / TS18048 possibly undefined](/javascript/js-ts2532-object-is-possibly-undefined/).

## Cause 4: one type used for different stages

Create forms, PATCH bodies and DB rows often differ. Use utility types instead of loosening the main type:

```ts
type NewUser   = Omit<User, "id">;             // id assigned by the server
type UserPatch = Partial<User>;                // every field optional
type UserCard  = Pick<User, "id" | "name">;    // just what a component needs

function createUser(data: NewUser) { /* ... */ }
createUser({ name: "Ann", email: "a@x.io" });  // OK, no id needed
```

## Cause 5: building an object step by step

```ts
const u: User = {} as User;   // compiles, but lies; properties are undefined at runtime
u.name = "Ann";
```

Build it in one expression instead, or type the draft as `Partial<User>` and check it before converting. `as User` and `as any` remove the error but not the bug.

## Cause 6: class instances and `implements`

```ts
class Admin implements User { id = 1; name = "root"; }   // TS2741 / TS2420: 'email' is missing
```

Add the field, or `implements Partial<User>` if that's really what you want. A related error: `Property 'x' has no initializer` is [TS2564](/javascript/js-ts2564-property-has-no-initializer/).

## Cause 7: mismatched library type versions

If the "missing" property belongs to a library type (for example after upgrading React, Express or an SDK), two versions of the types may be installed. Run `npm ls @types/react` (or the package name) and dedupe so only one version remains.
