--
-- PostgreSQL database dump
--

\restrict 5DZ4NKl29UU3Vf9XDCPyPgvTHstQASwt1F1vmtOPfgaMABK8gV7AFXJldM4fwai

-- Dumped from database version 18.3 (Homebrew)
-- Dumped by pg_dump version 18.3 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password, full_name, role, preferred_language, created_at) FROM stdin;
1	admin@eduvin.local	password	Admin User	l_and_d	en	2026-04-21 16:43:02.230214
2	manager@eduvin.local	password	Manager User	manager	en	2026-04-21 16:43:02.259831
3	employee@eduvin.local	password	John Employee	employee	en	2026-04-21 16:43:02.280174
4	jane.doe@eduvin.local	password	Jane Doe	employee	en	2026-04-21 16:43:02.286628
5	alex.kumar@eduvin.local	password	Alex Kumar	employee	en	2026-04-21 16:43:02.296312
6	playwright.ld.1776769982508@lms.local	password	Playwright L&D	l_and_d	en	2026-04-21 16:43:02.513816
\.


--
-- Data for Name: workflow_analyses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.workflow_analyses (id, created_by, filename, status, column_mapping, total_employees, created_at, completed_at) FROM stdin;
\.


--
-- Data for Name: analysis_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.analysis_results (id, analysis_id, employee_name, department, manager_remarks, ai_summary, recommended_skills, matched_course_ids, suggested_trainings, created_at) FROM stdin;
\.


--
-- Data for Name: app_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.app_sessions (sid, user_id, expires_at) FROM stdin;
ptIflvm4F8IG2ii0omvIZBR56tQtZLRu0IjdWijmTWg	6	2026-05-21 11:13:02.522354
ADIpoRiITvtKNgPABD-FYCSzvidU41IRSXq1YjSXtf8	3	2026-05-22 05:28:52.116319
\.


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.courses (id, title, description, status, created_by, created_at, objectives, audience, depth, generation_status, generation_progress) FROM stdin;
1	Fundamentals of React	Master the building blocks of modern web development with React. Learn components, state management, hooks, and best practices for building interactive user interfaces.	published	1	2026-04-21 16:43:02.301841	{"Understand React components and JSX","Manage state and props effectively","Use React hooks for modern development"}	\N	beginner	\N	\N
2	Python for Beginners	Start your programming journey with Python — one of the world's most popular and beginner-friendly languages. Cover variables, control flow, functions, and practical exercises.	published	1	2026-04-21 16:43:02.346511	{"Write Python programs from scratch","Understand data types and control flow","Create reusable functions and modules"}	\N	beginner	\N	\N
3	Introduction to Data Science	Explore the data science workflow from data wrangling to visualization and machine learning basics. Hands-on with Pandas, Matplotlib, and scikit-learn.	published	1	2026-04-21 16:43:02.362837	{"Manipulate data with Pandas","Create insightful visualizations","Build basic ML models"}	\N	intermediate	\N	\N
4	Cloud Computing Essentials	Understand cloud computing concepts, major AWS services, and learn to deploy applications on the cloud. Perfect for developers transitioning to cloud-native development.	published	1	2026-04-21 16:43:02.376358	{"Understand cloud computing models (IaaS, PaaS, SaaS)","Navigate core AWS services","Deploy a basic application on the cloud"}	\N	beginner	\N	\N
5	Cybersecurity Fundamentals	Learn to identify threats, secure networks, and follow security best practices. Essential knowledge for every technology professional in today's digital landscape.	published	1	2026-04-21 16:43:02.384842	{"Identify common cyber threats","Understand network security principles","Implement security best practices"}	\N	beginner	\N	\N
\.


