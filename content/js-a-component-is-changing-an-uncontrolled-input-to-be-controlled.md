---
error: "Warning: A component is changing an uncontrolled input to be controlled."
error_full: |
  Warning: A component is changing an uncontrolled input to be controlled. This is likely caused by the value changing from undefined to a defined value, which should not happen. Decide between using a controlled or uncontrolled input element for the lifetime of the component.
cat: javascript
description: "An input's `value` (or `checked`) prop started as undefined or null, so React treated it as uncontrolled, and later became a real value. Give it a defined initial value."
tldr: "Initialize state with an empty string instead of undefined: `useState(\"\")`, not `useState()`. For possibly-missing data use `value={name ?? \"\"}`, and for checkboxes `checked={!!flag}`. Or make it uncontrolled with `defaultValue` and no `value`."
keywords: react warning a component is changing an uncontrolled input to be controlled controlled to uncontrolled value undefined usestate defaultvalue checked checkbox form react-hook-form
related: [js-too-many-re-renders, js-cannot-read-properties-of-undefined, js-each-child-in-a-list-should-have-a-unique-key-prop]
---
## What it means

React has two kinds of form fields:

- **Controlled**: you pass `value` (or `checked`) and update it with `onChange`. React owns the value.
- **Uncontrolled**: no `value` prop (or `value={undefined}`); the DOM keeps the value, optionally seeded with `defaultValue`.

`value={undefined}` and `value={null}` mean "uncontrolled". When that later becomes a string, React warns because the field switched modes mid-life. The reverse message, *changing a controlled input to be uncontrolled*, means a defined value became `undefined`.

## Cause 1: state initialised without a value

```jsx
const [email, setEmail] = useState();        // undefined
<input value={email} onChange={e => setEmail(e.target.value)} />
```

Fix: start with an empty string:

```jsx
const [email, setEmail] = useState("");
```

For checkboxes start with a boolean: `useState(false)`.

## Cause 2: form object with missing fields

```jsx
const [form, setForm] = useState({});
<input name="city" value={form.city} onChange={handleChange} />
```

`form.city` is `undefined` until the user types. Declare every field up front:

```jsx
const [form, setForm] = useState({ name: "", email: "", city: "" });

const handleChange = e =>
  setForm(f => ({ ...f, [e.target.name]: e.target.value }));
```

A bad `setForm({ [e.target.name]: e.target.value })` (without spreading `...f`) drops the other fields and triggers the reverse warning.

## Cause 3: data loaded from an API

Fields from a fetch are `undefined` before loading and `null` for empty database columns:

```jsx
<input value={user?.phone ?? ""} onChange={...} />
<input type="checkbox" checked={!!user?.subscribed} onChange={...} />
```

Use `??` (not `||`) if `0` is a valid value for number inputs.

Alternatively render the form only after the data arrives: `if (!user) return <Spinner />;`

## Cause 4: you actually want an uncontrolled field

If you don't need the value on every keystroke, drop `value` and use `defaultValue`, then read it on submit:

```jsx
<form onSubmit={e => {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  console.log(data.get("email"));
}}>
  <input name="email" defaultValue="" />
</form>
```

Note `defaultValue` is only read on first render; changing it later does nothing (change the `key` to reset the field).

## Libraries

- **react-hook-form**: pass `defaultValues` to `useForm({ defaultValues: { email: "" } })`, especially when using `Controller`.
- **MUI / Ant Design** inputs wrap a native input and show the same warning (MUI phrases it as *A component is changing the uncontrolled value state*). Same fix: never pass `undefined` as `value`.
- **Select elements**: `<select value={x ?? ""}>` with a matching `<option value="">Choose…</option>`.
