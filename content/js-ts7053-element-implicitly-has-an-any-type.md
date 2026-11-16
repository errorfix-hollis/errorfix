---
error: "TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type"
error_full: |
  error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ red: string; green: string; }'.
    No index signature with a parameter of type 'string' was found on type '{ red: string; green: string; }'.
cat: javascript
description: "You indexed an object with a plain string (obj[key]) but TypeScript only knows the object's specific keys, so with noImplicitAny on it refuses to guess the result type."
tldr: "Narrow the key type: `obj[key as keyof typeof obj]`, or type the variable as `keyof typeof obj` from the start. If the object really is a dictionary, declare it as `Record<string, string>` or `{ [key: string]: string }`. Type `Object.keys()` results with a cast or iterate with `Object.entries()`."
keywords: ts7053 element implicitly has an any type because expression of type string can't be used to index type no index signature keyof typeof record typescript object key
related: [js-ts2339-property-does-not-exist-on-type, js-ts2322-type-is-not-assignable-to-type, js-ts2345-argument-of-type-is-not-assignable-to-parameter]
---
## What it means

```ts
const colors = { red: '#f00', green: '#0f0' };

function lookup(name: string) {
  return colors[name];   // TS7053
}
```

`colors` has exactly two keys, `'red'` and `'green'`. `name` is any `string`, so `colors[name]` might be `colors['blue']`, which doesn't exist. Without an index signature TypeScript would have to type the result as `any`, and with `strict` / `noImplicitAny` that is an error.

Pick the fix that matches what the object really is.

## Fix 1: the key really is one of the known keys — use `keyof`

Type the parameter so only valid keys are accepted:

```ts
type Color = keyof typeof colors;        // 'red' | 'green'

function lookup(name: Color) {
  return colors[name];                   // string
}
```

If the value comes from outside (user input, JSON) validate it once, then narrow:

```ts
function isColor(k: string): k is keyof typeof colors {
  return k in colors;
}

if (isColor(input)) {
  console.log(colors[input]);
}
```

A cast also works but skips the check — use it only when you're sure:

```ts
colors[name as keyof typeof colors];
```

## Fix 2: the object is a dictionary — add an index signature

If keys are arbitrary (a cache, a lookup map built at runtime), say so in the type:

```ts
const counts: Record<string, number> = {};
counts[word] = (counts[word] ?? 0) + 1;    // OK

// equivalent
interface Counts { [key: string]: number }
```

Enable `noUncheckedIndexedAccess` if you want `counts[word]` typed as `number | undefined`, which is more honest for dictionaries. For real maps, consider `Map<string, number>`.

## Fix 3: looping with `Object.keys()`

`Object.keys()` returns `string[]`, not `(keyof T)[]` (an object may have extra keys at runtime), so this errors:

```ts
Object.keys(colors).forEach(k => console.log(colors[k]));   // TS7053
```

Options:

```ts
// a) cast the keys
(Object.keys(colors) as Array<keyof typeof colors>)
  .forEach(k => console.log(colors[k]));

// b) use entries - no indexing needed
Object.entries(colors).forEach(([k, v]) => console.log(k, v));

// c) for...in with a typed key
let k: keyof typeof colors;
for (k in colors) console.log(colors[k]);
```

## Fix 4: generic functions

When writing a helper that reads a property, constrain the key with a generic:

```ts
function get<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

get(colors, 'red');    // string
get(colors, 'blue');   // error: '"blue"' is not assignable to '"red" | "green"'
```

## Related: `window[...]`, `process.env[...]`

`window[name]` hits the same error; declare what you need instead:

```ts
declare global { interface Window { myConfig: Config } }
window.myConfig;
```

`process.env` already has a string index signature (`string | undefined`), so it does not produce TS7053.

Avoid turning off `noImplicitAny` or adding `suppressImplicitAnyIndexErrors` (removed in TypeScript 5.5) — they hide real typos in property names.
