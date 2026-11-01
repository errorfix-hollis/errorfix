---
error: "Object is possibly 'undefined'. ts(2532)"
error_full: |
  error TS2532: Object is possibly 'undefined'.
  error TS18048: 'user' is possibly 'undefined'.
  error TS2531: Object is possibly 'null'.
cat: javascript
description: TypeScript strict null checks found a value whose type includes undefined (or null) being used as if it were always defined. Narrow the type, provide a default, or fix the type.
tldr: "Narrow before use: `if (user) { user.name }`, or use optional chaining `user?.name` and a default `user?.name ?? 'anon'`. Use `!` (`user!.name`) only when you are certain it is set. For arrays and records with `noUncheckedIndexedAccess`, check the element after indexing."
keywords: typescript ts2532 object is possibly undefined ts18048 is possibly undefined ts2531 possibly null strictnullchecks optional chaining non-null assertion
related: [js-ts2339-property-does-not-exist-on-type, js-cannot-read-properties-of-undefined, js-ts2307-cannot-find-module-or-its-corresponding-type-declarations]
---
## What it means

With `strict` (or `strictNullChecks`) enabled, `undefined` and `null` are separate types. If a value's type is `User | undefined`, TypeScript won't let you access `.name` on it until you prove it isn't `undefined`. Newer TypeScript versions (5.0+) report the same thing as `TS18048: 'x' is possibly 'undefined'` when it can name the variable.

Common sources of `| undefined`:

- optional properties (`name?: string`) and optional parameters
- `Array.prototype.find()`, `Map.get()`
- indexing with `noUncheckedIndexedAccess` turned on
- `useState<User>()` with no initial value, `useRef<HTMLDivElement>(null)`

## Fix 1: narrow with a check

TypeScript understands normal control flow:

```ts
const user = users.find(u => u.id === id);   // User | undefined

if (!user) {
  throw new Error(`No user ${id}`);
}
console.log(user.name);   // user is User here
```

`typeof x === "string"`, `x !== undefined`, `"key" in obj` and `instanceof` all narrow too.

## Fix 2: optional chaining and defaults

When "missing" is a valid state, handle it inline:

```ts
const city = user?.address?.city;          // string | undefined
const label = user?.name ?? "Anonymous";   // string
const count = cart.items?.length ?? 0;
```

`?.` returns `undefined` instead of throwing; `??` supplies a fallback only for `null`/`undefined` (unlike `||`, it keeps `0` and `""`).

## Fix 3: the narrowing got lost in a callback

Narrowing on a property doesn't survive into callbacks, because the property could change before the callback runs:

```ts
if (this.config) {
  items.forEach(i => this.config.apply(i));   // TS2532
}
```

Copy to a local `const` first:

```ts
const config = this.config;
if (config) {
  items.forEach(i => config.apply(i));        // OK
}
```

## Fix 4: indexed access with noUncheckedIndexedAccess

With this option `arr[0]` is `T | undefined`:

```ts
const first = arr[0];
if (first !== undefined) {
  use(first);
}

// or for records
const value = map[key];
if (value) { ... }
```

`for (const item of arr)` gives you `T`, not `T | undefined`, so prefer it over index loops.

## Fix 5: React refs and state

```tsx
const ref = useRef<HTMLInputElement>(null);
ref.current?.focus();                 // current is HTMLInputElement | null

const [user, setUser] = useState<User | null>(null);
if (!user) return <Spinner />;
return <p>{user.name}</p>;
```

## Fix 6: non-null assertion (last resort)

If you *know* the value is set and TypeScript can't see it, `!` removes `undefined`/`null` from the type:

```ts
const el = document.getElementById("app")!;
```

This is only a compile-time claim. If you're wrong you get `Cannot read properties of undefined` at runtime, so prefer a check that throws a clear error.

## Fix 7: the type itself is wrong

If a property is always present, don't declare it optional. Change `name?: string` to `name: string`, or give function parameters a default (`function f(opts: Options = {})`). Turning off `strictNullChecks` silences the error everywhere but hides real bugs; avoid it.
