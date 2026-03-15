# DuelMind 🗡️🧠

A production-ready, mobile-first competitive trivia and reaction duel app.

**Stack:** React · TypeScript · Tailwind · Node.js · Express · PostgreSQL · Prisma · Socket.IO · JWT

---

## Quick Start (5 minutes)

### 1. Prerequisites

- Node.js 18 or 20
- PostgreSQL 14+ running locally **or** Docker

### 2. Extract and install

```bash
tar -xzf duelmind-app.tar.gz
cd duelmind-app

# Install ALL dependencies (backend + frontend + admin)
npm run install:all
```

### 3. Start PostgreSQL

**Option A — Docker (easiest):**
```bash
docker compose up -d postgres
# Wait 5 seconds for postgres to be ready, then verify:
docker compose exec postgres pg_isready -U duelmind
```

**Option B — Local PostgreSQL:**
```sql
-- Run in psql as superuser:
CREATE DATABASE duelmind;
CREATE USER duelmind WITH PASSWORD 'duelmind_secret';
GRANT ALL PRIVILEGES ON DATABASE duelmind TO duelmind;
```

### 4. Create the .env file

```bash
cd backend
cp .env.example .env
# The defaults in .env.example work out of the box for local dev.
# No editing required unless you changed the PostgreSQL credentials.
```

### 5. Push the database schema

```bash
# From the backend directory:
npx prisma db push

# Or using the npm script:
npm run db:push
```

### 6. Seed the database (EXACT COMMAND)

```bash
# From the backend directory:
npx tsx prisma/seed.ts

# Or using the npm script:
npm run db:seed

# Or from the root directory:
npm run db:setup
```

Expected output:
```
🌱 Seeding DuelMind...
  ✓ 24 questions created
  ✓ 6 game configs created

✅ Seed complete!

  🔑 Admin:  admin@duelmind.app  / admin123
  👤 Demo 1: alice@demo.com       / demo1234
  👤 Demo 2: bob@demo.com         / demo1234

🔍 Verifying password hashes...
  ✓ admin@duelmind.app: OK
  ✓ alice@demo.com: OK
```

If you see `❌ HASH MISMATCH` — run `npm run db:seed` again. The upsert will overwrite the broken hash.

### 7. Start all services

```bash
# From the root (starts backend + frontend + admin concurrently):
npm run dev
```

| Service      | URL                         |
|--------------|-----------------------------|
| Frontend     | http://localhost:5173        |
| Admin panel  | http://localhost:5174        |
| Backend API  | http://localhost:4000        |
| Health check | http://localhost:4000/health |

### 8. Log in

- **Frontend demo:** `alice@demo.com` / `demo1234`
- **Admin panel:**   `admin@duelmind.app` / `admin123`

---

## Troubleshooting: Backend returns HTTP 500 on login

**Step 1 — Check your .env file exists:**
```bash
ls backend/.env   # must exist
cat backend/.env  # must have DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
```
If missing: `cd backend && cp .env.example .env`

**Step 2 — Check PostgreSQL is running:**
```bash
# Docker:
docker compose ps         # postgres should show "healthy"
docker compose up -d postgres

# Local:
pg_isready -h localhost -p 5432
```

**Step 3 — Re-run the seed to fix password hashes:**
```bash
cd backend
npm run db:seed
# Look for: ✓ admin@duelmind.app: OK
```

**Step 4 — Check backend server logs:**
```bash
# The backend now logs the exact error. Look for lines like:
# [login] error: JWT_SECRET is not set
# [login] error: Database connection failed
# [login] error: Can't reach database server at localhost:5432
```

**Step 5 — Verify the backend is actually running:**
```bash
curl http://localhost:4000/health
# Expected: {"status":"ok","ts":"..."}
```

