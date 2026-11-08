---
error: "nginx: [emerg] could not build server_names_hash, you should increase server_names_hash_bucket_size"
error_full: |
  nginx: [emerg] could not build server_names_hash, you should increase server_names_hash_bucket_size: 64
  nginx: configuration file /etc/nginx/nginx.conf test failed
  nginx: [warn] could not build optimal server_names_hash, you should increase either server_names_hash_max_size: 512 or server_names_hash_bucket_size: 64; ignoring server_names_hash_bucket_size
cat: web
description: "nginx stores all server_name values in a hash table, and one of your names is too long (or you have too many) for the default bucket size. Raise server_names_hash_bucket_size (and/or server_names_hash_max_size) in the http block."
tldr: "In the `http { }` block of /etc/nginx/nginx.conf set `server_names_hash_bucket_size 128;` (on Debian/Ubuntu just uncomment the existing line and change 64 to 128). For the 'optimal' warning with many names, also set `server_names_hash_max_size 1024;`. Then `sudo nginx -t && sudo systemctl reload nginx`."
keywords: nginx emerg could not build server_names_hash you should increase server_names_hash_bucket_size 32 64 128 server_names_hash_max_size long domain name nginx -t
related: [web-nginx-bind-address-already-in-use, web-nginx-502-bad-gateway, web-nginx-403-forbidden]
---
## What it means

nginx builds a hash table of every `server_name` at startup. Each hash bucket has a fixed size (`server_names_hash_bucket_size`, default 32, 64 or 128 depending on the CPU cache line size), and **a single name plus overhead must fit in one bucket**. A long hostname, such as a cloud load balancer name or a deep subdomain like `my-app-staging-eu-west-1.internal.example.com`, overflows it and nginx refuses to start (`[emerg]`).

The `[warn] could not build optimal server_names_hash` variant means the table works but isn't efficient, usually because you have many server names. That one is only a warning, but worth fixing.

## Fix: raise the bucket size

Edit `/etc/nginx/nginx.conf`. The directive must be in the `http` context, not inside a `server` block:

```nginx
http {
    server_names_hash_bucket_size 128;
    # server_names_hash_max_size 1024;   # if you have many names

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

On Debian and Ubuntu the default `nginx.conf` already contains a commented line:

```nginx
# server_names_hash_bucket_size 64;
```

Uncomment it and set 128 (use powers of two: 64, 128, 256). Then:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

If 128 still isn't enough, the name is extremely long or there's a mistake (see below); try 256.

## Fix for the "optimal" warning

With hundreds or thousands of names (multi-tenant hosting, big redirect maps), raise the maximum table size first:

```nginx
http {
    server_names_hash_max_size 2048;
    server_names_hash_bucket_size 128;
}
```

The nginx docs recommend increasing `server_names_hash_max_size` first, and only then the bucket size.

## Where it must go

- Put it **once**, in `http {}`. Placing it inside `server {}` gives `"server_names_hash_bucket_size" directive is not allowed here`. Placing it twice gives `"server_names_hash_bucket_size" directive is duplicate`.
- A file in `conf.d/` is included inside `http`, so a one-line `conf.d/00-hash.conf` with the directive also works, as long as the main file doesn't set it too.
- In the official Docker image, mount your own `nginx.conf` or add a file in `/etc/nginx/conf.d/`.

## Check for broken server_name lines

A missing semicolon makes nginx treat the following line as more server names, creating a huge "name":

```nginx
server_name example.com www.example.com   # <- missing ;
root /var/www/html;
```

Here `root` and `/var/www/html;` become server names. Find all names with:

```bash
sudo nginx -T 2>/dev/null | grep -n server_name
```

Similarly, don't put URLs in `server_name` (`https://example.com/`); it takes only hostnames, wildcards (`*.example.com`) or regexes (`~^www\d+\.example\.com$`).
