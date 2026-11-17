---
error: "Error response from daemon: conflict: unable to delete image - image is being used by stopped container"
error_full: |
  Error response from daemon: conflict: unable to delete 3f57d9401f8d (must be forced) - image is being used by stopped container 9b1e1c7a2d3f
  Error response from daemon: conflict: unable to delete 3f57d9401f8d (cannot be forced) - image is being used by running container 4c2a8e0b7d11
  Error response from daemon: conflict: unable to delete 3f57d9401f8d (must be forced) - image is referenced in multiple repositories
cat: docker
description: "Docker won't remove an image that a container (running or stopped) still uses, or that has several tags pointing to it. Remove the containers first, untag the image, or force it."
tldr: "Find the containers with `docker ps -a --filter ancestor=IMAGE`, remove them (`docker rm -f CONTAINER`), then `docker rmi IMAGE`. For 'referenced in multiple repositories', delete by tag (`docker rmi repo:tag`) or use `docker rmi -f IMAGE_ID`. To clean everything unused: `docker container prune` then `docker image prune -a`."
keywords: docker conflict unable to delete image is being used by stopped container running container must be forced cannot be forced referenced in multiple repositories rmi prune
related: [docker-container-name-already-in-use, docker-no-space-left-on-device, docker-network-has-active-endpoints]
---
## What it means

Every container - including stopped ones you may have forgotten about - keeps a reference to the image it was created from. `docker rmi` refuses to delete an image that's still referenced. There are three variants:

- **used by stopped container ... (must be forced)**: an exited container uses it. `-f` would work, but removing the container is cleaner.
- **used by running container ... (cannot be forced)**: you must stop/remove the container first; even `-f` won't work.
- **referenced in multiple repositories (must be forced)**: the same image ID has several tags (e.g. `myapp:latest` and `registry.example.com/myapp:1.2`).

## Fix 1: remove the containers using the image

```bash
docker ps -a --filter ancestor=myapp:latest
docker rm -f 9b1e1c7a2d3f            # container ID from the error message
docker rmi myapp:latest
```

To remove every container created from that image in one go:

```bash
docker rm -f $(docker ps -aq --filter ancestor=myapp:latest)
```

With Compose, the simplest way is to remove the project's containers and images together:

```bash
docker compose down --rmi local     # or --rmi all to also remove pulled images
```

## Fix 2: the image has several tags

List tags sharing the ID:

```bash
docker images | grep 3f57d9401f8d
```

Removing a *tag* (`docker rmi repo:tag`) just untags it; the image itself is deleted when the last tag goes. Remove each tag, or force by ID:

```bash
docker rmi myapp:latest registry.example.com/myapp:1.2
# or
docker rmi -f 3f57d9401f8d
```

## Fix 3: clean up in bulk

```bash
docker container prune        # remove all stopped containers
docker image prune            # remove dangling (<none>) images
docker image prune -a         # remove every image not used by any container
docker system df              # see what's using space
```

`docker system prune -a` does all of the above plus unused networks and build cache. Add `--volumes` only if you also want unused volumes (data!) gone.

## "image has dependent child images"

A different conflict: `conflict: unable to delete ... (cannot be forced) - image has dependent child images`. Another image was built `FROM` this one (or shares its layers as a parent in the legacy builder). Delete the child images first; find them with:

```bash
docker images --filter since=3f57d9401f8d
```

## Why `-f` is not always the answer

`docker rmi -f` on an image used by a stopped container only removes the tag; the layers stay on disk as an untagged `<none>` image until the container is gone. So for freeing space, remove the containers - `docker container prune` - and then the images.
