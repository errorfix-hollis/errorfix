---
error: "RuntimeError: CUDA error: device-side assert triggered"
error_full: |
  RuntimeError: CUDA error: device-side assert triggered
  CUDA kernel errors might be asynchronously reported at some other API call, so the stacktrace below might be incorrect.
  For debugging consider passing CUDA_LAUNCH_BLOCKING=1.
  Compile with `TORCH_USE_CUDA_DSA` to enable device-side assertions.
cat: python
description: "A PyTorch CUDA kernel hit an assertion, almost always an index out of range: class labels outside [0, num_classes), token ids larger than the embedding size, or bad values passed to a loss function."
tldr: "Rerun with `CUDA_LAUNCH_BLOCKING=1 python train.py` (or run on CPU) to get the real line and message. Then check `labels.min()`, `labels.max()` vs your number of classes, token ids vs `nn.Embedding` size / `len(tokenizer)`, and that BCELoss inputs are in [0, 1]. Restart the Python process afterwards: the CUDA context is broken."
keywords: pytorch runtimeerror cuda error device-side assert triggered cuda_launch_blocking=1 index out of bounds cross entropy labels num_classes embedding resize_token_embeddings bceloss torch_use_cuda_dsa
related: [python-cuda-out-of-memory, python-indexerror-list-index-out-of-range, python-modulenotfounderror-no-module-named-torch]
---
## What it means

A check inside a GPU kernel failed. On the CPU the same bug would raise a clear error like `IndexError: Target 5 is out of bounds.`; on the GPU you only get this generic message. Because CUDA runs asynchronously, the traceback often points to a later, innocent line (`loss.item()`, `.to("cpu")`, `optimizer.step()`).

After this error the CUDA context is corrupted: every following CUDA call fails. In Jupyter you must **restart the kernel**.

## Step 1: get the real error

Make CUDA synchronous so the traceback points at the failing op:

```bash
CUDA_LAUNCH_BLOCKING=1 python train.py
```

In a notebook, set it before importing torch (first cell, then restart):

```python
import os
os.environ["CUDA_LAUNCH_BLOCKING"] = "1"
import torch
```

Even better: run one batch on the CPU (`device = "cpu"`). The CPU kernels raise readable errors such as `IndexError: index out of range in self` or `Target 10 is out of bounds`.

## Cause 1: labels outside the number of classes

`nn.CrossEntropyLoss` / `NLLLoss` need integer targets in `[0, C-1]`, where `C` is the size of the model's last layer.

```python
print(labels.min().item(), labels.max().item(), model_output.shape[-1])
```

Typical bugs:

- Labels are 1-based (`1..C`): subtract 1.
- Output layer too small: `nn.Linear(hidden, num_classes)` with the wrong `num_classes`.
- `-1` used for "ignore": pass `ignore_index=-1` (default ignore value is `-100`).

## Cause 2: token id larger than the embedding table

`nn.Embedding(num_embeddings, dim)` asserts when an index is `>= num_embeddings`. With Hugging Face this happens after adding tokens to the tokenizer without resizing the model:

```python
tokenizer.add_special_tokens({"pad_token": "[PAD]"})
model.resize_token_embeddings(len(tokenizer))
```

Also check that the tokenizer and model come from the same checkpoint, and that inputs don't exceed `max_position_embeddings` (truncate with `truncation=True, max_length=...`).

## Cause 3: invalid values for the loss

`nn.BCELoss` requires predictions and targets in `[0, 1]`. Raw logits or NaN break it.

```python
loss_fn = nn.BCEWithLogitsLoss()   # apply to raw logits, no sigmoid needed
```

Check for NaN with `torch.isnan(x).any()`.

## Cause 4: indexing a tensor on the GPU

Any `tensor[idx]`, `torch.gather`, `index_select` or `scatter` with an out-of-range index triggers it. Validate indices:

```python
assert idx.max() < t.size(0) and idx.min() >= -t.size(0)
```

## After the fix

Restart the process or notebook kernel, remove `CUDA_LAUNCH_BLOCKING=1` (it slows training), and run again. If you then hit `CUDA out of memory`, see the related page.
