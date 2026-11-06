---
error: "error converting YAML to JSON: yaml: line N: mapping values are not allowed in this context"
error_full: |
  error: error parsing deployment.yaml: error converting YAML to JSON: yaml: line 12: mapping values are not allowed in this context
cat: kubernetes
description: "kubectl (or Helm) couldn't parse your manifest because the YAML is malformed — usually a missing space after a colon, wrong indentation, or an unquoted value containing \": \". The line number points at or just after the problem."
tldr: "Open the file at the reported line and the line above it. Fix indentation (spaces only, consistent levels), put a space after every `key:`, and quote values that contain `: ` or start with `{`, `[`, `*`, `&`, `!`, `%`, `@` or a backtick. Validate with `kubectl apply --dry-run=client -f file.yaml` or the YAML validator before applying."
keywords: kubernetes kubectl error converting yaml to json mapping values are not allowed in this context did not find expected key line yaml indentation tabs helm template manifest parse
related: [k8s-no-matches-for-kind, k8s-createcontainerconfigerror, k8s-crashloopbackoff]
---
## What it means

Kubernetes manifests are YAML that kubectl converts to JSON before sending to the API server. The YAML parser failed before Kubernetes even looked at your resources. "Mapping values are not allowed in this context" means the parser found a `key: value` pair (a mapping) somewhere it couldn't start one — typically because the line above ended in a way that made the parser think it was still reading a plain value.

The line number is where the parser gave up. The real mistake is often on the **line before**.

Paste the file into the [YAML validator](/tools/yaml-validator/) to see the exact position, or run:

```bash
kubectl apply --dry-run=client -f deployment.yaml
python3 -c 'import sys, yaml; list(yaml.safe_load_all(open(sys.argv[1])))' deployment.yaml
yamllint deployment.yaml
```

## Cause 1: unquoted value containing ": "

```yaml
command: ["sh", "-c"]
args:
  - echo Status: ready        # no parse error, but becomes a map {"echo Status": "ready"}
env:
  - name: GREETING
    value: Hello: world       # error
```

A colon followed by a space starts a mapping. On `value:` that's a parse error; in the list item it silently turns the item into a map, which kubectl then rejects with a type error. Quote both:

```yaml
    value: "Hello: world"
args:
  - "echo Status: ready"
```

Same for image tags with digests in odd places, URLs with ports in plain lists, and Windows paths. When in doubt, quote strings.

## Cause 2: missing space after the colon on the previous line

```yaml
metadata:
  name:my-app            # parsed as the string "name:my-app"
  labels:                # error reported here
    app: my-app
```

`name:my-app` without a space is a plain string, so `labels:` on the next line is "a mapping inside a scalar". Add the space: `name: my-app`.

## Cause 3: wrong indentation

```yaml
spec:
  containers:
  - name: web
    image: nginx:1.27
     ports:              # 5 spaces instead of 4
      - containerPort: 80
```

Every key at the same level must start in the same column. Use 2 spaces per level consistently. List items (`- `) can sit at the parent's indentation or be indented, but all items in a list must line up.

**Tabs are not allowed** for indentation in YAML. They produce `found character that cannot start any token`. Find them with:

```bash
grep -nP '\t' deployment.yaml
```

## Cause 4: a value on the same line as a nested block

```yaml
resources: limits:
  memory: 256Mi
```

A key can have either an inline value or a nested block, not both. Write:

```yaml
resources:
  limits:
    memory: 256Mi
```

## Cause 5: multi-line strings (scripts, ConfigMap data)

Shell scripts and config files embedded in a ConfigMap are full of colons. Use a block scalar so the content is taken literally:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  app.conf: |
    server:
      port: 8080
    log: level: debug
```

Everything indented under `|` is a single string. The content must be indented more than the key.

## Cause 6: Helm templates that render bad YAML

With Helm the error refers to the **rendered** output, so the line number won't match your template. Render and inspect it:

```bash
helm template myrelease ./chart -f values.yaml > out.yaml
helm lint ./chart
```

Typical culprits: `{{ .Values.x }}` producing an unquoted string with `: ` (use `{{ .Values.x | quote }}`), and `toYaml` blocks with the wrong `nindent`:

```yaml
        resources:
          {{- toYaml .Values.resources | nindent 10 }}
```

## Related parse errors

- `did not find expected key` — usually a list item or key indented inconsistently, or an unclosed quote/bracket.
- `found character that cannot start any token` — a tab, or a value starting with `` ` `` or `@`.
- `could not find expected ':'` — a line with a key but no colon, often in a broken multi-line string.

All are fixed the same way: check the reported line and the one above it for indentation, spacing and quoting.
