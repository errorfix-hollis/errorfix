---
error: "Objects are not valid as a React child"
error_full: |
  Error: Objects are not valid as a React child (found: object with keys {id, name}). If you meant to render a collection of children, use an array instead.
  Uncaught Error: Objects are not valid as a React child (found: [object Promise]).
  Error: Objects are not valid as a React child (found: [object Date]).
cat: javascript
description: You tried to render a plain object, Date, or Promise directly inside JSX. React can only render strings, numbers, elements, arrays of those, null and booleans.
tldr: "Render a property instead of the whole object (`{user.name}` not `{user}`), map arrays to elements (`{items.map(i => <li key={i.id}>{i.name}</li>)}`), convert dates with `{date.toLocaleDateString()}`, and never make a component `async` in client React — fetch in `useEffect` and store the result in state."
keywords: react objects are not valid as a react child found object with keys found object promise render collection use an array instead jsx date async component
related: [js-cannot-read-properties-of-undefined, js-is-not-a-function, js-unexpected-token-in-json]
---
## What it means

Inside `{ }` in JSX, React accepts strings, numbers, React elements, arrays/iterables of those, and `null`/`undefined`/booleans (which render nothing). Any other object — a plain `{...}`, a `Date`, a `Promise`, a `Map` — throws this error. The message tells you what it found: `object with keys {id, name}`, `[object Promise]`, `[object Date]`.

## Cause 1: rendering a whole object

```jsx
// Wrong
<p>{user}</p>

// Right
<p>{user.name}</p>
```

For debugging, render it as text:

```jsx
<pre>{JSON.stringify(user, null, 2)}</pre>
```

## Cause 2: rendering an array of objects without mapping

An array is fine only if its items are renderable. An array of objects is not:

```jsx
// Wrong
<ul>{todos}</ul>

// Right
<ul>
  {todos.map(todo => (
    <li key={todo.id}>{todo.title}</li>
  ))}
</ul>
```

## Cause 3: API response is wrapped

APIs often return `{ data: [...] }` or `{ results: [...] }`. If you stored the whole response in state, you're rendering an object. Log it and store the right part:

```js
const res = await fetch('/api/todos');
const json = await res.json();
console.log(json);           // check the shape
setTodos(json.data);         // not setTodos(json)
```

## Cause 4: a Date object

```jsx
// Wrong
<span>{post.createdAt}</span>        // if createdAt is a Date

// Right
<span>{post.createdAt.toLocaleDateString()}</span>
<span>{post.createdAt.toISOString()}</span>
```

## Cause 5: an async component or a Promise (`found: [object Promise]`)

In client-side React, a component marked `async` returns a Promise, which React can't render. (Async Server Components are only supported in frameworks like Next.js App Router.) Fetch in an effect instead:

```jsx
function Profile({ id }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then(r => r.json())
      .then(setUser);
  }, [id]);

  if (!user) return <p>Loading…</p>;
  return <p>{user.name}</p>;
}
```

The same error appears if you call an async function directly in JSX: `{getName()}` where `getName` is `async`.

## Cause 6: wrong props destructuring

Forgetting the braces in a component's parameter gives you the whole props object:

```jsx
// Wrong: title is the entire props object
function Header(title) { return <h1>{title}</h1>; }

// Right
function Header({ title }) { return <h1>{title}</h1>; }
```

## Cause 7: double braces

`{{name}}` is not template syntax in JSX — it creates an object literal `{ name: name }`. Use a single pair: `{name}`.

## Finding the culprit

The stack trace's component stack (in the browser console) names the component that rendered the object. Add `console.log(typeof value, value)` right before the JSX that renders it.
