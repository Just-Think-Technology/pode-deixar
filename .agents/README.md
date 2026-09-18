# .agents — Project agent configuration

This directory centralizes opencode/agent references for the Pode Deixar project.
`docs/` is kept for historical human docs; agents read only from `.agents`.

## Structure

```
.agents/
├── settings.json        # opencode config (mirrored as ./opencode.json)
├── README.md
├── rules/               # Conventions (architecture, clean-code, comments, task-checklists)
├── decisions/           # Product decisions (ownership, order-photos, payments, database)
├── security/            # Security policies (pci, rate-limiting, csp, ci, backups, encryption)
├── deploy.md            # Deploy guide (compose + Caddy)
├── plans/               # Task plans
├── agents/              # Custom agent definitions (.md with frontmatter)
├── commands/            # Custom slash commands (.md)
└── skills/              # Custom skills (each in <name>/SKILL.md)
```

- `settings.json` / `opencode.json` declare `instructions` (AGENTS.md + .agents/rules/*) and `references` (.agents/backend/frontend).
- `rules/` mirrors former `docs/` for agent consumption; edit `.agents/` as source of truth for agents.
- Add agents as `.agents/agents/<name>.md`, skills as `.agents/skills/<name>/SKILL.md`.
- After editing, restart opencode.
