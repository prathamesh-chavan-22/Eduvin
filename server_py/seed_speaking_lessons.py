"""Seed script for speaking lessons - populates initial topics and lessons."""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from config import ASYNC_DATABASE_URL
from storage import create_speaking_topic, create_speaking_lesson


# Topic and lesson data
TOPICS_AND_LESSONS = [
    {
        "name": "Greetings & Introductions",
        "description": "Learn to introduce yourself and greet others in English",
        "icon": "👋",
        "sort_order": 1,
        "lessons": [
            {
                "level": 1,
                "title": "Basic Greetings",
                "description": "Practice saying hello and goodbye",
                "prompt_en": "Introduce yourself. Say your name and where you are from.",
                "prompt_hi": "अपना परिचय दें। अपना नाम और आप कहाँ से हैं, बताएं।",
                "prompt_mr": "स्वतःची ओळख द्या. तुमचे नाव आणि तुम्ही कुठून आहात ते सांगा.",
                "vocabulary": ["hello", "name", "from", "nice", "meet"],
                "example": "Hello, my name is Raj. I am from Mumbai. Nice to meet you.",
            },
            {
                "level": 2,
                "title": "Extended Introductions",
                "description": "Introduce yourself with more details",
                "prompt_en": "Tell me about yourself: your name, where you live, and what you do.",
                "prompt_hi": "अपने बारे में बताएं: आपका नाम, आप कहां रहते हैं, और आप क्या करते हैं।",
                "prompt_mr": "तुमच्या बद्दल सांगा: तुमचे नाव, तुम्ही कुठे राहता आणि तुम्ही काय करता.",
                "vocabulary": ["live", "work", "student", "profession", "city"],
                "example": "My name is Priya. I live in Pune. I work as a software engineer.",
            },
            {
                "level": 3,
                "title": "Asking About Others",
                "description": "Learn to ask questions during introductions",
                "prompt_en": "Imagine you meet someone new. Introduce yourself and ask them 3 questions.",
                "prompt_hi": "कल्पना करें कि आप किसी नए व्यक्ति से मिलते हैं। अपना परिचय दें और उनसे 3 सवाल पूछें।",
                "prompt_mr": "कल्पना करा की तुम्ही कोणाला नवीन भेटता. स्वतःची ओळख द्या आणि त्यांना 3 प्रश्न विचारा.",
                "vocabulary": ["where", "what", "how", "do you", "tell me"],
                "example": "Hi, I'm Amit. Nice to meet you. Where are you from? What do you do? How long have you been here?",
            },
        ],
    },
    {
        "name": "Daily Routine",
        "description": "Talk about your daily activities and schedule",
        "icon": "🌅",
        "sort_order": 2,
        "lessons": [
            {
                "level": 1,
                "title": "Morning Routine",
                "description": "Describe what you do in the morning",
                "prompt_en": "Describe your morning routine. What do you do after you wake up?",
                "prompt_hi": "अपनी सुबह की दिनचर्या का वर्णन करें। जागने के बाद आप क्या करते हैं?",
                "prompt_mr": "तुमची सकाळची दिनचर्या वर्णन करा. उठल्यानंतर तुम्ही काय करता?",
                "vocabulary": ["wake up", "brush teeth", "breakfast", "shower", "get ready"],
                "example": "I wake up at 7 AM. I brush my teeth and take a shower. Then I have breakfast.",
            },
            {
                "level": 2,
                "title": "Work Day",
                "description": "Talk about your typical work day",
                "prompt_en": "Describe a typical day at work or school. What do you do?",
                "prompt_hi": "काम या स्कूल में एक सामान्य दिन का वर्णन करें। आप क्या करते हैं?",
                "prompt_mr": "कामावर किंवा शाळेत एक सामान्य दिवस वर्णन करा. तुम्ही काय करता?",
                "vocabulary": ["start work", "meetings", "lunch break", "tasks", "colleagues"],
                "example": "I start work at 9 AM. I attend meetings and work on my tasks. I have lunch at 1 PM with my colleagues.",
            },
            {
                "level": 3,
                "title": "Evening & Night",
                "description": "Describe your evening activities",
                "prompt_en": "What do you do in the evening after work? How do you relax?",
                "prompt_hi": "काम के बाद शाम को आप क्या करते हैं? आप कैसे आराम करते हैं?",
                "prompt_mr": "कामानंतर संध्याकाळी तुम्ही काय करता? तुम्ही कसे आराम करता?",
                "vocabulary": ["finish work", "go home", "relax", "dinner", "watch TV", "sleep"],
                "example": "I finish work at 6 PM and go home. I relax by watching TV or reading. I have dinner at 8 PM and sleep by 11 PM.",
            },
        ],
    },
    {
        "name": "Food & Dining",
        "description": "Talk about food, preferences, and ordering at restaurants",
        "icon": "🍽️",
        "sort_order": 3,
        "lessons": [
            {
                "level": 1,
                "title": "Favorite Foods",
                "description": "Talk about what you like to eat",
                "prompt_en": "What is your favorite food? Why do you like it?",
                "prompt_hi": "आपका पसंदीदा भोजन क्या है? आपको यह क्यों पसंद है?",
                "prompt_mr": "तुमचे आवडते खाद्यपदार्थ कोणते? तुम्हाला ते का आवडते?",
                "vocabulary": ["favorite", "delicious", "tasty", "like", "eat"],
                "example": "My favorite food is pizza. I like it because it is delicious and has many toppings.",
            },
            {
                "level": 2,
                "title": "Ordering Food",
                "description": "Practice ordering at a restaurant",
                "prompt_en": "You are at a restaurant. Order a meal for yourself.",
                "prompt_hi": "आप एक रेस्तरां में हैं। अपने लिए खाना ऑर्डर करें।",
                "prompt_mr": "तुम्ही रेस्टॉरंटमध्ये आहात. स्वतःसाठी जेवण ऑर्डर करा.",
                "vocabulary": ["order", "menu", "would like", "please", "water", "bill"],
                "example": "I would like to order chicken curry with rice, please. Can I also have a glass of water?",
            },
            {
                "level": 3,
                "title": "Cooking Experience",
                "description": "Talk about cooking and recipes",
                "prompt_en": "Do you like cooking? Describe a dish you can make.",
                "prompt_hi": "क्या आपको खाना पकाना पसंद है? एक व्यंजन का वर्णन करें जो आप बना सकते हैं।",
                "prompt_mr": "तुम्हाला स्वयंपाक करायला आवडतो का? तुम्ही बनवू शकता अशा पदार्थाचे वर्णन करा.",
                "vocabulary": ["cook", "recipe", "ingredients", "prepare", "delicious"],
                "example": "Yes, I enjoy cooking. I can make dal and rice. First, I prepare the ingredients, then I cook the dal with spices.",
            },
        ],
    },
    {
        "name": "Travel & Places",
        "description": "Discuss travel experiences and places you've visited",
        "icon": "✈️",
        "sort_order": 4,
        "lessons": [
            {
                "level": 2,
                "title": "Favorite Place",
                "description": "Describe a place you love",
                "prompt_en": "Tell me about your favorite place. Why is it special?",
                "prompt_hi": "मुझे अपनी पसंदीदा जगह के बारे में बताएं। यह विशेष क्यों है?",
                "prompt_mr": "मला तुमच्या आवडत्या ठिकाणाबद्दल सांगा. ते विशेष का आहे?",
                "vocabulary": ["beautiful", "visit", "special", "memories", "favorite"],
                "example": "My favorite place is Goa. It has beautiful beaches and the weather is nice. I have many happy memories there.",
            },
            {
                "level": 3,
                "title": "Travel Story",
                "description": "Share a travel experience",
                "prompt_en": "Describe a memorable trip you took. Where did you go and what did you do?",
                "prompt_hi": "एक यादगार यात्रा का वर्णन करें। आप कहाँ गए और क्या किया?",
                "prompt_mr": "एक संस्मरणीय प्रवासाचे वर्णन करा. तुम्ही कुठे गेलात आणि काय केलेत?",
                "vocabulary": ["traveled", "visited", "explored", "experience", "amazing"],
                "example": "Last year, I traveled to Kerala. I visited backwaters and explored the local culture. It was an amazing experience.",
            },
            {
                "level": 4,
                "title": "Planning a Trip",
                "description": "Talk about planning and preparations",
                "prompt_en": "If you could travel anywhere, where would you go? How would you plan your trip?",
                "prompt_hi": "अगर आप कहीं भी यात्रा कर सकते हैं, तो कहाँ जाएंगे? आप अपनी यात्रा की योजना कैसे बनाएंगे?",
                "prompt_mr": "तुम्ही कुठेही प्रवास करू शकत असाल तर कुठे जाल? तुम्ही तुमच्या प्रवासाची योजना कशी करणार?",
                "vocabulary": ["destination", "itinerary", "budget", "accommodation", "research"],
                "example": "I would love to visit Japan. I would research the culture first, plan my itinerary, book accommodation, and set a budget.",
            },
        ],
    },
    {
        "name": "Hobbies & Interests",
        "description": "Share your hobbies and things you enjoy doing",
        "icon": "🎨",
        "sort_order": 5,
        "lessons": [
            {
                "level": 1,
                "title": "Your Hobbies",
                "description": "Talk about what you do for fun",
                "prompt_en": "What are your hobbies? What do you like to do in your free time?",
                "prompt_hi": "आपके शौक क्या हैं? अपने खाली समय में आप क्या करना पसंद करते हैं?",
                "prompt_mr": "तुमचे छंद काय आहेत? मोकळ्या वेळेत तुम्ही काय करायला आवडते?",
                "vocabulary": ["hobby", "enjoy", "free time", "like", "fun"],
                "example": "I enjoy reading books and playing cricket. In my free time, I also like watching movies.",
            },
            {
                "level": 2,
                "title": "Learning Something New",
                "description": "Describe a skill you're learning",
                "prompt_en": "Are you learning any new skill or hobby? Tell me about it.",
                "prompt_hi": "क्या आप कोई नया कौशल या शौक सीख रहे हैं? इसके बारे में बताएं।",
                "prompt_mr": "तुम्ही काही नवीन कौशल्य किंवा छंद शिकत आहात का? त्याबद्दल सांगा.",
                "vocabulary": ["learning", "practicing", "improve", "skill", "interested"],
                "example": "Yes, I am learning to play the guitar. I practice every evening and I'm improving slowly. I'm very interested in music.",
            },
            {
                "level": 3,
                "title": "Favorite Entertainment",
                "description": "Discuss books, movies, or music you like",
                "prompt_en": "What kind of movies or books do you enjoy? Describe one you recently liked.",
                "prompt_hi": "आप किस तरह की फिल्में या किताबें पसंद करते हैं? हाल ही में पसंद आई किसी एक का वर्णन करें।",
                "prompt_mr": "तुम्हाला कोणत्या प्रकारचे चित्रपट किंवा पुस्तके आवडतात? अलीकडे आवडलेल्या एकाचे वर्णन करा.",
                "vocabulary": ["genre", "recommend", "entertaining", "favorite", "recently"],
                "example": "I enjoy thriller movies and mystery books. Recently, I watched a movie called 'Andhadhun'. It was very entertaining and had a surprising ending.",
            },
        ],
    },
    {
        "name": "Work & Career",
        "description": "Discuss professional life and career goals",
        "icon": "💼",
        "sort_order": 6,
        "lessons": [
            {
                "level": 2,
                "title": "Your Job",
                "description": "Describe what you do professionally",
                "prompt_en": "What do you do for work? Describe your job and responsibilities.",
                "prompt_hi": "आप काम के लिए क्या करते हैं? अपनी नौकरी और जिम्मेदारियों का वर्णन करें।",
                "prompt_mr": "तुम्ही कामासाठी काय करता? तुमच्या नोकरीचे आणि जबाबदाऱ्यांचे वर्णन करा.",
                "vocabulary": ["job", "work", "responsibilities", "team", "projects"],
                "example": "I work as a software developer. My responsibilities include writing code, testing applications, and working with my team on projects.",
            },
            {
                "level": 3,
                "title": "Career Goals",
                "description": "Talk about your professional aspirations",
                "prompt_en": "What are your career goals? Where do you see yourself in 5 years?",
                "prompt_hi": "आपके करियर लक्ष्य क्या हैं? 5 साल में आप खुद को कहां देखते हैं?",
                "prompt_mr": "तुमची करिअर उद्दिष्टे काय आहेत? 5 वर्षांत तुम्ही स्वतःला कुठे पाहता?",
                "vocabulary": ["goals", "achieve", "aspire", "develop", "position"],
                "example": "My goal is to become a senior developer. In 5 years, I aspire to lead a team and work on innovative projects. I want to develop my leadership skills.",
            },
            {
                "level": 4,
                "title": "Workplace Challenges",
                "description": "Discuss professional challenges and solutions",
                "prompt_en": "Describe a challenge you faced at work. How did you overcome it?",
                "prompt_hi": "काम पर आपके सामने आई एक चुनौती का वर्णन करें। आपने इसे कैसे पार किया?",
                "prompt_mr": "कामावर तुम्हाला भेडसावलेल्या आव्हानाचे वर्णन करा. तुम्ही ते कसे पार केलेत?",
                "vocabulary": ["challenge", "problem", "solution", "overcome", "learned"],
                "example": "I faced a tight deadline on a major project. I organized my time better, communicated with my team, and we worked extra hours. We delivered on time and I learned better project management.",
            },
        ],
    },
]


