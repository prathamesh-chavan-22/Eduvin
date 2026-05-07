import streamlit as st
import cv2
import pandas as pd
from datetime import datetime
import os
import time
import numpy as np
import threading
from deepface import DeepFace

st.set_page_config(page_title="Face Attendance System", layout="wide", page_icon="📸")

DATASET_DIR     = "dataset"
ATTENDANCE_FILE = "attendance.csv"
HAAR_PATH       = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
THRESHOLD       = 0.50   # cosine similarity — above = known, below = Unknown

os.makedirs(DATASET_DIR, exist_ok=True)
if not os.path.exists(ATTENDANCE_FILE) or os.path.getsize(ATTENDANCE_FILE) == 0:
    pd.DataFrame(columns=["Name", "Date", "Time"]).to_csv(ATTENDANCE_FILE, index=False)

# ── Load known face embeddings ONCE ────────────────────────────────────────────
@st.cache_resource(show_spinner="⏳ Loading face model... first time only")
def load_known_faces():
    known = {}
    for fname in sorted(os.listdir(DATASET_DIR)):
        if fname.lower().endswith(('.jpg', '.jpeg', '.png')):
            name = os.path.splitext(fname)[0]
            path = os.path.join(DATASET_DIR, fname)
            try:
                r = DeepFace.represent(img_path=path, model_name="Facenet512",
                                       enforce_detection=False)
                if r:
                    known[name] = np.array(r[0]["embedding"])
            except:
                pass
    return known

def open_camera():
    """Open the first working camera index with warm-up frames."""
    for index in [0, 1, 2]:
        # Try DirectShow first (best on Windows), then default
        for backend in [cv2.CAP_DSHOW, cv2.CAP_ANY]:
            cap = cv2.VideoCapture(index, backend)
            if not cap.isOpened():
                cap.release()
                continue
            # Set properties
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            # Warm up: discard first few frames (cameras need time to initialise)
            for _ in range(5):
                cap.read()
                time.sleep(0.05)
            # Verify we get a valid frame
            ret, frame = cap.read()
            if ret and frame is not None and frame.size > 0:
                return cap
            cap.release()
    return None

# ── Helpers ─────────────────────────────────────────────────────────────────────
def cosine_sim(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))

def recognize_face(crop_bgr, known_faces):
    """Returns name string for a single face crop."""
    try:
        r = DeepFace.represent(img_path=crop_bgr, model_name="Facenet512",
                               enforce_detection=False)
        if not r:
            return "Unknown"
        emb = np.array(r[0]["embedding"])
        best_name, best_score = "Unknown", -1.0
        for n, ref in known_faces.items():
            s = cosine_sim(emb, ref)
            if s > best_score:
                best_score, best_name = s, n
        return best_name if best_score >= THRESHOLD else "Unknown"
    except:
        return "Unknown"

def mark_attendance(name):
    if not name or name in ("Unknown", "Detecting..."):
        return False
    df   = pd.read_csv(ATTENDANCE_FILE)
    now  = datetime.now()
    dstr = now.strftime('%Y-%m-%d')
    tstr = now.strftime('%H:%M:%S')
    if df[(df['Name'] == name) & (df['Date'] == dstr)].empty:
        pd.concat([df, pd.DataFrame([{"Name": name, "Date": dstr, "Time": tstr}])],
                  ignore_index=True).to_csv(ATTENDANCE_FILE, index=False)
        return True
    return False

