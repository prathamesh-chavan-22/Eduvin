# EduVin AI

> A comprehensive AI-powered Learning Management System for workforce training, skill development, and adaptive learning.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)

---

## 📋 Overview

EduVin AI is a modern, full-stack learning management platform designed for enterprise workforce development. It combines adaptive learning, AI-powered tutoring, skill gap analysis, and comprehensive content management into a unified solution.

### Key Features

- 🎓 **Adaptive Learning Paths** - Personalized course recommendations based on performance
- 🤖 **AI Tutor** - Real-time learning assistance powered by Mistral AI
- 🗣️ **Speaking Practice** - Interactive pronunciation and fluency training with Edge TTS
- 📊 **Analytics Dashboard** - Role-based insights for learners, managers, and L&D teams
- 📈 **Skill Gap Analysis** - Workforce skill assessment and training planning
- 🎯 **Assessments & Quizzes** - Interactive evaluations with instant feedback
- 🔔 **Real-time Notifications** - Stay updated on course progress and achievements
- 👥 **Multi-Role Support** - Employee, Manager, and L&D Admin roles

---

## 🏗️ Architecture

**Frontend:** React 18 + TypeScript + Vite + TailwindCSS + Shadcn/UI
**Backend:** Python 3.11 + FastAPI + SQLAlchemy (Async)
**Database:** PostgreSQL with async support
**AI Services:** Mistral AI (Tutoring), Edge TTS (Speech)

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────┐
│  React Client   │─────▶│  FastAPI Server  │─────▶│ PostgreSQL  │
│  (Port 5173)    │      │   (Port 5000)    │      │             │
└─────────────────┘      └──────────────────┘      └─────────────┘
                                  │
                         ┌────────┴────────┐
                         │                 │
                    ┌────▼────┐      ┌────▼────┐
                    │ Mistral │      │Edge TTS │
                    │   AI    │      │ Service │
                    └─────────┘      └─────────┘
