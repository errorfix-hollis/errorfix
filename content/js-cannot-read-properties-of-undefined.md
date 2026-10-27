---
error: "TypeError: Cannot read properties of undefined (reading 'x')"
error_full: "Uncaught TypeError: Cannot read properties of undefined (reading 'map')"
cat: javascript
description: You accessed a property on a value that is undefined. The data isn't loaded yet, the object path is wrong, or a function returned nothing.
tldr: "The thing *before* `.map` (or whatever property is named) is `undefined`. Give it a default (`items ?? []`), use optional chaining (`user?.address?.city`), or wait until the data is loaded."
keywords: cannot read properties of undefined reading map length react typeerror javascript optional chaining null
related: [js-require-is-not-defined]
---
## What it means

In `something.map(...)`, `something` is `undefined`. JavaScript can't read `map` from nothing. (Older browsers say `Cannot read property 'map' of undefined`; with `null` it says `of null`.)

## Cause 1: data that isn't loaded yet (React, Vue…)

```jsx
const [posts, setPosts] = useState();          // undefined on first render
useEffect(() => { fetch('/api/posts').then(r => r.json()).then(setPosts) }, []);
return posts.map(p => <Post {...p} />);        // crashes before the fetch finishes
```

Fix: start with a sensible empty value, or render a loading state:

```jsx
const [posts, setPosts] = useState([]);
// or
if (!posts) return <p>Loading…</p>;
```

## Cause 2: the object shape is different from what you think

```js
const res = await fetch('/api/user').then(r => r.json());
res.user.name     // but the API returns { data: { user: ... } }
```

Log it and look: `console.log(JSON.stringify(res, null, 2))`.

## Cause 3: a function that returns nothing

```js
const getItems = () => { items.filter(i => i.active) };   // braces, no return!
getItems().length;                                       // undefined.length
```

Either add `return` or drop the braces: `() => items.filter(i => i.active)`.

## Safe access

```js
const city = user?.address?.city;          // undefined instead of a crash
const list = (data?.items ?? []).map(fn);  // default to an empty array
```

## Cause 4: `this` is undefined

In class methods passed as callbacks (`onClick={this.handleClick}`), `this` is lost. Use an arrow function class field (`handleClick = () => {...}`) or `.bind(this)`.

## Finding the culprit

The stack trace's first line points to the file and line. In the browser DevTools, enable *Pause on exceptions* in the Sources tab to inspect the variables at the moment it fails.
