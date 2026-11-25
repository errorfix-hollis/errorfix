---
error: "RuntimeError: Event loop is closed"
error_full: |
  Exception ignored in: <function _ProactorBasePipeTransport.__del__ at 0x000001>
  Traceback (most recent call last):
    File "C:\Python311\Lib\asyncio\proactor_events.py", line 116, in __del__
      self.close()
    File "C:\Python311\Lib\asyncio\base_events.py", line 519, in _check_closed
      raise RuntimeError('Event loop is closed')
  RuntimeError: Event loop is closed
cat: python
description: "Something tried to use an asyncio event loop after it was closed: often aiohttp/httpx transports cleaned up after asyncio.run() finished (especially on Windows), or code reusing a loop across asyncio.run() calls or tests."
tldr: "Close async clients inside the coroutine (`async with aiohttp.ClientSession() as s:` / `await client.aclose()`) before `asyncio.run()` returns. Don't store loops or clients created in one `asyncio.run()` and use them in another. On Windows with old aiohttp, the harmless shutdown warning goes away with `asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())`. In pytest use pytest-asyncio fixtures instead of a global loop."
keywords: python runtimeerror event loop is closed asyncio aiohttp httpx windows proactor _ProactorBasePipeTransport __del__ asyncio.run pytest-asyncio discord.py
related: [python-runtimeerror-asyncio-run-cannot-be-called-from-a-running-event-loop, python-requests-connectionerror-max-retries-exceeded]
---
## What it means

`asyncio.run()` creates a new event loop, runs your coroutine, then **closes** the loop. Anything that later calls `loop.call_soon()` on that loop (a transport's `__del__`, a callback, a client reused in another run) raises `RuntimeError: Event loop is closed`.

There are two flavours:

- `Exception ignored in: ... __del__` at program exit: a cleanup message, your program already finished its work.
- A real traceback in the middle of your code: you are using a closed loop, and results are lost.

## Cause 1: client sessions not closed before the loop ends

aiohttp, httpx, asyncpg, Redis etc. hold sockets bound to the loop. If they are garbage-collected after `asyncio.run()` returns, their cleanup hits a closed loop.

```python
import asyncio, aiohttp

async def main():
    async with aiohttp.ClientSession() as session:   # closed inside the loop
        async with session.get("https://example.com") as r:
            print(r.status)

asyncio.run(main())
```

httpx: `async with httpx.AsyncClient() as client:` or `await client.aclose()`.

## Cause 2: Windows Proactor loop shutdown warning

On Windows the default `ProactorEventLoop` plus older aiohttp versions print the `_ProactorBasePipeTransport.__del__` message on exit even when everything worked. Fixes, in order of preference:

1. Upgrade: `pip install -U aiohttp` and close sessions as above.
2. Use the selector loop:

```python
import asyncio, sys
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run(main())
```

(The selector loop does not support subprocesses on Windows; keep the Proactor loop if you need `asyncio.create_subprocess_exec`.)

## Cause 3: reusing objects across several `asyncio.run()` calls

```python
client = None
async def init():
    global client
    client = httpx.AsyncClient()
asyncio.run(init())
asyncio.run(use(client))   # client is bound to the first, closed loop
```

Run everything in **one** `asyncio.run(main())`, and create clients inside it. Don't call `asyncio.get_event_loop()` at import time and keep it; in Python 3.10+ that is deprecated anyway.

## Cause 4: closing the loop yourself

Old-style code:

```python
loop = asyncio.get_event_loop()
loop.run_until_complete(a())
loop.close()
loop.run_until_complete(b())   # Event loop is closed
```

Close the loop only once at the very end, or switch to `asyncio.run()`.

## Cause 5: pytest

Each pytest-asyncio test gets its own loop by default. A module-level client or a session-scoped fixture created on another loop fails in later tests. Create async resources in fixtures with matching scope:

```python
import pytest_asyncio, httpx

@pytest_asyncio.fixture
async def client():
    async with httpx.AsyncClient() as c:
        yield c
```

If you need one loop for the whole session, configure the loop scope (pytest-asyncio 0.24+: `asyncio_default_fixture_loop_scope = session` and `@pytest.mark.asyncio(loop_scope="session")`).

## Cause 6: Jupyter / frameworks with their own loop

In Jupyter, FastAPI, discord.py etc. a loop is already managed for you. Use `await coro()` directly instead of `asyncio.run()`, and don't close the framework's loop.
