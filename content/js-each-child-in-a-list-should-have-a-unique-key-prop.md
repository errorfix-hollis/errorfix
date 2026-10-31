---
error: "Each child in a list should have a unique \"key\" prop."
error_full: |
  Warning: Each child in a list should have a unique "key" prop.
  Check the render method of `TodoList`. See https://react.dev/link/warning-keys for more information.
  Warning: Encountered two children with the same key, `1`. Keys should be unique so that components maintain their identity across updates.
cat: javascript
description: You rendered an array of elements in React (usually with .map) without giving each element a stable, unique key prop, or two elements share the same key.
tldr: "Add a `key` to the outermost element returned from `.map()`, using a stable unique id from your data: `items.map(item => <li key={item.id}>{item.name}</li>)`. Use `<Fragment key={...}>` when returning fragments. Avoid array indexes as keys if the list can be reordered, filtered or edited."
keywords: react each child in a list should have a unique key prop warning map key fragment encountered two children with the same key index as key
related: [js-too-many-re-renders, js-objects-are-not-valid-as-a-react-child, js-is-not-a-function]
---
## What it means

When React re-renders a list, it uses `key` to match old elements to new ones. Without keys (or with duplicates) it can't tell which item moved, was added or was removed, so it may reuse the wrong component state — e.g. a checkbox or text input "jumping" to another row. It's a warning, not a crash, but it points at real bugs.

## Fix 1: add a key to the element returned by map

```jsx
// Wrong
{todos.map(todo => <li>{todo.text}</li>)}

// Right
{todos.map(todo => <li key={todo.id}>{todo.text}</li>)}
```

The key must be on the **outermost** element in the callback, not on a child inside it:

```jsx
// Wrong: key is on the inner element
{todos.map(todo => (
  <div className="row">
    <TodoItem key={todo.id} todo={todo} />
  </div>
))}

// Right
{todos.map(todo => (
  <div className="row" key={todo.id}>
    <TodoItem todo={todo} />
  </div>
))}
```

## Fix 2: fragments need an explicit Fragment

The short syntax `<>...</>` can't take a key. Use `Fragment`:

```jsx
import { Fragment } from 'react';

{terms.map(t => (
  <Fragment key={t.id}>
    <dt>{t.term}</dt>
    <dd>{t.definition}</dd>
  </Fragment>
))}
```

## Fix 3: duplicate keys

"Encountered two children with the same key" means your ids aren't unique (duplicate rows from an API, or keying by a non-unique field like `name`). Fix the data, or combine fields:

```jsx
<Row key={`${row.userId}-${row.date}`} row={row} />
```

Keys only need to be unique among siblings, not globally.

## Fix 4: no id in the data

Generate ids **when the data is created**, not during render:

```jsx
const addTodo = text =>
  setTodos(t => [...t, { id: crypto.randomUUID(), text }]);
```

Never do `key={Math.random()}` or `key={crypto.randomUUID()}` inside render: every render gets new keys, so React remounts every item and loses input focus and state.

## When is the index OK?

`key={index}` silences the warning and is fine if the list is static: never reordered, filtered, or inserted into except at the end. For editable or sortable lists it causes state to stick to the wrong row, so use real ids.

## Finding it

The warning names the component ("Check the render method of `TodoList`"). Look there for `.map(`, `Array.from(`, or any array of JSX. Arrays built manually (`const cells = []; cells.push(<td>...)`) need keys too.
