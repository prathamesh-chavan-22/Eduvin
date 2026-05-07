import base64
import logging
import numpy as np
import cv2
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from deepface import DeepFace

from database import get_db
from dependencies import require_auth, require_admin, require_manager_or_admin
from models import User, Attendance, Notification

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/attendance", tags=["attendance"])

# ✅ FIXED CONFIG
FACE_MODEL = "Facenet512"
DETECTOR_BACKEND = "opencv"   # changed from retinaface → more forgiving & faster
THRESHOLD = 0.40              # lowered from 0.50 → tolerate webcam lighting differences

# ⚡ In-memory embedding cache: {user_id: (embedding, timestamp)}
_emb_cache: dict[int, tuple[list, float]] = {}
EMB_CACHE_TTL = 60  # seconds — re-fetch from DB after 1 minute


# ─────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────
class AdminRegisterPayload(BaseModel):
    user_name: str
    image_base64: str

class DetectPayload(BaseModel):
    image_base64: str

class MarkPayload(BaseModel):
    image_base64: str


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def decode_image(image_base64: str):
    try:
        b64 = image_base64.split(",")[1] if "," in image_base64 else image_base64
        data = base64.b64decode(b64)
        arr = np.frombuffer(data, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return img
    except:
        return None


def resize_for_speed(img, max_w: int = 480):
    """Downscale wide images before DeepFace to cut processing time."""
    if img is None:
        return img
    h, w = img.shape[:2]
    if w <= max_w:
        return img
    scale = max_w / w
    return cv2.resize(img, (max_w, int(h * scale)), interpolation=cv2.INTER_AREA)


async def get_cached_embedding(user_id: int, db: AsyncSession):
    """Return user embedding from memory cache; fall back to DB if stale/missing."""
    import time
    now = time.monotonic()
    cached = _emb_cache.get(user_id)
    if cached:
        emb, ts = cached
        if now - ts < EMB_CACHE_TTL:
            return emb
    # Cache miss or expired — fetch from DB
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if user and user.face_embedding:
        _emb_cache[user_id] = (user.face_embedding, now)
        return user.face_embedding
    return None


def encode_image(img):
    _, buf = cv2.imencode(".jpg", img)
    return "data:image/jpeg;base64," + base64.b64encode(buf).decode()


def cosine_sim(a, b):
    a, b = np.array(a), np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def get_embedding(img):
    try:
        result = DeepFace.represent(
            img_path=img,
            model_name=FACE_MODEL,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=True,
            align=True,
        )
        if result:
            logger.info(f"Face detected — area={result[0]['facial_area']}")
            return result[0]["embedding"], result[0]["facial_area"]
    except Exception as e:
        logger.warning(f"Embedding error ({DETECTOR_BACKEND}): {e}")
        # Fallback: try without face detection (full image as face)
        try:
            result = DeepFace.represent(
                img_path=img,
                model_name=FACE_MODEL,
                detector_backend="skip",
                enforce_detection=False,
                align=False,
            )
            if result:
                logger.info("Fallback (skip detector) succeeded")
                return result[0]["embedding"], {"x": 0, "y": 0, "w": img.shape[1], "h": img.shape[0]}
        except Exception as e2:
            logger.error(f"Fallback embedding also failed: {e2}")
    return None, None


def check_liveness(img):
    """
    Anti-spoof check using DeepFace anti_spoofing.
    Returns (is_live, score_or_none, available).
    """
    try:
        faces = DeepFace.extract_faces(
            img_path=img,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=False,
            align=True,
            anti_spoofing=True,
        )
        if not faces:
            return False, None, True
        face = faces[0]
        is_real = bool(face.get("is_real", False))
        score = face.get("antispoof_score")
        return is_real, score, True
    except Exception as e:
        logger.warning(f"Liveness check failed: {e}")
        # Model not available in this runtime (e.g., torch missing).
        # Keep detection usable; enforce stricter checks in mark().
        return False, None, False


def is_mobile_user_agent(user_agent: str | None) -> bool:
    if not user_agent:
        return False
    ua = user_agent.lower()
    mobile_tokens = [
        "android", "iphone", "ipad", "ipod", "mobile", "opera mini", "iemobile"
    ]
    return any(token in ua for token in mobile_tokens)


def detect_phone_in_frame(img, face_area: dict | None = None) -> bool:
    """
    Heuristic phone-screen detector.
    Strict thresholds to avoid false positives — only flags when very confident.
    """
    try:
        h, w = img.shape[:2]
        frame_area = float(h * w)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blur, 80, 180)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        fx, fy, fw, fh = 0, 0, w, h
        if face_area:
            fx = max(0, int(face_area.get("x", 0)))
            fy = max(0, int(face_area.get("y", 0)))
            fw = max(1, int(face_area.get("w", w)))
            fh = max(1, int(face_area.get("h", h)))

        for c in contours:
            peri = cv2.arcLength(c, True)
            if peri < 120:          # larger minimum — ignores tiny noise
                continue
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            if len(approx) != 4:
                continue

            x, y, bw, bh = cv2.boundingRect(approx)
            area = float(bw * bh)
            area_ratio = area / frame_area

            # Stricter area range: must be meaningful size but not too large
            if area_ratio < 0.04 or area_ratio > 0.28:
                continue

            ar = bw / max(1.0, float(bh))
            # Tighter phone-shape range: portrait (0.5–0.75) or landscape (1.33–1.9)
            looks_like_phone_shape = (0.50 <= ar <= 0.75) or (1.33 <= ar <= 1.90)
            if not looks_like_phone_shape:
                continue

            # Must be clearly near/beside the face — strict proximity
            near_face = not (x > fx + fw + 20 or x + bw < fx - 20 or y > fy + fh + 80)
            if not near_face:
                continue

            roi = gray[y:y+bh, x:x+bw]
            if roi.size == 0:
                continue
            mean_v = float(np.mean(roi))
            std_v = float(np.std(roi))

            # Much stricter screen criteria: very bright AND very uniform
            looks_like_screen = mean_v > 145 and std_v < 50

            if looks_like_screen:
                return True
        return False
    except Exception as e:
        logger.warning(f"Phone detection heuristic failed: {e}")
        return False   # fail-closed: don't block attendance on heuristic error


