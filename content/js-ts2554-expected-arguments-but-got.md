---
error: "Expected 1 arguments, but got 0. ts(2554)"
error_full: |
  error TS2554: Expected 1 arguments, but got 0.
  error TS2554: Expected 2 arguments, but got 3.
  error TS2555: Expected at least 1 arguments, but got 0.
cat: javascript
description: "You called a function, method or constructor with a different number of arguments than its TypeScript signature declares. Either pass the right arguments or change the signature (optional, default or rest parameters)."
tldr: "Hover the function to see its signature and match it. Make a parameter optional with `?` (`function f(a?: string)`) or give it a default (`a = ''`). For React `useRef`/`useState` in React 19 types, pass an initial value: `useRef<HTMLDivElement>(null)`. For overloaded library functions, update `@types/*` to match the library version."
keywords: typescript ts2554 expected 1 arguments but got 0 expected 2 arguments but got 3 ts2555 expected at least optional parameter default parameter overload useRef react 19 promise resolve void
related: [js-ts2345-argument-of-type-is-not-assignable-to-parameter, js-ts2322-type-is-not-assignable-to-type, js-ts2339-property-does-not-exist-on-type]
---
## What it means

Unlike JavaScript, TypeScript checks the argument count. A parameter is required unless it is marked optional (`?`), has a default value, or is a rest parameter (`...args`). TS2554 lists how many it expected and how many you passed; TS2555 is the same for functions with a rest or optional tail ("at least N").

```ts
function greet(name: string) { return `hi ${name}`; }
greet();             // TS2554: Expected 1 arguments, but got 0.
greet("a", "b");     // TS2554: Expected 1 arguments, but got 2.
```

## Fix 1: pass the expected arguments

Hover the function in your editor (or Ctrl+click to the definition) to see its signature, then match it. Often an argument was added to a function you own and not every call site was updated; `tsc --noEmit` lists them all.

## Fix 2: make parameters optional

If the argument really can be left out, say so in the signature:

```ts
function greet(name?: string) {
  return `hi ${name ?? "there"}`;
}

function paginate(page = 1, size = 20) { /* ... */ }

function log(...parts: unknown[]) { console.log(...parts); }
```

For many optional settings use an options object: `function connect(opts: { host?: string; port?: number } = {})`.

## Fix 3: `new Promise` resolve with no value

```ts
await new Promise((resolve) => setTimeout(() => resolve(), 100));
// TS2554: Expected 1 arguments, but got 0.  (Did you forget to include 'void' in your type argument to 'Promise'?)
```

Fix: declare the promise as `Promise<void>`:

```ts
await new Promise<void>((resolve) => setTimeout(resolve, 100));
```

## Fix 4: React 19 type changes

With `@types/react` 19, `useRef` requires an argument:

```tsx
const ref = useRef<HTMLInputElement>();      // TS2554 in React 19 types
const ref = useRef<HTMLInputElement>(null);  // ok
const timer = useRef<number | undefined>(undefined);
```

Also `createContext` always needs a default value: `createContext<User | null>(null)`.

## Fix 5: event handlers and callbacks

Passing a function that requires an argument where the caller provides none, or calling a handler yourself without the event:

```tsx
function onSave(e: React.MouseEvent) { /* ... */ }
onSave();                                   // TS2554
<button onClick={onSave}>Save</button>       // ok: React passes the event
<button onClick={() => onSave()}>Save</button> // TS2554
```

If the handler doesn't use the event, drop the parameter.

## Fix 6: library types out of sync

If a library call that matches the docs fails, the installed type definitions are for a different version:

```bash
npm ls @types/node @types/express
npm install -D @types/express@latest
```

Libraries that ship their own types are fixed by upgrading the library itself. Check which overloads exist with "Go to Definition". When a function has overloads, TS reports the error against the closest overload, which may not be the one you intended.

## Fix 7: class constructors and `super()`

```ts
class Base { constructor(public id: string) {} }
class Child extends Base {
  constructor() { super(); }   // TS2554
}
```

Pass the required arguments to `super(...)`. Also note that `new Child(...)` is checked against the subclass constructor, not the base one.

Avoid silencing it with `// @ts-ignore` or `as any`: the runtime call will receive `undefined` for the missing argument.
