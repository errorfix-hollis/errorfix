---
error: "React Hook useEffect has a missing dependency"
error_full: |
  Warning: React Hook useEffect has a missing dependency: 'fetchData'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
cat: javascript
description: The ESLint rule react-hooks/exhaustive-deps found a value used inside useEffect (or useCallback/useMemo) that isn't listed in the dependency array, which can make the effect run with stale values.
tldr: "Add the value to the array if the effect should re-run when it changes. If that causes a loop, move the function inside the effect, wrap it in `useCallback`, use a functional state update (`setCount(c => c + 1)`), or keep a value in a `useRef`. Don't just disable the rule."
keywords: react hook useeffect has a missing dependency react-hooks/exhaustive-deps eslint dependency array usecallback stale closure infinite loop fetch
related: [js-maximum-update-depth-exceeded, js-too-many-re-renders, js-cannot-read-properties-of-undefined]
---
## What it means

An effect "captures" the props, state and functions it uses from the render it was created in. The dependency array tells React when to recreate the effect. If you use `userId` inside but don't list it, the effect keeps using the first `userId` forever — a *stale closure* bug. The lint rule warns about every value from the component scope used in the effect that's missing from the array.

```jsx
useEffect(() => {
  fetch(`/api/users/${userId}`).then(r => r.json()).then(setUser);
}, []);   // warning: missing dependency 'userId'
```

## Fix 1: add the dependency (usually correct)

```jsx
useEffect(() => {
  fetch(`/api/users/${userId}`).then(r => r.json()).then(setUser);
}, [userId]);
```

Now the effect re-runs when `userId` changes, which is what you want. Add cleanup to ignore responses from an outdated request:

```jsx
useEffect(() => {
  let ignore = false;
  fetch(`/api/users/${userId}`)
    .then(r => r.json())
    .then(data => { if (!ignore) setUser(data); });
  return () => { ignore = true; };
}, [userId]);
```

State setters from `useState` and `dispatch` from `useReducer` are stable, so the rule doesn't require them.

## Fix 2: the missing dependency is a function — move it inside

```jsx
function Profile({ userId }) {
  async function fetchData() {
    const r = await fetch(`/api/users/${userId}`);
    setUser(await r.json());
  }
  useEffect(() => { fetchData(); }, []);   // missing 'fetchData'
}
```

Adding `fetchData` to the array would re-run the effect on *every* render, because the function is recreated each time. Move it into the effect so only its real inputs are dependencies:

```jsx
useEffect(() => {
  async function fetchData() {
    const r = await fetch(`/api/users/${userId}`);
    setUser(await r.json());
  }
  fetchData();
}, [userId]);
```

If the function doesn't use props or state at all, move it outside the component.

## Fix 3: the function is shared — use useCallback

```jsx
const fetchData = useCallback(async () => {
  const r = await fetch(`/api/users/${userId}`);
  setUser(await r.json());
}, [userId]);

useEffect(() => { fetchData(); }, [fetchData]);
```

`fetchData` now only changes when `userId` changes.

## Fix 4: state used only to compute the next state

```jsx
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000);
  return () => clearInterval(id);
}, []);   // missing 'count', and the counter gets stuck at 1
```

Use the updater form so you don't read `count` at all:

```jsx
useEffect(() => {
  const id = setInterval(() => setCount(c => c + 1), 1000);
  return () => clearInterval(id);
}, []);
```

## Fix 5: objects and arrays recreated every render

```jsx
const options = { method: "POST", body };   // new object each render
useEffect(() => { send(options); }, [options]);   // runs every render
```

Depend on the primitives instead (`[body]`) and build the object inside the effect, or memoise it with `useMemo(() => ({ method: "POST", body }), [body])`.

## Fix 6: you really want the latest value without re-running

For values you want to read but that shouldn't trigger the effect (e.g. an `onChange` callback prop), keep them in a ref:

```jsx
const onChangeRef = useRef(onChange);
useEffect(() => { onChangeRef.current = onChange; });

useEffect(() => {
  const ws = new WebSocket(url);
  ws.onmessage = e => onChangeRef.current(e.data);
  return () => ws.close();
}, [url]);
```

(React's experimental `useEffectEvent` is meant for this case.)

## About disabling the rule

`// eslint-disable-next-line react-hooks/exhaustive-deps` hides the warning and usually hides a real bug. If adding a dependency causes an infinite loop, that's a sign the effect sets state that's also a dependency — see [Maximum update depth exceeded](/javascript/js-maximum-update-depth-exceeded/).
