"""
Run this ONCE to clear all stored face embeddings.
After running this, the admin must re-register everyone's faces
using the Live Webcam option in the Register Face page.

Usage:
    .\.venv\Scripts\python clear_face_embeddings.py
"""

import asyncio
from database import async_session_factory
from models import User
from sqlalchemy import select, update


async def main():
    async with async_session_factory() as session:
        # Get all users with embeddings
        result = await session.execute(
            select(User).where(User.face_embedding.is_not(None))
        )
        users_with_embeddings = result.scalars().all()

        if not users_with_embeddings:
            print("No face embeddings found in database. Nothing to clear.")
            return

        print(f"Found {len(users_with_embeddings)} user(s) with face embeddings:")
        for u in users_with_embeddings:
            emb_len = len(u.face_embedding) if u.face_embedding else 0
            print(f"  - {u.full_name} ({u.email}) — embedding dim: {emb_len}")

        print("\nClearing all face embeddings...")
        for u in users_with_embeddings:
            u.face_embedding = None

        await session.commit()
        print(f"\n[DONE] Cleared embeddings for {len(users_with_embeddings)} user(s).")
        print("\nNext steps:")
        print("  1. Log in as Admin (admin@lms.local)")
        print("  2. Go to 'Register Face' page")
        print("  3. For each employee (Jane, John, Alex):")
        print("     - Have them sit in front of the webcam")
        print("     - Select their name from the dropdown")
        print("     - Use 'Live Webcam (Recommended)' mode")
        print("     - Click 'Capture Photo' then 'Save Facial Data'")


if __name__ == "__main__":
    asyncio.run(main())