async def seed_speaking_lessons():
    """Seed the database with speaking topics and lessons."""
    engine = create_async_engine(ASYNC_DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        print("\\n🌱 Seeding speaking topics and lessons...\\n")
        
        for topic_data in TOPICS_AND_LESSONS:
            # Create topic
            topic = await create_speaking_topic(
                db,
                name=topic_data["name"],
                description=topic_data["description"],
                icon=topic_data.get("icon"),
                sort_order=topic_data["sort_order"],
            )
            print(f"✅ Created topic: {topic.name}")
            
            # Create lessons for this topic
            for idx, lesson_data in enumerate(topic_data["lessons"]):
                lesson = await create_speaking_lesson(
                    db,
                    topic_id=topic.id,
                    title=lesson_data["title"],
                    description=lesson_data["description"],
                    difficulty_level=lesson_data["level"],
                    prompt_template_en=lesson_data["prompt_en"],
                    prompt_template_hi=lesson_data.get("prompt_hi"),
                    prompt_template_mr=lesson_data.get("prompt_mr"),
                    target_vocabulary=lesson_data.get("vocabulary"),
                    example_response=lesson_data.get("example"),
                    sort_order=idx,
                )
                print(f"   ✅ Created lesson: {lesson.title} (Level {lesson.difficulty_level})")
        
        print(f"\\n✨ Seeding complete! Created {len(TOPICS_AND_LESSONS)} topics with lessons.\\n")


if __name__ == "__main__":
    asyncio.run(seed_speaking_lessons())
