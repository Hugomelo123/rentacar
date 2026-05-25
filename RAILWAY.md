# Deploy no Railway (só escolher o repositório)

## Forma simples (recomendada)

1. [Railway](https://railway.app) → **New Project** → **Deploy from GitHub repo** → `Hugomelo123/rentacar`
2. Se aparecerem **vários serviços** (monorepo): apague todos e crie **um** serviço ligado ao mesmo repo, ou crie projeto novo e escolha **Deploy with Dockerfile** (deteta o `Dockerfile` na raiz).
3. No projeto, **+ New** → **Database** → **PostgreSQL**
4. No serviço da app → **Variables** → **Add reference** → `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
5. **Deploy** / **Redeploy**

Um único URL serve **painel + API** (`/api/...`). Não precisa de escolher pastas nem dois serviços.

| Variável | Valor |
|----------|--------|
| `DATABASE_URL` | Referência ao Postgres (obrigatório) |
| `PORT` | Automático |
| `SERVE_DASHBOARD` | `true` (default) |
| `NODE_ENV` | `production` |

O `releaseCommand` aplica o schema SQL na primeira deploy com Postgres ligado.

---

## Porque às vezes aparecem 7 serviços?

O Railway importou o repo como **monorepo JavaScript** e criou um serviço por cada `package.json` (`lib/db`, `api-zod`, etc.). Esses pacotes **não são apps** → Build failed.

**Solução:** um serviço só, com `Dockerfile` + `railway.toml` na **raiz** do repo (já incluídos).

Apague: `@workspace/db`, `api-zod`, `api-client`, `api-spec`, `mockup-sandbox`, e serviços duplicados de API/dashboard se existirem.

---

## Arranque local (igual)

```powershell
.\start-local.ps1
```

Ver [LOCALHOST.md](./LOCALHOST.md).

---

## Estrutura de deploy

```
rentacar (1 serviço Railway)
├── Dockerfile          → build API + dashboard
├── railway.toml        → healthcheck + release schema
├── PostgreSQL plugin   → DATABASE_URL
└── URL público         → painel em /  e API em /api
```
