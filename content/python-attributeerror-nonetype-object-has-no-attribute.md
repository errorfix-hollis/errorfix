---
error: "AttributeError: 'NoneType' object has no attribute"
error_full: "AttributeError: 'NoneType' object has no attribute 'group'"
cat: python
description: You called a method or attribute on a variable that is None. Something earlier returned None instead of the object you expected.
tldr: "The object before the `.` is `None`. Check what produced it — a failed `re.search()`, a BeautifulSoup `find()` that matched nothing, or a function without `return` — and add an `if x is None` check."
keywords: nonetype object has no attribute group text get find python attributeerror
related: [python-typeerror-nonetype-object-is-not-subscriptable]
---
## What it means

In `x.something`, `x` is `None`. The attribute name tells you what you expected `x` to be.

| Attribute in the error | Usual source of None |
|---|---|
| `'group'` | `re.match()` / `re.search()` found no match |
| `'text'`, `'find'`, `'get'` | BeautifulSoup `find()` / `select_one()` matched nothing |
| `'append'` | `my_list = my_list.append(x)` (append returns None) |
| `'cursor'`, `'execute'` | A connection function returned None after failing |
| any | A function that has no `return` statement |

## Fix: handle the None case

```python
m = re.search(r"id=(\d+)", url)
if m:
    user_id = m.group(1)
else:
    user_id = None   # or raise, or skip
```

```python
title = soup.find("h1")
text = title.get_text(strip=True) if title else ""
```

## Web scraping: why find() returns None

- The page is built by JavaScript, so the element isn't in the HTML `requests` downloads. Check with `print(resp.text)`; you may need the site's API or a browser tool like Playwright.
- The site served a different page (a consent page, a CAPTCHA, a 403). Check `resp.status_code`.
- The class name or tag is different from what you see in the browser's DevTools.

## Don't reassign in-place methods

```python
items = items.append(4)   # items is now None
items.append(4)           # correct
```
