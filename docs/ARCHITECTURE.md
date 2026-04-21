# System Architecture

## Overview

LMS AI is built on a modern, scalable architecture that separates concerns between presentation (React frontend), business logic (FastAPI backend), and data persistence (PostgreSQL).

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  React 18 + TypeScript (Vite)                              │  │
│  │  - TailwindCSS + Shadcn/UI                                 │  │
│  │  - TanStack Query (State Management)                       │  │
│  │  - Wouter (Routing)                                        │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST API
                              │ WebSocket (Notifications)
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Application Layer                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  FastAPI (Python 3.11+)                                    │  │
│  │  ┌──────────────┬──────────────┬──────────────┐            │  │
│  │  │   Routers    │   Services   │Dependencies  │            │  │
│  │  │              │              │              │            │  │
│  │  │ - auth       │ - mistral_ai │ - get_db     │            │  │
│  │  │ - courses    │ - edge_tts   │ - get_user   │            │  │
│  │  │ - speaking   │ - recommender│ - session    │            │  │
│  │  │ - tutor      │              │              │            │  │
│  │  │ - analytics  │              │              │            │  │
│  │  └──────────────┴──────────────┴──────────────┘            │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ SQLAlchemy (Async)
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Data Layer                                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                                       │  │
│  │  - Users, Roles, Permissions                               │  │
│  │  - Courses, Lessons, Content                               │  │
│  │  - Enrollments, Progress, Assessments                      │  │
│  │  - Speaking Practice Records                               │  │
│  │  - Notifications, Analytics                                │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    External Services                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  Mistral AI  │  │  Edge TTS    │  │  File Storage│            │
│  │  (Tutoring)  │  │  (Speech)    │  │  (Audio/Img) │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
└──────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool & dev server |
| TailwindCSS | 3.x | Utility-first CSS |
| Shadcn/UI | Latest | Pre-built components |
| TanStack Query | 5.x | Server state management |
| Wouter | Latest | Lightweight routing |
| Recharts | Latest | Data visualization |
| React Hook Form | Latest | Form management |
| Zod | Latest | Schema validation |

### Backend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.11+ | Programming language |
| FastAPI | 0.115+ | Web framework |
| SQLAlchemy | 2.0+ | ORM (async) |
| Pydantic | 2.10+ | Data validation |
| asyncpg | 0.30+ | PostgreSQL driver |
| Uvicorn | 0.32+ | ASGI server |
| itsdangerous | 2.2+ | Session management |
| httpx | 0.27+ | HTTP client |
| edge-tts | 6.1+ | Text-to-speech |

### Database

| Technology | Purpose |
|------------|---------|
| PostgreSQL | Primary database |
| asyncpg | Async database driver |

## Core Components

### 1. Frontend Architecture

```
client/src/
├── components/          # Reusable UI components
│   ├── ui/             # Shadcn/UI components
│   ├── layout/         # Layout components (sidebar, nav)
│   ├── tutor/          # AI tutor components
│   └── markdown-content.tsx
│
├── pages/              # Route-based pages
│   ├── auth/          # Login, register
│   ├── dashboard/     # Role-based dashboards
│   ├── courses/       # Course catalog & details
│   ├── learning/      # Lesson viewer
│   ├── speaking/      # Speaking practice
│   ├── assessments/   # Quizzes & tests
│   ├── analytics/     # Analytics views
│   ├── team/          # Manager team view
│   └── settings/      # User settings
│
├── hooks/              # Custom React hooks
│   ├── use-auth.ts    # Authentication
│   ├── use-courses.ts # Course data
│   ├── use-tutor.ts   # AI tutor
│   └── use-speaking.ts# Speaking practice
│
└── lib/               # Utilities
    ├── queryClient.ts # React Query config
    └── utils.ts       # Helper functions
```

**Key Patterns:**
- **Component Composition**: Shadcn/UI components composed into feature components
- **Data Fetching**: TanStack Query hooks for server state
- **Type Safety**: Full TypeScript coverage with shared schema types
- **Responsive Design**: Mobile-first Tailwind approach

### 2. Backend Architecture

```
server_py/
├── routers/                    # API endpoints (routes)
│   ├── auth.py                # POST /api/auth/login, /logout
│   ├── users.py               # GET/PUT /api/users/*
│   ├── courses.py             # CRUD /api/courses/*
│   ├── enrollments.py         # POST /api/enrollments/*
│   ├── speaking.py            # POST /api/speaking/practice
│   ├── tutor.py               # POST /api/tutor/chat
│   ├── analytics.py           # GET /api/analytics/*
│   ├── assessments.py         # GET/POST /api/assessments/*
│   ├── analysis.py            # POST /api/analysis/skill-gap
│   └── notifications.py       # GET /api/notifications
│
├── services/                   # Business logic
│   ├── mistral_ai.py          # AI tutor integration
│   ├── edge_tts_service.py    # Text-to-speech
│   └── lesson_recommender.py  # Adaptive learning
│
├── models.py                   # SQLAlchemy ORM models
├── schemas.py                  # Pydantic request/response schemas
├── database.py                 # Database connection & session
├── dependencies.py             # FastAPI dependencies
├── session.py                  # Session middleware
├── storage.py                  # Data access layer (CRUD)
├── config.py                   # Configuration
└── main.py                     # Application entry point
```

**Key Patterns:**
- **Layered Architecture**: Routes → Services → Storage → Database
- **Dependency Injection**: FastAPI's DI for database sessions, auth
- **Async/Await**: Full async support with SQLAlchemy 2.0
- **Schema Validation**: Pydantic models for request/response
- **Session Management**: Cookie-based sessions with itsdangerous

### 3. Database Schema

**Core Entities:**