--
-- Data for Name: course_modules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.course_modules (id, course_id, title, content, sort_order, quiz, audio_url, images) FROM stdin;
1	1	Components & JSX	## What Are React Components?\n\nReact components are the fundamental building blocks of any React application. A component is a reusable piece of UI that can accept inputs (called **props**) and return React elements describing what should appear on the screen.\n\n### Functional Components\n\n```jsx\nfunction Welcome({ name }) {\n  return <h1>Hello, {name}!</h1>;\n}\n```\n\n### JSX — JavaScript XML\n\nJSX lets you write HTML-like syntax directly in JavaScript. Under the hood, JSX is compiled to `React.createElement()` calls.\n\n**Key rules:**\n- Every JSX expression must have **one root element**\n- Use `className` instead of `class`\n- JavaScript expressions go inside `{curly braces}`\n- Self-closing tags must end with `/>` (e.g. `<img />`)\n\n### Component Composition\n\nComponents can be nested and composed together to build complex UIs:\n\n```jsx\nfunction App() {\n  return (\n    <div>\n      <Header />\n      <MainContent />\n      <Footer />\n    </div>\n  );\n}\n```	1	{"questions": [{"q": "What is the correct way to define a functional React component?", "options": ["class MyComp extends React", "function MyComp() { return <div/> }", "const MyComp = React.create()", "MyComp.render = () => <div/>"], "correct": 1}, {"q": "Which attribute replaces 'class' in JSX?", "options": ["cssClass", "className", "htmlClass", "styleClass"], "correct": 1}, {"q": "What does JSX stand for?", "options": ["JavaScript Xtended", "JavaScript XML", "Java Syntax Extension", "JSON XML"], "correct": 1}]}	\N	null
2	1	State & Props	## Understanding Props\n\nProps (short for "properties") are read-only inputs passed from a parent component to a child. They allow data to flow **downward** through the component tree.\n\n```jsx\nfunction UserCard({ name, email }) {\n  return (\n    <div className="card">\n      <h2>{name}</h2>\n      <p>{email}</p>\n    </div>\n  );\n}\n\n// Usage\n<UserCard name="Alice" email="alice@example.com" />\n```\n\n## Managing State with `useState`\n\nState is data that can **change over time** within a component. When state updates, the component re-renders.\n\n```jsx\nimport { useState } from 'react';\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div>\n      <p>Count: {count}</p>\n      <button onClick={() => setCount(count + 1)}>Increment</button>\n    </div>\n  );\n}\n```\n\n### Props vs State\n| Feature | Props | State |\n|---------|-------|-------|\n| Owned by | Parent | Component itself |\n| Mutable? | No (read-only) | Yes (via setter) |\n| Triggers re-render? | When parent re-renders | When updated |	2	{"questions": [{"q": "Props in React are:", "options": ["Mutable data owned by child", "Read-only inputs from parent", "Global state", "Event handlers"], "correct": 1}, {"q": "Which hook manages local state?", "options": ["useEffect", "useContext", "useState", "useMemo"], "correct": 2}, {"q": "When does a component re-render due to state?", "options": ["Never", "When setState is called", "When props change", "Both B and C"], "correct": 3}]}	\N	null
3	1	React Hooks	## Introduction to Hooks\n\nHooks are functions that let you "hook into" React features from functional components. They were introduced in React 16.8.\n\n### `useEffect` — Side Effects\n\n`useEffect` runs code after the component renders. It's used for data fetching, subscriptions, and DOM manipulation.\n\n```jsx\nimport { useState, useEffect } from 'react';\n\nfunction UserProfile({ userId }) {\n  const [user, setUser] = useState(null);\n\n  useEffect(() => {\n    fetch(`/api/users/${userId}`)\n      .then(res => res.json())\n      .then(data => setUser(data));\n  }, [userId]); // Re-runs when userId changes\n\n  if (!user) return <p>Loading...</p>;\n  return <h1>{user.name}</h1>;\n}\n```\n\n### `useContext` — Sharing Data\n\nContext provides a way to pass data through the component tree without prop drilling.\n\n### `useMemo` & `useCallback` — Performance\n\n- `useMemo` memoizes expensive computations\n- `useCallback` memoizes function references\n\n### Rules of Hooks\n1. Only call hooks **at the top level** (not in loops, conditions, or nested functions)\n2. Only call hooks from **React function components** or custom hooks	3	{"questions": [{"q": "useEffect runs:", "options": ["Before render", "After render", "During render", "Only once ever"], "correct": 1}, {"q": "What is the purpose of useCallback?", "options": ["Fetch data", "Memoize function references", "Create context", "Handle form submit"], "correct": 1}, {"q": "Rule of Hooks: hooks must be called:", "options": ["Inside loops", "At the top level", "In class components", "Inside conditionals"], "correct": 1}]}	\N	null
4	2	Variables & Data Types	## Getting Started with Python\n\nPython is known for its clean, readable syntax. Let's start with the basics.\n\n### Variables\n\nVariables store data values. Python is **dynamically typed** — you don't need to declare the type.\n\n```python\nname = "Alice"        # String\nage = 30              # Integer\nheight = 5.7          # Float\nis_active = True      # Boolean\n```\n\n### Common Data Types\n\n| Type | Example | Description |\n|------|---------|-------------|\n| `str` | `"hello"` | Text data |\n| `int` | `42` | Whole numbers |\n| `float` | `3.14` | Decimal numbers |\n| `bool` | `True` / `False` | Boolean values |\n| `list` | `[1, 2, 3]` | Ordered, mutable collection |\n| `dict` | `{"key": "value"}` | Key-value pairs |\n\n### String Operations\n\n```python\ngreeting = "Hello, World!"\nprint(greeting.upper())     # HELLO, WORLD!\nprint(greeting[0:5])        # Hello\nprint(len(greeting))        # 13\n```	1	{"questions": [{"q": "What type is `x = 3.14` in Python?", "options": ["int", "str", "float", "complex"], "correct": 2}, {"q": "Which data type is ordered and mutable?", "options": ["tuple", "set", "dict", "list"], "correct": 3}, {"q": "What does len('hello') return?", "options": ["4", "5", "6", "Error"], "correct": 1}]}	\N	null
5	2	Control Flow	## Making Decisions with Conditionals\n\n### if / elif / else\n\n```python\nscore = 85\n\nif score >= 90:\n    grade = "A"\nelif score >= 80:\n    grade = "B"\nelif score >= 70:\n    grade = "C"\nelse:\n    grade = "F"\n\nprint(f"Your grade: {grade}")  # Your grade: B\n```\n\n## Loops\n\n### For Loops\n\n```python\nfruits = ["apple", "banana", "cherry"]\nfor fruit in fruits:\n    print(f"I like {fruit}")\n\n# Range-based loop\nfor i in range(5):\n    print(i)  # 0, 1, 2, 3, 4\n```\n\n### While Loops\n\n```python\ncount = 0\nwhile count < 5:\n    print(count)\n    count += 1\n```\n\n### List Comprehensions\n\nA Pythonic way to create lists:\n\n```python\nsquares = [x**2 for x in range(10)]\nevens = [x for x in range(20) if x % 2 == 0]\n```	2	{"questions": [{"q": "Which loop iterates a fixed number of times?", "options": ["while", "for", "do-while", "foreach"], "correct": 1}, {"q": "What does `range(5)` produce?", "options": ["[1,2,3,4,5]", "[0,1,2,3,4]", "[0,1,2,3,4,5]", "5"], "correct": 1}, {"q": "List comprehension `[x*2 for x in range(3)]` gives:", "options": ["[0,2,4]", "[2,4,6]", "[1,2,3]", "[0,1,2]"], "correct": 0}]}	\N	null
6	2	Functions & Modules	## Defining Functions\n\nFunctions are reusable blocks of code. Use `def` to define them.\n\n```python\ndef greet(name, greeting="Hello"):\n    return f"{greeting}, {name}!"\n\nprint(greet("Alice"))            # Hello, Alice!\nprint(greet("Bob", "Hey"))       # Hey, Bob!\n```\n\n### *args and **kwargs\n\n```python\ndef summarize(*args, **kwargs):\n    print(f"Positional: {args}")\n    print(f"Keyword: {kwargs}")\n\nsummarize(1, 2, 3, name="Alice", role="dev")\n```\n\n## Modules\n\nModules let you organize code into separate files.\n\n```python\n# math_utils.py\ndef add(a, b):\n    return a + b\n\n# main.py\nfrom math_utils import add\nresult = add(5, 3)\n```\n\n### Standard Library Highlights\n- `os` — File and directory operations\n- `json` — JSON parsing and serialization\n- `datetime` — Date and time handling\n- `random` — Random number generation\n- `collections` — Specialized data structures	3	{"questions": [{"q": "Which keyword defines a function?", "options": ["func", "def", "fn", "function"], "correct": 1}, {"q": "*args captures:", "options": ["Keyword arguments", "Required args only", "Positional arguments", "All global vars"], "correct": 2}, {"q": "**kwargs captures:", "options": ["Positional args", "Keyword arguments as dict", "Default values", "Module imports"], "correct": 1}]}	\N	null
7	3	Data Wrangling with Pandas	## Introduction to Pandas\n\nPandas is the go-to library for data manipulation in Python.\n\n### Creating DataFrames\n\n```python\nimport pandas as pd\n\ndata = {\n    "Name": ["Alice", "Bob", "Charlie"],\n    "Age": [25, 30, 35],\n    "Department": ["Engineering", "Marketing", "Sales"]\n}\ndf = pd.DataFrame(data)\nprint(df)\n```\n\n### Reading Data\n\n```python\ndf = pd.read_csv("employees.csv")\nprint(df.head())       # First 5 rows\nprint(df.shape)        # (rows, columns)\nprint(df.describe())   # Statistical summary\n```\n\n### Filtering & Selection\n\n```python\n# Select a column\nages = df["Age"]\n\n# Filter rows\nseniors = df[df["Age"] > 30]\n\n# Multiple conditions\nengineers_over_25 = df[(df["Department"] == "Engineering") & (df["Age"] > 25)]\n```\n\n### Handling Missing Data\n\n```python\ndf.dropna()                    # Remove rows with NaN\ndf.fillna(0)                   # Replace NaN with 0\ndf["Age"].fillna(df["Age"].mean())  # Fill with mean\n```	1	{"questions": [{"q": "Which method shows the first 5 rows of a DataFrame?", "options": ["df.tail()", "df.head()", "df.first()", "df.peek()"], "correct": 1}, {"q": "How do you drop rows with NaN?", "options": ["df.fillna()", "df.dropna()", "df.clean()", "df.remove_nan()"], "correct": 1}, {"q": "df.shape returns:", "options": ["Column names", "Row count only", "(rows, columns) tuple", "Data types"], "correct": 2}]}	\N	null
9	4	Cloud Concepts	## What is Cloud Computing?\n\nCloud computing delivers computing resources — servers, storage, databases, networking, software — over the internet ("the cloud") on a pay-as-you-go basis.\n\n### Service Models\n\n| Model | You Manage | Provider Manages | Examples |\n|-------|-----------|-------------------|----------|\n| **IaaS** | OS, Apps, Data | Hardware, Networking | AWS EC2, Azure VMs |\n| **PaaS** | Apps, Data | OS, Runtime, Hardware | Heroku, AWS Elastic Beanstalk |\n| **SaaS** | Just use it | Everything | Gmail, Salesforce |\n\n### Deployment Models\n- **Public Cloud** — Shared infrastructure (AWS, Azure, GCP)\n- **Private Cloud** — Dedicated to one organization\n- **Hybrid Cloud** — Combination of both\n\n### Key Benefits\n1. **Scalability** — Scale up/down based on demand\n2. **Cost Efficiency** — Pay only for what you use\n3. **Reliability** — Built-in redundancy and backups\n4. **Global Reach** — Deploy in regions worldwide	1	{"questions": [{"q": "What does IaaS stand for?", "options": ["Internet as a Service", "Infrastructure as a Service", "Integration as a Service", "Intelligence as a Service"], "correct": 1}, {"q": "Public cloud is:", "options": ["Dedicated to one org", "Shared infrastructure", "On-premises only", "Always free"], "correct": 1}, {"q": "Pay-as-you-go is a benefit of:", "options": ["On-premises", "Cloud computing", "Mainframes", "Private servers"], "correct": 1}]}	\N	null
11	4	Deploying on the Cloud	## Deploying Your First Application\n\n### Step 1: Containerize with Docker\n\n```dockerfile\nFROM python:3.11-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install -r requirements.txt\nCOPY . .\nCMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]\n```\n\n### Step 2: Push to a Registry\n\n```bash\ndocker build -t my-app .\ndocker tag my-app:latest <account-id>.dkr.ecr.<region>.amazonaws.com/my-app\ndocker push <account-id>.dkr.ecr.<region>.amazonaws.com/my-app\n```\n\n### Step 3: Deploy\n\nOptions include:\n- **ECS (Fargate)** — Serverless container orchestration\n- **Elastic Beanstalk** — Fully managed platform\n- **EKS** — Kubernetes on AWS\n\n### CI/CD Pipeline\n\nAutomate deployments with:\n1. **Source** — GitHub / CodeCommit\n2. **Build** — CodeBuild / GitHub Actions\n3. **Deploy** — CodeDeploy / ECS rolling updates\n\n### Best Practices\n- Use **environment variables** for secrets\n- Enable **health checks** and auto-scaling\n- Set up **CloudWatch** for monitoring and alerts	3	{"questions": [{"q": "What is a Dockerfile?", "options": ["A cloud config", "A container build recipe", "A CI/CD pipeline", "A DNS record"], "correct": 1}, {"q": "ECS with Fargate provides:", "options": ["Managed Kubernetes", "Serverless container orchestration", "Load balancing only", "Static hosting"], "correct": 1}, {"q": "Which tool is AWS-native CI/CD for deployment?", "options": ["Jenkins", "CircleCI", "CodeDeploy", "TravisCI"], "correct": 2}]}	\N	null
13	5	Network Security	## Securing Your Network\n\n### Firewalls\n\nFirewalls control incoming and outgoing network traffic based on rules.\n\nTypes:\n- **Packet filtering** — Examines individual packets\n- **Stateful inspection** — Tracks connection state\n- **Application-level** — Inspects application data (WAF)\n\n### Encryption\n\nProtect data in transit and at rest:\n\n- **TLS/SSL** — Encrypts web traffic (HTTPS)\n- **AES-256** — Industry-standard symmetric encryption\n- **RSA** — Asymmetric encryption for key exchange\n\n### VPN (Virtual Private Network)\n\nCreates an encrypted tunnel between your device and a network.\n\n### Zero Trust Architecture\n\n> "Never trust, always verify."\n\nKey principles:\n1. Verify every user and device\n2. Limit access to minimum required (least privilege)\n3. Assume breach — segment networks\n4. Monitor and log everything	2	{"questions": [{"q": "TLS/SSL is used to:", "options": ["Compress data", "Encrypt web traffic", "Route packets", "Monitor logs"], "correct": 1}, {"q": "VPN creates:", "options": ["A public hotspot", "An encrypted tunnel", "A firewall rule", "A DMZ zone"], "correct": 1}, {"q": "Zero Trust principle is:", "options": ["Trust all internal traffic", "Never trust, always verify", "Trust encrypted traffic", "Trust verified IPs"], "correct": 1}]}	\N	null
8	3	Data Visualization	## Visualizing Data\n\nGood visualizations tell stories. Python has powerful libraries for this.\n\n### Matplotlib Basics\n\n```python\nimport matplotlib.pyplot as plt\n\nmonths = ["Jan", "Feb", "Mar", "Apr", "May"]\nrevenue = [12000, 15000, 13500, 17000, 16000]\n\nplt.figure(figsize=(10, 6))\nplt.bar(months, revenue, color="steelblue")\nplt.title("Monthly Revenue")\nplt.ylabel("Revenue ($)")\nplt.show()\n```\n\n### Seaborn for Statistical Plots\n\n```python\nimport seaborn as sns\n\n# Distribution plot\nsns.histplot(df["Age"], kde=True)\n\n# Correlation heatmap\nsns.heatmap(df.corr(), annot=True, cmap="coolwarm")\n```\n\n### Choosing the Right Chart\n| Data Type | Recommended Chart |\n|-----------|------------------|\n| Comparison | Bar chart, Grouped bar |\n| Trend over time | Line chart |\n| Distribution | Histogram, Box plot |\n| Relationship | Scatter plot |\n| Composition | Pie chart, Stacked bar |	2	{"questions": [{"q": "Which chart is best for showing trends over time?", "options": ["Pie chart", "Bar chart", "Line chart", "Scatter plot"], "correct": 2}, {"q": "Which library provides the histplot function?", "options": ["matplotlib", "numpy", "seaborn", "pandas"], "correct": 2}, {"q": "sns.heatmap is used for:", "options": ["Time series", "Correlation matrices", "Maps", "3D plots"], "correct": 1}]}	\N	null
10	4	AWS Core Services	## Essential AWS Services\n\n### Compute — EC2\nAmazon Elastic Compute Cloud provides resizable virtual servers.\n\nKey concepts:\n- **Instance types** — t2.micro, m5.large, etc.\n- **AMI** — Amazon Machine Image (OS template)\n- **Security Groups** — Virtual firewall rules\n\n### Storage — S3\nAmazon Simple Storage Service for object storage.\n\n```\naws s3 cp myfile.txt s3://my-bucket/\naws s3 ls s3://my-bucket/\n```\n\n### Database — RDS\nManaged relational databases (PostgreSQL, MySQL, etc.)\n\n### Networking — VPC\nVirtual Private Cloud lets you define your own network topology.\n\n### Serverless — Lambda\nRun code without provisioning servers. You're charged per execution.\n\n```python\ndef lambda_handler(event, context):\n    name = event.get("name", "World")\n    return {"statusCode": 200, "body": f"Hello, {name}!"}\n```	2	{"questions": [{"q": "What is AWS EC2?", "options": ["Object storage", "Virtual servers", "DNS service", "Email service"], "correct": 1}, {"q": "S3 is used for:", "options": ["Compute", "Networking", "Object storage", "Database"], "correct": 2}, {"q": "AWS Lambda is:", "options": ["Container service", "Serverless compute", "Managed database", "Load balancer"], "correct": 1}]}	\N	null
14	5	Security Best Practices	## Security Best Practices for Developers\n\n### Authentication & Authorization\n\n- Use **multi-factor authentication (MFA)**\n- Never store passwords in plain text — use bcrypt or Argon2\n- Implement **role-based access control (RBAC)**\n\n### Secure Coding\n\n```python\n# BAD — SQL injection vulnerable\nquery = f"SELECT * FROM users WHERE email = '{user_input}'"\n\n# GOOD — Parameterized query\ncursor.execute("SELECT * FROM users WHERE email = %s", (user_input,))\n```\n\n### OWASP Top 10 (Key Items)\n\n1. Broken Access Control\n2. Cryptographic Failures\n3. Injection\n4. Insecure Design\n5. Security Misconfiguration\n\n### Incident Response Plan\n\n1. **Detect** — Monitor logs and alerts\n2. **Contain** — Isolate affected systems\n3. **Eradicate** — Remove the threat\n4. **Recover** — Restore systems\n5. **Learn** — Post-incident review\n\n### Daily Habits\n- Keep software and dependencies **updated**\n- Use a **password manager**\n- Review **access permissions** regularly\n- Back up data following the **3-2-1 rule** (3 copies, 2 media types, 1 offsite)	3	{"questions": [{"q": "Bcrypt is used for:", "options": ["Encrypting disks", "Hashing passwords", "Compressing files", "Network encryption"], "correct": 1}, {"q": "RBAC stands for:", "options": ["Role-Based Access Control", "Remote Backup And Control", "Real-time Binary Access Control", "Rule-Based Admin Config"], "correct": 0}, {"q": "OWASP Top 10 item #1 (2021) is:", "options": ["SQL Injection", "Broken Access Control", "XSS", "CSRF"], "correct": 1}]}	\N	null
12	5	Threat Landscape	## Understanding Cyber Threats\n\n### Common Attack Types\n\n| Attack | Description | Example |\n|--------|-------------|---------|\n| **Phishing** | Deceptive emails/links to steal credentials | Fake login page |\n| **Malware** | Malicious software (viruses, ransomware) | WannaCry |\n| **SQL Injection** | Exploiting database queries | `' OR 1=1 --` |\n| **DDoS** | Overwhelming servers with traffic | Botnet attacks |\n| **Man-in-the-Middle** | Intercepting communications | Wi-Fi eavesdropping |\n\n### The CIA Triad\n\nThe foundation of information security:\n\n- **Confidentiality** — Only authorized users can access data\n- **Integrity** — Data is accurate and unaltered\n- **Availability** — Systems and data are accessible when needed\n\n### Social Engineering\n\nHuman-targeted attacks are often more effective than technical ones:\n- Pretexting (fake scenarios)\n- Baiting (infected USB drives)\n- Tailgating (physical access)	1	{"questions": [{"q": "What is phishing?", "options": ["A network attack", "Deceptive emails to steal credentials", "Malware injection", "DoS attack"], "correct": 1}, {"q": "Which stands for Confidentiality, Integrity, Availability?", "options": ["CIS", "CISA", "CIA Triad", "CVSS"], "correct": 2}, {"q": "SQL Injection exploits:", "options": ["Network packets", "Database queries", "File uploads", "Email servers"], "correct": 1}]}	\N	null
\.


