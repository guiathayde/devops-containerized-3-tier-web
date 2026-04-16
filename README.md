# Prática com Docker — Aplicação 3-tier

Aplicação web de tarefas (to-do) containerizada com três serviços orquestrados via Docker Compose, atendendo ao requisito de comunicação entre contêineres por nome de serviço (sem uso de `localhost` / exportação de portas entre eles).

## Arquitetura

```
          ┌──────────────────────────────────────────────────┐
          │ Rede interna do Docker Compose                   │
          │                                                  │
          │   ┌──────────┐     ┌──────────┐     ┌────────┐   │
host ───►─┤   │ frontend │──►──│ backend  │──►──│   db   │   │
  :8080   │   │ (nginx)  │ /api│ (express)│ pg  │(postgres)│ │
          │   └──────────┘     └──────────┘     └────────┘   │
          │      :80              :3000            :5432     │
          └──────────────────────────────────────────────────┘
```

- **frontend**: React (Vite) compilado estaticamente e servido por Nginx. Também atua como reverse-proxy, encaminhando requisições `/api/` para o backend.
- **backend**: API REST em Node.js + Express, persistindo dados em PostgreSQL via `pg`.
- **db**: PostgreSQL 16 com volume nomeado (`db-data`) para persistência.

### Comunicação entre contêineres (por nome de serviço)

| Origem   | Destino | Endereço usado             | Onde está configurado          |
|----------|---------|----------------------------|--------------------------------|
| frontend | backend | `http://backend:3000`      | `frontend/nginx.conf`          |
| backend  | db      | `host: db`, porta `5432`   | `backend/server.js` (env vars) |

Apenas o `frontend` expõe uma porta para o host (`8080:80`). `backend` e `db` **não** são expostos externamente — são alcançáveis apenas pela rede interna do Compose, pelos nomes dos serviços.

## Estrutura do projeto

```
pratica-1/
├── compose.yml                # Orquestração dos 3 serviços
├── backend/
│   ├── Dockerfile             # node:20-alpine
│   ├── package.json
│   ├── server.js              # API /api/tasks (CRUD)
│   └── .dockerignore
└── frontend/
    ├── Dockerfile             # multi-stage: node (build) → nginx (runtime)
    ├── nginx.conf             # SPA + proxy reverso para /api/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── src/
    │   ├── main.jsx
    │   └── App.jsx
    └── .dockerignore
```

## Como executar

Pré-requisitos: Docker e Docker Compose instalados.

```bash
docker compose up --build
```

Após o build, acesse a aplicação em:

```
http://localhost:8080
```

Para parar:

```bash
docker compose down
```

Para remover também o volume do banco (apaga os dados):

```bash
docker compose down -v
```

## Endpoints da API

Acessíveis via proxy no frontend em `http://localhost:8080/api/...` (ou diretamente no backend, dentro da rede do Compose, em `http://backend:3000/api/...`).

| Método | Rota              | Descrição                         |
|--------|-------------------|-----------------------------------|
| GET    | `/api/health`     | Health check                      |
| GET    | `/api/tasks`      | Lista todas as tarefas            |
| POST   | `/api/tasks`      | Cria tarefa `{ "title": "..." }`  |
| PATCH  | `/api/tasks/:id`  | Alterna o estado `done`           |
| DELETE | `/api/tasks/:id`  | Remove a tarefa                   |

## Detalhes de configuração

- O backend aguarda o Postgres ficar pronto (retry loop + `healthcheck` no Compose com `pg_isready`) antes de iniciar o servidor HTTP e criar o schema.
- Credenciais do banco são definidas via variáveis de ambiente no `compose.yml` (usuário/senha/database iguais a `postgres`/`postgres`/`tasks`).
- O schema é criado automaticamente no startup do backend.
