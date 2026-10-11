# Planet Pulse

Planet Pulse is a React/Vite environmental-data dashboard with an Eco Agent powered by Groq.
The dashboard runs without a backend. The Eco Agent requires the Express backend deployed separately.

---

## Local development

### Frontend only

```powershell
cd src
npm install
npm run dev
```

Open `http://localhost:5173/`.

### Frontend + Eco Agent backend

**Terminal 1 — backend:**

```powershell
cd backend
copy .env.example .env   # then edit .env and set GROQ_API_KEY
npm install
npm run dev
```

**Terminal 2 — frontend:**

```powershell
cd src
npm install
npm run dev
```

Open `http://localhost:5173/eco-analyst`.
Vite proxies `/api/chat` → `http://localhost:3001` automatically.

> If the backend runs on a different port, set `ECO_AGENT_API_URL` before starting Vite:
> `$env:ECO_AGENT_API_URL = "http://localhost:3002"`

---

## Production deployment

### Backend → Render

| Setting | Value |
|---|---|
| **Service type** | Web Service |
| **Root directory** | `backend` |
| **Runtime** | Node |
| **Build command** | `npm install` |
| **Start command** | `npm start` |
| **Node version** | 20 (or latest LTS) |

**Environment variables to set in Render dashboard:**

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `GROQ_API_KEY` | *(your secret Groq key — never commit this)* |
| `GROQ_MODEL` | `openai/gpt-oss-20b` *(or any model enabled on your account)* |
| `FRONTEND_ORIGINS` | `https://your-app.vercel.app` *(exact Vercel URL, no trailing slash)* |

After deploying, note the public URL — e.g. `https://planet-pulse-eco-agent.onrender.com`.

---

### Frontend → Vercel

| Setting | Value |
|---|---|
| **Root directory** | `src` |
| **Framework preset** | Vite |
| **Build command** | `npm run build` |
| **Output directory** | `dist` |
| **Install command** | `npm install` |

**Environment variables to set in Vercel dashboard:**

| Variable | Value |
|---|---|
| `VITE_ECO_AGENT_API_URL` | `https://planet-pulse-eco-agent.onrender.com` *(your Render URL)* |

> `vercel.json` in `src/` rewrites all routes to `index.html` so React Router
> routes like `/eco-analyst` work correctly after a page refresh.

---

## Security notes

- `GROQ_API_KEY` lives **only** in the Render environment. It is never in a `VITE_*`
  variable, never in frontend code, and never committed to Git.
- `FRONTEND_ORIGINS` is an exact-match CORS allowlist. Set it to your Vercel domain only.
- `.env` files are excluded by `.gitignore` at both the root and `backend/` levels.
- The backend validates all inputs, rate-limits requests, and returns safe error messages
  that do not expose provider internals.

---

## Tests and build

```powershell
# Backend tests (mock-based, no Groq key required)
cd backend
npm test

# Frontend production build
cd src
npm run build

# Frontend lint
cd src
npm run lint
```

---

## Data sources and limitations

- **NASA POWER** — live gridded climate estimates (temperature, precipitation, humidity,
  wind, solar radiation, soil moisture). Gridded estimates, not weather-station readings.
- **OpenStreetMap Nominatim** — location search.
- **Natural Earth** — public-domain country boundaries.
- **CARTO / Esri** — map tiles.
- **NASA GIBS** — actual MODIS NDVI raster imagery in the Greenery map.
  Numeric NDVI statistics are not extracted from tiles.
- **Forest cover, forest loss, NDVI history, biomass** — prototype generated estimates,
  not observed satellite data.
- **Risk score** — prototype composite index, not a validated scientific index.
- **Eco Agent** — retrieves live NASA POWER and modeled CAMS air-quality data.
  History, forecasts, comparisons, and risk calculations are clearly labeled as prototype.

---

## Eco Agent architecture

```
React/Vite chat (src/)
  └─ POST /api/chat  →  Express backend (backend/)
                            ├─ validates input, CORS, rate-limits
                            ├─ Groq Chat Completions + GROQ_API_KEY
                            └─ tool calls:
                                 ├─ NASA POWER (live)
                                 ├─ CAMS air quality (live)
                                 └─ prototype history / forecast / risk
```
