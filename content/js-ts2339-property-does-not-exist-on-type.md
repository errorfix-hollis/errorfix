---
error: "Property 'x' does not exist on type 'Y'"
error_full: |
  error TS2339: Property 'name' does not exist on type '{}'.
  error TS2339: Property 'value' does not exist on type 'EventTarget'.
  error TS2339: Property 'foo' does not exist on type 'Window & typeof globalThis'.
cat: javascript
description: TypeScript only lets you access properties it knows exist on a value's type. The type is too narrow (often `{}` or a union), the property is missing from your interface, or a DOM/global type needs to be narrowed or extended.
tldr: "Give the value a proper type (`interface User { name: string }`, `useState<User | null>(null)`), narrow unions before access (`if ('name' in obj)`), cast DOM targets (`e.target as HTMLInputElement`), and extend globals with `declare global { interface Window { foo: string } }`. Avoid `any` unless you must."
keywords: typescript ts2339 property does not exist on type error {} eventtarget window interface narrowing type assertion declare global usestate never
related: [js-ts2307-cannot-find-module-or-its-corresponding-type-declarations, js-cannot-read-properties-of-undefined, js-is-not-a-function]
---
## What it means

TypeScript checks every property access against the *static* type of the value. If the type doesn't declare that property, it reports TS2339 — even if the property exists at runtime. The fix is to tell the compiler the real type, not to suppress the error.

## Cause 1: the type was inferred as `{}` or too narrowly

```ts
const user = {};
user.name = 'Ada';        // TS2339: Property 'name' does not exist on type '{}'
```

Declare the shape:

```ts
interface User { name?: string; age?: number }
const user: User = {};
user.name = 'Ada';

// dynamic keys
const counts: Record<string, number> = {};
counts.apples = 3;
```

## Cause 2: React `useState` without a type

```tsx
const [user, setUser] = useState(null);   // type: null
user.name;                                // error (and type 'never' after a null check)
```

```tsx
const [user, setUser] = useState<User | null>(null);
if (user) console.log(user.name);
const [items, setItems] = useState<Item[]>([]);   // [] alone infers never[]
```

## Cause 3: union types not narrowed

```ts
type Shape = { kind: 'circle'; radius: number } | { kind: 'square'; size: number };

function area(s: Shape) {
  return s.radius;       // error: not on the 'square' member
}
```

Narrow first:

```ts
function area(s: Shape) {
  if (s.kind === 'circle') return Math.PI * s.radius ** 2;
  return s.size ** 2;
}
// or: if ('radius' in s) { ... }
```

## Cause 4: DOM event targets and elements

`e.target` is typed as `EventTarget`, and `querySelector` returns `Element`, neither of which has `.value`:

```ts
input.addEventListener('input', e => {
  const v = (e.target as HTMLInputElement).value;
});

const el = document.querySelector<HTMLInputElement>('#email');
console.log(el?.value);
```

In React, type the handler: `(e: React.ChangeEvent<HTMLInputElement>) => e.target.value` (or use `e.currentTarget`).

## Cause 5: adding properties to `window` or other globals

Create a `.d.ts` file included by your `tsconfig.json` (e.g. `src/global.d.ts`):

```ts
export {};
declare global {
  interface Window {
    dataLayer: unknown[];
  }
}
```

Same idea for Express: augment `Request` via `declare global { namespace Express { interface Request { user?: User } } }`.

## Cause 6: JSON / API responses typed as `object` or `unknown`

```ts
const data = await res.json() as { items: Item[] };
```

Better: validate with a schema library (e.g. zod) so the type is guaranteed at runtime too.

## Cause 7: typo or outdated type definitions

Check spelling and casing (`innerHtml` vs `innerHTML`). If a library added the property in a newer version, update its types: `npm install -D @types/<lib>@latest`, and restart the TS server in your editor ("TypeScript: Restart TS Server").

## Escape hatches (use sparingly)

```ts
(obj as any).foo;
// @ts-expect-error  -- documented reason
obj.foo;
```
