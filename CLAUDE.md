# CLAUDE.md

## 🔧 Project Type
Premium multi-agent memory-enhanced AI assistant, intended for personal use and future SaaS conversion.

## 🧠 System Architecture

- Modular routing agent that delegates user input to sub-agents
- Each sub-agent is domain-specialized, configurable, and persistent
- Memory is split into:
  - Short-term logs (per session)
  - Long-term memory (Supabase + Claude `/prompt`)
- Core MCPs:
  - `ken-you-remember` (contextual memory engine)
  - `ken-you-think` (deep reasoning and chain-of-thought)
  - `snap-happy` (UI snapshot debugging)

## 🧩 Sub-Agent Model

Each agent has:
- Its own handler file (e.g., `agent-research.ts`)
- Config: `{ name, tone, goal, memoryScope, tools }`
- Access to Claude memory + parallel reasoning
- Logs all input/output to Supabase

## ⚙️ Key Commands

Use the following Claude Code commands throughout:
- `/init` – scaffold app shell with CI, tests, and hooks
- `/api` – create secure agent and memory API endpoints
- `/prompt` – store and recall context for long sessions
- `/new-feature` – add frontend components, agents, voice
- `/refactor` – update sub-agents safely with memory intact
- `/monitor` – detect memory, latency, or security issues
- `/deploy` – build and launch smoothly

## 🖥️ Frontend Requirements

- Responsive dashboard UI (Next.js + Tailwind or Claude code)
- Sidebar: agent selector
- Main chat panel with typing + voice input
- Voice button hooks into ElevenLabs
- Smooth animations and transitions
- Dark/light mode toggle
- Fully branded UX: minimalist, premium SaaS style

## 🔐 Security + Hooks

Auto-enabled:
- `bam.sh` – auto-fix formatting
- `make_sure.sh` – scan for secrets + vulnerabilities
- `context_warning.sh` – alert when memory overflows

## 📦 Storage

- Supabase database
  - `logs`: input/output per agent
  - `memory`: persistent summaries
  - `user`: (optional) tone, agent usage, feedback

## ✅ Claude Rules

- Stick to this framework for *all* new features
- Do not override agent structure unless explicitly instructed
- Avoid hallucinations — use memory or logs for persistent state
- Every new feature must support:
  - Clean modularity
  - Long-term memory
  - Scalable agent expansion