def centroid(bbox):
    x, y, w, h = bbox
    return (x + w // 2, y + h // 2)

def match_faces_to_tracks(faces_bboxes, tracks, max_dist=100):
    """Match each detected face to existing track by centroid distance."""
    assignments = [-1] * len(faces_bboxes)
    used_tids   = set()
    for i, bbox in enumerate(faces_bboxes):
        cx, cy = centroid(bbox)
        best_tid, best_d = -1, max_dist
        for tid, td in tracks.items():
            if tid in used_tids:
                continue
            tx, ty = centroid(td["bbox"])
            d = ((cx - tx) ** 2 + (cy - ty) ** 2) ** 0.5
            if d < best_d:
                best_d, best_tid = d, tid
        if best_tid >= 0:
            assignments[i] = best_tid
            used_tids.add(best_tid)
    return assignments

# ── Sidebar ─────────────────────────────────────────────────────────────────────
st.sidebar.title("📸 Attendance System")
menu = st.sidebar.radio("Go to", ["📷 Take Attendance", "📊 Dashboard", "➕ Add New User"])

# ═══════════════════════ TAKE ATTENDANCE ═══════════════════════════════════════
if menu == "📷 Take Attendance":
    st.title("📷 Real-Time Face Recognition Attendance")

    known_faces = load_known_faces()
    if not known_faces:
        st.error("⚠️ No registered faces found in dataset! Please add photos first.")
        st.stop()

    # ── Toggle to start/stop camera ──────────────────────────────────────────
    if 'run_cam' not in st.session_state:
        st.session_state.run_cam = False

    run = st.toggle("🟢 Start Camera", value=st.session_state.run_cam)
    st.session_state.run_cam = run

    frame_ph  = st.empty()
    notify_ph = st.empty()

    if run:
        with st.spinner("📷 Opening camera..."):
            cam = open_camera()

        if cam is None:
            st.error("❌ No webcam found. Check:\n- Windows Camera Privacy (Win+I → Privacy & Security → Camera)\n- Close other apps using the camera\n- Try unplugging and reconnecting the webcam")
            st.session_state.run_cam = False
            st.stop()

        face_cascade = cv2.CascadeClassifier(HAAR_PATH)

        # Per-face tracks: {track_id: {"bbox", "name", "busy"}}
        tracks          = {}
        next_id         = [0]
        lock            = threading.Lock()
        tf_lock         = threading.Lock()  # one DeepFace call at a time — prevents lag
        attendance_done = set()             # names already marked this session

        def recognition_worker(tid, crop, kf):
            """Background thread: update tracks[tid]['name'] when done."""
            with tf_lock:
                name = recognize_face(crop, kf)
            with lock:
                if tid in tracks:
                    tracks[tid]["name"] = name
                    tracks[tid]["busy"] = False

        fail_count = 0
        try:
            while True:
                ret, frame = cam.read()
                if not ret or frame is None:
                    fail_count += 1
                    if fail_count > 15:
                        notify_ph.error("❌ Lost camera connection. Please toggle camera off and back on.")
                        break
                    time.sleep(0.05)
                    continue
                fail_count = 0

                gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                raw   = face_cascade.detectMultiScale(
                    gray, scaleFactor=1.2, minNeighbors=6, minSize=(80, 80)
                )
                faces_list = [tuple(f) for f in raw] if len(raw) > 0 else []

                # ── Match detected faces → existing tracks ──────────────────
                assignments = match_faces_to_tracks(faces_list, tracks)

                # ── Create/update tracks and spawn recognition threads ──────
                actual_tids = []
                for i, bbox in enumerate(faces_list):
                    tid = assignments[i]

                    with lock:
                        if tid == -1:
                            tid = next_id[0]
                            next_id[0] += 1
                            tracks[tid] = {"bbox": bbox, "name": "Detecting...", "busy": False}
                        else:
                            tracks[tid]["bbox"] = bbox

                        is_busy = tracks[tid]["busy"]

                    actual_tids.append(tid)

                    if not is_busy:
                        x, y, w, h = bbox
                        crop = frame[y:y+h, x:x+w].copy()
                        with lock:
                            if tid in tracks:
                                tracks[tid]["busy"] = True
                        threading.Thread(
                            target=recognition_worker,
                            args=(tid, crop, known_faces),
                            daemon=True
                        ).start()

                # ── Remove stale tracks ─────────────────────────────────────
                seen_set = set(actual_tids)
                with lock:
                    for tid in list(tracks.keys()):
                        if tid not in seen_set:
                            del tracks[tid]

                # ── Mark attendance ─────────────────────────────────────────
                with lock:
                    names_snapshot = {tid: tracks[tid]["name"] for tid in actual_tids if tid in tracks}

                for tid, name in names_snapshot.items():
                    if name not in ("Unknown", "Detecting...") and name not in attendance_done:
                        if mark_attendance(name):
                            notify_ph.success(f"✅ Attendance marked for **{name}**!")
                        else:
                            notify_ph.info(f"👍 **{name}** already marked today.")
                        attendance_done.add(name)

                # ── Draw bounding boxes ─────────────────────────────────────
                for i, tid in enumerate(actual_tids):
                    x, y, w, h = faces_list[i]
                    name  = names_snapshot.get(tid, "Detecting...")
                    known = name not in ("Unknown", "Detecting...")
                    color = (34, 200, 34) if known else (60, 60, 220)

                    cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
                    cv2.rectangle(frame, (x, y - 36), (x + w, y), color, cv2.FILLED)
                    cv2.putText(frame, name, (x + 6, y - 8),
                                cv2.FONT_HERSHEY_DUPLEX, 0.80, (255, 255, 255), 1)

                # ── Display frame ───────────────────────────────────────────
                _, jpg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                frame_ph.image(jpg.tobytes(), channels="BGR", use_container_width=True)
                time.sleep(0.03)

        finally:
            cam.release()

# ═══════════════════════ DASHBOARD ═════════════════════════════════════════════
elif menu == "📊 Dashboard":
    st.title("📊 Attendance Dashboard")

    df    = pd.read_csv(ATTENDANCE_FILE)
    today = datetime.now().strftime('%Y-%m-%d')
    t_df  = df[df['Date'] == today]

    c1, c2, c3 = st.columns(3)
    c1.metric("Today's Attendees", len(t_df))
    c2.metric("Total Records",      len(df))
    c3.metric("Registered Faces",
              len([f for f in os.listdir(DATASET_DIR)
                   if f.lower().endswith(('.jpg','.jpeg','.png'))]))

    st.markdown("### Today's Attendance")
    if t_df.empty:
        st.info("No attendance recorded today yet.")
    else:
        st.dataframe(t_df.reset_index(drop=True), use_container_width=True)

    st.markdown("### All Records")
    st.dataframe(df.iloc[::-1].reset_index(drop=True), use_container_width=True)

    st.download_button("⬇️ Download CSV",
                       df.to_csv(index=False).encode('utf-8'),
                       "attendance.csv", "text/csv")

    st.sidebar.markdown("---")
    st.sidebar.subheader("Registered Users")
    for f in os.listdir(DATASET_DIR):
        if f.lower().endswith(('.jpg', '.jpeg', '.png')):
            st.sidebar.text(f"👤 {os.path.splitext(f)[0]}")

# ═══════════════════════ ADD NEW USER ══════════════════════════════════════════
elif menu == "➕ Add New User":
    st.title("➕ Register New Person")
    name = st.text_input("Full Name")
    img  = st.camera_input("Take a clear photo (good lighting, face centred)")
    if img and name.strip():
        path = os.path.join(DATASET_DIR, f"{name.strip()}.jpg")
        with open(path, "wb") as f:
            f.write(img.getbuffer())
        for pkl in os.listdir(DATASET_DIR):
            if pkl.endswith(".pkl"):
                os.remove(os.path.join(DATASET_DIR, pkl))
        st.cache_resource.clear()
        st.success(f"✅ {name.strip()} added! Go to 'Take Attendance' to test.")