--
-- Data for Name: assessments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assessments (id, user_id, course_id, module_id, score, answers, submitted_at) FROM stdin;
\.


--
-- Data for Name: audio_uploads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audio_uploads (id, user_id, filename, file_path, audio_url, transcript, mindmap_data, status, error_message, created_at, completed_at) FROM stdin;
\.


--
-- Data for Name: course_concept_graphs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.course_concept_graphs (id, course_id, mermaid, status, nodes, edges, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: enrollments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.enrollments (id, user_id, course_id, status, progress_pct, started_at, completed_at) FROM stdin;
1	3	1	in_progress	65	2026-04-21 11:13:02.392041	\N
2	3	2	completed	100	2026-04-21 11:13:02.395538	\N
3	4	3	in_progress	40	2026-04-21 11:13:02.403358	\N
4	4	4	assigned	0	2026-04-21 11:13:02.407271	\N
5	5	5	in_progress	80	2026-04-21 11:13:02.411727	\N
6	5	1	in_progress	20	2026-04-21 11:13:02.414968	\N
\.


--
-- Data for Name: exam_papers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exam_papers (id, course_id, generated_by, questions, total_marks, created_at) FROM stdin;
1	5	1	[{"type": "essay", "question": "Explain the CIA Triad in cybersecurity. Discuss how each component (Confidentiality, Integrity, Availability) is critical to an organization's security posture. Provide real-world examples where a failure in one component led to a security breach. Additionally, analyze how modern cyber threats (e.g., ransomware, phishing) impact these components.", "marks": 15, "rubric": "A good answer will: (1) Clearly define each component of the CIA Triad with accurate explanations. (2) Provide real-world examples of breaches caused by failures in each component. (3) Analyze how specific cyber threats (e.g., ransomware, phishing) target or disrupt these components. (4) Demonstrate critical thinking by discussing the interdependence of the three components. (5) Use proper terminology and structure the response coherently."}, {"type": "long", "question": "Compare and contrast the three types of firewalls (Packet Filtering, Stateful Inspection, and Application-Level). For each type, describe its strengths, weaknesses, and a scenario where it would be the most appropriate choice. Additionally, explain how a Zero Trust Architecture complements firewall usage in a modern network security strategy.", "marks": 12, "rubric": "A good answer will: (1) Accurately describe each firewall type, including how they function. (2) Highlight the strengths and weaknesses of each firewall type with specific examples. (3) Provide realistic scenarios where each firewall type is the best choice. (4) Explain the principles of Zero Trust Architecture and how it enhances firewall security. (5) Use technical terminology correctly and present a well-structured comparison."}, {"type": "short", "question": "Describe the concept of 'least privilege' in access control. Why is it a critical principle in cybersecurity? Provide an example of how failing to implement least privilege can lead to a security incident.", "marks": 5, "rubric": "A good answer will: (1) Clearly define 'least privilege' and its importance in access control. (2) Explain why it is a critical principle in cybersecurity. (3) Provide a concrete example of a security incident resulting from not implementing least privilege. (4) Be concise and use appropriate terminology."}, {"type": "long", "question": "You are a security consultant tasked with improving the security of a web application. The application is vulnerable to SQL injection attacks. Outline a step-by-step plan to mitigate this vulnerability. Your plan should include: (1) Immediate actions to contain the risk, (2) Long-term fixes to prevent future occurrences, (3) Tools or techniques to test for and validate the fixes, and (4) Best practices to ensure secure coding moving forward.", "marks": 10, "rubric": "A good answer will: (1) Provide a clear, actionable plan with immediate and long-term steps. (2) Include specific tools or techniques for testing and validation (e.g., parameterized queries, static code analysis). (3) Discuss best practices for secure coding to prevent SQL injection. (4) Demonstrate an understanding of the vulnerability and its impact. (5) Use technical accuracy and logical structure."}, {"type": "definition", "question": "Define the following terms: (a) Phishing, (b) Multi-Factor Authentication (MFA), (c) Zero Trust Architecture, (d) Encryption.", "marks": 8, "rubric": "A good answer will: (1) Provide clear, concise, and accurate definitions for each term. (2) Include key characteristics or examples where relevant (e.g., types of phishing, how MFA works). (3) Use proper cybersecurity terminology. (4) Avoid vague or overly simplistic explanations."}, {"type": "short", "question": "What is the 3-2-1 backup rule? Explain why it is an essential practice for data protection and disaster recovery.", "marks": 5, "rubric": "A good answer will: (1) Clearly describe the 3-2-1 backup rule (3 copies, 2 media types, 1 offsite). (2) Explain the importance of each component of the rule. (3) Discuss how this rule enhances data protection and disaster recovery efforts. (4) Be concise and use appropriate terminology."}, {"type": "long", "question": "An organization has experienced a ransomware attack that encrypted critical business data. As part of the incident response team, outline the steps you would take to: (1) Contain the attack, (2) Eradicate the ransomware, (3) Recover the data, and (4) Prevent future attacks. Include specific tools, techniques, or policies that would be used at each stage.", "marks": 10, "rubric": "A good answer will: (1) Provide a detailed, step-by-step incident response plan. (2) Include specific actions for containment, eradication, recovery, and prevention. (3) Mention tools, techniques, or policies relevant to each stage (e.g., isolating systems, using backups, patching vulnerabilities). (4) Demonstrate an understanding of ransomware attacks and their impact. (5) Use technical accuracy and logical structure."}, {"type": "definition", "question": "Define the following terms: (a) Social Engineering, (b) VPN (Virtual Private Network), (c) OWASP Top 10, (d) Role-Based Access Control (RBAC).", "marks": 5, "rubric": "A good answer will: (1) Provide clear, concise, and accurate definitions for each term. (2) Include key characteristics or examples where relevant (e.g., types of social engineering, purpose of VPN). (3) Use proper cybersecurity terminology. (4) Avoid vague or overly simplistic explanations."}]	70	2026-04-22 10:19:59.263129
2	4	1	[{"type": "definition", "bloom_level": "remember", "question": "Define the term 'Cloud Computing' and list its two key characteristics.", "marks": 3, "rubric": "A good answer should: (1) Provide a concise definition of cloud computing (e.g., delivery of computing resources over the internet), (2) List at least two key characteristics (e.g., scalability, pay-as-you-go model, on-demand access).", "options": [], "answer": ""}, {"type": "mcq", "bloom_level": "remember", "question": "Which of the following is an example of a SaaS service?", "marks": 2, "rubric": "A good answer should correctly identify the SaaS example (e.g., Gmail, Salesforce) from the options provided.", "options": ["A. AWS EC2", "B. Heroku", "C. Gmail", "D. Docker"], "answer": "C"}, {"type": "short", "bloom_level": "understand", "question": "Explain the difference between IaaS and PaaS with respect to what the user and provider manage.", "marks": 5, "rubric": "A good answer should: (1) Clearly state what the user manages in IaaS (OS, apps, data) and PaaS (apps, data), (2) State what the provider manages in IaaS (hardware, networking) and PaaS (OS, runtime, hardware), (3) Provide an example for each model.", "options": [], "answer": ""}, {"type": "mcq", "bloom_level": "understand", "question": "Which AWS service is best suited for running serverless functions?", "marks": 2, "rubric": "A good answer should correctly identify AWS Lambda as the serverless compute service.", "options": ["A. EC2", "B. RDS", "C. Lambda", "D. S3"], "answer": "C"}, {"type": "long", "bloom_level": "apply", "question": "You are tasked with deploying a Python web application on AWS. Describe the steps you would take to containerize the application using Docker and deploy it using AWS ECS Fargate.", "marks": 10, "rubric": "A good answer should: (1) Outline the process of writing a Dockerfile (e.g., base image, dependencies, CMD), (2) Explain how to build and push the Docker image to ECR, (3) Describe the setup of an ECS cluster and task definition, (4) Mention the use of Fargate for serverless deployment.", "options": [], "answer": ""}, {"type": "short", "bloom_level": "apply", "question": "Write the AWS CLI command to list all objects in an S3 bucket named 'my-data-bucket'.", "marks": 5, "rubric": "A good answer should provide the correct AWS CLI command (e.g., `aws s3 ls s3://my-data-bucket/`).", "options": [], "answer": ""}, {"type": "long", "bloom_level": "analyze", "question": "Compare the use cases for AWS EC2, Lambda, and Elastic Beanstalk. In what scenarios would you choose one over the others? Provide examples for each.", "marks": 12, "rubric": "A good answer should: (1) Describe the use case for EC2 (e.g., full control over infrastructure, long-running applications), (2) Describe the use case for Lambda (e.g., event-driven, short-lived functions), (3) Describe the use case for Elastic Beanstalk (e.g., fully managed platform for web apps), (4) Provide a real-world example for each service.", "options": [], "answer": ""}, {"type": "essay", "bloom_level": "evaluate", "question": "A company is deciding between using a public cloud, private cloud, or hybrid cloud for their infrastructure. Evaluate the pros and cons of each deployment model and recommend the best option based on the following requirements: high scalability, cost efficiency, and compliance with strict data security regulations.", "marks": 15, "rubric": "A good answer should: (1) Evaluate the pros and cons of public cloud (e.g., scalability, cost efficiency vs. limited control over security), (2) Evaluate the pros and cons of private cloud (e.g., full control over security vs. higher costs and limited scalability), (3) Evaluate the pros and cons of hybrid cloud (e.g., balance of control and scalability vs. complexity), (4) Recommend the best option based on the given requirements and justify the choice.", "options": [], "answer": ""}, {"type": "long", "bloom_level": "analyze", "question": "Analyze the following scenario: Your team has deployed a containerized application on AWS ECS, but users are experiencing intermittent downtime. Describe how you would troubleshoot this issue, including the AWS tools and best practices you would use.", "marks": 10, "rubric": "A good answer should: (1) Identify potential causes of downtime (e.g., insufficient resources, misconfigured health checks, networking issues), (2) Describe the use of AWS CloudWatch for monitoring logs and metrics, (3) Explain how to check ECS service events and task statuses, (4) Mention best practices such as enabling auto-scaling and setting up alerts.", "options": [], "answer": ""}, {"type": "essay", "bloom_level": "create", "question": "Design a CI/CD pipeline for a web application deployed on AWS. Your pipeline should include stages for source control, build, testing, and deployment. Describe the AWS services you would use at each stage and explain how they integrate to automate the deployment process.", "marks": 15, "rubric": "A good answer should: (1) Outline the stages of the CI/CD pipeline (source, build, test, deploy), (2) Specify AWS services for each stage (e.g., CodeCommit/GitHub for source, CodeBuild for build, CodeDeploy/ECS for deployment), (3) Explain how these services integrate (e.g., triggers, IAM roles, deployment configurations), (4) Include best practices such as automated testing and rollback mechanisms.", "options": [], "answer": ""}]	79	2026-04-22 10:57:54.353085
\.


--
-- Data for Name: exam_attempts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exam_attempts (id, exam_paper_id, user_id, image_urls, score, total_marks, evaluation_text, submitted_at) FROM stdin;
1	2	3	[]	0	79	Auto-graded 10 questions. Correct: 0.	2026-04-22 11:00:06.679202
\.


--
-- Data for Name: exam_paper_configs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exam_paper_configs (id, exam_paper_id, blooms_distribution, question_format, notify_user_ids, live_enabled, live_duration_minutes, created_at) FROM stdin;
1	2	{"remember": 2, "understand": 2, "apply": 2, "analyze": 2, "evaluate": 1, "create": 1}	mixed	[1]	t	30	2026-04-22 10:58:18.141254
\.


--
-- Data for Name: learner_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.learner_profiles (id, user_id, knowledge_level, avg_quiz_score, total_modules_completed, struggle_topics, strong_topics, preferred_pace, updated_at) FROM stdin;
1	3	intermediate	72	3	["State management"]	["React Hooks", "Python Functions"]	normal	2026-04-21 16:43:02.421341
2	4	beginner	45	1	["Pandas filtering", "Visualization"]	["Data Types"]	slow	2026-04-21 16:43:02.427746
3	5	advanced	88	5	["Cloud deployment"]	["Network Security", "Threat Landscape", "JSX"]	fast	2026-04-21 16:43:02.434378
4	6	beginner	0	0	\N	\N	normal	2026-04-21 16:43:03.043071
5	1	beginner	0	0	\N	\N	normal	2026-04-22 10:19:37.335963
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, title, message, is_read, created_at) FROM stdin;
3	3	Speaking Practice Analyzed	Your practice has been analyzed. Pronunciation: 88%, Fluency: 85%.	t	2026-04-21 16:43:02.480492
4	4	Course Assigned	You've been assigned "Cloud Computing Essentials". Start learning now!	f	2026-04-21 16:43:02.484698
5	4	Reminder: Low Progress	You've been at 40% on Introduction to Data Science for a while. Need help? Talk to your AI Tutor!	f	2026-04-21 16:43:02.496422
6	5	Almost There!	You're 80% through Cybersecurity Fundamentals. Keep going — you're doing great!	f	2026-04-21 16:43:02.4985
1	3	Welcome to LMS! 🎉	Welcome! You've been enrolled in Fundamentals of React. Start learning now.	t	2026-04-21 16:43:02.457798
2	3	Course Completed 🎉	Congratulations! You have completed Python for Beginners.	t	2026-04-21 16:43:02.475064
7	1	Exam Submission Alert	John Employee submitted a live exam attempt for "Cloud Computing Essentials". Current score: 0/79.	f	2026-04-22 11:00:06.702043
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.session (sid, sess, expire) FROM stdin;
03lBsLRJq_THLGRyPDasH6Reb1JEAPLG	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-05T07:22:51.213Z","httpOnly":true,"path":"/"},"userId":1}	2026-04-05 12:56:09
_ckIxl61b1meRNUBsnS9t7ODyyPkSKUo	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-05T07:15:07.584Z","httpOnly":true,"path":"/"},"userId":2}	2026-04-05 12:56:09
\.


