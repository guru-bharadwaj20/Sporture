# 🏆 Sporture

**Bringing People Together Through Local Sports Events**

Sporture is a full-stack MERN application for discovering and organising local sports events. Its
central feature is **proximity search**: find games happening near you, sorted by distance, filtered
by sport and radius — backed by MongoDB geospatial indexing rather than string matching.

---

## 🚀 Features

### 📍 Proximity Search
- **Find events near me** using the browser's geolocation API.
- Adjustable radius (2–50 km) with live distance shown on every event card.
- Results sorted nearest-first via MongoDB's `$geoNear` aggregation over a `2dsphere` index.
- Venue addresses are geocoded server-side (OpenStreetMap Nominatim) when a host doesn't
  supply coordinates directly; results are cached and rate-limited to respect the provider's policy.

### 🧑‍💻 Authentication
- JWT-based login and registration, passwords hashed with bcrypt (cost 12).
- Login returns an identical response for unknown emails and wrong passwords, so the endpoint
  can't be used to enumerate registered accounts.
- Rate-limited credential endpoints (10 attempts / 15 min, successful attempts not counted).

### 🏟️ Event Management
- Create events with sport, venue, date/time and participant limit.
- **Capacity is enforced atomically** — a single conditional update, so simultaneous joins can
  never overbook an event.
- Events in the past are rejected at creation, and started events can't be joined.

### 👤 Profiles & Feedback
- Editable profiles with avatar upload (2 MB limit, image types only).
- Derived fields (rating, games played, events hosted, role) are server-owned and not writable
  by clients.
- Feedback is attributed to the authenticated user and deletable only by its author.

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, React Router 7, Vite 7, Axios |
| **Backend** | Node.js, Express 5 |
| **Database** | MongoDB (Mongoose 8), `2dsphere` geospatial index |
| **Auth** | JWT, bcrypt |
| **Validation** | Zod |
| **Security** | Helmet, CORS allowlist, express-rate-limit |
| **Testing** | Vitest, Supertest, mongodb-memory-server |
| **CI** | GitHub Actions |

---

## 🏗️ Architecture

```
Sporture/
├── Client/                     React SPA
│   └── src/components/
│       ├── pages/              Route-level components
│       └── utils/
│           ├── api.js          Axios instance + token interceptor
│           └── useGeolocation.js
└── Server/
    ├── app.js                  Express app (no side effects — importable by tests)
    ├── server.js               Process entry: connect DB, listen
    ├── config/
    │   ├── env.js              Validates required env vars at boot
    │   └── db.js
    ├── middleware/
    │   ├── auth.js             JWT verification
    │   ├── validate.js         Zod validation + field allowlisting
    │   ├── rateLimit.js
    │   └── errorHandler.js     Centralized error translation
    ├── models/                 Mongoose schemas
    ├── routes/                 Route handlers
    ├── services/geocoder.js    Address → coordinates
    ├── validators/schemas.js   Zod schemas (single source of truth for input shape)
    ├── scripts/                seed.js, migrate-locations.js
    └── tests/                  Vitest + Supertest suites
```

### Notable design decisions

**`app.js` is separate from `server.js`.** Building the app has no side effects — no DB
connection, no `listen`. Tests import it directly and drive it with Supertest, so the suite needs
no running server and no port.

**Zod schemas double as field allowlists.** Because Zod strips unknown keys, a client that
POSTs `{ name, rating: 5, role: "admin" }` gets only `name` through. Mass assignment is
prevented by the same declaration that validates types, rather than by a separate hand-maintained
list that can drift.

**Joining an event is one atomic operation.** The capacity and duplicate checks live in the
filter of a single `findOneAndUpdate`:

```js
{ _id: id,
  createdBy:      { $ne: userId },
  currentPlayers: { $ne: userId },
  $expr: { $lt: [{ $size: "$currentPlayers" }, "$maxPlayers"] } }
```

A read-then-write would let two concurrent requests both observe a free slot and both write.
There's a test that fires six simultaneous joins at a two-slot event and asserts exactly two succeed.

**Locations are GeoJSON, not strings.** `location` stores `{ address, geo: { type: "Point",
coordinates: [lng, lat] } }`. MongoDB requires longitude first — the reverse of how coordinates
are normally spoken and of what the browser's geolocation API returns — so the swap is done once,
at the validation boundary.

---

