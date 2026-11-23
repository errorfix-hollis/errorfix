---
error: "Warning: Cannot update during an existing state transition (such as within `render`)."
error_full: |
  Warning: Cannot update during an existing state transition (such as within `render`). Render methods should be a pure function of props and state.
cat: javascript
description: "React caught `setState` being called while a component was rendering. In class components this is almost always an event handler that is called (`onClick={this.handleClick()}`) instead of passed."
tldr: "Pass the handler, don't call it: `onClick={this.handleClick}` or `onClick={() => this.handleClick(id)}` instead of `onClick={this.handleClick(id)}`. Never call `setState` (or a parent callback that does) inside `render()`; move it to `componentDidMount`/`componentDidUpdate` or derive the value during render."
keywords: react warning cannot update during an existing state transition such as within render render methods should be a pure function of props and state setstate in render onclick class component componentdidupdate
related: [js-too-many-re-renders, js-cannot-update-a-component-while-rendering-a-different-component, js-maximum-update-depth-exceeded]
---
## What it means

`render()` must only compute JSX from props and state. Calling `this.setState()` (or a function that does) while React is rendering would trigger another render in the middle of the current one, so React warns. It often comes with, or turns into, [Maximum update depth exceeded](/javascript/js-maximum-update-depth-exceeded/).

The function-component version of the same mistake usually shows as [Too many re-renders](/javascript/js-too-many-re-renders/), or [Cannot update a component while rendering a different component](/javascript/js-cannot-update-a-component-while-rendering-a-different-component/) when the setter belongs to a parent.

## Cause 1: calling the handler instead of passing it

```jsx
class TodoList extends React.Component {
  remove(id) {
    this.setState(s => ({ items: s.items.filter(i => i.id !== id) }));
  }
  render() {
    return this.state.items.map(item => (
      <button key={item.id} onClick={this.remove(item.id)}>x</button>
      //                              ^ runs during render
    ));
  }
}
```

`onClick={this.remove(item.id)}` executes `remove` right away and passes its return value. Wrap it:

```jsx
<button key={item.id} onClick={() => this.remove(item.id)}>x</button>
```

Without arguments, pass the bound method:

```jsx
constructor(props) {
  super(props);
  this.toggle = this.toggle.bind(this);
}
// ...
<button onClick={this.toggle}>Toggle</button>
```

or define it as a class field arrow function: `toggle = () => { this.setState(...) }`.

## Cause 2: setState directly in render

```jsx
render() {
  if (this.props.items.length === 0) {
    this.setState({ empty: true });   // warning
  }
  return ...;
}
```

Derived values don't need state at all:

```jsx
render() {
  const empty = this.props.items.length === 0;
  return empty ? <p>No items</p> : <List items={this.props.items} />;
}
```

If you really need to react to a prop change, do it after render:

```jsx
componentDidUpdate(prevProps) {
  if (prevProps.userId !== this.props.userId) {
    this.loadUser(this.props.userId);
  }
}
```

Always compare with `prevProps`; an unconditional `setState` in `componentDidUpdate` loops forever.

## Cause 3: calling a parent callback during render

```jsx
render() {
  this.props.onCountChange(this.state.items.length);  // parent calls setState
  return ...;
}
```

Notify the parent in `componentDidMount`/`componentDidUpdate`, or lift the state up so the parent computes the count itself.

## Cause 4: Redux/MobX dispatch in render

`dispatch(action)` or mutating an observable in `render()` updates store subscribers (other components) mid-render. Move the dispatch into a lifecycle method, `useEffect`, or the event handler that caused the change.

## Finding the culprit

The warning's component stack (expand it in the browser console) shows which component's render triggered the update. Search that component's JSX for `={this.` and `={handle` followed by `(` — the parenthesis is usually the bug.
