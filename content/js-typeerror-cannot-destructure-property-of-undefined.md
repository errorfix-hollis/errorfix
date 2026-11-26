---
error: "TypeError: Cannot destructure property 'x' of 'undefined' as it is undefined."
error_full: |
  Uncaught TypeError: Cannot destructure property 'name' of 'undefined' as it is undefined.
  TypeError: Cannot destructure property 'data' of '(intermediate value)' as it is undefined.
  TypeError: Cannot read properties of undefined (reading 'name')
cat: javascript
description: "You used object destructuring (const { a } = obj or a function parameter like ({ a }) => ...) on a value that is undefined or null, such as a missing argument, an unresolved Promise result or a missing React prop or context."
tldr: "Give the destructured value a default: `const { name } = user ?? {}` or `function f({ name } = {})`. Make sure you `await` promises before destructuring (`const { data } = await axios.get(url)`), and check that React props/context providers actually pass the object."
keywords: javascript typeerror cannot destructure property of undefined as it is undefined intermediate value react props usecontext await axios default parameter
related: [js-cannot-read-properties-of-undefined, js-cannot-read-properties-of-null, js-is-not-a-function]
---
## What it means

Destructuring reads properties from the right-hand side. `const { name } = user` is shorthand for `const name = user.name`, so if `user` is `undefined` or `null` it throws. V8 (Chrome, Node) phrases it as `Cannot destructure property 'name' of 'undefined' as it is undefined`; `'(intermediate value)'` means the value came from an expression such as a function call rather than a named variable. Firefox says `TypeError: user is undefined`.

The fix is always the same idea: find out why the value is `undefined`, and either make sure it exists or provide a default.

## Cause 1: function called without the expected object

```js
function connect({ host, port }) { ... }
connect();            // TypeError
```

## Fix 1: default the parameter

```js
function connect({ host = 'localhost', port = 5432 } = {}) { ... }
connect();            // works
```

The `= {}` after the pattern is what prevents the crash; the inner defaults fill in missing keys.

## Cause 2: destructuring a Promise result without await

```js
const { data } = axios.get('/api/user');      // data is undefined, no crash
const { data: { user } } = axios.get('/api/user'); // TypeError
```

Or `useQuery`/`fetch` returning `undefined` while it's still loading.

## Fix 2: await it, and handle loading state

```js
const { data } = await axios.get('/api/user');

const res = await fetch('/api/user');
const { user } = await res.json();
```

For hooks that start as `undefined`:

```js
const { data } = useSWR('/api/user', fetcher);
const { name } = data ?? {};
if (!data) return <Spinner />;
```

## Cause 3: React props or context missing

```jsx
function Profile({ user: { name } }) { ... }
<Profile />   // user is undefined -> TypeError
```

With context, `useContext(AuthContext)` returns the default value (often `undefined`) when the component isn't wrapped in the provider:

```jsx
const { user, login } = useContext(AuthContext); // TypeError outside <AuthProvider>
```

## Fix 3: pass the prop, or wrap in the provider

```jsx
<AuthProvider>
  <App />
</AuthProvider>
```

Give context a usable default, or throw a clearer error:

```jsx
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
```

In Next.js, this error often appears when `getServerSideProps`/`getStaticProps` returns no `props` key, or a page is rendered without its data.

## Cause 4: nested destructuring of an optional field

```js
const { address: { city } } = user;  // fails if user.address is undefined
```

## Fix 4: default the nested level or use optional chaining

```js
const { address: { city } = {} } = user;
// or
const city = user?.address?.city;
```

## Cause 5: wrong import shape

`const { foo } = require('./mod')` fails with this error when the module exports `undefined` (for example a circular `require`, or `module.exports` assigned after the import ran). Log `require('./mod')` to see what you actually got.

## Debugging tip

Log the value right before the destructuring line: `console.log(typeof value, value)`. The stack trace's top frame points to the exact line.