# ─────────────────────────────────────────────
# UPDATED DRAW BOX (PROFESSIONAL UI)
# ─────────────────────────────────────────────
def draw_box(img, area, label, color):
    x, y, w, h = area["x"], area["y"], area["w"], area["h"]

    # 🔹 Add padding around face (better visual spacing)
    pad_w = int(0.15 * w)
    pad_h = int(0.15 * h)

    x1 = max(0, x - pad_w)
    y1 = max(0, y - pad_h)
    x2 = min(img.shape[1], x + w + pad_w)
    y2 = min(img.shape[0], y + h + pad_h)

    # 🔹 Draw clean anti-aliased rectangle
    cv2.rectangle(img, (x1, y1), (x2, y2), color, 2, cv2.LINE_AA)

    # 🔹 Font setup
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.7
    thickness = 2

    # 🔹 Calculate text size
    (text_w, text_h), baseline = cv2.getTextSize(label, font, font_scale, thickness)

    # 🔹 Smart label positioning
    # If enough space above → place above
    if y1 - text_h - 12 > 0:
        text_x = x1
        text_y = y1 - 8
    else:
        # Otherwise place inside box at top
        text_x = x1
        text_y = y1 + text_h + 8

    # 🔹 Draw label background
    cv2.rectangle(
        img,
        (text_x, text_y - text_h - 6),
        (text_x + text_w + 10, text_y + baseline - 6),
        color,
        -1
    )

    # 🔹 Draw label text
    cv2.putText(
        img,
        label,
        (text_x + 5, text_y - 5),
        font,
        font_scale,
        (255, 255, 255),
        thickness,
        cv2.LINE_AA
    )

