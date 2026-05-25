# Rent-a-Car · Autocunha (Madeira)

Plataforma de gestão e reservas para **Autocunha Rent-a-Car**, com painel operacional, API REST e assistente **Sofia** no simulador WhatsApp. O fluxo cobre a maior parte do trabalho **antes do balcão**: dados do cliente, datas, frota, proteção, contrato, pagamento e pré-check-in com validação por IA.

> Repositório: [github.com/Hugomelo123/rentacar](https://github.com/Hugomelo123/rentacar)

---

## Funcionalidades

| Área | Descrição |
|------|-----------|
| **Dashboard** | KPIs, atividade do dia, resumo da frota e reservas em tempo real |
| **Frota** | Listagem, estado dos veículos e seed com viaturas de demonstração |
| **WhatsApp (Sofia)** | Conversa guiada multilingue (PT, EN, FR, ES, DE), FAQ, intents e tom humano |
| **Reservas** | Criação, atualização, pagamento simulado e upload de documentos/fotos |
| **API** | OpenAPI + cliente React gerado, validação Zod, PostgreSQL com Drizzle |

---

## Stack

- **Frontend:** React 19, Vite 7, Tailwind CSS 4, TanStack Query, Wouter  
- **Backend:** Node.js, API REST (porta 5000)  
- **Base de dados:** PostgreSQL 16 (Docker) + Drizzle ORM  
- **Monorepo:** pnpm workspaces  

---

## Estrutura do projeto

```
├── artifacts/
│   ├── api-server/          # API REST
│   └── rentacar-dashboard/  # Painel + simulador WhatsApp
├── lib/
│   ├── api-spec/            # OpenAPI
│   ├── api-client-react/    # Cliente gerado
│   ├── api-zod/             # Tipos e validação
│   └── db/                  # Schema, migrations, seed
├── scripts/                 # Schema SQL e utilitários
├── docker-compose.yml       # PostgreSQL local
├── LOCALHOST.md             # Guia detalhado de desenvolvimento
└── start-local.ps1          # Arranque rápido (Windows)
```

---

## Requisitos

- [Node.js](https://nodejs.org) **20+**
- [pnpm](https://pnpm.io) — `npm install -g pnpm`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (PostgreSQL local)

---

## Início rápido

### Windows (recomendado)

```powershell
git clone https://github.com/Hugomelo123/rentacar.git
cd rentacar
copy .env.example .env
.\start-local.ps1
```

Abra o painel em **http://localhost:5173**

### Manual (qualquer SO)

```bash
git clone https://github.com/Hugomelo123/rentacar.git
cd rentacar
cp .env.example .env

docker compose up -d
pnpm install
pnpm setup:local
```

**Terminal 1 — API**

```bash
pnpm dev:api
```

**Terminal 2 — Dashboard**

```bash
pnpm dev:web
```

| Serviço | URL |
|---------|-----|
| Dashboard | http://localhost:5173 |
| API (health) | http://localhost:5000/api/healthz |
| Frota | http://localhost:5000/api/fleet |

O Vite faz proxy de `/api` para a API local; não é necessário configurar CORS no frontend.

Mais detalhes e resolução de problemas: **[LOCALHOST.md](./LOCALHOST.md)**

---

## Variáveis de ambiente

Copie `.env.example` para `.env`:

```env
DATABASE_URL=postgresql://autocunha:autocunha@localhost:5432/rentacar
PORT=5000
NODE_ENV=development
DASHBOARD_PORT=5173
```

> **Nunca** faça commit do ficheiro `.env` (já está no `.gitignore`).

---

## Scripts úteis

| Comando | Descrição |
|---------|-----------|
| `pnpm setup:local` | Docker + schema + seed da frota |
| `pnpm dev:api` | API em modo watch (porta 5000) |
| `pnpm dev:web` | Dashboard Vite (porta 5173) |
| `pnpm db:seed` | Repor viaturas de demonstração |
| `pnpm db:up` / `pnpm db:down` | Subir / parar PostgreSQL |
| `pnpm typecheck` | Verificação TypeScript no monorepo |
| `pnpm build` | Typecheck + build dos pacotes |

---

## Assistente Sofia (WhatsApp)

Fluxo pensado para clientes que abrem a conversa pelo **link WhatsApp**:

1. Apresentação da Autocunha e pedido de **idioma**  
2. Recolha de nome, telefone, datas, local e voo  
3. Escolha de viatura, proteção e aceitação de condições  
4. Orçamento, sinal (€50 simulado) e pré-check-in (documentos + fotos)  

A lógica de conversa está em `artifacts/rentacar-dashboard/src/lib/` (`chat-i18n`, `chat-intent`, `chat-human`).

---

## Deploy (Railway)

O Railway pode criar **vários serviços** automaticamente (um por pacote do monorepo). Só precisa de **2**:

- `artifacts/api-server` (API)
- `artifacts/rentacar-dashboard` (frontend)

Apague os serviços `@workspace/db`, `api-zod`, `api-client`, `api-spec` e `mockup-sandbox`. Guia completo: **[RAILWAY.md](./RAILWAY.md)**

---

## Licença

MIT — ver ficheiro de licença do projeto, se aplicável.

---

## Autor

**Hugo Melo** · [Hugomelo123](https://github.com/Hugomelo123)
