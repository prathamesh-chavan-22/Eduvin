# Setup Guide

Complete installation and configuration guide for EduVin AI.

## Table of Contents

- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Troubleshooting](#troubleshooting)
- [Docker Setup](#docker-setup-optional)

---

## System Requirements

### Minimum Requirements

| Component | Version | Notes |
|-----------|---------|-------|
| Node.js | 18.x or higher | LTS recommended |
| Python | 3.11 or higher | Required for FastAPI |
| PostgreSQL | 14.x or higher | Database server |
| npm | 9.x or higher | Comes with Node.js |
| Git | Any recent version | For version control |

### Operating Systems

- **macOS**: 12+ (Monterey or later)
- **Linux**: Ubuntu 20.04+, Debian 11+, or equivalent
- **Windows**: 10/11 with WSL2 recommended

### Hardware

- **RAM**: 4GB minimum, 8GB+ recommended
- **Disk**: 2GB free space for dependencies
- **CPU**: Any modern multi-core processor

---

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Web-App-Stack
```

### 2. Install Node.js Dependencies

```bash
npm install
```

This will install all frontend and build dependencies defined in `package.json`.

**Expected output:**
```
added 847 packages in 23s
```

### 3. Install Python Dependencies

#### Option A: Using pip (Recommended)

```bash
cd server_py
pip install fastapi 'uvicorn[standard]' 'sqlalchemy[asyncio]' asyncpg pydantic python-dotenv itsdangerous httpx edge-tts beautifulsoup4
```

#### Option B: Using requirements file

If a `requirements.txt` exists:
```bash
cd server_py
pip install -r requirements.txt
```

#### Option C: Using pyproject.toml

```bash
cd server_py
pip install -e .
```

**Verify Python installation:**
```bash
python --version  # Should show 3.11+
pip list | grep fastapi  # Should show fastapi 0.115+
```

---

## Database Setup

### 1. Install PostgreSQL

#### macOS (using Homebrew)
```bash
brew install postgresql@14
brew services start postgresql@14
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Windows
Download and install from [PostgreSQL.org](https://www.postgresql.org/download/windows/)

### 2. Create Database

#### macOS/Linux
```bash
# Create database
createdb eduvin_ai

# Verify
psql -l | grep eduvin_ai
```

#### Using psql directly
```bash
psql -U postgres
```

```sql
CREATE DATABASE eduvin_ai;
\q
```

### 3. Create Database User (Optional but recommended)

```sql
CREATE USER eduvin_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE eduvin_ai TO eduvin_user;
```

### 4. Push Database Schema

```bash
# From project root
npm run db:push
```

This uses Drizzle Kit to create all necessary tables.

**Expected output:**
```
✓ Applying changes...
✓ Database schema updated
```

---

## Environment Configuration

### 1. Create Environment File

```bash
# From project root
touch .env
```

### 2. Configure Environment Variables

Edit `.env` with the following:

```env
# Database Configuration
DATABASE_URL=postgresql://eduvin_user:secure_password@localhost:5432/eduvin_ai

# Session Security
SESSION_SECRET=your-secret-key-change-this-in-production

# Server Configuration
PORT=5000
HOST=0.0.0.0

# Optional: AI Service Configuration
MISTRAL_API_KEY=your-mistral-api-key-here

# Optional: Frontend URL for CORS
FRONTEND_URL=http://localhost:5173
```

### 3. Generate Secure Session Secret

```bash
# macOS/Linux
openssl rand -hex 32

# Or using Python
python -c "import secrets; print(secrets.token_hex(32))"
```

### 4. Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | - | Secret key for session cookies |
| `PORT` | No | 5000 | API server port |
| `HOST` | No | 0.0.0.0 | API server host |
| `MISTRAL_API_KEY` | No | - | API key for AI tutor (optional) |
| `FRONTEND_URL` | No | http://localhost:5173 | CORS allowed origin |

---

## Running the Application

### Development Mode

#### Option 1: Run Both Servers Separately

**Terminal 1 - Backend API:**
```bash
npm run dev:api
```

**Terminal 2 - Frontend:**
```bash
npm run dev:client
```

#### Option 2: Using tmux (macOS/Linux)

```bash
# Start tmux session
tmux new -s eduvin

# Split window
Ctrl+B then "

# In first pane
npm run dev:api

# Switch to second pane
Ctrl+B then O

# In second pane
npm run dev:client
```

### Initial Startup

On first run, the application will:

1. ✅ Create database tables
2. ✅ Seed demo users and courses
3. ✅ Generate sample lessons
4. ✅ Create speaking practice content
5. ✅ Set up notifications

**Expected console output:**
```
INFO:     Uvicorn running on http://0.0.0.0:5000
INFO:     Seeding database with initial data...
INFO:     Created 3 demo users
INFO:     Created 5 sample courses
INFO:     Created 15 lessons
INFO:     Database seeding complete
```

### Access the Application

- **Frontend**: http://localhost:5173
- **API Server**: http://localhost:5000
- **API Documentation**: http://localhost:5000/docs
- **Alternative API Docs**: http://localhost:5000/redoc

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| L&D Admin | admin@eduvin.local | password |
| Manager | manager@eduvin.local | password |
| Employee | employee@eduvin.local | password |

---

## Verification Steps

### 1. Check Backend Health

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{"status": "healthy"}
```

### 2. Check Database Connection

```bash
psql -d eduvin_ai -c "SELECT COUNT(*) FROM users;"
```

Expected output:
```
 count
-------
     3
(1 row)
```

### 3. Check Frontend Build

```bash
npm run check
```

Should show no TypeScript errors.

---

## Troubleshooting

### Common Issues

#### Database Connection Failed

**Error:**
```
asyncpg.exceptions.InvalidCatalogNameError: database "eduvin_ai" does not exist
```

**Solution:**
```bash
createdb eduvin_ai
npm run db:push
```

#### Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solution:**
```bash
# macOS/Linux - Find and kill process
lsof -ti:5000 | xargs kill -9

# Or use a different port
PORT=5001 npm run dev:api
```

#### Python Module Not Found

**Error:**
```
ModuleNotFoundError: No module named 'fastapi'
```

**Solution:**
```bash
cd server_py
pip install fastapi uvicorn[standard]
```

#### Node Version Mismatch

**Error:**
```
error @rollup/rollup-darwin-arm64@4.x.x: The engine "node" is incompatible
```

**Solution:**
```bash
# Install correct Node version
nvm install 18
nvm use 18
npm install
```

#### PostgreSQL Not Running

**Error:**
```
could not connect to server: No such file or directory
```

**Solution:**
```bash
# macOS
brew services start postgresql@14

# Linux
sudo systemctl start postgresql
```

### Clear Cache and Restart

```bash
# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Clear Python cache
cd server_py
rm -rf __pycache__ routers/__pycache__ services/__pycache__
```

### Database Reset

```bash
# Drop and recreate database
dropdb eduvin_ai
createdb eduvin_ai
npm run db:push

# Restart server to re-seed
npm run dev:api
```

---

## Docker Setup (Optional)

### Using Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:14
    environment:
      POSTGRES_DB: eduvin_ai
      POSTGRES_USER: eduvin_user
      POSTGRES_PASSWORD: secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./server_py
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: postgresql://eduvin_user:secure_password@db:5432/eduvin_ai
      SESSION_SECRET: your-secret-here
    depends_on:
      - db

  frontend:
    build: ./client
    ports:
      - "5173:5173"
    depends_on:
      - backend

volumes:
  postgres_data:
```

**Run with Docker:**
```bash
docker-compose up -d
```

---

## Advanced Configuration

### Custom Database Host

If PostgreSQL is on a different server:

```env
DATABASE_URL=postgresql://user:password@192.168.1.100:5432/eduvin_ai
```

### HTTPS in Development

```bash
npm run dev:client -- --https
```

### Environment-Specific Configs

Create `.env.development` and `.env.production` files.

---

## Next Steps

After successful setup:

1. ✅ Explore the [Features Documentation](FEATURES.md)
2. ✅ Review the [API Reference](API.md)
3. ✅ Read the [Development Guide](DEVELOPMENT.md)
4. ✅ Customize seed data in `server_py/seed.py`
5. ✅ Configure AI services (Mistral API key)

---

## Getting Help

- **Documentation**: Check other docs in `/docs` folder
- **API Docs**: Visit http://localhost:5000/docs
- **Issues**: Open a GitHub issue
- **Logs**: Check terminal output for detailed error messages

---

[← Back to Main README](../README.md) | [Features Guide →](FEATURES.md)