**Step 6 — Test login directly (bypass the frontend):**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@demo.com","password":"demo1234"}'
# Expected: {"user":{...},"accessToken":"...","refreshToken":"..."}
```

---

---

## Project Structure

```
duelmind-app/
├── backend/                  Node.js + Express + Prisma
│   ├── prisma/
│   │   ├── schema.prisma     Database schema (11 tables)
│   │   ├── seed.ts           Sample data
│   │   └── migrations/       Auto-generated migrations
│   ├── src/
│   │   ├── app.ts            Express + Socket.IO server
│   │   ├── config/           Prisma client singleton
│   │   ├── middleware/        Auth (JWT), rate limiter, error handler
│   │   ├── routes/           REST API routes
│   │   │   ├── auth.ts
│   │   │   ├── duels.ts
│   │   │   ├── questions.ts
│   │   │   ├── games.ts
│   │   │   ├── leaderboard.ts
│   │   │   ├── profile.ts
│   │   │   └── admin/        Admin-only endpoints
│   │   ├── services/
│   │   │   ├── triviaEngine.ts   Smart question selection
│   │   │   ├── duelService.ts    Duel lifecycle management
│   │   │   └── anticheat.ts      Score anomaly detection
│   │   └── websocket/
│   │       └── duelRoom.ts   Real-time duel engine
│   ├── sample_questions.csv  Import template
│   ├── .env.example
│   └── Dockerfile
│
├── frontend/                 React mobile app
│   └── src/
│       ├── pages/            Auth, Home, DuelLobby, DuelRoom,
│       │                     LearnMode, Leaderboard, Profile
│       ├── stores/           Zustand state (auth, duel)
│       ├── hooks/            useWebSocket
│       ├── api/              Axios client with auto-refresh
│       └── components/       BottomNav
│
├── admin/                    React admin dashboard
│   └── src/
│       └── pages/            Login, Dashboard, Questions,
│                             Categories, Users, Games, Analytics
│
├── docker-compose.yml
└── package.json              Root scripts
```

---

## Available Scripts

| From root directory       | Description                              |
|---------------------------|------------------------------------------|
| `npm run install:all`     | Install deps for all 3 packages          |
| `npm run dev`             | Start backend + frontend + admin         |
| `npm run dev:backend`     | Backend only                             |
| `npm run dev:frontend`    | Frontend only (port 5173)                |
| `npm run dev:admin`       | Admin panel only (port 5174)             |
| `npm run db:setup`        | Push schema + seed data                  |
| `npm run db:reset`        | Wipe DB and re-seed                      |

| From `backend/` directory | Description                              |
|---------------------------|------------------------------------------|
| `npm run db:push`         | Apply schema without migration           |
| `npm run db:migrate`      | Create and apply a named migration       |
| `npm run db:seed`         | Run seed file                            |
| `npm run db:studio`       | Open Prisma Studio GUI (port 5555)       |
| `npm run build`           | Compile TypeScript                       |

---

## API Reference

### Auth
```
POST /api/auth/register    { username, email, password }
POST /api/auth/login       { email, password }
POST /api/auth/refresh     { refreshToken }
```

### Duels
```
POST /api/duels/create         Create private duel → { inviteCode, id }
POST /api/duels/join/:code     Join by invite code
POST /api/duels/quickmatch     Find or create random match
GET  /api/duels/:id            Get duel details
GET  /api/duels/history/me     My completed duels
```

### Trivia / Learn
```
GET  /api/questions/next?categoryId=&difficulty=&language=&count=&context=
POST /api/questions/answer     { questionId, answer, answerText, responseMs, context }
GET  /api/questions/categories
GET  /api/questions/stats/me
```

### Leaderboard
```
GET /api/leaderboard/GLOBAL
GET /api/leaderboard/TRIVIA
GET /api/leaderboard/REACTION
```

### Mini Games
```
GET  /api/games/config
POST /api/games/score    { gameType, score, durationMs }
GET  /api/games/history
```

### WebSocket Events
```
Client → Server:
  duel:join        { duelId }
  duel:answer      { duelId, answer, responseMs }

Server → Client:
  duel:player_joined   { userId, username, playerCount }
  duel:started         { players, totalRounds }
  duel:question        { question, index, round, total, timeLimit }
  duel:answer_result   { correct, score, correctAnswer }
  duel:player_answered { userId }
  duel:round_result    { roundWinner, correctAnswer, scores, explanation }
  duel:ended           { winnerId, scores }
  duel:player_disconnected { userId }
  error                { message }
```

---

## CSV Import Format

Upload via Admin → Questions → Import CSV.

```csv
question_text,option_a,option_b,option_c,option_d,correct_option,category,difficulty,language,explanation,image_url,question_family_id
"What is 2+2?","3","4","5","6","B","science","EASY","en","Basic arithmetic.","",""
```

- `correct_option`: must be A, B, C, or D
- `category`: must match an existing category **slug** (e.g. `science`, `history`, `pop-culture`)
- `difficulty`: EASY, MEDIUM, or HARD
- `language`: en, az, or ru
- `image_url`, `explanation`, `question_family_id`: optional

See `backend/sample_questions.csv` for a complete example.

---

## Production Deployment

### Docker (VPS / any server)

```bash
# 1. Build frontend and admin
npm run build:all

# 2. Configure secrets in docker-compose.yml (change JWT secrets!)

# 3. Start everything
docker compose up -d

# 4. Seed the database
docker compose exec backend npx tsx prisma/seed.ts
```

### Railway / Render / Fly.io

1. Set environment variables from `.env.example` in your dashboard
2. Deploy backend with start command: `npm run db:push && npm start`
3. Deploy frontend/admin as static sites after running `npm run build`

### Nginx config (production)

```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/frontend;
    location /api/     { proxy_pass http://localhost:4000; }
    location /socket.io/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    location / { try_files $uri /index.html; }
}

# Admin
server {
    listen 80;
    server_name admin.yourdomain.com;
    root /var/www/admin;
    location /api/ { proxy_pass http://localhost:4000; }
    location / { try_files $uri /index.html; }
}
```

---

## Key Features

### Smart Trivia Engine
- **Unseen-first:** Never-seen questions get a +200 priority bonus
- **Cooldown:** Recently answered questions are penalised by time since last seen
- **Review boost:** Incorrectly answered questions surface more often in practice
- **Family clustering:** Related question variants never appear back-to-back
- **Fisher-Yates shuffle:** Answer options are properly randomised every session
- **Text-based validation:** Answer correctness validated by option text, not key — shuffle-proof

### Real-time Duel Engine
- WebSocket rooms with automatic 2-player detection
- Per-question 20-second countdown with server-side enforcement
- Best-of-N format (1, 3, 5, or 7 rounds)
- Fastest correct answer wins the round
- Score = 1000 − floor(responseMs / 10), minimum 100 per correct answer

### Anti-cheat
- Flags scores with impossible reaction times (< 100ms)
- Flags scores > 3× the player's rolling average
- All flagged scores visible in Admin → Analytics → Suspicious

---

## License

MIT
