# TD Jogos

App de gamificação do desafio interno Tributo Devido (20/04–10/05/2026).
Stack: React 19 + Vite 8 + Supabase + Vercel.

## Setup — passos manuais (fazer 1 vez)

### 1. Projeto Supabase

1. https://supabase.com/dashboard → **New project**, nome `td-jogos`, região `South America (São Paulo)`, salvar a **senha do banco**.
2. Espera provisionar (~2min).
3. **Project Settings → API** → copiar:
   - `Project URL` → vai em `VITE_SUPABASE_URL`
   - `anon public` → vai em `VITE_SUPABASE_ANON_KEY`

### 2. Rodar SQLs (no SQL Editor do Supabase, nessa ordem)

1. Cole o conteúdo de `supabase/schema.sql` e `Run`.
2. Cole `supabase/policies.sql` e `Run`.
3. Cole `supabase/seed.sql` e `Run`.

### 3. Storage bucket

Supabase Dashboard → **Storage → New bucket**:
- Nome: `postagens`
- **Public bucket**: ✅ SIM (facilita exibir as imagens)
- Create

Depois, no SQL Editor, rodar de novo a parte de `storage.objects` que está no fim de `policies.sql` (caso não tenha rodado).

### 4. Google OAuth

1. Supabase Dashboard → **Authentication → Providers → Google** → Enable.
2. Configurar no Google Cloud Console ([console.cloud.google.com](https://console.cloud.google.com)):
   - Criar OAuth 2.0 Client ID (tipo Web).
   - **Authorized redirect URIs**: colar o URL que aparece no painel do Supabase (algo tipo `https://<projeto>.supabase.co/auth/v1/callback`).
   - Copiar `Client ID` e `Client Secret` → colar no Supabase.
3. Em **Authentication → URL Configuration**: adicionar `http://localhost:5173` e depois a URL Vercel em **Redirect URLs**.

### 5. `.env.local`

Criar arquivo `.env.local` na raiz:
```
VITE_SUPABASE_URL=https://SEUPROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

### 6. Rodar local

```bash
npm install
npm run dev
```

Abrir http://localhost:5173 → logar com `marcio.capellup@tributodevido.com.br`.

## Deploy Vercel

```bash
npm install -g vercel
vercel login
vercel         # primeira vez: aceita defaults, escolhe "No" pra link
vercel --prod  # deploy de produção
```

No dashboard Vercel → Settings → Environment Variables: adicionar as 2 variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Redeploy.

Depois de ter a URL final (`td-jogos.vercel.app`), voltar no Supabase → Auth → URL Configuration → colocar essa URL em **Site URL** e **Redirect URLs**.

## Fluxo funcional

- **Login Google** (domínio `tributodevido.com.br` é sugerido via `hd=`).
- Primeiro login: `claim_pending_profile()` tenta matchar por email, depois por nome. Se não achar, cria perfil solto (admin atribui grupo manualmente).
- **Postar:** foto no Storage + registro em `posts` com `status='pending'`.
- **Admin:** aprova/reprova. Trigger SQL recalcula `pontos` no approve.
- **Dashboard:** soma `status='approved'` por grupo/usuário.

## Quem é admin

- `marcio.capellup@tributodevido.com.br` é `superadmin` (seed). No primeiro login ele aparece automático.
- Superadmin vai em `/admin → Usuários` e promove outra pessoa a `admin`.

## Scripts

```bash
npm run dev      # dev server
npm run build    # prod build
npm run preview  # preview do build
npm run lint     # eslint
```

## Estrutura

```
td-jogos/
├── supabase/          # SQL rodar no dashboard
├── public/logo-td.svg
└── src/
    ├── lib/           # supabase client, regras de semana/pontos
    ├── hooks/         # useAuth
    ├── components/    # Header, Layout, PostCard, FotoUpload, ...
    ├── pages/         # Login, Home, Postar, MeusPosts, Dashboard, Admin
    └── styles/globals.css
```