## 🔌 API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | — | Create an account |
| `POST` | `/api/auth/login` | — | Obtain a JWT |
| `GET`  | `/api/auth/me` | ✅ | Current user |
| `GET`  | `/api/events` | — | List / search events |
| `POST` | `/api/events` | ✅ | Create an event |
| `GET`  | `/api/events/:id` | — | Event detail |
| `GET`  | `/api/events/joined` | ✅ | Events you host or joined |
| `POST` | `/api/events/:id/join` | ✅ | Join an event |
| `GET`  | `/api/users/:id` | ✅ | Public profile |
| `PUT`  | `/api/users/:id` | ✅ | Update own profile |
| `POST` | `/api/users/:id/upload-photo` | ✅ | Upload avatar |
| `GET`  | `/api/feedback` | — | List feedback |
| `POST` | `/api/feedback` | ✅ | Submit feedback |
| `DELETE` | `/api/feedback/:id` | ✅ | Delete own feedback |
| `GET`  | `/health` | — | Liveness check |

### Proximity search

```
GET /api/events?lat=12.9352&lng=77.6245&radius=5000&sport=badminton
```

| Param | Description |
|-------|-------------|
| `lat`, `lng` | Centre point. Must be given together. |
| `radius` | Metres, max 200 000. Defaults to 25 000. Requires `lat`/`lng`. |
| `sport` | Exact match, case-insensitive. Metacharacters are escaped. |
| `upcoming` | `false` to include events that already started. Defaults to `true`. |

When `lat`/`lng` are present each event gains a `distanceMetres` field and results are ordered
nearest-first. Without them the response is a plain chronological listing.

---

## ⚙️ Getting Started

### Prerequisites
Node.js 20+, and MongoDB (local or Atlas).

### Setup

```bash
git clone https://github.com/guru-bharadwaj20/Eventure.git
cd Eventure

# --- Server ---
cd Sporture/Server
npm install
cp .env.example .env      # then fill it in (see below)
npm run seed              # optional: 10 users + 12 events around Bengaluru
npm run dev               # http://localhost:5000

# --- Client (new terminal) ---
cd Sporture/Client
npm install
cp .env.example .env.local
npm run dev               # http://localhost:5173
```

### Environment

`Sporture/Server/.env`:

| Variable | Required | Notes |
|----------|----------|-------|
| `MONGO_URI` | ✅ | **Include a database name** — `...mongodb.net/sporture`. Without one, MongoDB silently uses `test`. |
| `JWT_SECRET` | ✅ | Minimum 32 chars. Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `PORT` | | Defaults to 5000 |
| `JWT_EXPIRES_IN` | | Defaults to `1d` |
| `CLIENT_ORIGINS` | | Comma-separated CORS allowlist. Defaults to `http://localhost:5173` |
| `BACKEND_URL` | | Public API origin, used to build upload URLs |
| `NODE_ENV` | | **Set to `production` when deploying** — otherwise stack traces are returned in error responses |

The server refuses to start if `MONGO_URI` or `JWT_SECRET` is missing or if the secret is too
short, so misconfiguration surfaces at boot rather than on the first request.

### Seed accounts

`npm run seed` creates ten users sharing the password `Password123!` (override with
`SEED_PASSWORD`), and twelve events across real Bengaluru venues 3–20 km apart — enough spread to
demonstrate radius search. Sign in as `radha@example.com` and search near Koramangala
(12.9352, 77.6245).

### Migrating existing data

If you have events created before the geospatial change, their `location` is a plain string:

```bash
node scripts/migrate-locations.js --dry-run   # preview
node scripts/migrate-locations.js             # apply
```

Addresses that can't be geocoded are reported and left untouched, rather than guessed at.

---

## 🧪 Testing

```bash
cd Sporture/Server
npm test                # 97 tests
npm run test:coverage
```

Each test file runs against its own in-memory MongoDB, so the suite needs no local database and is
safe to run in CI. Coverage is weighted toward security properties rather than happy paths:

- passwords are stored hashed and never returned
- login doesn't leak whether an account exists
- users can't edit other users' profiles
- privileged fields (`rating`, `role`, `email`, `password`) can't be set by a client
- concurrent joins can't overbook an event
- regex metacharacters in query params are matched literally
- geocoding failures degrade to 422/503 rather than 500

```bash
cd Sporture/Client
npm run lint
npm run build
```

CI runs all of the above on every push and pull request.
