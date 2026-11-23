---
error: "RuntimeError: asyncio.run() cannot be called from a running event loop"
error_full: |
  Traceback (most recent call last):
    File "<stdin>", line 1, in <module>
    File "/usr/lib/python3.12/asyncio/runners.py", line 190, in run
      raise RuntimeError(
  RuntimeError: asyncio.run() cannot be called from a running event loop
cat: python
description: "`asyncio.run()` creates and starts a new event loop, and only one loop can run per thread. You called it from code that is already inside a running loop, typically Jupyter, IPython, or an async function/framework."
tldr: "Inside Jupyter or an `async def`, don't call `asyncio.run()`; use `await main()` directly. From sync code that is called by a running loop, schedule work with `asyncio.create_task()` or run it in a separate thread (`concurrent.futures.ThreadPoolExecutor().submit(asyncio.run, main()).result()`). `nest_asyncio.apply()` is a last-resort workaround."
keywords: runtimeerror asyncio.run cannot be called from a running event loop jupyter notebook ipython await top level nest_asyncio get_event_loop run_until_complete this event loop is already running fastapi
related: [python-recursionerror-maximum-recursion-depth, python-typeerror-nonetype-object-is-not-callable]
---
## What it means

`asyncio.run(coro)` is the entry point for asyncio programs: it creates a loop, runs `coro` to completion and closes the loop. It refuses to start if the current thread already has a running loop. A related message is `RuntimeError: This event loop is already running`, from `loop.run_until_complete()` in the same situation.

## Cause 1: Jupyter Notebook, JupyterLab, IPython, Colab

Jupyter kernels run an event loop already, and support top-level `await`. Replace:

```python
asyncio.run(main())
```

with:

```python
await main()
```

In a plain `.py` script, keep `asyncio.run(main())` under `if __name__ == "__main__":`.

## Cause 2: calling asyncio.run() inside an async function

```python
async def handler():
    result = asyncio.run(fetch_data())   # error
```

You are already in a coroutine, so just await:

```python
async def handler():
    result = await fetch_data()
```

Run several at once with `await asyncio.gather(fetch_a(), fetch_b())`.

This also applies to FastAPI, aiohttp, Discord bots, Playwright async, etc.: their handlers run in a loop the framework owns.

## Cause 3: sync code called from async code

A library function is synchronous but internally calls `asyncio.run()`, and you call it from an async context. Options:

Run the sync function in a worker thread (no loop there, so `asyncio.run()` works):

```python
async def handler():
    result = await asyncio.to_thread(sync_function_that_uses_asyncio_run)
```

Or from purely sync code that might be under a running loop:

```python
import asyncio, concurrent.futures

def run_sync(coro):
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)          # no loop: normal path
    with concurrent.futures.ThreadPoolExecutor(1) as pool:
        return pool.submit(asyncio.run, coro).result()
```

Better still, use the library's async API if it has one.

## Cause 4: fire-and-forget inside a running loop

If you don't need the result immediately, schedule a task instead:

```python
task = asyncio.create_task(send_metrics())
# keep a reference to `task` so it isn't garbage-collected
```

## Workaround: nest_asyncio

```bash
pip install nest_asyncio
```

```python
import nest_asyncio
nest_asyncio.apply()
asyncio.run(main())
```

It patches asyncio to allow re-entrant loops. It is handy in notebooks for libraries you can't change, but it is monkey-patching (the project is no longer maintained) and can break with uvloop or newer Python versions, so prefer the fixes above.

## Don't use get_event_loop().run_until_complete() as a fix

`asyncio.get_event_loop().run_until_complete(main())` hits the same problem ("This event loop is already running") and `get_event_loop()` without a running loop is deprecated since Python 3.12. Use `asyncio.run()` at the top level and `await` everywhere below it.
