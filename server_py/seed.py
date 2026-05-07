from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

import storage
from old_utils.seed_quiz_data import (
    QUIZ_REACT_COMPONENTS,
    QUIZ_REACT_STATE,
    QUIZ_REACT_HOOKS,
    QUIZ_PYTHON_VARS,
    QUIZ_PYTHON_FLOW,
    QUIZ_PYTHON_FUNCS,
    QUIZ_DS_PANDAS,
    QUIZ_DS_VIZ,
    QUIZ_CLOUD_CONCEPTS,
    QUIZ_CLOUD_AWS,
    QUIZ_CLOUD_DEPLOY,
    QUIZ_SEC_THREATS,
    QUIZ_SEC_NETWORK,
    QUIZ_SEC_PRACTICES,
)


async def seed_database(db: AsyncSession):
    """Seed the database with initial data if empty."""
    users = await storage.get_users(db)
    if len(users) > 0:
        return

    print("Seeding database...")

    # --- Users ---
    l_and_d = await storage.create_user(
        db, email="admin@lms.local", password="password",
        full_name="Admin User", role="l_and_d",
    )
    manager = await storage.create_user(
        db, email="manager@lms.local", password="password",
        full_name="Manager User", role="manager",
    )
    emp1 = await storage.create_user(
        db, email="employee@lms.local", password="password",
        full_name="John Employee", role="employee",
    )
    emp2 = await storage.create_user(
        db, email="jane.doe@lms.local", password="password",
        full_name="Jane Doe", role="employee",
    )
    emp3 = await storage.create_user(
        db, email="alex.kumar@lms.local", password="password",
        full_name="Alex Kumar", role="employee",
    )

    # --- Course 1: Fundamentals of React ---
    c1 = await storage.create_course(
        db, title="Fundamentals of React", status="published", created_by=l_and_d.id,
        description="Master the building blocks of modern web development with React. Learn components, state management, hooks, and best practices for building interactive user interfaces.",
        depth="beginner",
        objectives=["Understand React components and JSX", "Manage state and props effectively", "Use React hooks for modern development"],
    )
    await storage.create_course_module(
        db, course_id=c1.id, title="Components & JSX", sort_order=1,
        quiz=QUIZ_REACT_COMPONENTS,
        audio_url="/static/audio/lesson_1_en_382add5d.mp3",
        content="""## What Are React Components?

React components are the fundamental building blocks of any React application. A component is a reusable piece of UI that can accept inputs (called **props**) and return React elements describing what should appear on the screen.

### Functional Components

```jsx
function Welcome({ name }) {
  return <h1>Hello, {name}!</h1>;
}
```

### JSX — JavaScript XML

JSX lets you write HTML-like syntax directly in JavaScript. Under the hood, JSX is compiled to `React.createElement()` calls.

**Key rules:**
- Every JSX expression must have **one root element**
- Use `className` instead of `class`
- JavaScript expressions go inside `{curly braces}`
- Self-closing tags must end with `/>` (e.g. `<img />`)

### Component Composition

Components can be nested and composed together to build complex UIs:

```jsx
function App() {
  return (
    <div>
      <Header />
      <MainContent />
      <Footer />
    </div>
  );
}
```""",
    )
    await storage.create_course_module(
        db, course_id=c1.id, title="State & Props", sort_order=2,
        quiz=QUIZ_REACT_STATE,
        content="""## Understanding Props

Props (short for "properties") are read-only inputs passed from a parent component to a child. They allow data to flow **downward** through the component tree.

```jsx
function UserCard({ name, email }) {
  return (
    <div className="card">
      <h2>{name}</h2>
      <p>{email}</p>
    </div>
  );
}

// Usage
<UserCard name="Alice" email="alice@example.com" />
```

## Managing State with `useState`

State is data that can **change over time** within a component. When state updates, the component re-renders.

```jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

### Props vs State
| Feature | Props | State |
|---------|-------|-------|
| Owned by | Parent | Component itself |
| Mutable? | No (read-only) | Yes (via setter) |
| Triggers re-render? | When parent re-renders | When updated |""",
    )
    await storage.create_course_module(
        db, course_id=c1.id, title="React Hooks", sort_order=3,
        quiz=QUIZ_REACT_HOOKS,
        content="""## Introduction to Hooks

Hooks are functions that let you "hook into" React features from functional components. They were introduced in React 16.8.

### `useEffect` — Side Effects

`useEffect` runs code after the component renders. It's used for data fetching, subscriptions, and DOM manipulation.

```jsx
import { useState, useEffect } from 'react';

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => setUser(data));
  }, [userId]); // Re-runs when userId changes

  if (!user) return <p>Loading...</p>;
  return <h1>{user.name}</h1>;
}
```

### `useContext` — Sharing Data

Context provides a way to pass data through the component tree without prop drilling.

### `useMemo` & `useCallback` — Performance

- `useMemo` memoizes expensive computations
- `useCallback` memoizes function references

### Rules of Hooks
1. Only call hooks **at the top level** (not in loops, conditions, or nested functions)
2. Only call hooks from **React function components** or custom hooks""",
    )

    # --- Course 2: Python for Beginners ---
    c2 = await storage.create_course(
        db, title="Python for Beginners", status="published", created_by=l_and_d.id,
        description="Start your programming journey with Python — one of the world's most popular and beginner-friendly languages. Cover variables, control flow, functions, and practical exercises.",
        depth="beginner",
        objectives=["Write Python programs from scratch", "Understand data types and control flow", "Create reusable functions and modules"],
    )
    await storage.create_course_module(
        db, course_id=c2.id, title="Variables & Data Types", sort_order=1,
        quiz=QUIZ_PYTHON_VARS,
        content="""## Getting Started with Python

Python is known for its clean, readable syntax. Let's start with the basics.

### Variables

Variables store data values. Python is **dynamically typed** — you don't need to declare the type.

```python
name = "Alice"        # String
age = 30              # Integer
height = 5.7          # Float
is_active = True      # Boolean
```

### Common Data Types

| Type | Example | Description |
|------|---------|-------------|
| `str` | `"hello"` | Text data |
| `int` | `42` | Whole numbers |
| `float` | `3.14` | Decimal numbers |
| `bool` | `True` / `False` | Boolean values |
| `list` | `[1, 2, 3]` | Ordered, mutable collection |
| `dict` | `{"key": "value"}` | Key-value pairs |

### String Operations

```python
greeting = "Hello, World!"
print(greeting.upper())     # HELLO, WORLD!
print(greeting[0:5])        # Hello
print(len(greeting))        # 13
```""",
    )
    await storage.create_course_module(
        db, course_id=c2.id, title="Control Flow", sort_order=2,
        quiz=QUIZ_PYTHON_FLOW,
        content="""## Making Decisions with Conditionals

### if / elif / else

```python
score = 85

if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
elif score >= 70:
    grade = "C"
else:
    grade = "F"

print(f"Your grade: {grade}")  # Your grade: B
```

## Loops

### For Loops

```python
fruits = ["apple", "banana", "cherry"]
for fruit in fruits:
    print(f"I like {fruit}")

# Range-based loop
for i in range(5):
    print(i)  # 0, 1, 2, 3, 4
```

### While Loops

```python
count = 0
while count < 5:
    print(count)
    count += 1
```

### List Comprehensions

A Pythonic way to create lists:

```python
squares = [x**2 for x in range(10)]
evens = [x for x in range(20) if x % 2 == 0]
```""",
    )
    await storage.create_course_module(
        db, course_id=c2.id, title="Functions & Modules", sort_order=3,
        quiz=QUIZ_PYTHON_FUNCS,
        content="""## Defining Functions

Functions are reusable blocks of code. Use `def` to define them.

```python
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

print(greet("Alice"))            # Hello, Alice!
print(greet("Bob", "Hey"))       # Hey, Bob!
```

### *args and **kwargs

```python
def summarize(*args, **kwargs):
    print(f"Positional: {args}")
    print(f"Keyword: {kwargs}")

summarize(1, 2, 3, name="Alice", role="dev")
```

## Modules

Modules let you organize code into separate files.

```python
# math_utils.py
def add(a, b):
    return a + b

# main.py
from math_utils import add
result = add(5, 3)
```

### Standard Library Highlights
- `os` — File and directory operations
- `json` — JSON parsing and serialization
- `datetime` — Date and time handling
- `random` — Random number generation
- `collections` — Specialized data structures""",
    )

    # --- Course 3: Introduction to Data Science ---
    c3 = await storage.create_course(
        db, title="Introduction to Data Science", status="published", created_by=l_and_d.id,
        description="Explore the data science workflow from data wrangling to visualization and machine learning basics. Hands-on with Pandas, Matplotlib, and scikit-learn.",
        depth="intermediate",
        objectives=["Manipulate data with Pandas", "Create insightful visualizations", "Build basic ML models"],
    )
    await storage.create_course_module(
        db, course_id=c3.id, title="Data Wrangling with Pandas", sort_order=1,
        quiz=QUIZ_DS_PANDAS,
        content="""## Introduction to Pandas

Pandas is the go-to library for data manipulation in Python.

### Creating DataFrames

```python
import pandas as pd

data = {
    "Name": ["Alice", "Bob", "Charlie"],
    "Age": [25, 30, 35],
    "Department": ["Engineering", "Marketing", "Sales"]
}
df = pd.DataFrame(data)
print(df)
```

### Reading Data

```python
df = pd.read_csv("employees.csv")
print(df.head())       # First 5 rows
print(df.shape)        # (rows, columns)
print(df.describe())   # Statistical summary
```

### Filtering & Selection

```python
# Select a column
ages = df["Age"]

# Filter rows
seniors = df[df["Age"] > 30]

# Multiple conditions
engineers_over_25 = df[(df["Department"] == "Engineering") & (df["Age"] > 25)]
```

### Handling Missing Data

```python
df.dropna()                    # Remove rows with NaN
df.fillna(0)                   # Replace NaN with 0
df["Age"].fillna(df["Age"].mean())  # Fill with mean
```""",
    )
    await storage.create_course_module(
        db, course_id=c3.id, title="Data Visualization", sort_order=2,
        quiz=QUIZ_DS_VIZ,
        content="""## Visualizing Data

Good visualizations tell stories. Python has powerful libraries for this.

### Matplotlib Basics

```python
import matplotlib.pyplot as plt

months = ["Jan", "Feb", "Mar", "Apr", "May"]
revenue = [12000, 15000, 13500, 17000, 16000]

plt.figure(figsize=(10, 6))
plt.bar(months, revenue, color="steelblue")
plt.title("Monthly Revenue")
plt.ylabel("Revenue ($)")
plt.show()
```

### Seaborn for Statistical Plots

```python
import seaborn as sns

# Distribution plot
sns.histplot(df["Age"], kde=True)

# Correlation heatmap
sns.heatmap(df.corr(), annot=True, cmap="coolwarm")
```

### Choosing the Right Chart
| Data Type | Recommended Chart |
|-----------|------------------|
| Comparison | Bar chart, Grouped bar |
| Trend over time | Line chart |
| Distribution | Histogram, Box plot |
| Relationship | Scatter plot |
| Composition | Pie chart, Stacked bar |""",
    )

    # --- Course 4: Cloud Computing Essentials ---
    c4 = await storage.create_course(
        db, title="Cloud Computing Essentials", status="published", created_by=l_and_d.id,
        description="Understand cloud computing concepts, major AWS services, and learn to deploy applications on the cloud. Perfect for developers transitioning to cloud-native development.",
        depth="beginner",
        objectives=["Understand cloud computing models (IaaS, PaaS, SaaS)", "Navigate core AWS services", "Deploy a basic application on the cloud"],
    )
    await storage.create_course_module(
        db, course_id=c4.id, title="Cloud Concepts", sort_order=1,
        quiz=QUIZ_CLOUD_CONCEPTS,
        content="""## What is Cloud Computing?

Cloud computing delivers computing resources — servers, storage, databases, networking, software — over the internet ("the cloud") on a pay-as-you-go basis.

### Service Models

| Model | You Manage | Provider Manages | Examples |
|-------|-----------|-------------------|----------|
| **IaaS** | OS, Apps, Data | Hardware, Networking | AWS EC2, Azure VMs |
| **PaaS** | Apps, Data | OS, Runtime, Hardware | Heroku, AWS Elastic Beanstalk |
| **SaaS** | Just use it | Everything | Gmail, Salesforce |

### Deployment Models
- **Public Cloud** — Shared infrastructure (AWS, Azure, GCP)
- **Private Cloud** — Dedicated to one organization
- **Hybrid Cloud** — Combination of both

### Key Benefits
1. **Scalability** — Scale up/down based on demand
2. **Cost Efficiency** — Pay only for what you use
3. **Reliability** — Built-in redundancy and backups
4. **Global Reach** — Deploy in regions worldwide""",
    )
    await storage.create_course_module(
        db, course_id=c4.id, title="AWS Core Services", sort_order=2,
        quiz=QUIZ_CLOUD_AWS,
        content="""## Essential AWS Services

### Compute — EC2
Amazon Elastic Compute Cloud provides resizable virtual servers.

Key concepts:
- **Instance types** — t2.micro, m5.large, etc.
- **AMI** — Amazon Machine Image (OS template)
- **Security Groups** — Virtual firewall rules

### Storage — S3
Amazon Simple Storage Service for object storage.

```
aws s3 cp myfile.txt s3://my-bucket/
aws s3 ls s3://my-bucket/
```

### Database — RDS
Managed relational databases (PostgreSQL, MySQL, etc.)

### Networking — VPC
Virtual Private Cloud lets you define your own network topology.

### Serverless — Lambda
Run code without provisioning servers. You're charged per execution.

```python
def lambda_handler(event, context):
    name = event.get("name", "World")
    return {"statusCode": 200, "body": f"Hello, {name}!"}
```""",
    )
    await storage.create_course_module(
        db, course_id=c4.id, title="Deploying on the Cloud", sort_order=3,
        quiz=QUIZ_CLOUD_DEPLOY,
        content="""## Deploying Your First Application

### Step 1: Containerize with Docker

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Step 2: Push to a Registry

```bash
docker build -t my-app .
docker tag my-app:latest <account-id>.dkr.ecr.<region>.amazonaws.com/my-app
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/my-app
```

### Step 3: Deploy

Options include:
- **ECS (Fargate)** — Serverless container orchestration
- **Elastic Beanstalk** — Fully managed platform
- **EKS** — Kubernetes on AWS

### CI/CD Pipeline

Automate deployments with:
1. **Source** — GitHub / CodeCommit
2. **Build** — CodeBuild / GitHub Actions
3. **Deploy** — CodeDeploy / ECS rolling updates

### Best Practices
- Use **environment variables** for secrets
- Enable **health checks** and auto-scaling
- Set up **CloudWatch** for monitoring and alerts""",
    )

    # --- Course 5: Cybersecurity Fundamentals ---
    c5 = await storage.create_course(
        db, title="Cybersecurity Fundamentals", status="published", created_by=l_and_d.id,
        description="Learn to identify threats, secure networks, and follow security best practices. Essential knowledge for every technology professional in today's digital landscape.",
        depth="beginner",
        objectives=["Identify common cyber threats", "Understand network security principles", "Implement security best practices"],
    )
    await storage.create_course_module(
        db, course_id=c5.id, title="Threat Landscape", sort_order=1,
        quiz=QUIZ_SEC_THREATS,
        content="""## Understanding Cyber Threats

### Common Attack Types

| Attack | Description | Example |
|--------|-------------|---------|
| **Phishing** | Deceptive emails/links to steal credentials | Fake login page |
| **Malware** | Malicious software (viruses, ransomware) | WannaCry |
| **SQL Injection** | Exploiting database queries | `' OR 1=1 --` |
| **DDoS** | Overwhelming servers with traffic | Botnet attacks |
| **Man-in-the-Middle** | Intercepting communications | Wi-Fi eavesdropping |

### The CIA Triad

The foundation of information security:

- **Confidentiality** — Only authorized users can access data
- **Integrity** — Data is accurate and unaltered
- **Availability** — Systems and data are accessible when needed

### Social Engineering

Human-targeted attacks are often more effective than technical ones:
- Pretexting (fake scenarios)
- Baiting (infected USB drives)
- Tailgating (physical access)""",
    )
    await storage.create_course_module(
        db, course_id=c5.id, title="Network Security", sort_order=2,
        quiz=QUIZ_SEC_NETWORK,
        content="""## Securing Your Network

### Firewalls

Firewalls control incoming and outgoing network traffic based on rules.

Types:
- **Packet filtering** — Examines individual packets
- **Stateful inspection** — Tracks connection state
- **Application-level** — Inspects application data (WAF)

### Encryption

Protect data in transit and at rest:

- **TLS/SSL** — Encrypts web traffic (HTTPS)
- **AES-256** — Industry-standard symmetric encryption
- **RSA** — Asymmetric encryption for key exchange

### VPN (Virtual Private Network)

Creates an encrypted tunnel between your device and a network.

### Zero Trust Architecture

> "Never trust, always verify."

Key principles:
1. Verify every user and device
2. Limit access to minimum required (least privilege)
3. Assume breach — segment networks
4. Monitor and log everything""",
    )
    await storage.create_course_module(
        db, course_id=c5.id, title="Security Best Practices", sort_order=3,
        quiz=QUIZ_SEC_PRACTICES,
        content="""## Security Best Practices for Developers

### Authentication & Authorization

- Use **multi-factor authentication (MFA)**
- Never store passwords in plain text — use bcrypt or Argon2
- Implement **role-based access control (RBAC)**

### Secure Coding

```python
# BAD — SQL injection vulnerable
query = f"SELECT * FROM users WHERE email = '{user_input}'"

# GOOD — Parameterized query
cursor.execute("SELECT * FROM users WHERE email = %s", (user_input,))
```

### OWASP Top 10 (Key Items)

1. Broken Access Control
2. Cryptographic Failures
3. Injection
4. Insecure Design
5. Security Misconfiguration

### Incident Response Plan

1. **Detect** — Monitor logs and alerts
2. **Contain** — Isolate affected systems
3. **Eradicate** — Remove the threat
4. **Recover** — Restore systems
5. **Learn** — Post-incident review

### Daily Habits
- Keep software and dependencies **updated**
- Use a **password manager**
- Review **access permissions** regularly
- Back up data following the **3-2-1 rule** (3 copies, 2 media types, 1 offsite)""",
    )

    # --- Enrollments with varied progress ---
    e1 = await storage.create_enrollment(db, user_id=emp1.id, course_id=c1.id, status="in_progress", progress_pct=65)
    e2 = await storage.create_enrollment(db, user_id=emp1.id, course_id=c2.id, status="completed", progress_pct=100)
    e3 = await storage.create_enrollment(db, user_id=emp2.id, course_id=c3.id, status="in_progress", progress_pct=40)
    e4 = await storage.create_enrollment(db, user_id=emp2.id, course_id=c4.id, status="assigned", progress_pct=0)
    e5 = await storage.create_enrollment(db, user_id=emp3.id, course_id=c5.id, status="in_progress", progress_pct=80)
    e6 = await storage.create_enrollment(db, user_id=emp3.id, course_id=c1.id, status="in_progress", progress_pct=20)

    # --- LearnerProfiles ---
    lp1 = await storage.get_or_create_learner_profile(db, emp1.id)
    await storage.update_learner_profile(
        db, emp1.id,
        knowledge_level="intermediate", avg_quiz_score=72.0,
        total_modules_completed=3, preferred_pace="normal",
        strong_topics=["React Hooks", "Python Functions"],
        struggle_topics=["State management"],
    )
    lp2 = await storage.get_or_create_learner_profile(db, emp2.id)
    await storage.update_learner_profile(
        db, emp2.id,
        knowledge_level="beginner", avg_quiz_score=45.0,
        total_modules_completed=1, preferred_pace="slow",
        strong_topics=["Data Types"],
        struggle_topics=["Pandas filtering", "Visualization"],
    )
    lp3 = await storage.get_or_create_learner_profile(db, emp3.id)
    await storage.update_learner_profile(
        db, emp3.id,
        knowledge_level="advanced", avg_quiz_score=88.0,
        total_modules_completed=5, preferred_pace="fast",
        strong_topics=["Network Security", "Threat Landscape", "JSX"],
        struggle_topics=["Cloud deployment"],
    )

    # --- SpeakingPractice records for emp1 ---
    from models import SpeakingPractice
    sp1 = SpeakingPractice(
        user_id=emp1.id,
        prompt="Describe your favorite hobby and why you enjoy it.",
        transcript="I really enjoy coding because it lets me solve complex problems and build useful tools. I started programming about three years ago and found it incredibly rewarding.",
        pronunciation_score=82.5, fluency_score=78.0,
        feedback="Good job articulating your thoughts clearly. Your sentence structure was solid and your vocabulary was appropriate for professional communication.",
        corrections="Try to avoid starting sentences with 'I really' too often. Consider using more varied sentence starters for a more polished delivery.",
        created_at=datetime.utcnow() - timedelta(days=7),
    )
    sp2 = SpeakingPractice(
        user_id=emp1.id,
        prompt="Explain the importance of effective communication in a team.",
        transcript="Effective communication in a team is crucial because it ensures everyone is aligned on goals. When team members share information openly, it reduces misunderstandings and increases productivity.",
        pronunciation_score=88.0, fluency_score=85.5,
        feedback="Excellent response with a clear structure. You effectively conveyed the key points about team communication. Your pace was comfortable and natural.",
        corrections="Consider adding a specific example next time to make your point more concrete and memorable.",
        created_at=datetime.utcnow() - timedelta(days=3),
    )
    db.add(sp1)
    db.add(sp2)
    await db.commit()

    # --- TutorMessages for emp1 / course1 ---
    from models import CourseModule
    from sqlalchemy import select
    mods_q = await db.execute(select(CourseModule).where(CourseModule.course_id == c1.id).limit(1))
    first_mod = mods_q.scalar_one_or_none()
    if first_mod:
        await storage.create_tutor_message(db, user_id=emp1.id, course_id=c1.id, module_id=first_mod.id,
            role="user", content="What's the difference between props and state in React?")
        await storage.create_tutor_message(db, user_id=emp1.id, course_id=c1.id, module_id=first_mod.id,
            role="assistant", content="Props are read-only inputs passed from a parent to a child component. State is internal, mutable data owned by the component itself. When state changes, the component re-renders; when the parent re-renders, the child gets updated props.")
        await storage.create_tutor_message(db, user_id=emp1.id, course_id=c1.id, module_id=first_mod.id,
            role="user", content="Can a component change its own props?")
        await storage.create_tutor_message(db, user_id=emp1.id, course_id=c1.id, module_id=first_mod.id,
            role="assistant", content="No! Props are immutable from the child's perspective. If you need the child to influence data, you'd pass a callback function as a prop from the parent, and the child calls it to notify the parent.")

    # --- Notifications ---
    await storage.create_notification(
        db, user_id=emp1.id, title="Welcome to LMS! 🎉",
        message="Welcome! You've been enrolled in Fundamentals of React. Start learning now.", is_read=False,
    )
    await storage.create_notification(
        db, user_id=emp1.id, title="Course Completed 🎉",
        message="Congratulations! You have completed Python for Beginners.", is_read=False,
    )
    await storage.create_notification(
        db, user_id=emp1.id, title="Speaking Practice Analyzed",
        message="Your practice has been analyzed. Pronunciation: 88%, Fluency: 85%.", is_read=True,
    )
    await storage.create_notification(
        db, user_id=emp2.id, title="Course Assigned",
        message="You've been assigned \"Cloud Computing Essentials\". Start learning now!", is_read=False,
    )
    await storage.create_notification(
        db, user_id=emp2.id, title="Reminder: Low Progress",
        message="You've been at 40% on Introduction to Data Science for a while. Need help? Talk to your AI Tutor!", is_read=False,
    )
    await storage.create_notification(
        db, user_id=emp3.id, title="Almost There!",
        message="You're 80% through Cybersecurity Fundamentals. Keep going — you're doing great!", is_read=False,
    )

    print("Database seeded successfully with 5 courses (quiz data), learner profiles, speaking practices, and notifications.")
