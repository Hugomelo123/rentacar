# Deploy no Railway

## Porque aparecem 7 serviços e vários falham?

O Railway detetou o repositório como **monorepo** (pnpm workspaces) e criou **um serviço por cada `package.json`**.

| Serviço no Railway | O que é | Deve fazer deploy? |
|--------------------|---------|-------------------|
| `@workspace/api-server` | API Express | **Sim** |
| `@workspace/rentacar-dashboard` | Painel + WhatsApp | **Sim** |
| `@workspace/db` | Biblioteca Drizzle (schema) | **Não** |
| `@workspace/api-zod` | Biblioteca Zod | **Não** |
| `@workspace/api-client-react` | Cliente React gerado | **Não** |
| `@workspace/api-spec` | OpenAPI + codegen | **Não** |
| `@workspace/mockup-sandbox` | Sandbox UI (dev) | **Não** |

Os pacotes em `lib/` **não têm servidor** (`start`). O Railway tenta fazer build na mesma → **Build failed**.

---

## Configuração correta (2 serviços + Postgres)

### 1. Apagar serviços a mais

No projeto Railway, **apague** (ou desligue) estes serviços:

- `@workspace/db`
- `@workspace/api-zod`
- `@workspace/api-client-react`
- `@workspace/api-spec`
- `@workspace/mockup-sandbox`

Opcional: em **Settings → General**, desative **Automatic Monorepo Detection** para não voltarem a aparecer.

### 2. Serviço API

| Campo | Valor |
|-------|--------|
| **Root Directory** | `artifacts/api-server` |
| **Build** | (usa `railway.toml` no repo) ou manual: `cd ../.. && pnpm install && pnpm --filter @workspace/api-server run build` |
| **Start** | `node dist/index.mjs` |

**Variáveis de ambiente:**

| Variável | Valor |
|----------|--------|
| `DATABASE_URL` | URL do PostgreSQL Railway (plugin Postgres) |
| `PORT` | (Railway define automaticamente) |
| `NODE_ENV` | `production` |

Depois do primeiro deploy, corra o schema na base (local ou one-off):

```bash
pnpm db:push
pnpm db:seed
```

(ou ligue um job one-off no Railway com a mesma `DATABASE_URL`.)

### 3. Serviço Dashboard (frontend)

| Campo | Valor |
|-------|--------|
| **Root Directory** | `artifacts/rentacar-dashboard` |
| **Build** | `cd ../.. && pnpm install && pnpm --filter @workspace/rentacar-dashboard run build` |
| **Start** | `pnpm run serve` |

**Variáveis:**

| Variável | Valor |
|----------|--------|
| `BASE_PATH` | `/` |
| `PORT` | (automático) |

Para o painel falar com a API em produção, configure no frontend a URL da API (domínio público do serviço `api-server`), por exemplo via variável que o cliente React use (`setBaseUrl`).

### 4. PostgreSQL

Adicione o plugin **PostgreSQL** ao projeto e ligue a variável `DATABASE_URL` ao serviço **api-server**.

---

## Ficheiros no repositório

- `artifacts/api-server/railway.toml`
- `artifacts/rentacar-dashboard/railway.toml`

Faça push para `main` e volte a fazer deploy **só** nos dois serviços acima.

---

## Resumo

```
GitHub repo (monorepo)
├── lib/*              → bibliotecas (NÃO deploy)
├── artifacts/api-server      → 1.º serviço Railway ✅
└── artifacts/rentacar-dashboard → 2.º serviço Railway ✅
+ PostgreSQL plugin
```
