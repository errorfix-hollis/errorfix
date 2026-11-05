---
error: "TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'."
error_full: |
  error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
    Type 'undefined' is not assignable to type 'string'.
cat: javascript
description: TypeScript found a function call whose argument type doesn't match the parameter type. Most often a possibly-undefined or possibly-null value is passed where a definite value is required, or a wide type (string) is passed where a narrow one (a union of literals) is expected.
tldr: "Narrow the value before the call: `if (id) fetchUser(id)` or `fetchUser(id ?? 'default')`. Use `as const` for literal arrays/objects, give `useState`/empty arrays an explicit type (`useState<User | null>(null)`, `const xs: string[] = []`), and only use the non-null assertion `id!` when you are certain. Read the second line of the error: it says which part doesn't match."
keywords: typescript ts2345 argument of type is not assignable to parameter of type string undefined null never union literal as const usestate react strictnullchecks narrowing
related: [js-ts2532-object-is-possibly-undefined, js-ts2339-property-does-not-exist-on-type, js-ts2307-cannot-find-module-or-its-corresponding-type-declarations]
---
## What it means

A function declares what it accepts; you passed something TypeScript can't prove fits. The indented lines under the error explain the specific mismatch — read those first, they often point to one property deep inside an object.

```ts
function fetchUser(id: string) { /* ... */ }

const id = new URLSearchParams(location.search).get("id"); // string | null
fetchUser(id);   // TS2345: 'string | null' is not assignable to 'string'
```

## Cause 1: the value may be `undefined` or `null`

With `strictNullChecks` (part of `strict`), optional properties, `Map.get`, `Array.find`, `process.env.X`, `searchParams.get` and `document.querySelector` all include `undefined`/`null`.

Narrow it:

```ts
if (id) {
  fetchUser(id);          // id: string here
}

if (!id) throw new Error("id is required");
fetchUser(id);
```

Or supply a default:

```ts
fetchUser(id ?? "anonymous");
const port = Number(process.env.PORT ?? 3000);
```

The non-null assertion `fetchUser(id!)` silences the error but crashes at runtime if you're wrong — use it only when you've checked by other means.

## Cause 2: a wide `string` where a literal union is expected

```ts
type Method = "GET" | "POST";
function request(method: Method) {}

const opts = { method: "GET" };    // inferred as { method: string }
request(opts.method);              // string is not assignable to Method
```

Fix by keeping the literal type:

```ts
const opts = { method: "GET" } as const;
// or
const opts: { method: Method } = { method: "GET" };
// or
const opts = { method: "GET" } satisfies { method: Method };
```

## Cause 3: `never[]` from an empty array or `useState([])`

```ts
const [items, setItems] = useState([]);   // never[]
setItems([{ id: 1 }]);                    // Argument of type '{ id: number }[]' is not assignable to 'SetStateAction<never[]>'
```

Give it a type:

```ts
const [items, setItems] = useState<Item[]>([]);
const [user, setUser] = useState<User | null>(null);
const ids: string[] = [];
```

## Cause 4: event and DOM types

```ts
function onChange(e: React.ChangeEvent<HTMLInputElement>) {}
<select onChange={onChange} />   // HTMLSelectElement vs HTMLInputElement
```

Use the matching element type, or a union: `React.ChangeEvent<HTMLInputElement | HTMLSelectElement>`. For `addEventListener`, TypeScript infers the event type from the event name — don't annotate it with a different type.

## Cause 5: object is missing or has extra properties

```ts
interface User { id: number; name: string }
save({ id: 1 });   // Property 'name' is missing in type '{ id: number; }'
```

Add the property, make it optional in the interface (`name?: string`), or pass a `Partial<User>` to a function that accepts one. API responses typed as `any`/`unknown` should be validated (e.g. with zod) and given a real type before passing them on.

## Cause 6: `string | number` from mixed sources

Form values and `JSON.parse` results often aren't the type you assume. Convert explicitly: `Number(value)`, `String(value)`, `parseInt(value, 10)`. For `unknown`, narrow with `typeof value === "string"` first.

## Cause 7: duplicate or mismatched library types

`Argument of type 'X' is not assignable to parameter of type 'X'` (same name on both sides) means two copies of a package's types are installed. Check with `npm ls @types/react` and dedupe (`npm dedupe`, or align versions/`overrides` in package.json).
