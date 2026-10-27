---
error: "torch.cuda.OutOfMemoryError: CUDA out of memory"
error_full: |
  torch.cuda.OutOfMemoryError: CUDA out of memory. Tried to allocate 512.00 MiB. GPU 0 has a total capacity of 7.79 GiB of which 301.00 MiB is free. Including non-PyTorch memory, this process has 7.47 GiB memory in use.
cat: python
description: Your model, batch or tensors don't fit in GPU memory. Reduce batch size, use mixed precision, free unused tensors, or check another process isn't using the GPU.
tldr: "Lower the batch size first. Then: use mixed precision (`torch.autocast`), wrap inference in `torch.no_grad()`, and check `nvidia-smi` for other processes holding GPU memory."
keywords: cuda out of memory pytorch torch.cuda.outofmemoryerror tried to allocate batch size gpu memory nvidia-smi empty_cache
related: [python-modulenotfounderror-no-module-named]
---
## What it means

PyTorch asked the GPU for more memory than is free. GPU memory holds the model weights, the activations of the current batch (which grow with batch size and sequence length), gradients, and optimizer state.

## Step 1: is something else using the GPU?

```bash
nvidia-smi
```

Another training run, a Jupyter kernel you forgot, or a crashed process can hold memory. Restart that kernel or kill the process.

## Step 2: reduce memory use

**Smaller batches** (the biggest lever). Keep the effective batch size with gradient accumulation:

```python
accum = 4
for i, (x, y) in enumerate(loader):
    loss = model(x, y) / accum
    loss.backward()
    if (i + 1) % accum == 0:
        optimizer.step(); optimizer.zero_grad()
```

**Mixed precision** roughly halves activation memory:

```python
with torch.autocast(device_type="cuda", dtype=torch.bfloat16):
    loss = model(x, y)
```

**No gradients during evaluation/inference:**

```python
model.eval()
with torch.no_grad():   # or torch.inference_mode()
    preds = model(x)
```

**Don't keep the graph alive.** Accumulate `loss.item()`, not `loss`:

```python
total_loss += loss.item()
```

**Shorter sequences / smaller images**, gradient checkpointing (`model.gradient_checkpointing_enable()` in Hugging Face), or loading large models in 8/4-bit.

## Step 3: fragmentation

If the message shows lots of memory "reserved but unallocated", try:

```bash
export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True
```

`torch.cuda.empty_cache()` only returns cached memory to the driver (useful so *other* processes can use it); it doesn't make room for more tensors in your own process.

## In Jupyter

Variables from earlier cells keep tensors alive. `del model, optimizer`, then `gc.collect()` and `torch.cuda.empty_cache()`, or restart the kernel.
