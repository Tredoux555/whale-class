#!/usr/bin/env python3
"""
Reliable GitHub push via REST API for Cowork VM.
Handles TLS flakiness with automatic retries.

Usage:
  GITHUB_PAT=xxx python3 scripts/push-to-github.py "commit message" repo/path local/path [repo/path2 local/path2 ...]

Example:
  GITHUB_PAT=xxx python3 scripts/push-to-github.py "fix: seed route" \
    "app/api/montree/community/seed/route.ts" "app/api/montree/community/seed/route.ts"
"""
import json, base64, sys, os, time, ssl
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

REPO = "Tredoux555/whale-class"
BASE = f"https://api.github.com/repos/{REPO}"
PAT = os.environ.get("GITHUB_PAT", "")
MAX_RETRIES = 5
RETRY_DELAY = 3

# Create SSL context that's more tolerant
ctx = ssl.create_default_context()

def api(method, path, data=None):
    url = f"{BASE}/{path}" if not path.startswith("http") else path
    body = json.dumps(data).encode() if data else None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            req = Request(url, data=body, method=method)
            req.add_header("Authorization", f"token {PAT}")
            req.add_header("Content-Type", "application/json")
            req.add_header("Accept", "application/vnd.github.v3+json")
            resp = urlopen(req, timeout=30, context=ctx)
            return json.loads(resp.read())
        except (URLError, ssl.SSLError, ConnectionError, OSError) as e:
            if attempt < MAX_RETRIES:
                print(f"  Retry {attempt}/{MAX_RETRIES} ({type(e).__name__})")
                time.sleep(RETRY_DELAY * attempt)
            else:
                raise
        except HTTPError as e:
            err_body = e.read().decode()
            print(f"API Error {e.code}: {err_body[:500]}")
            sys.exit(1)

def push_files(file_map, message):
    """file_map: dict of {repo_path: local_path}"""
    print(f"Pushing {len(file_map)} file(s)...")

    # 1. Get HEAD
    ref = api("GET", "git/ref/heads/main")
    head_sha = ref["object"]["sha"]
    print(f"  HEAD: {head_sha[:12]}")

    # 2. Get tree from HEAD
    commit = api("GET", f"git/commits/{head_sha}")
    base_tree = commit["tree"]["sha"]

    # 3. Create blobs
    tree_items = []
    for repo_path, local_path in file_map.items():
        with open(local_path, "rb") as f:
            content_b64 = base64.b64encode(f.read()).decode()
        blob = api("POST", "git/blobs", {"content": content_b64, "encoding": "base64"})
        print(f"  Blob: {repo_path} -> {blob['sha'][:12]}")
        tree_items.append({
            "path": repo_path,
            "mode": "100644",
            "type": "blob",
            "sha": blob["sha"]
        })

    # 4. Create tree
    new_tree = api("POST", "git/trees", {"base_tree": base_tree, "tree": tree_items})

    # 5. Create commit
    new_commit = api("POST", "git/commits", {
        "message": message,
        "tree": new_tree["sha"],
        "parents": [head_sha]
    })
    print(f"  Commit: {new_commit['sha'][:12]}")

    # 6. Update ref
    api("PATCH", "git/refs/heads/main", {"sha": new_commit["sha"]})
    print(f"  Pushed to main: {new_commit['sha']}")
    return new_commit["sha"]

if __name__ == "__main__":
    if not PAT:
        print("Error: Set GITHUB_PAT environment variable")
        sys.exit(1)
    if len(sys.argv) < 4 or len(sys.argv[2:]) % 2 != 0:
        print(__doc__)
        sys.exit(1)

    message = sys.argv[1]
    pairs = sys.argv[2:]
    file_map = {pairs[i]: pairs[i+1] for i in range(0, len(pairs), 2)}
    push_files(file_map, message)
