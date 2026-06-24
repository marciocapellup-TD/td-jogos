# AGENTS.md — td-jogos

Guia para agentes de código (Codex, Cursor e outros não-Claude).
Fonte de verdade detalhada: **`CLAUDE.md`** na raiz — leia-o primeiro.

## Setup

```bash
npm install
```

## Comandos

| Ação | Comando |
|------|---------|
| Dev | `npm run dev` |
| Build | `npm run build` |
| Preview | `npm run preview` |
| Lint | `npm run lint` |

## Stack

React 19 + Vite + Supabase. Deploy automático na Vercel via push em `main`.

## Convenções

- PT-BR em UI e documentação.
- SQL de schema versionado em `supabase/`.

## Não fazer

- Não commitar `.env`, tokens, nem `supabase/.temp/`.
