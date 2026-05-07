import asyncio
from database import async_session_factory
import storage
from security import verify_password

TEST_PASSWORDS = ["password", "Password123", "admin", "password123", "eduvin"]

async def main():
    async with async_session_factory() as db:
        users = await storage.get_users(db)
        print("=== Found %d users in DB ===" % len(users))
        print()
        for u in users:
            print("ID: %d  Email: %s  Role: %s" % (u.id, u.email, u.role))
            matched = False
            for pwd in TEST_PASSWORDS:
                try:
                    ok = verify_password(pwd, u.password)
                    if ok:
                        print("  [PASS] Password WORKS: '%s'" % pwd)
                        matched = True
                        break
                except Exception as e:
                    print("  [WARN] verify_password error for '%s': %s" % (pwd, e))
            if not matched:
                print("  [FAIL] None of the tested passwords matched.")
            print()

if __name__ == "__main__":
    asyncio.run(main())
