# Newsletter dashboard (FastAPI + React)

Full-stack dashboard for market pricing, historical charts, and forecasts. Backend is **FastAPI** with **SQLAlchemy 2 (async)** and a layered **API → Service → Repository** layout. Frontend is **React 18**, **TypeScript**, **Vite**, **Tailwind CSS**, and **TanStack Query**, aligned with `frontend/design/dashboard.html` and `frontend/design/ENDPOINTS-REQUIRED.md`.

PostgreSQL is expected to **already exist** (for example on a VM). Docker Compose runs **backend** and **frontend** only; point `DATABASE_*` URLs at your server.

## Repository layout

```
backend/           # FastAPI app (app/api, services, repositories, models, schemas)
frontend/        # Vite + React + TS (src/components, features, pages, layouts)
docker-compose.yaml
.env.example     # Copy to `.env` at repo root for Docker / local backend
```

## Prerequisites

- Python **3.11+**
- Node.js **20+** (22 recommended for the frontend Docker image)
- **PostgreSQL** with schema compatible with `data/dbdiagram.txt` / your seed CSVs (see schema notes below)

## Backend setup (local)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # Edit DATABASE_URL and DATABASE_URL_SYNC
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- API prefix: **`/api/v1`**
- Successful JSON shape: `{ "data": ..., "message": "ok", "errors": null }`

### Alembic

Migrations live under `backend/alembic`. For a database that **already has tables**, stamp the placeholder revision instead of applying destructive upgrades:

```bash
cd backend
export DATABASE_URL_SYNC=postgresql://USER:PASSWORD@HOST:PORT/DB
alembic stamp head
```

For a **new** empty database, you can autogenerate from models:

```bash
alembic revision --autogenerate -m "init"
alembic upgrade head
```

Review generated SQL carefully before applying to production.

### Schema alignment notes

- **`product`**: Models use `prod_id` as primary key (see `data/csv/product.csv`). If your table uses a surrogate `id` column instead, adjust `app/models/product.py` to match.
- **`price_history`**: PostgreSQL column is **`date`** (see `data/create_tables.py`). The ORM maps it to the Python attribute **`price_date`** via `mapped_column("date", ...)`.
- **`price_forecast`**: The model maps provider FK as column **`forecast_provider`**. If your DDL uses **`source`**, rename the column in SQL or change `app/models/price_forecast.py` and the raw SQL in `DashboardRepository.fetch_forecasts_latest_per_product`.

## Frontend setup (local)

```bash
cd frontend
npm install
cp .env.example .env        # Optional; empty VITE_API_URL uses Vite proxy
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). The dev server proxies `/api` to `http://127.0.0.1:8000` (override with `VITE_PROXY_TARGET` in the shell if needed).

```bash
npm run build      # production bundle
npm run lint
```

## Deploy with Docker Compose (nginx + backend; DB on VM)

Compose runs **frontend** (nginx + static React build) and **backend** (FastAPI). **PostgreSQL is not started by Compose** — point `DATABASE_URL` / `DATABASE_URL_SYNC` at your existing database (typically on the same or another VM).

### How traffic flows

1. Users open the app at **`http://<server>:3894`** (nginx in the `frontend` container).
2. The SPA calls **`/api/...`** on the same origin (empty `VITE_API_URL` at build time).
3. **`frontend/nginx.conf`** proxies `/api/`, `/docs`, and `/openapi.json` to the **`backend`** service at `http://backend:8000` on the internal Docker network.
4. The backend connects to PostgreSQL using **`DATABASE_URL`** from `.env` (must be reachable from **inside** the backend container).

### Step-by-step: deploy on a VM

1. **Install** Docker Engine and the Docker Compose plugin on the VM.

2. **Clone or copy** this repository onto the VM and `cd` into the project root.

3. **Configure environment**
   - Copy the template: `cp .env.example .env`
   - Edit `.env`:
     - Set **`DATABASE_URL`** (async) and **`DATABASE_URL_SYNC`** (sync, for Alembic) to your Postgres instance.
       - Use a hostname/IP that works **from inside the backend container**, not `127.0.0.1` unless you intentionally mean the container itself.
       - If Postgres runs **on the same machine** as Docker, use the VM’s LAN IP, or **`host.docker.internal`** with the host port Postgres listens on (Compose already adds `host.docker.internal` for Linux).
       - If Postgres is **on another server**, use that server’s address and ensure `pg_hba.conf`, `listen_addresses`, and firewalls allow the VM running Docker.
     - Set **`CORS_ORIGINS`** to every browser origin that will load the UI, comma-separated, including scheme and port — for example `http://YOUR_PUBLIC_IP:3894` and local dev URLs if needed. If the browser’s origin is not listed, API calls from the SPA can be blocked by CORS.

4. **Open host ports** (cloud security group / `ufw` / etc.): **3894** (frontend/nginx) and optionally **3895** (direct API access). Ensure Postgres (**e.g. 3893**) is reachable from the backend container, not necessarily from the public internet.

5. **Build and start**

```bash
docker compose up -d --build
```

6. **Verify**
   - App UI: `http://<server>:3894`
   - API health: `http://<server>:3895/health`
   - Swagger (via nginx): `http://<server>:3894/docs`
   - Swagger (direct backend port): `http://<server>:3895/docs`

7. **Logs and updates**

```bash
docker compose logs -f
docker compose pull   # if using pre-built images later
docker compose up -d --build
```

### Port summary

| Service    | Host port | Container | Notes                                      |
|-----------|-----------|-----------|--------------------------------------------|
| Frontend  | **3894**  | 80        | nginx: static files + proxy `/api` → backend |
| Backend   | **3895**  | 8000      | FastAPI / Uvicorn                          |
| PostgreSQL| *(your VM)* | —     | Configured only in `.env`, not in Compose |

### Local Docker (same ports)

On your laptop, after `.env` points to a reachable database:

```bash
docker compose up --build
```

- UI: [http://localhost:3894](http://localhost:3894)
- API: [http://localhost:3895](http://localhost:3895)

## Tests (backend)

```bash
cd backend
source .venv/bin/activate
pytest
```

`tests/test_health.py` hits `/health` only (no database round-trip).

## Behaviour notes (dashboard API)

- **`market=international|domestic`**: Echoed on pricing-by-group; **Phase 1** does not filter `price_latest` by market (see `ENDPOINTS-REQUIRED.md`). History charts map market to **`INTL` / `DOM`** `price_source` codes when `source` is omitted.
- **`change_direction`**: Normalized to `up` | `down` | `flat` from values such as `increase` / `decrease`.

## Security

- Do **not** commit `.env` files or real database passwords. Rotate any credentials that were ever stored in plain text in a shared folder.

## Formatting / linting

- **Python**: `black app` and `ruff check app` (from `backend/`).
- **Frontend**: `npm run lint` and `npm run format` (from `frontend/`).
