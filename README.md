# EdTech LMS

A full-stack Learning Management System with a React frontend and Python FastAPI backend.

## Prerequisites

- **Node.js** (v18+) and npm
- **Python** (3.11+)
- **PostgreSQL** running locally

## Setup

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Install Python dependencies

```bash
pip install fastapi 'uvicorn[standard]' 'sqlalchemy[asyncio]' asyncpg pydantic python-dotenv itsdangerous
```

### 3. Configure environment

Create a `.env` file in the project root:

```
DATABASE_URL=postgresql://your_user@localhost:5432/edtech_lms
SESSION_SECRET=your_secret_here
```

### 4. Create the database

```bash
createdb edtech_lms
```

Push the schema:

```bash
npm run db:push
```

The server will seed initial data (users, courses, etc.) on first startup if the database is empty.

## Running (Development)

Open two terminals:

**Terminal 1 — API server (FastAPI on port 5000):**

```bash
npm run dev:api
```

**Terminal 2 — Frontend dev server (Vite on port 5173):**

```bash
npm run dev:client
```

Then open **http://localhost:5173** in your browser.

## Seed Accounts

| Email                | Password   | Role      |
|----------------------|------------|-----------|
| admin@lms.local      | password   | L&D Admin |
| manager@lms.local    | password   | Manager   |
| employee@lms.local   | password   | Employee  |

## Project Structure

```
├── client/            # React frontend (Vite)
├── server/            # Original Express.js backend (kept for reference)
├── server_py/         # FastAPI backend
│   ├── main.py        # App entry point, lifespan, CORS, routers
│   ├── config.py      # Environment config
│   ├── database.py    # SQLAlchemy async engine
│   ├── models.py      # ORM models
│   ├── schemas.py     # Pydantic request/response models
│   ├── storage.py     # CRUD operations
│   ├── session.py     # Cookie session middleware
│   ├── dependencies.py# FastAPI dependencies (auth, DB)
│   ├── seed.py        # Database seeding
│   └── routers/       # Route handlers
│       ├── auth.py
│       ├── users.py
│       ├── courses.py
│       ├── enrollments.py
│       ├── notifications.py
│       └── speaking.py
├── shared/            # Shared schema definitions
└── package.json
```

## Scripts

| Script          | Command                        |
|-----------------|--------------------------------|
| `dev:api`       | Start FastAPI server (port 5000) |
| `dev:client`    | Start Vite dev server (port 5173) |
| `dev`           | Start original Express server  |
| `build`         | Build for production           |
| `db:push`       | Push Drizzle schema to database |
