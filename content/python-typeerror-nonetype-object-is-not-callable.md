---
error: "TypeError: 'NoneType' object is not callable"
error_full: |
  Traceback (most recent call last):
    File "main.py", line 9, in <module>
      result = handler(data)
               ^^^^^^^^^^^^^
  TypeError: 'NoneType' object is not callable
cat: python
description: "You put parentheses after something whose value is None, so Python tried to call None. The name was set to None by accident, or a function or decorator returned None instead of a function."
tldr: "Find the name being called on the traceback line and print it (`print(repr(handler))`). Usual fixes: pass the function without calling it (`callback=func`, not `callback=func()`), make decorators `return wrapper`, don't overwrite a method with its result, and in BeautifulSoup use `find_all` (not `findAll`/`findall` typos, which return None)."
keywords: python typeerror nonetype object is not callable none called function returns none decorator return wrapper beautifulsoup findall callback parentheses
related: [python-typeerror-str-object-is-not-callable, python-attributeerror-nonetype-object-has-no-attribute, python-typeerror-module-object-is-not-callable]
---
## What it means

`x(...)` works only if `x` is callable: a function, class, method, or an object with `__call__`. Here `x` was `None`. On Python 3.11+ the `^^^^` markers show which call failed. Print the value just before that line:

```python
print(repr(handler), type(handler))
```

Then find where it became `None`.

## Cause 1: calling the function when passing it

```python
def on_done():
    print("done")

# Wrong: on_done() runs now and returns None; None is stored as the callback
button.connect(on_done())
threading.Thread(target=worker())
schedule.every(5).seconds.do(job())

# Right: pass the function object
button.connect(on_done)
threading.Thread(target=worker)
schedule.every(5).seconds.do(job)
```

If you need arguments, use `lambda: worker(42)`, `functools.partial(worker, 42)`, or `Thread(target=worker, args=(42,))`.

## Cause 2: a decorator that doesn't return the wrapper

```python
def log_calls(func):
    def wrapper(*args, **kwargs):
        print("calling", func.__name__)
        return func(*args, **kwargs)
    # forgot: return wrapper

@log_calls
def add(a, b): return a + b

add(1, 2)   # TypeError: 'NoneType' object is not callable
```

`@log_calls` replaces `add` with whatever `log_calls` returns. Without `return wrapper` that's `None`. Add the return and wrap with `@functools.wraps(func)`.

The same happens with decorator factories if you write `@retry` when the decorator expects `@retry()`, or the other way round.

## Cause 3: overwriting a function or method with its result

```python
self.process = self.process()     # first call works, now self.process is None
self.process()                    # TypeError

callback = print("hi")            # print returns None
callback()
```

Use different names for the method and its result.

## Cause 4: a lookup returned None

```python
handlers = {"add": do_add}
handler = handlers.get(cmd)       # None for unknown commands
handler(data)                     # TypeError if cmd isn't "add"

func = getattr(module, name, None)
func()
```

Check it first: `if handler is None: raise ValueError(f"unknown command {cmd!r}")`.

## Cause 5: BeautifulSoup attribute typos

In BeautifulSoup, `tag.something` means `tag.find("something")`. A misspelled method name is treated as a tag search, returns `None`, and calling it raises this error:

```python
soup.findall("a")      # bs4 looks for a <findall> tag -> None -> TypeError
soup.find_all("a")     # correct
```

The same happens with methods that don't exist in your bs4 version. Check the spelling against the bs4 docs.

## Cause 6: a variable named like a function

```python
max = None            # or: input, sorted, len, ... set somewhere earlier
max([1, 2, 3])        # TypeError
```

Rename the variable (`max_value`). In a notebook, also restart the kernel, or `del max`, to restore the built-in. See [str object is not callable](/python/python-typeerror-str-object-is-not-callable/) for the same problem with strings.

## Cause 7: a function that only returns on some paths

```python
def get_parser(kind):
    if kind == "json":
        return json.loads
    # no return for other kinds -> None

parse = get_parser("yaml")
parse(text)           # TypeError
```

Return something on every path, or raise an exception for unsupported input.
