# EduVin AI

> A comprehensive AI-powered Learning Management System for workforce training, skill development, and adaptive learning.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 18+](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)

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
**Real-time:** WebSocket support for notifications  

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

📖 **[View Detailed Architecture](docs/ARCHITECTURE.md)**

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **PostgreSQL** 14+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Web-App-Stack
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Setup database**
   ```bash
   createdb eduvin_ai
   npm run db:push
   ```

5. **Run development servers**
   ```bash
   # Terminal 1 - Frontend
   npm run dev:client

   # Terminal 2 - Backend API
   npm run dev:api
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - API: http://localhost:5000
   - API Docs: http://localhost:5000/docs

📖 **[Detailed Setup Guide](docs/SETUP.md)**

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
- **Content Analysis:** Custom ML models

### DevOps
- **Database Migrations:** Drizzle Kit
- **Package Manager:** npm
- **Python Dependencies:** pip (pyproject.toml)
- **Type Checking:** TypeScript + mypy (planned)

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
└── script/                # Build and utility scripts
```

---

## 🧪 Testing

```bash
# Run frontend tests
npm run test

# Run backend tests (when implemented)
cd server_py && pytest

# Type checking
npm run check
```

---

## 🚢 Deployment

```bash
# Build frontend for production
npm run build

# Start production server
npm start
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
