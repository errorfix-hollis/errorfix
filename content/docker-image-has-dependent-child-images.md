---
error: "Error response from daemon: conflict: unable to delete (cannot be forced) - image has dependent child images"
error_full: |
  Error response from daemon: conflict: unable to delete 4f2a1c8e9b3d (cannot be forced) - image has dependent child images
cat: docker
description: "Other local images were built on top of this image (it's a parent layer of them), so Docker refuses to delete it, even with -f. Remove the child images first, or remove by tag instead of by ID."
tldr: "Find the children with `docker images --filter since=<IMAGE_ID> -q` (or inspect `.Parent`), delete them first, then the parent. Usually simplest: `docker image prune -a` to remove all unused images, or `docker rmi repo:tag` to untag without deleting shared layers. Never delete files in /var/lib/docker by hand."
keywords: docker image has dependent child images unable to delete cannot be forced rmi conflict parent image prune dangling intermediate layers
related: [docker-conflict-unable-to-delete-image-is-being-used, docker-no-space-left-on-device, docker-container-name-already-in-use]
---
## What it means

Docker images are stacks of layers. When you build image B `FROM` image A locally (or with the classic builder, every intermediate build step), B references A as its *parent*. Deleting A would break B, so `docker rmi` refuses — and `-f` doesn't help, hence "cannot be forced".

You usually hit this when deleting by **image ID**, especially IDs of `<none>` images left over from builds.

## Fix 1: remove unused images with prune

If you just want to free space, let Docker work out the order:

```bash
docker image prune        # dangling (<none>) images only
docker image prune -a     # every image not used by a container
docker system prune -a    # also stopped containers, unused networks, build cache
```

Prune deletes children before parents automatically. It won't touch images used by existing containers (including stopped ones), so remove those containers first if needed: `docker container prune`.

## Fix 2: find and delete the child images

List images created after the parent; children are among them:

```bash
docker images --filter since=4f2a1c8e9b3d
```

To find exact children by parent ID (works for images built with the classic builder, which records `.Parent`):

```bash
for i in $(docker images -aq); do
  docker inspect --format '{{.Id}} {{.Parent}}' "$i"
done | grep 4f2a1c8e9b3d
```

Delete the children (by tag if they have one), then the parent:

```bash
docker rmi myapp:latest
docker rmi 4f2a1c8e9b3d
```

## Fix 3: delete by tag, not by ID

If an image ID has several tags, or is the base of another tagged image, removing a tag just untags it:

```bash
docker rmi node-base:old      # "Untagged: node-base:old"
```

The layers stay as long as something uses them, which is what you want. Listing with `docker images` shows which repository:tag pairs share an ID.

## Fix 4: intermediate images with docker images -a

`docker images -a` shows intermediate layers (`<none>:<none>`) from classic builds. These are *meant* to be children of each other and of your final image; you don't need to delete them one by one. They disappear when the final image is removed, or with `docker image prune`.

## Fix 5: remove everything (dev machines only)

```bash
docker rm -f $(docker ps -aq)          # all containers
docker rmi -f $(docker images -aq)     # all images; repeat if some fail on order
```

Run the `rmi` line a second time if the first pass hits ordering conflicts — children removed in the first pass free their parents.

## Don't

Don't delete directories under `/var/lib/docker` manually to get rid of an image. It corrupts Docker's metadata and causes errors like `layer does not exist`. Use `docker system prune` or, as a last resort on a dev box, Docker Desktop's "Clean / Purge data".
