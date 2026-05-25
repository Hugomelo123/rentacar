# Deploy no Railway (1 serviço só)

## Porque abrem vários serviços?

Ao ligar o GitHub, o Railway usa **“Import monorepo”** e cria um serviço por cada pacote (`@workspace/db`, `api-zod`, etc.).  
Esses pacotes em `lib/` são **bibliotecas**, não aplicações → **Build failed**.

**Não use** o fluxo que diz “detectámos um monorepo” com 7 serviços.

---

## Forma certa (fazer uma vez)

### 1. Limpar o projeto atual

No [Railway Dashboard](https://railway.app):

1. Apague **todos** os serviços `@workspace/...` (os 6 ou 7 cartões).
2. Ou crie um **projeto novo** (recomendado se estiver confuso).

### 2. Um único serviço com Dockerfile

1. **New Project** → **Empty Project** (projeto vazio).
2. **+ New** → **GitHub Repo** → `Hugomelo123/rentacar`.
3. Abra o **único** serviço criado → **Settings**:
   - **Root Directory:** deixe **vazio** `/` (raiz do repo).
   - **Builder:** **Dockerfile** (não Nixpacks / Railpack por pacote).
   - **Dockerfile path:** `Dockerfile`
4. **+ New** → **Database** → **PostgreSQL**.
5. No serviço da app → **Variables** (obrigatório, senão o deploy falha ou a app não arranca):
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `NODE_ENV` = `production`
   - (`PORT` é definido automaticamente pelo Railway)
6. **Settings** → confirme **Builder: Dockerfile**
7. **Deploy** / **Redeploy**.

Se o build falhar com `pnpm lockfile` ou `vite not found`, faça pull do `main` mais recente (Dockerfile corrigido).

Deve ficar **só 2 cartões**: `rentacar` (app) + `Postgres`.

### 3. Domínio

No serviço da app → **Settings** → **Networking** → **Generate Domain**.

Abre o URL: vê o **painel**; a API está em `/api/healthz`.

---

## O que o repositório já tem

| Ficheiro | Função |
|----------|--------|
| `Dockerfile` | Build API + dashboard numa imagem |
| `railway.toml` / `railway.json` | Força builder Dockerfile na raiz |
| `package.json` (raiz) | `start` + `build` para um único app |

**Removido:** `railway.toml` dentro de `artifacts/*` (isso fazia o Railway criar serviços extra).

**Workspace:** `mockup-sandbox` já não entra no `pnpm-workspace` (menos um serviço fantasma).

---

## Se voltarem a aparecer vários serviços

- Não clique em **“Deploy all packages”** / import monorepo.
- Confirme **Builder = Dockerfile** e **Root = /**.
- Apague de novo os serviços `@workspace/*`.

---

## Local

```powershell
.\start-local.ps1
```

Ver [LOCALHOST.md](./LOCALHOST.md).
