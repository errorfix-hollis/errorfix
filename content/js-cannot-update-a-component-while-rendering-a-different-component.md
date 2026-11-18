---
error: "Warning: Cannot update a component while rendering a different component"
error_full: |
  Warning: Cannot update a component (`App`) while rendering a different component (`Child`). To locate the bad setState() call inside `Child`, follow the stack trace as described in https://reactjs.org/link/setstate-in-render
cat: javascript
description: "A component called a state setter that belongs to another component (usually a parent's setter passed as a prop, or a store/context update) during its render. Move that update into an event handler or useEffect."
tldr: "Don't call a parent's setter in the child's render body. Wrap it in `useEffect(() => { onChange(value); }, [value]);`, call it from an event handler, or better, compute the value in the parent instead of syncing it. Also check for `onClick={setX(1)}` (should be `onClick={() => setX(1)}`)."
keywords: react cannot update a component while rendering a different component setstate in render parent setter prop useeffect redux dispatch zustand context warning
related: [js-too-many-re-renders, js-maximum-update-depth-exceeded, js-cant-perform-a-react-state-update-on-an-unmounted-component]
---
## What it means

Rendering must be pure: while React renders `Child`, it must not change the state of `App`. React detected a `setState` (or a store update that re-renders another component) that ran *during* `Child`'s render and warns, because the result depends on render order and can cause extra renders or loops.

The first component in the message (`App`) owns the state; the second (`Child`) is where the bad call happens. The stack trace below the warning points to the exact line.

## Cause 1: calling a parent setter in the render body

```jsx
function Child({ items, onCount }) {
  onCount(items.length);          // runs during render -> warning
  return <ul>{items.map(i => <li key={i.id}>{i.name}</li>)}</ul>;
}
```

Best fix: the parent doesn't need this state at all, it can derive it:

```jsx
function App() {
  const [items] = useState([]);
  const count = items.length;     // derived, no setter needed
  return <><p>{count}</p><Child items={items} /></>;
}
```

If the parent genuinely needs a notification, do it after render:

```jsx
useEffect(() => {
  onCount(items.length);
}, [items.length, onCount]);
```

Make sure `onCount` is stable (a state setter, or wrapped in `useCallback`) to avoid an effect loop.

## Cause 2: handler called instead of passed

```jsx
<button onClick={onSelect(id)}>Pick</button>        // calls parent setter during render
<button onClick={() => onSelect(id)}>Pick</button>  // correct
```

## Cause 3: dispatching to a store during render

Redux `dispatch`, Zustand `set`, Jotai/Recoil setters or a context setter called directly in a component body trigger re-renders of other subscribed components:

```jsx
function Page({ title }) {
  dispatch(setTitle(title));       // warning
  ...
}
```

Move it into an effect:

```jsx
useEffect(() => {
  dispatch(setTitle(title));
}, [title, dispatch]);
```

## Cause 4: form libraries and setValue in render

Calling `setValue` / `setFieldValue` from react-hook-form or Formik in the body of a child field component has the same effect. Use `defaultValues`, or put the call in `useEffect`.

## Cause 5: setState inside a parent's state updater

An updater function passed to `setState` runs during render. Calling another component's setter inside it triggers the warning:

```jsx
setItems(prev => {
  onChange(prev.length + 1);   // side effect in updater -> warning
  return [...prev, item];
});
```

Keep updaters pure and do the side effect next to the `setItems` call in the event handler:

```jsx
const next = [...items, item];
setItems(next);
onChange(next.length);
```

## Finding it

Open the browser console and expand the warning's stack trace; look for the first frame in your own code inside the second component named. Search that component for setter calls (`set...(`, `dispatch(`, `on...(`) that aren't inside a handler, `useEffect` or callback. This warning is the "different component" sibling of `Too many re-renders`, which happens when a component updates *its own* state during render.