--
-- Data for Name: speaking_topics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.speaking_topics (id, name, description, icon, sort_order, created_at) FROM stdin;
\.


--
-- Data for Name: speaking_lessons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.speaking_lessons (id, topic_id, title, description, difficulty_level, prompt_template_en, prompt_template_hi, prompt_template_mr, target_vocabulary, example_response, sort_order, created_at) FROM stdin;
\.


--
-- Data for Name: speaking_practices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.speaking_practices (id, user_id, lesson_id, prompt, transcript, audio_url, pronunciation_score, fluency_score, vocabulary_score, grammar_score, feedback, corrections, created_at) FROM stdin;
1	3	\N	Describe your favorite hobby and why you enjoy it.	I really enjoy coding because it lets me solve complex problems and build useful tools. I started programming about three years ago and found it incredibly rewarding.	\N	82.5	78	\N	\N	Good job articulating your thoughts clearly. Your sentence structure was solid and your vocabulary was appropriate for professional communication.	Try to avoid starting sentences with 'I really' too often. Consider using more varied sentence starters for a more polished delivery.	2026-04-14 11:13:02.437415
2	3	\N	Explain the importance of effective communication in a team.	Effective communication in a team is crucial because it ensures everyone is aligned on goals. When team members share information openly, it reduces misunderstandings and increases productivity.	\N	88	85.5	\N	\N	Excellent response with a clear structure. You effectively conveyed the key points about team communication. Your pace was comfortable and natural.	Consider adding a specific example next time to make your point more concrete and memorable.	2026-04-18 11:13:02.437496
\.