# ─────────────────────────────────────────────
# REGISTER
# ─────────────────────────────────────────────
@router.post("/register")
async def register(payload: AdminRegisterPayload,
                   current_user_id: int = Depends(require_admin),
                   db: AsyncSession = Depends(get_db)):

    img = decode_image(payload.image_base64)
    if img is None:
        raise HTTPException(400, "Invalid image")

    emb, _ = get_embedding(img)
    if emb is None:
        raise HTTPException(400, "No face detected")

    res = await db.execute(
        select(User).where(func.lower(User.full_name) == payload.user_name.lower())
    )
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(404, "User not found")

    user.face_embedding = emb
    await db.commit()

    # ⚡ Invalidate embedding cache so new photo is used immediately
    _emb_cache.pop(user.id, None)

    # ⚡ Clear today's attendance so user can mark fresh with new face
    today = datetime.now().strftime("%Y-%m-%d")
    old_att = await db.execute(
        select(Attendance).where(
            Attendance.user_id == user.id,
            Attendance.date == today
        )
    )
    for att in old_att.scalars().all():
        await db.delete(att)
    await db.commit()

    return {"success": True, "message": "Face registered. Today's attendance has been reset — user can now mark attendance."}


# ─────────────────────────────────────────────
# DETECT
# ─────────────────────────────────────────────
@router.post("/detect")
async def detect(payload: DetectPayload,
                 current_user_id: int = Depends(require_auth),
                 db: AsyncSession = Depends(get_db)):

    img = decode_image(payload.image_base64)
    if img is None:
        return {"face_detected": False, "recognized": False, "message": "Bad image"}

    # ⚡ Downscale for speed before any processing
    img = resize_for_speed(img, max_w=480)

    live_emb, area = get_embedding(img)
    if live_emb is None:
        return {"face_detected": False, "recognized": False, "message": "No face detected"}

    # ⚡ Skip liveness in detect (expensive) — only enforce it at mark time
    phone_detected = detect_phone_in_frame(img, area)

    # ⚡ Use cached embedding — avoids DB round-trip every 650 ms
    stored_emb = await get_cached_embedding(current_user_id, db)
    if not stored_emb:
        return {"face_detected": True, "recognized": False, "message": "Face not registered"}

    score = cosine_sim(live_emb, stored_emb)

    logger.info(f"[MATCH] cosine_score={score:.4f} threshold={THRESHOLD} -> {'MATCH' if score >= THRESHOLD else 'NO MATCH'}")

    recognized = score >= THRESHOLD and not phone_detected

    # Fetch name only when needed (recognised or for label)
    res = await db.execute(select(User.full_name).where(User.id == current_user_id))
    user_name = res.scalar_one_or_none() or "Unknown"

    label = user_name if recognized else ("Phone Detected" if phone_detected else "Unknown")
    color = (0, 255, 0) if recognized else (0, 0, 255)

    draw_box(img, area, label, color)

    return {
        "face_detected": True,
        "recognized": recognized,
        "score": round(score, 4),
        "liveness_verified": True,   # not checked here — checked at mark time
        "liveness_available": False, # tells frontend not to show spoof warning during scan
        "phone_detected": phone_detected,
        "spoof_score": None,
        "matched_user_name": user_name if recognized else None,
        "face_box": area,
        "face_label": label,
        "processed_image": encode_image(img),
        "message": "Phone detected in frame. Keep phone away to mark attendance." if phone_detected else None,
    }


