---
error: "Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client"
error_full: |
  Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client
      at new NodeError (node:internal/errors:405:5)
      at ServerResponse.setHeader (node:_http_outgoing:648:11)
      at ServerResponse.header (/app/node_modules/express/lib/response.js:794:10)
      at ServerResponse.send (/app/node_modules/express/lib/response.js:174:12)
      at ServerResponse.json (/app/node_modules/express/lib/response.js:278:15)
  code: 'ERR_HTTP_HEADERS_SENT'
cat: javascript
description: "Your Node/Express handler tried to send a second response (or set a header) after the first response was already sent. Usually a missing return after res.send/res.json, or both a callback and the main path responding."
tldr: "Make sure every request path sends exactly one response: write `return res.status(400).json({...})` instead of `res.status(400).json({...})` in early exits, don't call `next()` after responding, and don't respond in both a `.then()` and a `.catch()`/after an `await`. Guard with `if (res.headersSent) return next(err);` in error handlers."
keywords: err_http_headers_sent cannot set headers after they are sent to the client express node res.send res.json return next headersSent double response
related: [node-error-socket-hang-up-econnreset, node-error-listen-eaddrinuse-address-already-in-use, js-is-not-a-function]
---
## What it means

An HTTP response has one status line and one set of headers, sent before the body. Once you call `res.send()`, `res.json()`, `res.end()`, `res.redirect()` or `res.render()`, the headers are flushed. Any later call that needs to set headers — another `res.json()`, `res.status()`, `res.setHeader()`, `res.cookie()` — throws `ERR_HTTP_HEADERS_SENT`.

The stack trace shows *where the second write happened*; the bug is usually that the *first* write didn't stop the function.

## Cause 1: missing `return` after an early response

```js
// Wrong: execution continues after the 400
app.post('/users', (req, res) => {
  if (!req.body.email) {
    res.status(400).json({ error: 'email required' });
  }
  res.status(201).json(createUser(req.body));   // second response -> error
});
```

`res.json()` does not end the function. Return it:

```js
app.post('/users', (req, res) => {
  if (!req.body.email) {
    return res.status(400).json({ error: 'email required' });
  }
  return res.status(201).json(createUser(req.body));
});
```

## Cause 2: responding inside a loop or callback

```js
// Wrong: responds once per item
items.forEach(item => {
  if (item.invalid) res.status(400).send('bad item');
});
res.send('ok');
```

Find the result first, then respond once:

```js
const bad = items.find(item => item.invalid);
if (bad) return res.status(400).send('bad item');
res.send('ok');
```

The same applies to callback APIs: a callback that responds *and* code after it that responds will race.

## Cause 3: calling `next()` after sending

```js
// Wrong
app.use((req, res, next) => {
  if (!req.user) res.status(401).send('login required');
  next();   // the route handler runs and responds again
});

// Right
app.use((req, res, next) => {
  if (!req.user) return res.status(401).send('login required');
  next();
});
```

## Cause 4: async code that responds twice

```js
// Wrong: if res.json throws or an await below fails, catch responds again
try {
  const user = await db.find(id);
  res.json(user);
  await audit.log(id);         // throws -> catch -> second response
} catch (err) {
  res.status(500).json({ error: err.message });
}
```

Respond as the last step, or check `res.headersSent` in the catch:

```js
} catch (err) {
  if (res.headersSent) return console.error(err);
  res.status(500).json({ error: err.message });
}
```

In an Express error-handling middleware, delegate to the default handler when headers are already out:

```js
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'internal error' });
});
```

## Cause 5: setting headers after streaming started

`res.write()` or `pipe(res)` sends headers on the first chunk. Call `res.setHeader()` / `res.status()` *before* writing anything, and don't call `res.json()` after a stream has been piped to `res`.

## How to find the culprit

Search the route for every `res.` call and make sure each path reaches exactly one of them. A quick debugging aid:

```js
app.use((req, res, next) => {
  const send = res.send;
  res.send = function (...args) {
    if (res.headersSent) console.trace('second response for', req.method, req.url);
    return send.apply(this, args);
  };
  next();
});
```
