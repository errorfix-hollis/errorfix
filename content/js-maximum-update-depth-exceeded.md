---
error: "Maximum update depth exceeded"
error_full: |
  Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops.
  Warning: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.
cat: javascript
description: A React effect or lifecycle method updates state, which re-renders, which runs the effect again, forever. Usually a useEffect without a dependency array, or a dependency that is a new object/array/function on every render.
tldr: "Give `useEffect` a correct dependency array, don't list values that you set inside the effect, and stabilise object/function dependencies with `useMemo`/`useCallback` (or depend on primitive fields like `user.id`). Only call `setState` when the value actually changed."
keywords: react maximum update depth exceeded useeffect setstate infinite loop dependency array componentdidupdate usecallback usememo nested updates
related: [js-too-many-re-renders, js-objects-are-not-valid-as-a-react-child, js-cannot-read-properties-of-undefined]
---
## What it means

React counts nested updates triggered from commits (effects, `componentDidUpdate`). When the chain goes past its limit (~50), it stops with this error. It is related to "Too many re-renders", which is triggered by setState *during render*; this one is triggered *after* render.

## Cause 1: useEffect with no dependency array

```jsx
// Wrong: runs after every render, and sets state every time
useEffect(() => {
  setItems(data.filter(d => d.active));
});
```

Add dependencies — or better, don't store derived data in state at all:

```jsx
const items = useMemo(() => data.filter(d => d.active), [data]);
```

## Cause 2: a dependency that changes every render

Objects, arrays and functions created in the component body are new on every render, so the effect always "sees a change":

```jsx
// Wrong: options is a new object each render
const options = { page, size: 20 };
useEffect(() => { fetchRows(options).then(setRows); }, [options]);
```

Depend on primitives, or memoise:

```jsx
useEffect(() => { fetchRows({ page, size: 20 }).then(setRows); }, [page]);

// or
const options = useMemo(() => ({ page, size: 20 }), [page]);
```

For functions, use `useCallback`, or define the function inside the effect.

## Cause 3: the effect depends on the state it sets

```jsx
// Wrong: count changes -> effect -> count changes -> ...
useEffect(() => { setCount(count + 1); }, [count]);
```

Use a functional update and remove the dependency, or add a condition that stops the loop:

```jsx
useEffect(() => {
  if (value !== normalized) setValue(normalized);
}, [value, normalized]);
```

## Cause 4: callback props that set parent state

A child calls `onChange(...)` in an effect, the parent sets state, re-renders, and passes a *new* `onChange` function, re-triggering the child's effect. Wrap the parent's handler in `useCallback`:

```jsx
const handleChange = useCallback(v => setFilter(v), []);
<Filter onChange={handleChange} />
```

## Cause 5: class components

```jsx
componentDidUpdate(prevProps) {
  // Wrong: unconditional
  // this.setState({ user: this.props.user });

  if (prevProps.userId !== this.props.userId) {
    this.setState({ user: null });
  }
}
```

Always compare with `prevProps`/`prevState` before calling `setState` in `componentDidUpdate`.

## Cause 6: ref callbacks or event handlers called during render

`onClick={setOpen(true)}` or `ref={node => setNode(node)}` with an inline function can loop too. Pass `() => setOpen(true)`, and use `useRef` instead of state for DOM nodes when you don't need a re-render.

## Finding it

The warning in the console includes a component stack. Install the React DevTools and enable "Highlight updates when components render" to see which component is re-rendering constantly, then inspect its effects' dependency arrays. The `react-hooks/exhaustive-deps` ESLint rule catches most of these.
