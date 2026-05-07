import json

QUIZ_REACT_COMPONENTS = json.dumps({"questions": [
    {"q": "What is the correct way to define a functional React component?",
     "options": ["class MyComp extends React", "function MyComp() { return <div/> }", "const MyComp = React.create()", "MyComp.render = () => <div/>"],
     "correct": 1},
    {"q": "Which attribute replaces 'class' in JSX?", "options": ["cssClass", "className", "htmlClass", "styleClass"], "correct": 1},
    {"q": "What does JSX stand for?", "options": ["JavaScript Xtended", "JavaScript XML", "Java Syntax Extension", "JSON XML"], "correct": 1},
]})

QUIZ_REACT_STATE = json.dumps({"questions": [
    {"q": "Props in React are:", "options": ["Mutable data owned by child", "Read-only inputs from parent", "Global state", "Event handlers"], "correct": 1},
    {"q": "Which hook manages local state?", "options": ["useEffect", "useContext", "useState", "useMemo"], "correct": 2},
    {"q": "When does a component re-render due to state?", "options": ["Never", "When setState is called", "When props change", "Both B and C"], "correct": 3},
]})

QUIZ_REACT_HOOKS = json.dumps({"questions": [
    {"q": "useEffect runs:", "options": ["Before render", "After render", "During render", "Only once ever"], "correct": 1},
    {"q": "What is the purpose of useCallback?", "options": ["Fetch data", "Memoize function references", "Create context", "Handle form submit"], "correct": 1},
    {"q": "Rule of Hooks: hooks must be called:", "options": ["Inside loops", "At the top level", "In class components", "Inside conditionals"], "correct": 1},
]})

QUIZ_PYTHON_VARS = json.dumps({"questions": [
    {"q": "What type is `x = 3.14` in Python?", "options": ["int", "str", "float", "complex"], "correct": 2},
    {"q": "Which data type is ordered and mutable?", "options": ["tuple", "set", "dict", "list"], "correct": 3},
    {"q": "What does len('hello') return?", "options": ["4", "5", "6", "Error"], "correct": 1},
]})

QUIZ_PYTHON_FLOW = json.dumps({"questions": [
    {"q": "Which loop iterates a fixed number of times?", "options": ["while", "for", "do-while", "foreach"], "correct": 1},
    {"q": "What does `range(5)` produce?", "options": ["[1,2,3,4,5]", "[0,1,2,3,4]", "[0,1,2,3,4,5]", "5"], "correct": 1},
    {"q": "List comprehension `[x*2 for x in range(3)]` gives:", "options": ["[0,2,4]", "[2,4,6]", "[1,2,3]", "[0,1,2]"], "correct": 0},
]})

QUIZ_PYTHON_FUNCS = json.dumps({"questions": [
    {"q": "Which keyword defines a function?", "options": ["func", "def", "fn", "function"], "correct": 1},
    {"q": "*args captures:", "options": ["Keyword arguments", "Required args only", "Positional arguments", "All global vars"], "correct": 2},
    {"q": "**kwargs captures:", "options": ["Positional args", "Keyword arguments as dict", "Default values", "Module imports"], "correct": 1},
]})

QUIZ_DS_PANDAS = json.dumps({"questions": [
    {"q": "Which method shows the first 5 rows of a DataFrame?", "options": ["df.tail()", "df.head()", "df.first()", "df.peek()"], "correct": 1},
    {"q": "How do you drop rows with NaN?", "options": ["df.fillna()", "df.dropna()", "df.clean()", "df.remove_nan()"], "correct": 1},
    {"q": "df.shape returns:", "options": ["Column names", "Row count only", "(rows, columns) tuple", "Data types"], "correct": 2},
]})

QUIZ_DS_VIZ = json.dumps({"questions": [
    {"q": "Which chart is best for showing trends over time?", "options": ["Pie chart", "Bar chart", "Line chart", "Scatter plot"], "correct": 2},
    {"q": "Which library provides the histplot function?", "options": ["matplotlib", "numpy", "seaborn", "pandas"], "correct": 2},
    {"q": "sns.heatmap is used for:", "options": ["Time series", "Correlation matrices", "Maps", "3D plots"], "correct": 1},
]})

QUIZ_CLOUD_CONCEPTS = json.dumps({"questions": [
    {"q": "What does IaaS stand for?", "options": ["Internet as a Service", "Infrastructure as a Service", "Integration as a Service", "Intelligence as a Service"], "correct": 1},
    {"q": "Public cloud is:", "options": ["Dedicated to one org", "Shared infrastructure", "On-premises only", "Always free"], "correct": 1},
    {"q": "Pay-as-you-go is a benefit of:", "options": ["On-premises", "Cloud computing", "Mainframes", "Private servers"], "correct": 1},
]})

QUIZ_CLOUD_AWS = json.dumps({"questions": [
    {"q": "What is AWS EC2?", "options": ["Object storage", "Virtual servers", "DNS service", "Email service"], "correct": 1},
    {"q": "S3 is used for:", "options": ["Compute", "Networking", "Object storage", "Database"], "correct": 2},
    {"q": "AWS Lambda is:", "options": ["Container service", "Serverless compute", "Managed database", "Load balancer"], "correct": 1},
]})

QUIZ_CLOUD_DEPLOY = json.dumps({"questions": [
    {"q": "What is a Dockerfile?", "options": ["A cloud config", "A container build recipe", "A CI/CD pipeline", "A DNS record"], "correct": 1},
    {"q": "ECS with Fargate provides:", "options": ["Managed Kubernetes", "Serverless container orchestration", "Load balancing only", "Static hosting"], "correct": 1},
    {"q": "Which tool is AWS-native CI/CD for deployment?", "options": ["Jenkins", "CircleCI", "CodeDeploy", "TravisCI"], "correct": 2},
]})

QUIZ_SEC_THREATS = json.dumps({"questions": [
    {"q": "What is phishing?", "options": ["A network attack", "Deceptive emails to steal credentials", "Malware injection", "DoS attack"], "correct": 1},
    {"q": "Which stands for Confidentiality, Integrity, Availability?", "options": ["CIS", "CISA", "CIA Triad", "CVSS"], "correct": 2},
    {"q": "SQL Injection exploits:", "options": ["Network packets", "Database queries", "File uploads", "Email servers"], "correct": 1},
]})

QUIZ_SEC_NETWORK = json.dumps({"questions": [
    {"q": "TLS/SSL is used to:", "options": ["Compress data", "Encrypt web traffic", "Route packets", "Monitor logs"], "correct": 1},
    {"q": "VPN creates:", "options": ["A public hotspot", "An encrypted tunnel", "A firewall rule", "A DMZ zone"], "correct": 1},
    {"q": "Zero Trust principle is:", "options": ["Trust all internal traffic", "Never trust, always verify", "Trust encrypted traffic", "Trust verified IPs"], "correct": 1},
]})

QUIZ_SEC_PRACTICES = json.dumps({"questions": [
    {"q": "Bcrypt is used for:", "options": ["Encrypting disks", "Hashing passwords", "Compressing files", "Network encryption"], "correct": 1},
    {"q": "RBAC stands for:", "options": ["Role-Based Access Control", "Remote Backup And Control", "Real-time Binary Access Control", "Rule-Based Admin Config"], "correct": 0},
    {"q": "OWASP Top 10 item #1 (2021) is:", "options": ["SQL Injection", "Broken Access Control", "XSS", "CSRF"], "correct": 1},
]})