--
-- Data for Name: tutor_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tutor_messages (id, user_id, course_id, module_id, role, content, audio_url, created_at) FROM stdin;
1	3	1	1	user	What's the difference between props and state in React?	\N	2026-04-21 16:43:02.440672
2	3	1	1	assistant	Props are read-only inputs passed from a parent to a child component. State is internal, mutable data owned by the component itself. When state changes, the component re-renders; when the parent re-renders, the child gets updated props.	\N	2026-04-21 16:43:02.446066
3	3	1	1	user	Can a component change its own props?	\N	2026-04-21 16:43:02.450028
4	3	1	1	assistant	No! Props are immutable from the child's perspective. If you need the child to influence data, you'd pass a callback function as a prop from the parent, and the child calls it to notify the parent.	\N	2026-04-21 16:43:02.452918
\.


--
-- Data for Name: user_lesson_progress; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_lesson_progress (id, user_id, lesson_id, attempts, best_score, completed, last_practiced_at, completed_at) FROM stdin;
\.


--
-- Name: analysis_results_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.analysis_results_id_seq', 1, false);


--
-- Name: assessments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.assessments_id_seq', 1, false);


--
-- Name: audio_uploads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audio_uploads_id_seq', 1, false);


--
-- Name: course_concept_graphs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.course_concept_graphs_id_seq', 1, false);


--
-- Name: course_modules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.course_modules_id_seq', 14, true);


--
-- Name: courses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.courses_id_seq', 5, true);


--
-- Name: enrollments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.enrollments_id_seq', 6, true);


--
-- Name: exam_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.exam_attempts_id_seq', 1, true);


--
-- Name: exam_paper_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.exam_paper_configs_id_seq', 1, true);


--
-- Name: exam_papers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.exam_papers_id_seq', 2, true);


--
-- Name: learner_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.learner_profiles_id_seq', 5, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 7, true);


--
-- Name: speaking_lessons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.speaking_lessons_id_seq', 1, false);


--
-- Name: speaking_practices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.speaking_practices_id_seq', 2, true);


--
-- Name: speaking_topics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.speaking_topics_id_seq', 1, false);


--
-- Name: tutor_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tutor_messages_id_seq', 4, true);


--
-- Name: user_lesson_progress_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_lesson_progress_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 6, true);


--
-- Name: workflow_analyses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.workflow_analyses_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict 5DZ4NKl29UU3Vf9XDCPyPgvTHstQASwt1F1vmtOPfgaMABK8gV7AFXJldM4fwai

