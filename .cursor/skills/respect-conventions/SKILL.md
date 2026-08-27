---
name: respect-conventions
description: >-
  Enforces reading existing patterns and Cursor rules before implementing.
  Use when starting a feature, refactoring, choosing libraries, changing API
  contracts, or when tempted to introduce a new pattern or dependency.
---

# Respect conventions

Before implementing:

1. Read `.cursor/rules/00-philosophy.mdc` and `01-agent-discipline.mdc`.
2. Open the nearest existing module in the same package and match its shape.
3. If the work touches HTTP/RPC, open `packages/contract` first.
4. If no convention exists, propose the smallest rule-compatible approach — do not import a new framework.

Refuse drive-by rewrites. Prefer incremental improvement that preserves architecture.
