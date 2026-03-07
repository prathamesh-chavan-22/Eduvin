# API Reference

Complete REST API documentation for EduVin AI.

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Auth Endpoints](#auth-endpoints)
- [User Endpoints](#user-endpoints)
- [Course Endpoints](#course-endpoints)
- [Enrollment Endpoints](#enrollment-endpoints)
- [Lesson Progress Endpoints](#lesson-progress-endpoints)
- [Speaking Practice Endpoints](#speaking-practice-endpoints)
- [AI Tutor Endpoints](#ai-tutor-endpoints)
- [Assessment Endpoints](#assessment-endpoints)
- [Analytics Endpoints](#analytics-endpoints)
- [Notification Endpoints](#notification-endpoints)
- [Analysis Endpoints](#analysis-endpoints)
- [Error Responses](#error-responses)

---

## Base URL

```
Development: http://localhost:5000
Production: https://your-domain.com
```

All endpoints are prefixed with `/api/` (e.g., `/api/auth/login`)

---

## Authentication

### Session-Based Auth

The API uses cookie-based session authentication:
- Login returns a secure HTTP-only cookie
- Include cookie in subsequent requests
- Logout clears the session cookie

### Protected Endpoints

Most endpoints require authentication. Include session cookie in requests:

```bash
curl -X GET http://localhost:5000/api/users/me \
  -H "Cookie: session=<session-cookie>"
```

---

## Auth Endpoints

### POST `/api/auth/login`

Authenticate user and create session.

**Request Body:**
```json
{
  "email": "employee@eduvin.local",
  "password": "password"
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "email": "employee@eduvin.local",
  "full_name": "John Doe",
  "role": "employee",
  "department_id": 1
}
```

**Sets Cookie:** `session=<encrypted-session-id>`

**Errors:**
- `400 Bad Request` - Missing fields
- `401 Unauthorized` - Invalid credentials

---

### POST `/api/auth/logout`

Destroy current session.

**Response:** `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

**Clears Cookie:** `session`

---

### GET `/api/auth/me`

Get current authenticated user.

**Response:** `200 OK`
```json
{
  "id": 1,
  "email": "employee@eduvin.local",
  "full_name": "John Doe",
  "role": "employee",
  "department_id": 1,
  "manager_id": 2
}
```

**Errors:**
- `401 Unauthorized` - Not logged in

---

## User Endpoints

### GET `/api/users`

List all users (Admin only).

**Query Parameters:**
- `role` (optional): Filter by role (employee, manager, admin)
- `department_id` (optional): Filter by department
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "email": "employee@eduvin.local",
    "full_name": "John Doe",
    "role": "employee",
    "department_id": 1,
    "created_at": "2026-01-15T10:00:00Z"
  }
]
```

---

### GET `/api/users/me`

Get current user's profile.

**Response:** `200 OK`
```json
{
  "id": 1,
  "email": "employee@eduvin.local",
  "full_name": "John Doe",
  "role": "employee",
  "department_id": 1,
  "manager_id": 2,
  "notification_preferences": {
    "email": true,
    "push": false
  }
}
```

---

### PUT `/api/users/me`

Update current user's profile.

**Request Body:**
```json
{
  "full_name": "Jane Doe",
  "notification_preferences": {
    "email": false,
    "push": true
  }
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "email": "employee@eduvin.local",
  "full_name": "Jane Doe",
  "role": "employee",
  "notification_preferences": {
    "email": false,
    "push": true
  }
}
```

---

### GET `/api/users/{user_id}`

Get specific user details (Manager/Admin only).

**Response:** `200 OK`
```json
{
  "id": 5,
  "email": "team@eduvin.local",
  "full_name": "Team Member",
  "role": "employee",
  "manager_id": 2,
  "enrollments": [
    {
      "course_id": 1,
      "status": "in_progress",
      "progress_percentage": 45
    }
  ]
}
```

---

## Course Endpoints

### GET `/api/courses`

List all available courses.

**Query Parameters:**
- `category` (optional): Filter by category
- `difficulty_level` (optional): beginner, intermediate, advanced
- `enrolled` (optional): true to show only enrolled courses
- `limit` (optional): Number of results
- `offset` (optional): Pagination offset

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "title": "Introduction to Python",
    "description": "Learn Python basics...",
    "category": "Programming",
    "difficulty_level": "beginner",
    "estimated_duration": 120,
    "lesson_count": 10,
    "created_at": "2026-01-01T00:00:00Z"
  }
]
```

---

### GET `/api/courses/{course_id}`

Get detailed course information.

**Response:** `200 OK`
```json
{
  "id": 1,
  "title": "Introduction to Python",
  "description": "Learn Python basics from scratch...",
  "category": "Programming",
  "difficulty_level": "beginner",
  "estimated_duration": 120,
  "prerequisites": [2, 3],
  "lessons": [
    {
      "id": 101,
      "title": "Variables and Data Types",
      "order_index": 1,
      "type": "reading",
      "estimated_duration": 15
    }
  ],
  "enrollment": {
    "enrolled": true,
    "status": "in_progress",
    "progress_percentage": 30
  }
}
```

---

### POST `/api/courses`

Create new course (Admin only).

**Request Body:**
```json
{
  "title": "Advanced JavaScript",
  "description": "Deep dive into JS...",
  "category": "Programming",
  "difficulty_level": "advanced",
  "estimated_duration": 180,
  "prerequisites": [1, 2]
}
```

**Response:** `201 Created`
```json
{
  "id": 10,
  "title": "Advanced JavaScript",
  "created_at": "2026-03-07T10:00:00Z"
}
```

---

### PUT `/api/courses/{course_id}`

Update course (Admin only).

**Request Body:** (partial updates allowed)
```json
{
  "title": "Updated Title",
  "description": "New description"
}
```

**Response:** `200 OK`

---

### DELETE `/api/courses/{course_id}`

Delete course (Admin only).

**Response:** `204 No Content`

---

### GET `/api/courses/{course_id}/lessons/{lesson_id}`

Get lesson content.

**Response:** `200 OK`
```json
{
  "id": 101,
  "course_id": 1,
  "title": "Variables and Data Types",
  "content": {
    "type": "markdown",
    "data": "# Variables\n\nIn Python, variables..."
  },
  "type": "reading",
  "order_index": 1,
  "estimated_duration": 15,
  "resources": [
    {
      "title": "Python Docs",
      "url": "https://docs.python.org"
    }
  ]
}
```

---

## Enrollment Endpoints

### GET `/api/enrollments`

Get current user's enrollments.

**Query Parameters:**
- `status` (optional): not_started, in_progress, completed

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "course_id": 1,
    "course_title": "Introduction to Python",
    "status": "in_progress",
    "progress_percentage": 45,
    "enrolled_at": "2026-02-01T10:00:00Z",
    "completed_at": null,
    "deadline": "2026-03-31T23:59:59Z"
  }
]
```

---

### POST `/api/enrollments`

Enroll in a course.

**Request Body:**
```json
{
  "course_id": 1
}
```

**Response:** `201 Created`
```json
{
  "id": 5,
  "course_id": 1,
  "status": "not_started",
  "enrolled_at": "2026-03-07T10:00:00Z"
}
```

**Errors:**
- `400 Bad Request` - Already enrolled
- `404 Not Found` - Course doesn't exist

---

### GET `/api/enrollments/{enrollment_id}`

Get enrollment details.

**Response:** `200 OK`
```json
{
  "id": 1,
  "course_id": 1,
  "status": "in_progress",
  "progress_percentage": 45,
  "lesson_progress": [
    {
      "lesson_id": 101,
      "completed": true,
      "completed_at": "2026-02-05T14:30:00Z"
    }
  ]
}
```

---

### POST `/api/enrollments/{enrollment_id}/progress`

Update lesson progress.

**Request Body:**
```json
{
  "lesson_id": 101,
  "completed": true
}
```

**Response:** `200 OK`
```json
{
  "lesson_id": 101,
  "completed": true,
  "enrollment_progress": 50
}
```

---

## Speaking Practice Endpoints

### POST `/api/speaking/practice`

Submit speaking practice recording.

**Request:** `multipart/form-data`
- `audio` (file): Audio recording (WAV, MP3)
- `lesson_id` (int): Related lesson
- `exercise_id` (int): Specific exercise

**Response:** `200 OK`
```json
{
  "id": 123,
  "transcript": "Hello, my name is John.",
  "pronunciation_score": 85,
  "fluency_score": 78,
  "feedback": {
    "overall": "Good pronunciation overall!",
    "improvements": [
      "Work on 'th' sound in 'the'",
      "Reduce pauses between words"
    ],
    "words": [
      {
        "word": "hello",
        "score": 95,
        "correct": true
      }
    ]
  },
  "audio_url": "/static/audio/123.wav",
  "created_at": "2026-03-07T10:15:00Z"
}
```

---

### GET `/api/speaking/history`

Get speaking practice history.

**Query Parameters:**
- `limit` (optional): Number of results
- `lesson_id` (optional): Filter by lesson

**Response:** `200 OK`
```json
[
  {
    "id": 123,
    "lesson_id": 101,
    "pronunciation_score": 85,
    "fluency_score": 78,
    "created_at": "2026-03-07T10:15:00Z"
  }
]
```

---

## AI Tutor Endpoints

### POST `/api/tutor/chat`

Send message to AI tutor.

**Request Body:**
```json
{
  "message": "Can you explain variables in Python?",
  "lesson_id": 101,
  "conversation_id": null
}
```

**Response:** `200 OK`
```json
{
  "conversation_id": "abc123",
  "response": "Sure! Variables in Python are containers for storing data values. Unlike other programming languages...",
  "context": {
    "lesson_title": "Variables and Data Types",
    "lesson_id": 101
  }
}
```

---

### GET `/api/tutor/conversations`

Get tutor conversation history.

**Response:** `200 OK`
```json
[
  {
    "id": "abc123",
    "lesson_id": 101,
    "started_at": "2026-03-07T10:00:00Z",
    "message_count": 5,
    "last_message": "Thanks for explaining!"
  }
]
```

---

### GET `/api/tutor/conversations/{conversation_id}`

Get specific conversation.

**Response:** `200 OK`
```json
{
  "id": "abc123",
  "lesson_id": 101,
  "messages": [
    {
      "role": "user",
      "content": "Can you explain variables?",
      "timestamp": "2026-03-07T10:00:00Z"
    },
    {
      "role": "assistant",
      "content": "Sure! Variables are...",
      "timestamp": "2026-03-07T10:00:05Z"
    }
  ]
}
```

---

## Assessment Endpoints

### GET `/api/assessments/courses/{course_id}`

Get assessments for a course.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "title": "Python Basics Quiz",
    "type": "quiz",
    "question_count": 10,
    "passing_score": 70,
    "time_limit": 30,
    "attempts_allowed": 3
  }
]
```

---

### GET `/api/assessments/{assessment_id}`

Get assessment details.

**Response:** `200 OK`
```json
{
  "id": 1,
  "title": "Python Basics Quiz",
  "description": "Test your knowledge...",
  "questions": [
    {
      "id": 1,
      "question": "What is a variable?",
      "type": "multiple_choice",
      "options": [
        "A container for data",
        "A function",
        "A loop",
        "A class"
      ],
      "correct_answer_index": null
    }
  ],
  "time_limit": 30,
  "passing_score": 70
}
```

---

### POST `/api/assessments/{assessment_id}/submit`

Submit assessment answers.

**Request Body:**
```json
{
  "answers": [
    {
      "question_id": 1,
      "answer": 0
    },
    {
      "question_id": 2,
      "answer": "Python is a programming language"
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "score": 85,
  "passing": true,
  "total_questions": 10,
  "correct_answers": 9,
  "results": [
    {
      "question_id": 1,
      "correct": true,
      "explanation": "Correct! A variable is a container..."
    }
  ],
  "completed_at": "2026-03-07T10:30:00Z"
}
```

---

## Analytics Endpoints

### GET `/api/analytics/overview`

Get user's learning analytics overview.

**Response:** `200 OK`
```json
{
  "courses_completed": 5,
  "courses_in_progress": 3,
  "hours_spent": 45.5,
  "average_score": 87,
  "streak_days": 7,
  "achievements": [
    {
      "id": "first_course",
      "title": "First Course Completed",
      "earned_at": "2026-02-15T00:00:00Z"
    }
  ]
}
```

---

### GET `/api/analytics/progress`

Get detailed progress data.

**Query Parameters:**
- `period` (optional): week, month, year
- `course_id` (optional): Filter by course

**Response:** `200 OK`
```json
{
  "daily_activity": [
    {
      "date": "2026-03-01",
      "minutes": 45,
      "lessons_completed": 3
    }
  ],
  "course_progress": [
    {
      "course_id": 1,
      "progress": 75,
      "time_spent": 120
    }
  ]
}
```

---

### GET `/api/analytics/team`

Get team analytics (Manager only).

**Response:** `200 OK`
```json
{
  "team_size": 10,
  "active_learners": 8,
  "average_completion_rate": 65,
  "top_performers": [
    {
      "user_id": 5,
      "name": "Alice",
      "courses_completed": 8
    }
  ],
  "at_risk": [
    {
      "user_id": 7,
      "name": "Bob",
      "days_inactive": 14
    }
  ]
}
```

---

## Notification Endpoints

### GET `/api/notifications`

Get user notifications.

**Query Parameters:**
- `unread` (optional): true to show only unread
- `limit` (optional): Number of results

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "type": "course_assigned",
    "title": "New Course Assigned",
    "message": "Your manager assigned you 'Introduction to Python'",
    "read": false,
    "created_at": "2026-03-07T09:00:00Z",
    "data": {
      "course_id": 1
    }
  }
]
```

---

### PUT `/api/notifications/{notification_id}/read`

Mark notification as read.

**Response:** `200 OK`
```json
{
  "id": 1,
  "read": true
}
```

---

### PUT `/api/notifications/read-all`

Mark all notifications as read.

**Response:** `200 OK`
```json
{
  "marked_read": 15
}
```

---

## Analysis Endpoints

### POST `/api/analysis/upload`

Upload employee data for analysis (Admin only).

**Request:** `multipart/form-data`
- `file` (CSV): Employee data file

**Response:** `200 OK`
```json
{
  "upload_id": "xyz789",
  "records_processed": 150,
  "status": "processing"
}
```

---

### POST `/api/analysis/skill-gap`

Run skill gap analysis (Admin only).

**Request Body:**
```json
{
  "department_id": 1,
  "target_skills": ["Python", "SQL", "Leadership"],
  "upload_id": "xyz789"
}
```

**Response:** `200 OK`
```json
{
  "analysis_id": "analysis_456",
  "status": "completed",
  "gaps": [
    {
      "skill": "Python",
      "average_proficiency": 45,
      "target_proficiency": 70,
      "gap": 25,
      "affected_employees": 87
    }
  ],
  "recommendations": [
    {
      "skill": "Python",
      "courses": [1, 5, 8],
      "priority": "high"
    }
  ]
}
```

---

## Error Responses

### Standard Error Format

All errors return JSON with a `message` field:

```json
{
  "message": "Description of what went wrong"
}
```

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful request |
| 201 | Created | Resource created |
| 204 | No Content | Successful deletion |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Not logged in |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation error |
| 500 | Internal Server Error | Server error |

### Example Error Responses

**400 Bad Request:**
```json
{
  "message": "Validation error",
  "details": {
    "email": "Invalid email format"
  }
}
```

**401 Unauthorized:**
```json
{
  "message": "Not authenticated"
}
```

**403 Forbidden:**
```json
{
  "message": "Insufficient permissions. Admin role required."
}
```

**404 Not Found:**
```json
{
  "message": "Course not found"
}
```

---

## Rate Limiting

Current implementation has no rate limiting. Recommended for production:

- **General endpoints**: 100 requests/minute
- **AI tutor**: 10 requests/minute
- **Upload endpoints**: 5 requests/minute

---

## Interactive API Documentation

Visit these URLs when server is running:

- **Swagger UI**: http://localhost:5000/docs
- **ReDoc**: http://localhost:5000/redoc

Both provide interactive API testing and complete schema documentation.

---

[← Back to Main README](../README.md) | [Development Guide →](DEVELOPMENT.md)
