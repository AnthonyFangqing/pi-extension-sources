# pi-extension-sources

Adds loaded extension locations to the pi system prompt so the agent knows where to find source code.

## Install

```bash
pi install git:github.com/yourusername/pi-packages
```

Or for local development:
```bash
cd ~/pi-packages
pi install .
```

## What it does

Adds to the system prompt:

```
Here are the loaded extensions for the pi coding agent harness:

**Global extensions** (from ~/.pi/agent/extensions):
  - extension-sources-index: ~/.pi/agent/extensions/extension-sources-index.ts
```

## Extension Discovery

The extension discovers and lists:
- **Project extensions** from `.pi/extensions/`
- **Global extensions** from `~/.pi/agent/extensions/`
- **Package extensions** from installed pi packages

Handles both:
- Top-level `.ts` files: `extensions/foo.ts` → name: `foo`
- Subdirectories: `extensions/foo/index.ts` → name: `foo`
