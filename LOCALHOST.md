# Arranque em localhost (Autocunha)

## Requisitos

- **Node.js** 20+ ([nodejs.org](https://nodejs.org))
- **pnpm** — `npm install -g pnpm`
- **Docker Desktop** (para PostgreSQL)

## Início rápido (Windows)

```powershell
cd c:\Users\diann\Downloads\Premium-Strong\Premium-Strong
.\start-local.ps1
```

Abre o dashboard em **http://localhost:5173**

## Início manual

### 1. Base de dados

```powershell
docker compose up -d
copy .env.example .env   # se ainda não existir .env
```

### 2. Dependências e schema

```powershell
pnpm install
pnpm setup:local
```

(`setup:local` = Docker + schema Drizzle + veículos de demo)

### 3. Dois terminais

**Terminal A — API (porta 5000):**

```powershell
$env:DATABASE_URL="postgresql://autocunha:autocunha@localhost:5432/rentacar"
$env:PORT="5000"
pnpm dev:api
```

**Terminal B — Dashboard (porta 5173):**

```powershell
pnpm dev:web
```

## URLs

| Serviço    | URL |
|-----------|-----|
| Dashboard | http://localhost:5173 |
| API health | http://localhost:5000/api/healthz |
| Frota API | http://localhost:5000/api/fleet |

O Vite faz **proxy** de `/api` → `http://127.0.0.1:5000`, por isso o frontend não precisa de CORS extra.

## Parar

```powershell
docker compose down
```

## Problemas comuns

- **pnpm não encontrado** → `npm install -g pnpm`
- **Porta 5432 ocupada** → altere a porta no `docker-compose.yml` e no `.env`
- **Frota vazia no WhatsApp** → `pnpm db:seed`
- **API não liga** → confirme `docker compose ps` e `DATABASE_URL` no `.env`
