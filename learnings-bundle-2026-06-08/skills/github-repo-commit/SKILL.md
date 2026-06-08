---
name: github-repo-commit
id: cmq4skayh0qqm06ade1x6xv6m
source: Hyperagent knowledge base
exported: 2026-06-08
platform_builtin: false
pinned: false
tags: []
credentials: [GITHUB_TOKEN]
---

# github-repo-commit

> Commit one or more local files or directories to a GitHub repository in a single atomic commit via the GitHub Git Data API. Works over the sandbox HTTPS proxy. Use to land generated artifacts (configs, bundles, docs) into a repo without a native GitHub integration.

## When to use
(not specified)

## Documentation
# github-repo-commit

Commits local files/directories to a GitHub repo in one atomic commit using the Git Data API
(blobs → tree → commit → update ref). Runs fine through the sandbox HTTPS proxy because it uses
`requests`.

## Credential
- `GITHUB_TOKEN` — PAT with Contents: read & write on the target repo. Injected as an env var.

## Usage
```
python3 gh_commit.py \
  --owner skybrookai-atlas \
  --repo quickscreen-colorbond-bom-generator \
  --branch main \
  --message "Add Build Forge portable bundle v0.1.0" \
  --dir /agent/workspace/build-forge:anyfence-build-pack/build-forge
```

Flags:
- `--dir LOCAL_DIR:REPO_PREFIX` — upload every file under LOCAL_DIR to REPO_PREFIX (repeatable)
- `--add LOCAL_FILE:REPO_PATH` — upload a single file (repeatable)
- `--branch` defaults to `main`; the branch is created off the repo default if it doesn't exist
- All `--dir`/`--add` entries land in a SINGLE commit

## Behaviour
- Adds/updates only the listed files; never deletes anything else.
- Prints each staged file and the final commit URL.
- For a PR-style flow, pass a feature `--branch`, then open the PR in the GitHub UI.

## Run it
Use RunWithCredentials so GITHUB_TOKEN is injected:
```
RunWithCredentials(skillName="github-repo-commit",
  command="python3 gh_commit.py --owner ... --repo ... --message ... --dir ...")
```

## Scripts
- gh_commit.py
