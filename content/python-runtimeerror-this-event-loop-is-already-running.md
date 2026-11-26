---
error: "RuntimeError: This event loop is already running"
error_full: |
  Traceback (most recent call last):
    File "<stdin>", line 1, in <module>
    File "/usr/lib/python3.11/asyncio/base_events.py", line 629, in run_until_complete
      self._check_running()
    File "/usr/lib/python3.11/asyncio/base_events.py", line 588, in _check_running
      raise RuntimeError('This event loop is already running')
  RuntimeError: This event loop is already running
cat: python
description: "You called loop.run_until_complete() (or a library that does) while an asyncio loop was already running in the same thread, typically inside Jupyter, IPython, Spyder or an async function."
tldr: "In Jupyter/IPython use top-level `await main()` instead of `asyncio.run()`/`run_until_complete()`. Inside async code, `await` the coroutine instead of starting a new loop. As a last resort for legacy libraries: `pip install nest_asyncio` then `import nest_asyncio; nest_asyncio.apply()`."
keywords: python runtimeerror this event loop is already running asyncio run_until_complete jupyter notebook ipython spyder nest_asyncio get_event_loop await
related: [python-runtimeerror-asyncio-run-cannot-be-called-from-a-running-event-loop, python-runtimeerror-event-loop-is-closed]
---
## What it means

An asyncio event loop can only be driven by one `run_until_complete()` / `run_forever()` call at a time per thread. If code calls `loop.run_until_complete(...)` while that loop is already running, asyncio raises this error instead of nesting.

The loop is "already running" in two common situations:

- **Jupyter, IPython 7+, Spyder, VS Code notebooks**: the kernel itself runs an asyncio loop, so your cell is already executing inside it.
- **Inside an `async def`**: a coroutine is running on the loop, and something inside it (often a sync wrapper in a library) tries to start the loop again.

The sibling error `asyncio.run() cannot be called from a running event loop` has the same cause; you get that one when you use `asyncio.run()` instead.

## Cause 1: running asyncio code in a notebook

```python
# In a Jupyter cell - fails
loop = asyncio.get_event_loop()
loop.run_until_complete(main())
```

## Fix 1: use top-level await

Notebooks support `await` directly at cell level:

```python
result = await main()
```

To run several coroutines concurrently:

```python
results = await asyncio.gather(fetch(a), fetch(b))
```

Keep the `asyncio.run(main())` form for `.py` scripts run with `python script.py`, where no loop is running.

## Cause 2: starting a loop from inside a coroutine

```python
async def handler():
    data = asyncio.get_event_loop().run_until_complete(fetch())  # error
```

## Fix 2: await instead

```python
async def handler():
    data = await fetch()
```

If you must call blocking sync code from async code, push it to a thread so it doesn't block the loop:

```python
data = await asyncio.to_thread(blocking_function, arg)
```

If sync code needs to run a coroutine while a loop is running in *another* thread, use `asyncio.run_coroutine_threadsafe(coro, loop).result()`.

## Cause 3: a library with a sync wrapper around async code

Some libraries (older versions of scrapers, Telegram bots, `pyppeteer`, some SDKs) expose sync methods that internally call `run_until_complete()`. Called from a notebook or async framework (FastAPI, Discord bots), they fail.

## Fix 3: use the async API, or nest_asyncio

First check whether the library has an async variant (`await client.fetch_async()`, `AsyncClient`, etc.) and use it.

If not, `nest_asyncio` patches the loop to allow re-entrant calls:

```bash
pip install nest_asyncio
```

```python
import nest_asyncio
nest_asyncio.apply()
```

Run this once at the top of the notebook. It's a workaround for interactive use; avoid it in production servers, and note it doesn't work with `uvloop`.

## Cause 4: GUI or framework already owns the loop

Frameworks such as Qt with `qasync`, `discord.py` and `aiohttp` web apps run the loop for you. Calling `bot.run()` or `web.run_app()` inside another running loop gives the same error. Use their async start methods instead (`await bot.start(token)`, `web.AppRunner`), or start them from a plain script.