```sql
users
├── id (primary key)
├── email (unique)
├── password_hash
├── full_name
├── role (employee, manager, admin)
├── department_id
└── manager_id

courses
├── id (primary key)
├── title
├── description
├── difficulty_level
├── category
└── created_at

lessons
├── id (primary key)
├── course_id (foreign key)
├── title
├── content (JSONB)
├── order_index
└── type (reading, video, quiz)

enrollments
├── id (primary key)
├── user_id (foreign key)
├── course_id (foreign key)
├── status (not_started, in_progress, completed)
├── progress_percentage
└── enrolled_at

lesson_progress
├── id (primary key)
├── enrollment_id (foreign key)
├── lesson_id (foreign key)
├── completed
└── completed_at

speaking_practice_records
├── id (primary key)
├── user_id (foreign key)
├── lesson_id (foreign key)
├── audio_url
├── transcript
├── feedback (JSONB)
└── created_at

tutor_conversations
├── id (primary key)
├── user_id (foreign key)
├── lesson_id (foreign key)
├── messages (JSONB)
└── created_at

notifications
├── id (primary key)
├── user_id (foreign key)
├── type
├── message
├── read
└── created_at
```

**Relationships:**
- Users → Enrollments (one-to-many)
- Courses → Lessons (one-to-many)
- Enrollments → LessonProgress (one-to-many)
- Users → SpeakingRecords (one-to-many)
- Users → Notifications (one-to-many)

## Data Flow

### 1. Authentication Flow

```
1. User submits credentials (email/password)
2. Frontend: POST /api/auth/login
3. Backend: Validate credentials
4. Backend: Create session, set cookie
5. Backend: Return user data + role
6. Frontend: Store in React Query cache
7. Frontend: Redirect to role-specific dashboard
```

### 2. Course Enrollment Flow

```
1. User clicks "Enroll" button
2. Frontend: POST /api/enrollments
3. Backend: Create enrollment record
4. Backend: Initialize progress tracking
5. Backend: Create notification
6. Frontend: Invalidate queries, update UI
7. Frontend: Redirect to first lesson
```

### 3. AI Tutor Flow

```
1. User types question in lesson
2. Frontend: POST /api/tutor/chat
3. Backend: Build context (lesson + history)
4. Backend: Call Mistral AI API
5. Backend: Store conversation
6. Backend: Stream response
7. Frontend: Display response with markdown
```

### 4. Speaking Practice Flow

```
1. User records audio
2. Frontend: POST /api/speaking/practice (multipart)
3. Backend: Save audio file
4. Backend: Transcribe with Edge TTS
5. Backend: Analyze pronunciation
6. Backend: Generate feedback
7. Backend: Store record
8. Frontend: Display feedback + score
```

## Security Architecture

### Authentication
- Session-based auth with secure HTTP-only cookies
- Password hashing with bcrypt-compatible algorithms
- CSRF protection via SameSite cookies

### Authorization
- Role-based access control (RBAC)
- Dependency injection for route protection
- Endpoint-level permissions

### Data Protection
- Input validation with Pydantic schemas
- SQL injection prevention via ORM
- XSS protection via React's escaping
- CORS configuration for allowed origins

## Scalability Considerations

### Current Architecture
- Single server deployment
- Direct database connections
- Synchronous AI service calls
- File-based static storage

### Future Enhancements
- **Horizontal Scaling**: Load balancer + multiple app instances
- **Caching**: Redis for session storage and query caching
- **Message Queue**: Celery for async tasks (AI, reports)
- **CDN**: Static asset delivery
- **Database**: Read replicas for analytics
- **Storage**: S3-compatible object storage
- **Containerization**: Docker + Kubernetes

## Performance Optimization

### Frontend
- Code splitting by route
- Lazy loading of heavy components
- React Query caching strategy
- Image optimization
- Bundle size monitoring

### Backend
- Async database operations
- Connection pooling
- Query optimization (indexes, joins)
- Response compression
- Static file caching

## Monitoring & Observability

### Current Setup
- FastAPI automatic API docs (/docs)
- Development server logging
- Browser DevTools

### Recommended Additions
- **Logging**: Structured logging (JSON)
- **Metrics**: Prometheus + Grafana
- **Tracing**: OpenTelemetry
- **Error Tracking**: Sentry
- **Uptime Monitoring**: Health check endpoints

## Development Workflow

```
Developer → Git → CI/CD → Testing → Staging → Production
    │
    ├── Frontend dev server (Vite HMR)
    ├── Backend dev server (Uvicorn reload)
    └── Database (local PostgreSQL)
```

## Deployment Architecture

### Development
```
localhost:5173 (Vite) → localhost:5000 (FastAPI) → localhost:5432 (PostgreSQL)
```

### Production (Recommended)
```
CDN → Reverse Proxy (Nginx) → App Server (Uvicorn) → Database (PostgreSQL)
                                      │
                                      └─→ Object Storage (S3)
                                      └─→ Cache (Redis)
```

## API Design Principles

1. **RESTful Conventions**: Standard HTTP methods and status codes
2. **JSON API**: Content-Type: application/json
3. **Versioning**: `/api/v1/` prefix for future compatibility
4. **Pagination**: Offset/limit for list endpoints
5. **Filtering**: Query parameters for filtering
6. **Error Handling**: Consistent error response format
7. **Documentation**: Auto-generated OpenAPI/Swagger docs

## Next Steps

- [ ] Add caching layer (Redis)
- [ ] Implement background task queue (Celery)
- [ ] Add real-time features (WebSocket subscriptions)
- [ ] Implement search with Elasticsearch
- [ ] Add vector database for AI features (pgvector or Pinecone)
- [ ] Implement rate limiting
- [ ] Add comprehensive monitoring

---

[← Back to Main README](../README.md) | [Setup Guide →](SETUP.md)
