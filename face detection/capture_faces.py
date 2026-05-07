import cv2
import os

# Load Haar Cascade
face_detector = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# Take user ID
face_id = input("Enter User ID: ")

# Start webcam
cam = cv2.VideoCapture(0)
count = 0

os.makedirs("dataset", exist_ok=True)

print("Capturing faces... Look at the camera")

while True:
    ret, img = cam.read()
    if not ret:
        print("Failed to access webcam")
        break

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    faces = face_detector.detectMultiScale(gray, 1.3, 5)

    for (x, y, w, h) in faces:
        count += 1

        # Save face image
        cv2.imwrite(f"dataset/User.{face_id}.{count}.jpg", gray[y:y+h, x:x+w])

        # Draw rectangle
        cv2.rectangle(img, (x, y), (x+w, y+h), (255, 0, 0), 2)

        cv2.imshow("Capturing Faces", img)

    # ESC key to stop OR capture 30 samples
    if cv2.waitKey(100) & 0xff == 27:
        break
    elif count >= 30:
        break

cam.release()
cv2.destroyAllWindows()

print("Face samples captured successfully.")