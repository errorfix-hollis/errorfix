---
error: "ssh: connect to host port 22: Connection timed out"
error_full: |
  ssh: connect to host 203.0.113.10 port 22: Connection timed out
cat: ssh
description: Your SSH packets never got an answer. A firewall (cloud security group, ufw, corporate network) is dropping port 22, the server is down or has a different IP, or SSH listens on another port.
tldr: "Check the server is up and the IP is right, then open port 22 in the cloud firewall/security group and the server firewall (`sudo ufw allow OpenSSH`). If SSH runs on another port, use `ssh -p 2222 user@host`."
keywords: ssh connect to host port 22 connection timed out operation timed out aws security group ufw firewall port 22 blocked ec2 digitalocean
related: [ssh-permission-denied-publickey, ssh-remote-host-identification-has-changed]
---
## Timed out vs refused

- **Connection timed out**: nothing answered. Usually a firewall silently dropping packets, wrong IP, or the machine is off.
- **Connection refused**: the host answered "nothing listens on that port" — SSH isn't running or uses another port.

## Step 1: is the host reachable at all?

```bash
ping -c 3 203.0.113.10          # may be blocked, not conclusive
nc -vz -w 5 203.0.113.10 22     # tests the SSH port specifically
```

Check in your cloud console that the instance is running and the **public** IP hasn't changed (AWS public IPs change on stop/start unless you use an Elastic IP).

## Step 2: cloud firewall

- **AWS EC2**: the instance's Security Group needs an inbound rule TCP 22 from your IP. Also check Network ACLs and that the subnet has a route to an Internet Gateway.
- **GCP**: VPC firewall rule allowing `tcp:22` (default `default-allow-ssh`).
- **Azure**: Network Security Group inbound rule for 22.
- **DigitalOcean/Hetzner/Linode**: Cloud Firewall attached to the droplet/server.

## Step 3: firewall on the server

If you can get a console (cloud web console / VNC):

```bash
sudo ufw status
sudo ufw allow OpenSSH
sudo systemctl status ssh       # or sshd
```

Also check `firewalld` (`sudo firewall-cmd --list-all`) and `iptables -L`.

## Step 4: SSH on a non-standard port

```bash
ssh -p 2222 user@host
```

Or in `~/.ssh/config`:

```
Host myserver
    HostName 203.0.113.10
    Port 2222
    User ubuntu
```

## Step 5: your network blocks outgoing port 22

Corporate, school and hotel Wi-Fi often block it. Test from another network (phone hotspot). For GitHub specifically, SSH over port 443 works: `ssh -T -p 443 git@ssh.github.com`.

## Other causes

- `fail2ban` banned your IP after failed logins: unban from the console (`sudo fail2ban-client set sshd unbanip <ip>`).
- IPv6 vs IPv4: force IPv4 with `ssh -4`.
