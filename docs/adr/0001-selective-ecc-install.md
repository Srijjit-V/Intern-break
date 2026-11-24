# 0001. Selective ECC install, no hooks

Status: accepted, 2026-11-24

## Context
We want ECC (affaan-m/ECC, MIT) skills, agents and rules as a working method. Its installer selects whole modules: a narrow `--skills` request still plans 715 file operations (Angular, Rust, Swift rules and unrelated skills). Its `claude` target writes to `~/.claude`, shared by every project.

## Decision
- Clone shallow into a separate folder, pin commit `4adeee6`, read the installer and manifests first.
- Copy only the 19 requested skills, 13 agents and the common, typescript, react and web rules into this repo's `.claude/`, as plain reviewed files. No hooks, no install scripts, nothing in `~/.claude`.
- Trim always-loaded rules from 74 KB to 42 KB: dropped hook rules (hooks are off), agent-orchestration and code-review rules (covered by agents and skills), and react patterns and testing rules (covered by the frontend-patterns and react-testing skills).
- Scanned `.claude/` with AgentShield 1.6.0 (basic mode): 0 critical, 0 high, 5 medium (agent files over 5000 characters, a size heuristic).

## Consequences
- `ecc doctor` and the installer's `install-state.json` do not exist, because the installer was not used. Updates are manual: re-copy from a newer pinned commit.
- ECC text is treated as data. Skills are read before use.
