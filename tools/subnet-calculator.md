---
name: "Subnet / CIDR calculator"
title: "Subnet Calculator (CIDR) — network, broadcast, netmask, host range, IPv4 & IPv6"
h1: "Subnet and CIDR calculator"
description: "Free IPv4 and IPv6 subnet calculator: get the network and broadcast address, netmask, wildcard mask, first and last host and host count for any CIDR, check whether an IP is in a subnet, find overlapping ranges and split a network into subnets."
intro: "Enter an address with a prefix (192.168.1.10/24), a netmask (10.0.0.5 255.255.255.0) or an IPv6 prefix. Then check whether an address is in the range, test two ranges for overlap, or split the network into smaller subnets."
order: 19
js: subnet
keywords: "subnet calculator cidr calculator ip subnet calculator netmask calculator ipv4 ipv6 subnet wildcard mask broadcast address host range cidr to ip range is ip in subnet"
related: [docker-network-has-active-endpoints, k8s-unable-to-connect-to-the-server-dial-tcp-i-o-timeout, web-err-connection-timed-out, linux-temporary-failure-in-name-resolution]
---
## CIDR cheat sheet

| Prefix | Netmask | Addresses | Usable hosts | Typical use |
|---|---|---|---|---|
| /32 | 255.255.255.255 | 1 | 1 | a single host (firewall rules, security groups) |
| /31 | 255.255.255.254 | 2 | 2 | point-to-point links (RFC 3021) |
| /30 | 255.255.255.252 | 4 | 2 | old-style point-to-point links |
| /28 | 255.255.255.240 | 16 | 14 | small DMZ; AWS subnets lose 5 addresses |
| /24 | 255.255.255.0 | 256 | 254 | a typical LAN |
| /22 | 255.255.252.0 | 1,024 | 1,022 | office or VPC subnet |
| /16 | 255.255.0.0 | 65,536 | 65,534 | Docker's default bridge (172.17.0.0/16), a VPC |
| /8 | 255.0.0.0 | 16,777,216 | 16,777,214 | 10.0.0.0/8 private range |

Usable hosts = 2<sup>32 − prefix</sup> − 2, because the first address names the network and the last one is the broadcast address.

## Private ranges and conflicts

RFC 1918 reserves `10.0.0.0/8`, `172.16.0.0/12` and `192.168.0.0/16` for private networks, and `100.64.0.0/10` is used for carrier-grade NAT (and by Tailscale). Many "it times out" problems come from **overlapping ranges**. Docker creates bridge networks in `172.17–172.31.x.x` and `192.168.x.x`, Kubernetes pod and service CIDRs often use `10.x`, and if one of them overlaps your LAN or VPN, traffic to those hosts goes into the container network instead. The symptoms look like [dial tcp: i/o timeout](/kubernetes/k8s-unable-to-connect-to-the-server-dial-tcp-i-o-timeout/), [ERR_CONNECTION_TIMED_OUT](/web/web-err-connection-timed-out/) or DNS failures inside containers ([Temporary failure in name resolution](/linux/linux-temporary-failure-in-name-resolution/)). Paste one range above and the other into the check box to test for overlap. Then move Docker with `default-address-pools` in `/etc/docker/daemon.json`, or create the network with an explicit `--subnet`.

## IPv6 notes

IPv6 subnets for LANs are almost always **/64**. `::` stands for the single longest run of zero groups, and leading zeros in each group can be dropped (RFC 5952): `2001:0db8:0000:0000:0000:ff00:0042:8329` is `2001:db8::ff00:42:8329`. `fe80::/10` addresses are link-local and need a zone (`%eth0`) to be usable, and `fc00::/7` is the private (ULA) range.
