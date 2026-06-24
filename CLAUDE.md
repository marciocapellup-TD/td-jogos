# CLAUDE.md — td-jogos

Instruções para o Claude Code ao trabalhar neste repositório.

## Contexto

App de gamificação do desafio interno de bem-estar da equipe Tributo Devido.
Cada etapa tem pilares com metas; a equipe registra progresso e vê rankings.

## Stack

- **Frontend:** React 19 + Vite + React Router + Recharts
- **Dados:** Supabase (Postgres + Auth + RLS), ref `lzlnnspoepidhbsyclmk`
- **Deploy:** Vercel, automático no push para `main`

## Comandos principais

```bash
npm install
npm run dev       # Vite dev server
npm run build     # build de produção
npm run preview   # serve o build
npm run lint      # ESLint
```

## Supabase

- SQLs versionados em `supabase/` (`schema.sql`, `policies.sql`, `seed.sql`) — rodar nessa ordem no SQL Editor.
- O MCP Supabase **não alcança** este projeto; o token de service role fica em `C:/tmp/.sb-token` (fora do repo).
- Variáveis: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Convenções

- Idioma: PT-BR em UI, mensagens e documentação.
- Mudanças de schema entram como arquivo `.sql` em `supabase/`, não só aplicadas direto no painel.

## O que NÃO fazer

- Não commitar `.env`, tokens ou a pasta `supabase/.temp/`.
- Não aplicar migrations de schema só no painel sem versionar o SQL.

## Ponteiros

- Memória `project_td_jogos` (etapa ativa, pilares, prêmio).
