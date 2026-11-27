---
error: "TS2531: Object is possibly 'null'."
error_full: |
  error TS2531: Object is possibly 'null'.
  error TS18047: 'el' is possibly 'null'.
cat: javascript
description: "With strictNullChecks on, TypeScript sees that a value's type includes null (e.g. document.getElementById, useRef(null), regex match) and refuses to let you access properties on it without a check."
tldr: "Narrow the type before use: `if (el) el.focus();`, or use optional chaining `el?.focus()`. If you're sure the value exists, use a non-null assertion `el!.focus()` or throw early: `if (!el) throw new Error('missing #app');`. For React refs, use `useRef<HTMLInputElement>(null)` and `ref.current?.focus()`."
keywords: typescript ts2531 object is possibly null ts18047 is possibly null strictnullchecks getelementbyid queryselector useref current non-null assertion optional chaining match
related: [js-ts2532-object-is-possibly-undefined, js-ts2339-property-does-not-exist-on-type, js-cannot-read-properties-of-null]
---
## What it means

The value's type is something like `HTMLElement | null`. Calling a method on `null` would crash at runtime (`Cannot read properties of null`), so with `strict` / `strictNullChecks` TypeScript stops you at compile time. TypeScript 5.x often reports the newer code **TS18047** (`'x' is possibly 'null'`) with the variable name; the fixes are identical. `TS2532` / `TS18048` are the same for `undefined`.

## Cause 1: DOM lookups

`getElementById`, `querySelector` and friends return `null` if nothing matches:

```ts
const btn = document.getElementById('save');
btn.addEventListener('click', save);   // TS2531 / TS18047
```

Fixes, from safest to least safe:

```ts
// 1. Guard (narrowing)
const btn = document.getElementById('save');
if (btn) btn.addEventListener('click', save);

// 2. Fail fast with a clear message
const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app not found');
app.innerHTML = '...';           // app is HTMLDivElement here

// 3. Optional chaining (silently does nothing if null)
document.getElementById('save')?.addEventListener('click', save);

// 4. Non-null assertion (you promise it's there)
const canvas = document.getElementById('c')! as HTMLCanvasElement;
```

Use `!` only when null is truly impossible; it removes the check, not the bug.

## Cause 2: React useRef

```tsx
const inputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  inputRef.current.focus();      // 'inputRef.current' is possibly 'null'
  inputRef.current?.focus();     // OK
}, []);
```

`ref.current` is null before mount and after unmount, so the check is correct. Always pass the element type as the generic (`useRef<HTMLInputElement>(null)`); without it the ref is typed as holding only `null`.

## Cause 3: String.match and RegExp.exec

```ts
const m = 'v1.2.3'.match(/v(\d+)/);
const major = m[1];              // m is RegExpMatchArray | null

const major2 = m?.[1] ?? '0';    // OK
```

## Cause 4: values typed `T | null` from APIs

`localStorage.getItem()` returns `string | null`:

```ts
const raw = localStorage.getItem('settings');
const settings = JSON.parse(raw ?? '{}');
```

For your own types, narrowing works with `if`, early `return`, `===` checks and type guards:

```ts
function isDefined<T>(v: T | null | undefined): v is T {
  return v != null;
}
const names = users.map(u => u.name).filter(isDefined);
```

## Cause 5: narrowing lost inside callbacks

A check outside a callback doesn't carry into it if the variable is mutable (`let` or a property):

```ts
let el = document.getElementById('x');
if (el) {
  setTimeout(() => el.remove(), 100);   // error: el could be reassigned
}
```

Copy to a `const` inside the check: `const node = el; setTimeout(() => node.remove(), 100);`.

## Don't just turn it off

Setting `"strictNullChecks": false` in `tsconfig.json` silences every one of these errors and the runtime crashes they prevent. Fix the individual sites instead.
