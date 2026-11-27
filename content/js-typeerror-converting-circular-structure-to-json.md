---
error: "TypeError: Converting circular structure to JSON"
error_full: |
  TypeError: Converting circular structure to JSON
      --> starting at object with constructor 'Object'
      |     property 'self' -> object with constructor 'Object'
      --- property 'parent' closes the circle
      at JSON.stringify (<anonymous>)
cat: javascript
description: "JSON.stringify was given an object that references itself somewhere in its graph. Common culprits are Express req/res objects, DOM nodes, React events, Axios errors and Mongoose documents."
tldr: "Stringify only the data you need (e.g. `res.json(user.toObject())` or `JSON.stringify({ message: err.message, status: err.response?.status })`) instead of whole framework objects. If you really need the whole graph, use a replacer that drops repeated references, or `util.inspect` for logging."
keywords: javascript typeerror converting circular structure to json json.stringify circular reference starting at object with constructor closes the circle express req res axios error mongoose socket node
related: [js-unexpected-token-in-json, js-cannot-read-properties-of-undefined, python-object-of-type-is-not-json-serializable]
---
## What it means

JSON is a tree; it can't represent an object that points back to itself. When `JSON.stringify` finds a cycle, it throws. Modern V8 (Node 12+, Chrome) prints the path of the cycle — read it, it tells you which property closes the loop:

```
--> starting at object with constructor 'ClientRequest'
|     property 'socket' -> object with constructor 'Socket'
--- property '_httpMessage' closes the circle
```

`ClientRequest`/`Socket` → you're serializing an HTTP request or an Axios error. `HTMLDivElement`/`FiberNode` → a DOM node or React internals.

Minimal reproduction:

```js
const a = { name: 'a' };
a.self = a;
JSON.stringify(a);   // TypeError
```

## Cause 1: sending framework objects in a response

```js
// Express — wrong
app.get('/x', (req, res) => res.json(req));
res.send(JSON.stringify(res));
```

Send plain data:

```js
res.json({ query: req.query, body: req.body });
// Mongoose: .lean() returns a plain object instead of a document
const user = await User.findById(id).lean();
res.json(user);
```

## Cause 2: logging or returning an Axios / fetch error

An Axios error contains `config`, `request` (a `ClientRequest` with a socket) and `response`:

```js
try {
  await axios.get(url);
} catch (err) {
  // wrong: res.status(500).json(err)
  res.status(500).json({
    message: err.message,
    status: err.response?.status,
    data: err.response?.data,
  });
}
```

Axios errors also have `err.toJSON()` which returns a safe summary.

## Cause 3: React events, refs or DOM elements in state

```jsx
// wrong: saving the whole event or element
onChange={(e) => setForm(e)}
localStorage.setItem('form', JSON.stringify(form));

// right
onChange={(e) => setForm({ ...form, [e.target.name]: e.target.value })}
```

The same happens when passing a DOM element or ref to `JSON.stringify`, or putting it in Redux state with persistence.

## Cause 4: your own data has back-references

Trees with `parent` pointers, doubly-linked lists, graphs. Exclude the back-reference with a replacer or `toJSON`:

```js
JSON.stringify(node, (key, value) => (key === 'parent' ? undefined : value));

class TreeNode {
  toJSON() {
    const { parent, ...rest } = this;
    return rest;
  }
}
```

## Fix: a generic "safe stringify"

Drops any object already seen (note: also drops repeated non-circular references):

```js
function safeStringify(obj, space) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  }, space);
}
```

For logging in Node, skip JSON entirely: `console.log(obj)` or `util.inspect(obj, { depth: 4 })` handle cycles and print `<ref *1>` / `[Circular *1]`. To deep-copy an object with cycles, use `structuredClone(obj)` instead of `JSON.parse(JSON.stringify(obj))`.

To inspect the JSON you do produce, paste it into the [JSON formatter](/tools/json-formatter/).
