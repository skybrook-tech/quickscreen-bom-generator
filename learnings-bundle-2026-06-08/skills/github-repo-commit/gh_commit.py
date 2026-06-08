#!/usr/bin/env python3
"""
github-repo-commit — commit one or more local files/directories to a GitHub repo
in a single atomic commit, via the GitHub Git Data API (works over HTTPS_PROXY).

Auth: reads a Personal Access Token from env var GITHUB_TOKEN (injected by the
skill credential system). Token needs Contents: read & write on the target repo.

Usage:
  python3 gh_commit.py \
      --owner skybrookai-atlas \
      --repo quickscreen-colorbond-bom-generator \
      --branch main \
      --message "Add Build Forge portable bundle v0.1.0" \
      --dir /agent/workspace/build-forge:anyfence-build-pack/build-forge \
      --add /agent/workspace/notes.md:docs/notes.md

  # --dir  LOCAL_DIR:REPO_PREFIX   (uploads every file under LOCAL_DIR)
  # --add  LOCAL_FILE:REPO_PATH    (uploads a single file)
  # Repeat --dir / --add as many times as needed; all land in ONE commit.

Behaviour:
  - Creates the branch if it doesn't exist (branched off the repo default branch).
  - Adds/updates files; does not delete anything not listed.
  - Prints the resulting commit URL on success.
"""
import argparse
import base64
import json
import os
import sys
import urllib.parse

import requests

API = "https://api.github.com"


def gh(session, method, path, **kw):
    url = path if path.startswith("http") else f"{API}{path}"
    r = session.request(method, url, **kw)
    if r.status_code >= 300:
        sys.stderr.write(f"\nGitHub API {method} {url} -> {r.status_code}\n{r.text}\n")
        r.raise_for_status()
    return r.json() if r.text else {}


def collect_files(specs_dir, specs_add):
    """Return list of (repo_path, local_path)."""
    out = []
    for spec in specs_dir or []:
        local_dir, _, prefix = spec.partition(":")
        prefix = prefix.strip("/")
        if not os.path.isdir(local_dir):
            sys.exit(f"--dir local path is not a directory: {local_dir}")
        for root, _, files in os.walk(local_dir):
            for f in files:
                lp = os.path.join(root, f)
                rel = os.path.relpath(lp, local_dir).replace(os.sep, "/")
                rp = f"{prefix}/{rel}" if prefix else rel
                out.append((rp, lp))
    for spec in specs_add or []:
        local_file, _, rp = spec.partition(":")
        rp = (rp or os.path.basename(local_file)).strip("/")
        if not os.path.isfile(local_file):
            sys.exit(f"--add local path is not a file: {local_file}")
        out.append((rp, local_file))
    if not out:
        sys.exit("Nothing to commit: pass at least one --dir or --add.")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--owner", required=True)
    ap.add_argument("--repo", required=True)
    ap.add_argument("--branch", default="main")
    ap.add_argument("--message", required=True)
    ap.add_argument("--dir", action="append", help="LOCAL_DIR:REPO_PREFIX")
    ap.add_argument("--add", action="append", help="LOCAL_FILE:REPO_PATH")
    args = ap.parse_args()

    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        sys.exit("GITHUB_TOKEN not set. Configure the skill credential first.")

    s = requests.Session()
    s.headers.update({
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "anyfence-build-forge",
    })

    base = f"/repos/{args.owner}/{args.repo}"
    repo = gh(s, "GET", base)
    default_branch = repo.get("default_branch", "main")

    # Resolve the branch ref; create it off default if missing.
    ref_path = f"{base}/git/refs/heads/{urllib.parse.quote(args.branch)}"
    try:
        ref = gh(s, "GET", ref_path)
        base_sha = ref["object"]["sha"]
    except requests.HTTPError:
        dref = gh(s, "GET", f"{base}/git/refs/heads/{urllib.parse.quote(default_branch)}")
        base_sha = dref["object"]["sha"]
        gh(s, "POST", f"{base}/git/refs",
           json={"ref": f"refs/heads/{args.branch}", "sha": base_sha})
        print(f"Created branch '{args.branch}' off '{default_branch}'.")

    base_commit = gh(s, "GET", f"{base}/git/commits/{base_sha}")
    base_tree = base_commit["tree"]["sha"]

    files = collect_files(args.dir, args.add)
    tree_entries = []
    for repo_path, local_path in files:
        with open(local_path, "rb") as fh:
            content = fh.read()
        blob = gh(s, "POST", f"{base}/git/blobs",
                  json={"content": base64.b64encode(content).decode(),
                        "encoding": "base64"})
        tree_entries.append({"path": repo_path, "mode": "100644",
                             "type": "blob", "sha": blob["sha"]})
        print(f"  staged {repo_path} ({len(content)} bytes)")

    new_tree = gh(s, "POST", f"{base}/git/trees",
                  json={"base_tree": base_tree, "tree": tree_entries})
    new_commit = gh(s, "POST", f"{base}/git/commits",
                    json={"message": args.message,
                          "tree": new_tree["sha"],
                          "parents": [base_sha]})
    gh(s, "PATCH", ref_path, json={"sha": new_commit["sha"], "force": False})

    print(f"\nCommitted {len(files)} file(s) to {args.owner}/{args.repo}@{args.branch}")
    print(f"Commit: {new_commit.get('html_url', new_commit['sha'])}")


if __name__ == "__main__":
    main()
