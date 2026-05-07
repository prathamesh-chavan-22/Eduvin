import sqlite3

conn = sqlite3.connect('app.db')
c = conn.cursor()
c.execute("SELECT id, email, full_name, role, length(face_embedding) FROM users WHERE full_name LIKE '%Jane%'")
print("Jane:", c.fetchall())

c.execute("SELECT id, email, full_name, role, length(face_embedding) FROM users")
all_users = c.fetchall()
print("All users face_embedding lengths:")
for u in all_users:
    print(u)
