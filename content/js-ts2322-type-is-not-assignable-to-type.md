---
error: "TS2322: Type 'X' is not assignable to type 'Y'"
error_full: |
  error TS2322: Type 'string | undefined' is not assignable to type 'string'.
    Type 'undefined' is not assignable to type 'string'.
cat: javascript
description: TypeScript found a value whose type doesn't fit the declared type of the variable, property, return value or prop it's assigned to. The indented lines under the error tell you exactly which part doesn't fit.
tldr: "Read the last indented line — it names the exact mismatch. Then narrow the value (`if (x === undefined) return;`, `x ?? 'default'`), fix the declared type (`useState<User | null>(null)`), or convert (`Number(x)`, `String(x)`). Use `as const` for literal unions. Avoid `as any`."
keywords: typescript ts2322 type is not assignable to type string undefined null usestate never literal union as const react props return type strictnullchecks
related: [js-ts2345-argument-of-type-is-not-assignable-to-parameter, js-ts2532-object-is-possibly-undefined, js-ts2339-property-does-not-exist-on-type]
---
## What it means

TS2322 is TypeScript's general "this doesn't fit" error for **assignments**: `let x: T = value`, `obj.prop = value`, `return value` in a function with a return type, and JSX props. (When the value is a function argument you get the sibling error TS2345 instead.)

The first line is the summary; the indented lines below drill down to the actual incompatible part. Always read the deepest one:

```text
Type '{ id: number; name: string | undefined; }' is not assignable to type 'User'.
  Types of property 'name' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
```

Here the real problem is only `name`.

## Cause 1: `undefined` or `null` in the value (strictNullChecks)

```ts
const name: string = params.get("name");   // string | null
const port: number = process.env.PORT;     // string | undefined -> two problems
```

Fix by handling the missing case:

```ts
const name = params.get("name") ?? "anonymous";      // string
const port = Number(process.env.PORT ?? 3000);       // number

const user = users.find(u => u.id === id);          // User | undefined
if (!user) throw new Error(`no user ${id}`);
const current: User = user;                         // narrowed to User
```

Use the non-null assertion `value!` only when you *know* it can't be null; it removes the check at compile time but not the crash at runtime.

## Cause 2: `useState` inferred too narrow a type

```tsx
const [user, setUser] = useState(null);   // type is null
setUser(data);                            // TS2322 / TS2345: User not assignable to null

const [items, setItems] = useState([]);   // never[]
setItems(["a"]);                          // Type 'string' is not assignable to type 'never'
```

Give the generic explicitly:

```tsx
const [user, setUser] = useState<User | null>(null);
const [items, setItems] = useState<string[]>([]);
```

`not assignable to type 'never'` almost always means an empty array or object was inferred without a type.

## Cause 3: string literal unions widened to `string`

```ts
type Variant = "primary" | "secondary";
const config = { variant: "primary" };   // variant: string
const v: Variant = config.variant;       // Type 'string' is not assignable to type 'Variant'
```

Keep the literal type:

```ts
const config = { variant: "primary" } as const;
// or
const config: { variant: Variant } = { variant: "primary" };
// or (TS 4.9+)
const config = { variant: "primary" } satisfies { variant: Variant };
```

## Cause 4: wrong primitive type

```ts
const age: number = input.value;   // string
```

Convert instead of asserting: `Number(input.value)`, `parseInt(input.value, 10)`, `String(n)`, `Boolean(x)`. A cast like `input.value as unknown as number` compiles but leaves a string at runtime.

## Cause 5: React props and children

```tsx
<Button size="huge" />   // Type '"huge"' is not assignable to type '"sm" | "md" | "lg"'
```

Either pass an allowed value or widen the prop type in the component. For children, `Type 'Element[]' is not assignable to type 'Element'` means the prop is typed `JSX.Element` but you pass several elements — type it as `React.ReactNode`.

## Cause 6: function return types

```ts
function getId(): number {
  return localStorage.getItem("id");   // string | null
}
```

Fix the implementation (`return Number(localStorage.getItem("id") ?? 0)`), or the signature if the function really can return null (`: number | null`).

## Cause 7: object literal has extra or missing properties

`Object literal may only specify known properties` (TS2353) and `Property 'x' is missing in type ... but required in type ...` (TS2741) often show up as the detail under TS2322. Add the missing property, make it optional in the type (`x?: string`), or remove the typo'd one.

## What not to do

`as any` or `// @ts-ignore` silence the error but keep the bug. If you need an escape hatch, `as unknown as T` at least makes it explicit, and is easy to grep for later.
