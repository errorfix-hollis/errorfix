---
error: "Too many re-renders. React limits the number of renders to prevent an infinite loop."
error_full: |
  Uncaught Error: Too many re-renders. React limits the number of renders to prevent an infinite loop.
cat: javascript
description: A state setter is being called during render, which triggers another render, which calls it again. Usually it's an onClick that calls a function instead of passing one.
tldr: "Pass a function to event handlers instead of calling it: `onClick={() => setCount(count + 1)}` not `onClick={setCount(count + 1)}`. Move any unconditional `setState` out of the component body into `useEffect` or an event handler, or compute the value directly during render."
keywords: react too many re-renders limits the number of renders infinite loop setstate onclick usestate render loop
related: [js-objects-are-not-valid-as-a-react-child, js-is-not-a-function, js-cannot-read-properties-of-undefined]
---
## What it means

React threw this because state was updated *during rendering* over and over. Each `setState` during render schedules another render; the render calls `setState` again; after ~50 nested updates React stops with this error.

Note this is different from `Maximum update depth exceeded`, which is usually caused by `useEffect` / `componentDidUpdate` loops.

## Cause 1: calling the handler instead of passing it

The most common cause by far:

```jsx
// Wrong: setCount runs immediately, on every render
<button onClick={setCount(count + 1)}>+</button>
<button onClick={handleClick(id)}>Delete</button>

// Right: pass a function that runs on click
<button onClick={() => setCount(count + 1)}>+</button>
<button onClick={() => handleClick(id)}>Delete</button>
```

If the handler takes no arguments you can pass it directly: `onClick={handleClick}` (no parentheses).

## Cause 2: setState directly in the component body

```jsx
// Wrong
function Cart({ items }) {
  const [total, setTotal] = useState(0);
  setTotal(items.reduce((s, i) => s + i.price, 0));   // runs every render
  return <p>{total}</p>;
}
```

Derived values don't need state at all — compute them during render:

```jsx
function Cart({ items }) {
  const total = items.reduce((s, i) => s + i.price, 0);
  return <p>{total}</p>;
}
```

If it's expensive, wrap it in `useMemo`:

```jsx
const total = useMemo(
  () => items.reduce((s, i) => s + i.price, 0),
  [items]
);
```

## Cause 3: side effect that belongs in useEffect

If you really need to set state in response to something (e.g. after reading from `localStorage`), do it in an effect so it runs after render, not during it:

```jsx
useEffect(() => {
  setTheme(localStorage.getItem('theme') ?? 'light');
}, []);   // empty array: run once after mount
```

## Cause 4: unconditional "sync props to state"

```jsx
// Wrong
if (props.value !== value) setValue(props.value);   // fine only if it eventually stops
setValue(props.value);                               // never stops
```

React does allow setting state during render if it's *conditional* and converges, but it's easy to get wrong. Prefer using the prop directly, or reset the component with a `key`:

```jsx
<Editor key={userId} initialValue={user.bio} />
```

## Cause 5: a custom hook that sets state on every call

A custom hook is just code in the render. If it calls a setter unconditionally, you get the same loop. Move the update into a `useEffect` inside the hook.

## Finding it

The error's stack trace in the browser console points to the component. Search that component for `onClick={`, `onChange={`, `onSubmit={` followed by a call with `(...)`, and for any `set...(` call that isn't inside a handler or effect.
