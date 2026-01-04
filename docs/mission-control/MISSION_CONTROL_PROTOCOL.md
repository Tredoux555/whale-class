# Whale Mission Control Protocol

## What This Is

Mandatory system for Claude to update at the END of every Whale conversation. Ensures continuity and smart planning.

---

## Files To Update Every Session

### 1. `docs/mission-control/SESSION_LOG.md`

**Append a new entry:**
```markdown
## YYYY-MM-DD - Session Title

### Done
- Bullet points of completed work

### In Progress  
- What's actively being worked on

### Blocked/Waiting
- Things waiting on external factors

### Next Actions
- Specific next steps

### Files Changed
- Key files created/modified
```

### 2. `docs/mission-control/mission-control.json`

**Always update:**
- `meta.lastUpdated` → today's date
- `dailyLog` → add entry for today's work
- `goals` → update progress
- `actionQueue` → add/complete tasks

---

## When To Update

At natural conversation end:
- User says "that's it", "write a handoff", "let's stop"
- Task complete and user seems done
- Before suggesting new chat

---

## The Goal

Any Claude instance should be able to:
1. Read `mission-control.json`
2. Read recent `SESSION_LOG.md` entries
3. Understand exactly where things stand
4. Continue work without asking "what were we doing?"

---

*Created: 2026-01-04*
