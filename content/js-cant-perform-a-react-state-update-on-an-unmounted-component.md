---
error: "Warning: Can't perform a React state update on an unmounted component."
error_full: |
  Warning: Can't perform a React state update on an unmounted component. This is a no-op, but it indicates a memory leak in your application. To fix, cancel all subscriptions and asynchronous tasks in a useEffect cleanup function.
      at UserProfile (UserProfile.jsx:12)
cat: javascript
description: "An async task (fetch, timer, subscription) finished after its component was removed and then called setState. React 18 removed this warning, but the underlying bug (wasted work, race conditions) is still worth fixing with an effect cleanup."
tldr: "Return a cleanup function from `useEffect` that cancels the work: abort fetches with `AbortController` (`return () => controller.abort()`), `clearTimeout`/`clearInterval` timers, and unsubscribe listeners. For data fetching, a library like TanStack Query handles this for you. Upgrading to React 18+ removes the warning itself."
keywords: react warning cant perform a react state update on an unmounted component memory leak useeffect cleanup abortcontroller fetch setstate unmounted settimeout subscription
related: [js-react-hook-useeffect-has-a-missing-dependency, js-maximum-update-depth-exceeded, js-too-many-re-renders]
---
## What it means

A component started something asynchronous, then got unmounted (the user navigated away, a conditional hid it, a list item was removed). When the async work completed it called a state setter on a component that no longer exists. React ignores the update and, in React 16/17, prints this warning.

**React 18 removed the warning**, because most cases (a single fetch resolving late) aren't real leaks. If you still see it, you're on React 17 or older. Either way, the cleanups below are the right pattern: they prevent race conditions where a slow old request overwrites newer data.

## Fix 1: abort fetch requests

```jsx
useEffect(() => {
  const controller = new AbortController();

  fetch(`/api/users/${id}`, { signal: controller.signal })
    .then(res => res.json())
    .then(setUser)
    .catch(err => {
      if (err.name !== 'AbortError') setError(err);
    });

  return () => controller.abort();   // runs on unmount and before the next effect
}, [id]);
```

Axios supports the same `signal` option (`axios.get(url, { signal })`); aborted requests reject with `CanceledError`, which you can check with `axios.isCancel(err)`.

## Fix 2: ignore stale results with a flag

If the async API can't be cancelled (an SDK call, a promise from a library), ignore the result after cleanup:

```jsx
useEffect(() => {
  let ignore = false;

  loadUser(id).then(data => {
    if (!ignore) setUser(data);
  });

  return () => { ignore = true; };
}, [id]);
```

This is the pattern from the React docs. It also fixes the race when `id` changes quickly: only the latest request updates state.

## Fix 3: clear timers and intervals

```jsx
useEffect(() => {
  const t = setTimeout(() => setVisible(false), 3000);
  return () => clearTimeout(t);
}, []);

useEffect(() => {
  const i = setInterval(() => setNow(Date.now()), 1000);
  return () => clearInterval(i);
}, []);
```

## Fix 4: unsubscribe from listeners and sockets

```jsx
useEffect(() => {
  const onResize = () => setWidth(window.innerWidth);
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}, []);

useEffect(() => {
  const ws = new WebSocket(url);
  ws.onmessage = e => setMessages(m => [...m, e.data]);
  return () => ws.close();
}, [url]);
```

Firebase, RxJS and most stores return an unsubscribe function: `return onSnapshot(ref, cb);` is a valid cleanup.

## Fix 5: async work in event handlers

The warning can also come from a click handler that awaits and then sets state after the component closed (e.g. a modal that submits, then closes itself, then sets `loading=false`):

```jsx
async function handleSubmit() {
  setLoading(true);
  await save(form);
  onClose();            // parent unmounts this modal
  setLoading(false);    // too late: component is gone
}
```

Reorder so the state update happens before closing, or skip it since the component disappears anyway.

## Fix 6: let a data library handle it

TanStack Query, SWR, RTK Query and React Router loaders manage cancellation, caching and deduplication for you:

```jsx
const { data: user } = useQuery({
  queryKey: ['user', id],
  queryFn: ({ signal }) => fetch(`/api/users/${id}`, { signal }).then(r => r.json()),
});
```

## Don't use an isMounted ref as the fix

Tracking `isMounted.current` silences the warning but leaves the request running and doesn't fix races between requests. In React 18 Strict Mode, effects mount, unmount and mount again in development, so a ref set only once can also be wrong. Prefer the cleanup patterns above.