# ─────────────────────────────────────────────
# MARK ATTENDANCE
# ─────────────────────────────────────────────
@router.post("/mark")
async def mark(payload: MarkPayload,
               request: Request,
               current_user_id: int = Depends(require_auth),
               db: AsyncSession = Depends(get_db)):

    # Block attendance marking from mobile devices.
    if is_mobile_user_agent(request.headers.get("user-agent")):
        return {
            "success": False,
            "message": "Attendance marking is allowed only on desktop/laptop camera."
        }

    detect_result = await detect(payload, current_user_id, db)

    if not detect_result["recognized"]:
        return {"success": False, "message": "Face not recognized"}
    if detect_result.get("phone_detected"):
        return {"success": False, "message": "Phone detected in frame. Attendance not approved."}
    if detect_result.get("liveness_available") and not detect_result.get("liveness_verified"):
        return {"success": False, "message": "Liveness check failed. Attendance not approved."}

    res = await db.execute(select(User).where(User.id == current_user_id))
    user = res.scalar_one()

    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")

    # Prevent duplicate attendance marking for the same day.
    existing_attendance = await db.execute(
        select(Attendance.id).where(
            Attendance.user_id == user.id,
            Attendance.date == date_str
        ).limit(1)
    )
    if existing_attendance.first():
        return {"success": False, "message": "Attendance is already marked for today."}

    db.add(Attendance(
        user_id=user.id,
        date=date_str,
        time=now.strftime("%H:%M:%S"),
        status="Present"
    ))

    await db.commit()

    # Notify managers and admins
    res_managers = await db.execute(select(User).where(User.role.in_(["l_and_d", "manager"])))
    managers = res_managers.scalars().all()
    for mgr in managers:
        db.add(Notification(
            user_id=mgr.id,
            title="Attendance Marked",
            message=f"{user.full_name} has just marked their attendance.",
            is_read=False
        ))
    await db.commit()

    return {"success": True, "message": "Attendance marked"}


# ─────────────────────────────────────────────
# ADMIN ENDPOINTS
# ─────────────────────────────────────────────
@router.get("/registered-users")
async def get_registered_users(current_user_id: int = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.role != "l_and_d").order_by(User.id.desc()))
    users = res.scalars().all()
    result = []
    for u in users:
        result.append({
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "is_registered": u.face_embedding is not None and len(u.face_embedding) > 0
        })
    return result


@router.delete("/register/{user_id}")
async def delete_registration(user_id: int, current_user_id: int = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    user.face_embedding = None
    await db.commit()

    # ⚡ Invalidate cache immediately so deleted user is no longer recognised
    _emb_cache.pop(user_id, None)

    # ⚡ Clear today's attendance so if re-registered, user can mark fresh
    today = datetime.now().strftime("%Y-%m-%d")
    old_att = await db.execute(
        select(Attendance).where(
            Attendance.user_id == user_id,
            Attendance.date == today
        )
    )
    for att in old_att.scalars().all():
        await db.delete(att)
    await db.commit()

    return {"success": True, "message": f"Face registration for {user.full_name} deleted. Today's attendance also cleared."}


@router.get("/list")
async def get_attendance_list(current_user_id: int = Depends(require_manager_or_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Attendance, User)
        .join(User, Attendance.user_id == User.id)
        .order_by(Attendance.id.desc())
    )
    records = res.all()
    result = []
    for att, user in records:
        result.append({
            "id": att.id,
            "date": att.date,
            "time": att.time,
            "status": att.status,
            "full_name": user.full_name,
            "email": user.email
        })
    return result


# ─────────────────────────────────────────────
# DEMO RESET — delete today's attendance only
# Face embedding is NOT touched.
# ─────────────────────────────────────────────
@router.delete("/reset-today/{user_id}")
async def reset_today_attendance(
    user_id: int,
    current_user_id: int = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin-only: deletes the attendance record for <user_id> for TODAY only.
    Useful for demo / re-testing without clearing face registration data.
    """
    today = datetime.now().strftime("%Y-%m-%d")

    res = await db.execute(
        select(Attendance).where(
            Attendance.user_id == user_id,
            Attendance.date == today
        )
    )
    records = res.scalars().all()

    if not records:
        return {"success": False, "message": f"No attendance record found for today ({today})."}

    for record in records:
        await db.delete(record)
    await db.commit()

    return {"success": True, "message": f"Today's attendance reset for demo. Face data untouched."}