```

**Production deployment:** Build the client with `npm run build`, then serve `dist/` via nginx (or any static file server) and proxy `/api/*` to FastAPI. See [nginx.conf](nginx.conf) for a template.

---

## 🚀 Quick Start

### Option 1: Python Backend Only (Recommended)

This is the simplest setup — run the FastAPI backend directly without Node.js for the server.

#### Prerequisites

- **Python** 3.11+
- **PostgreSQL** 14+
- **Node.js** 18+ and npm (only for building the frontend)
- **Rhubarb Lip-Sync** *(optional — required for avatar lip-sync on newly generated courses)*
  ```bash
  # macOS (Homebrew — unofficial tap or direct download)
  # Download the binary from https://github.com/DanielSWolf/rhubarb-lip-sync/releases
  # and place it somewhere on your PATH, e.g.:
  mv rhubarb /usr/local/bin/rhubarb
  chmod +x /usr/local/bin/rhubarb
  ```
  If Rhubarb is not installed, courses still generate normally; the avatar will  
  display in idle mode (closed mouth) while audio plays.

#### 1. Clone the repository

```bash
git clone <repository-url>
cd Web-App-Stack
```

#### 2. Setup Python backend

```bash
# Create and activate a virtual environment (recommended)
cd server_py
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

#### 3. Configure environment

```bash
# Copy the example env file
cp .env.example .env

# Edit with your database credentials and API keys
nano .env
```

#### 4. Setup database

```bash
# Create the database
createdb edtech_lms

# The app auto-creates tables and seeds data on first startup
```

#### 5. Run the backend

```bash
cd server_py
python -m uvicorn main:app --reload --host 0.0.0.0 --port 5000
```

#### 6. Run the frontend (development)

```bash
# In a separate terminal, from project root
npm install
npm run dev
```

#### 7. Access the application

- Frontend (dev): http://localhost:5173
- API: http://localhost:5000
- API Docs: http://localhost:5000/docs

---

### Option 2: Production Deployment with Nginx

For production, serve the built client with nginx and proxy API requests to FastAPI.

#### 1. Build the frontend

```bash
npm install
npm run build
```

This outputs static files to `dist/`.

#### 2. Start FastAPI

```bash
cd server_py
python -m uvicorn main:app --host 127.0.0.1 --port 5000
```

#### 3. Configure nginx

Copy and edit the provided [nginx.conf](nginx.conf):

```bash
# Update the root path in nginx.conf to your absolute dist/ path
# e.g., root /home/user/Web-App-Stack/dist;

nginx -c $(pwd)/nginx.conf
```

#### 4. Access the application

- Application: http://localhost (or your server's domain)
- API: http://localhost/api/* (proxied to FastAPI)

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design, tech stack, and component overview |
| [Setup Guide](docs/SETUP.md) | Detailed installation and configuration |
| [Features](docs/FEATURES.md) | Comprehensive feature documentation |
| [API Reference](docs/API.md) | REST API endpoints and schemas |
| [Development Guide](docs/DEVELOPMENT.md) | Development workflow and best practices |

---

## 🎯 User Roles

### 👨‍🎓 Employee (Learner)
- Browse and enroll in courses
- Complete lessons and assessments
- Practice speaking with AI feedback
- Get personalized AI tutoring
- Track learning progress

### 👔 Manager
- View team progress and performance
- Identify skill gaps in team members
- Assign courses to team members
- Monitor completion rates
- Access team analytics

### 🎓 L&D Admin
- Manage course catalog
- Upload workforce data
- Run skill gap analyses
- Generate training plans
- Monitor platform analytics
- Manage users and enrollments

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** TailwindCSS + Shadcn/UI components
- **State Management:** TanStack Query (React Query)
- **Routing:** Wouter
- **Charts:** Recharts
- **Icons:** Lucide React
- **Forms:** React Hook Form + Zod

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **ORM:** SQLAlchemy 2.0 (Async)
- **Database:** PostgreSQL with asyncpg driver
- **Validation:** Pydantic v2
- **Sessions:** itsdangerous
- **Server:** Uvicorn with auto-reload

### AI/ML Services
- **AI Tutor:** Mistral AI API
- **TTS:** Edge TTS (Microsoft)
- **Lip-Sync:** Rhubarb Lip-Sync CLI (phoneme timing from audio)
- **Content Analysis:** Custom ML models

### DevOps
- **Database Migrations:** Auto-created on startup
- **Package Manager:** npm (frontend only)
- **Python Dependencies:** pip (requirements.txt)

---

## 📁 Project Structure

```
Web-App-Stack/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route-based page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and helpers
│   └── public/            # Static assets
│
├── server_py/             # Python FastAPI backend
│   ├── routers/           # API route handlers
│   │   ├── auth.py       # Authentication endpoints
│   │   ├── courses.py    # Course management
│   │   ├── speaking.py   # Speaking practice
│   │   ├── tutor.py      # AI tutor endpoints
│   │   ├── analytics.py  # Analytics & reporting
│   │   └── ...
│   ├── services/          # Business logic services
│   │   ├── mistral_ai.py # AI integration
│   │   ├── edge_tts_service.py
│   │   ├── lip_sync_service.py # Rhubarb lip-sync invocation
│   │   └── lesson_recommender.py
│   ├── models.py          # SQLAlchemy models
│   ├── schemas.py         # Pydantic schemas
│   └── main.py            # Application entry point
│
├── shared/                # Shared TypeScript types
│   ├── schema.ts          # Database schema types
│   └── routes.ts          # API route definitions
│
├── docs/                  # Documentation (modular)
├── dist/                  # Built frontend (generated by npm run build)
└── script/                # Build and utility scripts
```

---

## 🧪 Testing

```bash
# Type checking (frontend)
npm run check

# Backend unit tests
cd server_py && python3 -m unittest discover -s tests -v

# Frontend viseme engine tests
node --import tsx --test client/src/components/avatar/viseme.test.ts
```

---

## 🚢 Deployment

```bash
# Build frontend for production
npm run build

# Start FastAPI backend
cd server_py && python -m uvicorn main:app --host 0.0.0.0 --port 5000

# Serve dist/ with nginx (see nginx.conf for template)
```

📖 **[Deployment Guide](docs/DEPLOYMENT.md)** (coming soon)

---

## 🔐 Default Credentials

The system seeds demo users on first startup:

| Role | Email | Password |
|------|-------|----------|
| L&D Admin | admin@eduvin.local | password |
| Manager | manager@eduvin.local | password |
| Employee | employee@eduvin.local | password |

⚠️ **Change these credentials in production!**

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/)
- UI components from [Shadcn/UI](https://ui.shadcn.com/)
- Icons by [Lucide](https://lucide.dev/)
- AI powered by [Mistral AI](https://mistral.ai/)

---

## 📧 Support

For questions or issues, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ for modern workforce learning**
