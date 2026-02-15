# Handoff: Git SSL Fix & Clean Repo Setup — Feb 15, 2026 (Late Session)

## Summary

Diagnosed and fixed the persistent git push/pull SSL failures that have been plaguing the project for days. Root cause: **Astrill VPN (TCP protocol)** intercepting TLS handshakes to github.com:443.

Also created a clean `montree` repo on GitHub as a fresh alternative to the bloated `whale-class` repo (600MB+ .git directory).

## Root Cause: Astrill VPN

**Symptoms:** Every tool (curl, wget, git, gh CLI, GitHub Desktop, Python requests) failed with SSL/TLS errors when connecting to github.com:443. Small payloads sometimes squeezed through; larger transfers always died.

**Diagnosis path:**
1. TCP connection to github.com:443 **succeeded** (port open, SYN-ACK received)
2. TLS Client Hello sent, **no Server Hello returned** (handshake hung/timed out)
3. DNS server was `198.19.255.254` — Astrill VPN's local DNS proxy
4. `ps aux` showed Astrill VPN tunnel process active
5. Astrill listed as a network service in `networksetup -listallnetworkservices`
6. Multiple `utun` interfaces active (VPN tunnels)

**Root cause:** Astrill VPN on **TCP protocol** causes "TCP-over-TCP meltdown" — git's HTTPS (TCP) wrapped inside Astrill's TCP tunnel. Packet loss triggers competing retransmission cascades from both TCP layers, killing larger transfers. Small requests occasionally completed during lucky windows.

**Fix:** Turn off Astrill VPN before git operations, turn it back on after.

**Alternative fixes (not yet tested):**
- Switch Astrill to UDP protocol (avoids TCP-over-TCP)
- Add github.com to Astrill's split tunneling bypass list
- Switch Astrill VPN protocol (e.g., WireGuard vs OpenVPN)

## Git Workflow Going Forward

```
1. Open Astrill → Disconnect (or switch to UDP)
2. Do git push/pull/fetch (GitHub Desktop or terminal)
3. Reconnect Astrill
```

## Clean Repo: `montree`

**Created:** `github.com/Tredoux555/montree` (private)
- Clean copy of codebase at `/Users/tredouxwillemse/Desktop/ACTIVE/montree/`
- 68MB working tree (vs 600MB+ whale-class .git)
- Commit `87f0321` ("Initial commit: Montree platform (clean repo)") — confirmed on GitHub via `git ls-remote`
- Bulletproof `.gitignore` (blocks node_modules, .next, media, audio, videos, env files, large binaries)

**GitHub PATs (montree repo):**
- `cowork-push-feb15` — active, expires Mar 17 2026 (Contents read/write)
- Fine-grained PAT: `github_pat_11BVO4B2Q0WHml4HFuHVHW_...` (montree repo only)

**SSH config:** `~/.ssh/config` has GitHub entry using `~/.ssh/id_ed25519_github`

## whale-class Status

- **Pushed successfully** via GitHub Desktop (22 changed files, commit "deploy: latest changes")
- Required Astrill VPN off to push
- 26 stashed changes discarded (stale Opus-generated reports)
- Still the active Railway deployment repo
- Current HEAD: latest commit with all Montree Home phases

## Previous Git Config Changes (from debugging)

These were set during troubleshooting and should be cleaned up:
```
git config --global http.sslverify=false     # ← should be removed (set true)
git config --global http.version=HTTP/1.1    # ← can be removed
git config --global http.timeout=300         # ← can be removed
git config --global http.lowspeedlimit=0     # ← can be removed
git config --global http.lowspeedtime=0      # ← can be removed
```

To clean up:
```bash
git config --global http.sslverify true
git config --global --unset http.version
git config --global --unset http.timeout
git config --global --unset http.lowspeedlimit
git config --global --unset http.lowspeedtime
```

## Remaining Tasks

- **Switch Railway** from whale-class to montree repo (when ready — not urgent, whale-class works fine)
- **Test UDP protocol** in Astrill to see if git works with VPN on
- **Clean up old Mac repos:** `whale-clean/`, `whale-old/`, `whale-class-mirror.git/`, `~/Desktop/whale-backup-feb15/`
- **Clean up stale GitHub SSH keys:** "Cowork VM" (Feb 11) — can delete
- **Archive whale-class** repo (make read-only) after montree is proven stable
