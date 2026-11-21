---
error: "TypeError: Cannot set properties of undefined (setting '...')"
error_full: |
  Uncaught TypeError: Cannot set properties of undefined (setting 'name')
  TypeError: Cannot set property 'name' of undefined
cat: javascript
description: "You assigned a property on something that is undefined, e.g. obj.a.b = 1 when obj.a doesn't exist yet, an array slot that was never created, or `this` lost in a callback."
tldr: "Create the parent before assigning: `obj.a ??= {}; obj.a.b = 1;`. For nested arrays initialise every row (`Array.from({length: n}, () => [])`). In classes, bind methods or use arrow functions so `this` isn't undefined. Log the object just before the line to see which part is undefined."
keywords: javascript typeerror cannot set properties of undefined setting cannot set property of undefined nested object array index this undefined class method react state
related: [js-cannot-set-properties-of-null, js-cannot-read-properties-of-undefined, js-is-not-a-function]
---
## What it means

In `x.y = value`, `x` is `undefined`, so there is nothing to put the property on. The name in parentheses is the property being **set** (`'name'`), not the variable that is undefined; the undefined thing is whatever is to the left of `.name`. Older engines print `Cannot set property 'name' of undefined`.

The `null` version (`Cannot set properties of null`) is usually a DOM element that wasn't found.

## Cause 1: nested object path that doesn't exist yet

```js
const config = {};
config.db.host = "localhost";      // config.db is undefined
```

Create each level first:

```js
config.db ??= {};                  // ES2021 logical nullish assignment
config.db.host = "localhost";

// or build it in one go
const config = { db: { host: "localhost" } };
```

For dynamic keys (grouping, counting):

```js
const groups = {};
for (const item of items) {
  (groups[item.type] ??= []).push(item);
}
```

## Cause 2: array element that doesn't exist

```js
const grid = [];
grid[0][0] = 1;                    // grid[0] is undefined
```

Initialise every row. Avoid `new Array(n).fill([])`, which shares one array between all rows:

```js
const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
grid[0][0] = 1;
```

Also check off-by-one indexes: `arr[arr.length].x = 1` is always undefined.

## Cause 3: `this` is undefined in a callback

Class bodies run in strict mode, so a method passed as a callback loses `this`:

```js
class Counter {
  count = 0;
  increment() { this.count++; }    // 'this' undefined when detached
}
const c = new Counter();
button.addEventListener("click", c.increment);       // TypeError
```

Fix with an arrow function field, `bind`, or a wrapper:

```js
class Counter {
  count = 0;
  increment = () => { this.count++; };
}
// or
button.addEventListener("click", () => c.increment());
```

Same in old React class components: bind handlers in the constructor or use arrow-function fields.

## Cause 4: data not loaded yet

```js
let user;
fetch("/api/me").then(r => r.json()).then(d => { user = d; });
user.lastSeen = Date.now();        // runs before the fetch resolves
```

Do the work after the data arrives (`await`, or inside `.then`). In React, never mutate state objects; create a new one:

```js
setUser(prev => ({ ...prev, profile: { ...prev?.profile, name } }));
```

## Cause 5: a function returned nothing

```js
function makeUser(name) { const u = { name }; }   // forgot "return u"
const u = makeUser("ana");
u.age = 30;                        // TypeError
```

Check that the function, `Array.find()` (returns `undefined` when nothing matches) or the module export you are using actually returns an object:

```js
const user = users.find(u => u.id === id);
if (user) user.active = true;
```

## Debugging

Put `console.log(obj, obj?.a)` (or a breakpoint) on the line before the error and walk the chain left to right. The first `undefined` in the chain is the one to fix.
