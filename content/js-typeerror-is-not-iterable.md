---
error: "TypeError: x is not iterable"
error_full: |
  Uncaught TypeError: data is not iterable
      at App (App.jsx:8:24)
  TypeError: undefined is not iterable (cannot read property Symbol(Symbol.iterator))
  TypeError: object is not iterable (cannot read property Symbol(Symbol.iterator))
cat: javascript
description: "You used for...of, spread (...), array destructuring, Promise.all or Array.from on a value that isn't iterable: usually undefined/null (data not loaded yet) or a plain object instead of an array."
tldr: "Check what the value really is with `console.log(x)`. For objects use `Object.entries(obj)` / `Object.values(obj)` instead of iterating the object. For values that may be missing, default them: `for (const x of items ?? [])`, `const [a, b] = arr ?? []`. In React, `const [state, setState] = useState()` errors mean you destructured something that isn't an array (e.g. used `{}` or a custom hook returning an object)."
keywords: javascript typeerror is not iterable undefined is not iterable object is not iterable cannot read property Symbol(Symbol.iterator) for of spread destructuring react usestate useContext Object.entries Promise.all
related: [js-cannot-read-properties-of-undefined, js-is-not-a-function, js-objects-are-not-valid-as-a-react-child]
---
## What it means

These operations require an *iterable* (something with a `Symbol.iterator` method, like arrays, strings, Maps, Sets, NodeLists):

```js
for (const x of value) {}
[...value]
const [a, b] = value
new Map(value), new Set(value), Array.from(value)
Promise.all(value)
```

If `value` is `undefined`, `null`, a number or a plain object, you get `TypeError: value is not iterable`. Chrome's longer form mentions `Symbol(Symbol.iterator)`; for destructuring a function call it says `x is not a function or its return value is not iterable`.

## Cause 1: plain object instead of array

```js
const user = { name: "Ana", role: "admin" };
for (const item of user) {}       // TypeError: user is not iterable
```

Objects aren't iterable. Pick what you need:

```js
for (const [key, value] of Object.entries(user)) {}
for (const value of Object.values(user)) {}
for (const key of Object.keys(user)) {}
```

A very common version: an API returns `{ items: [...] }` or `{ data: [...] }` and you iterate the whole response. Log it and iterate the array property:

```js
const json = await res.json();
console.log(json);
for (const item of json.items) {}
```

Use our [JSON formatter](/tools/json-formatter/) to see the response shape quickly.

## Cause 2: value is undefined or null (not loaded yet)

```js
const [first, second] = props.values;   // values undefined on first render
```

Default it:

```js
const [first, second] = props.values ?? [];
for (const item of items ?? []) {}
const merged = [...(a ?? []), ...(b ?? [])];
```

or give state an array initial value: `useState([])`, not `useState()`.

## Cause 3: destructuring a hook or function that doesn't return an array

```js
const [user, setUser] = useContext(UserContext);   // context value is an object
const [data, loading] = useFetch(url);             // hook returns { data, loading }
```

Match the shape that's actually returned:

```js
const { user, setUser } = useContext(UserContext);
const { data, loading } = useFetch(url);
```

If you see this with `useContext`, also check the component is inside the Provider; outside it, the value is the default (often `undefined`).

Also check for typos like `const [a, b] = useState` (missing `()`), which gives `useState is not a function or its return value is not iterable`.

## Cause 4: Promise.all / Map / Set with a non-iterable

```js
await Promise.all(promise1, promise2);   // wrong: needs one array
await Promise.all([promise1, promise2]); // right

new Map({ a: 1 });                       // wrong
new Map(Object.entries({ a: 1 }));       // right
```

## Cause 5: forgot to await

```js
const users = fetchUsers();     // a Promise, not an array
for (const u of users) {}       // TypeError: users is not iterable
```

Add `await` (inside an async function): `const users = await fetchUsers();`.

## Cause 6: iterating a number

`for (const i of 10)` doesn't work. Use a classic loop or create a range:

```js
for (let i = 0; i < 10; i++) {}
for (const i of Array.from({ length: 10 }, (_, i) => i)) {}
```
