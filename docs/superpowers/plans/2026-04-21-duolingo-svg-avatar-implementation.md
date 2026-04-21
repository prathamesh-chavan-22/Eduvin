# Duolingo SVG Avatar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Duolingo-style SVG avatar in the course player that lip-syncs to module narration audio using Rhubarb timing.

**Architecture:** Generate lip-sync timeline JSON on the backend right after TTS audio generation, expose a `lipSyncUrl` in course-module responses, and render a lightweight SVG avatar in the React course player. Keep v1 to one mascot with 6 visemes + blink and preserve existing audio behavior when data is missing.

**Tech Stack:** FastAPI + SQLAlchemy (backend), React + TypeScript + TanStack Query (frontend), SVG (rendering), Rhubarb CLI (phoneme timing), `node --import tsx --test` + Python `unittest` (tests), `npm run check` (type-check).

---

## File Structure and Responsibilities

- **Create:** `server_py/services/lip_sync_service.py`  
  Run Rhubarb for an audio file, validate output JSON shape, and return static URL for timeline.

- **Create:** `server_py/tests/test_lip_sync_service.py`  
  Unit tests for timeline-path derivation and Rhubarb command behavior (mocked subprocess).

- **Modify:** `server_py/routers/courses.py`  
  Call lip-sync generation in course pipeline and include `lipSyncUrl` in module payloads.

- **Modify:** `server_py/schemas.py`  
  Extend `CourseModuleOut` with optional `lip_sync_url`.

- **Modify:** `shared/routes.ts`  
  Replace module response `z.custom` with explicit module schema that includes optional `lipSyncUrl`.

- **Create:** `client/src/components/avatar/viseme.ts`  
  Pure functions to map `currentTime` to active viseme.

- **Create:** `client/src/components/avatar/viseme.test.ts`  
  Node test-runner tests for viseme mapping logic.

- **Create:** `client/src/components/avatar/AvatarNarrator.tsx`  
  SVG avatar component that fetches timeline JSON and animates mouth/blink state from audio time.

- **Modify:** `client/src/pages/courses/player.tsx`  
  Integrate `AvatarNarrator` in the existing audio narration block with shared `audio` ref.

- **Modify:** `docs/FEATURES.md`  
  Add short note about course narration avatar + lip-sync behavior.

---

### Task 1: Backend lip-sync service (TDD first)

**Files:**
- Create: `server_py/services/lip_sync_service.py`
- Create: `server_py/tests/test_lip_sync_service.py`

- [ ] **Step 1: Write the failing backend test for URL derivation**

```python
# server_py/tests/test_lip_sync_service.py
import unittest
from services.lip_sync_service import derive_lipsync_url

class LipSyncServiceTests(unittest.TestCase):
    def test_derive_lipsync_url_from_audio_url(self):
        self.assertEqual(
            derive_lipsync_url("/api/static/audio/course_1_module_2.mp3"),
            "/api/static/audio/course_1_module_2.json",
        )
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server_py && python -m unittest tests/test_lip_sync_service.py -v`  
Expected: FAIL with `ModuleNotFoundError` for `services.lip_sync_service`.

- [ ] **Step 3: Write minimal implementation**

```python
# server_py/services/lip_sync_service.py
from __future__ import annotations

def derive_lipsync_url(audio_url: str | None) -> str | None:
    if not audio_url or not audio_url.endswith(".mp3"):
        return None
    return audio_url[:-4] + ".json"
```

- [ ] **Step 4: Add failing test for Rhubarb invocation contract**

```python
from unittest.mock import patch, MagicMock
from services.lip_sync_service import generate_lipsync_json
import tempfile
import json
import os

class LipSyncServiceTests(unittest.TestCase):
    @patch("services.lip_sync_service.subprocess.run")
    def test_generate_lipsync_json_calls_rhubarb(self, mock_run):
        mock_run.return_value = MagicMock(returncode=0, stderr="")
        with tempfile.TemporaryDirectory() as tmp:
            out_json = os.path.join(tmp, "a.json")
            with open(out_json, "w", encoding="utf-8") as f:
                json.dump({"mouthCues": []}, f)
            out = generate_lipsync_json("/tmp/a.mp3", out_json, "rhubarb")
            self.assertEqual(out, out_json)
            mock_run.assert_called_once()
```

- [ ] **Step 5: Implement Rhubarb executor**

```python
import json
import os
import subprocess
from pathlib import Path

def generate_lipsync_json(audio_path: str, output_path: str, executable: str = "rhubarb") -> str:
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    cmd = [executable, "--machineReadable", "-f", "json", "-o", output_path, audio_path]
    completed = subprocess.run(cmd, capture_output=True, text=True)
    if completed.returncode != 0:
        raise RuntimeError(f"Rhubarb failed: {completed.stderr.strip()}")
    with open(output_path, "r", encoding="utf-8") as f:
        payload = json.load(f)
    if "mouthCues" not in payload:
        raise RuntimeError("Invalid Rhubarb output: missing mouthCues")
    return output_path
```

- [ ] **Step 6: Run backend tests and confirm pass**

Run: `cd server_py && python -m unittest tests/test_lip_sync_service.py -v`  
Expected: PASS with all test cases green.

- [ ] **Step 7: Commit Task 1**

```bash
git add server_py/services/lip_sync_service.py server_py/tests/test_lip_sync_service.py
git commit -m "feat: add Rhubarb lip-sync service with unit tests"
```

---

### Task 2: Wire lip-sync into course API responses and generation pipeline

**Files:**
- Modify: `server_py/routers/courses.py`
- Modify: `server_py/schemas.py`
- Modify: `shared/routes.ts`

- [ ] **Step 1: Add failing backend test for module payload containing `lipSyncUrl`**

```python
# append in server_py/tests/test_lip_sync_service.py
from services.lip_sync_service import derive_lipsync_url

def test_module_audio_maps_to_lipsync_url():
    assert derive_lipsync_url("/api/static/audio/course_4_module_8.mp3") == "/api/static/audio/course_4_module_8.json"
```

- [ ] **Step 2: Extend API output schema**

```python
# server_py/schemas.py (CourseModuleOut)
class CourseModuleOut(CamelModel):
    id: int
    course_id: Optional[int] = None
    title: str
    content: str
    sort_order: int
    quiz: Optional[str] = None
    audio_url: Optional[str] = None
    lip_sync_url: Optional[str] = None
    images: Optional[List[str]] = None
```

- [ ] **Step 3: Populate `lipSyncUrl` in course/module endpoints**

```python
# server_py/routers/courses.py
from services.lip_sync_service import derive_lipsync_url, generate_lipsync_json

def module_to_out(module):
    data = CourseModuleOut.model_validate(module).model_dump(by_alias=True)
    data["lipSyncUrl"] = derive_lipsync_url(data.get("audioUrl"))
    return data

# use module_to_out() for result["modules"] and list_modules()
```

- [ ] **Step 4: Generate timeline JSON after TTS audio is created**

```python
# server_py/routers/courses.py inside _generate_course_pipeline
filename = f"course_{course_id}_module_{mod_id}.mp3"
audio_url = await generate_audio(script, filename)
await storage.update_module_audio(db, mod_id, audio_url)

audio_path = f"server_py/static/audio/{filename}"
timeline_path = f"server_py/static/audio/{filename[:-4]}.json"
generate_lipsync_json(audio_path=audio_path, output_path=timeline_path)
```

- [ ] **Step 5: Update typed route schema for module responses**

```ts
// shared/routes.ts
const courseModuleResponseSchema = z.object({
  id: z.number(),
  courseId: z.number().nullable().optional(),
  title: z.string(),
  content: z.string(),
  sortOrder: z.number(),
  quiz: z.string().nullable().optional(),
  audioUrl: z.string().nullable().optional(),
  lipSyncUrl: z.string().nullable().optional(),
  images: z.array(z.string()).nullable().optional(),
});
```

- [ ] **Step 6: Run backend tests + type check**

Run: `cd server_py && python -m unittest tests/test_lip_sync_service.py -v`  
Expected: PASS.

Run: `npm run check`  
Expected: TypeScript compile succeeds.

- [ ] **Step 7: Commit Task 2**

```bash
git add server_py/routers/courses.py server_py/schemas.py shared/routes.ts
git commit -m "feat: expose and generate module lip-sync timeline URLs"
```

---

### Task 3: Build avatar viseme engine and component (TDD first)

**Files:**
- Create: `client/src/components/avatar/viseme.ts`
- Create: `client/src/components/avatar/viseme.test.ts`
- Create: `client/src/components/avatar/AvatarNarrator.tsx`

- [ ] **Step 1: Write failing viseme selector test**

```ts
// client/src/components/avatar/viseme.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { pickVisemeAtTime } from "./viseme";

test("pickVisemeAtTime returns active mouth cue by current time", () => {
  const cues = [
    { start: 0, end: 0.2, value: "A" },
    { start: 0.2, end: 0.4, value: "C" },
  ];
  assert.equal(pickVisemeAtTime(cues, 0.25), "C");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test client/src/components/avatar/viseme.test.ts`  
Expected: FAIL with import error for `./viseme`.

- [ ] **Step 3: Implement minimal viseme mapping**

```ts
// client/src/components/avatar/viseme.ts
export type MouthCue = { start: number; end: number; value: string };

export function pickVisemeAtTime(cues: MouthCue[], t: number): string {
  const cue = cues.find((c) => t >= c.start && t < c.end);
  return cue?.value ?? "X";
}
```

- [ ] **Step 4: Add avatar component using SVG groups**

```tsx
// client/src/components/avatar/AvatarNarrator.tsx
import { useEffect, useState } from "react";
import { pickVisemeAtTime, type MouthCue } from "./viseme";

type Props = { audioRef: React.RefObject<HTMLAudioElement | null>; lipSyncUrl?: string | null };

export default function AvatarNarrator({ audioRef, lipSyncUrl }: Props) {
  const [cues, setCues] = useState<MouthCue[]>([]);
  const [viseme, setViseme] = useState("X");
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (!lipSyncUrl) return setCues([]);
    fetch(lipSyncUrl).then((r) => r.json()).then((data) => {
      setCues(Array.isArray(data?.mouthCues) ? data.mouthCues : []);
    });
  }, [lipSyncUrl]);

  useEffect(() => {
    const id = setInterval(() => setBlink((b) => !b), 3200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(function tick() {
      const t = audioRef.current?.currentTime ?? 0;
      setViseme(pickVisemeAtTime(cues, t));
      requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [audioRef, cues]);

  return <svg viewBox="0 0 120 120">{/* eye + mouth <g> groups keyed by viseme/blink */}</svg>;
}
```

- [ ] **Step 5: Add paused/end behavior test**

```ts
test("pickVisemeAtTime returns X when no cue matches", () => {
  assert.equal(pickVisemeAtTime([], 1.2), "X");
});
```

- [ ] **Step 6: Run tests and type-check**

Run: `node --import tsx --test client/src/components/avatar/viseme.test.ts`  
Expected: PASS.

Run: `npm run check`  
Expected: PASS.

- [ ] **Step 7: Commit Task 3**

```bash
git add client/src/components/avatar/viseme.ts client/src/components/avatar/viseme.test.ts client/src/components/avatar/AvatarNarrator.tsx
git commit -m "feat: add svg avatar narrator with viseme engine"
```

---

### Task 4: Integrate avatar into course player and document behavior

**Files:**
- Modify: `client/src/pages/courses/player.tsx`
- Modify: `docs/FEATURES.md`

- [ ] **Step 1: Add failing integration test note (manual acceptance first)**

```md
Acceptance check target:
Given module has audioUrl + lipSyncUrl
When learner clicks Play
Then avatar mouth switches visemes over time and resets on end.
```

- [ ] **Step 2: Wire shared audio ref and avatar in course player**

```tsx
// client/src/pages/courses/player.tsx
const audioRef = useRef<HTMLAudioElement | null>(null);

<AvatarNarrator
  audioRef={audioRef}
  lipSyncUrl={(activeModule as any).lipSyncUrl ?? null}
/>
<audio
  ref={audioRef}
  controls
  className="w-full h-8"
  src={(activeModule as any).audioUrl}
  preload="none"
/>
```

- [ ] **Step 3: Keep safe fallback behavior**

```tsx
// client/src/components/avatar/AvatarNarrator.tsx
useEffect(() => {
  if (!lipSyncUrl) {
    setCues([]);
    setViseme("X");
    return;
  }
  fetch(lipSyncUrl)
    .then((r) => (r.ok ? r.json() : { mouthCues: [] }))
    .then((data) => setCues(Array.isArray(data?.mouthCues) ? data.mouthCues : []));
}, [lipSyncUrl]);
```

- [ ] **Step 4: Update feature documentation**

```md
### Speaking + Narration UX
- Course narration now supports a Duolingo-style SVG mascot.
- Lip-sync is driven by Rhubarb timeline JSON generated from narration audio.
- If timeline is unavailable, audio still plays and avatar remains in safe fallback mode.
```

- [ ] **Step 5: Run verification commands**

Run: `npm run check`  
Expected: PASS.

Run: `cd server_py && python -m unittest tests/test_lip_sync_service.py -v`  
Expected: PASS.

- [ ] **Step 6: Commit Task 4**

```bash
git add client/src/pages/courses/player.tsx docs/FEATURES.md
git commit -m "feat: integrate lip-sync avatar into course player narration"
```

---

### Task 5: Final verification and release readiness

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Rhubarb prerequisite note**

```md
For lip-sync generation, install Rhubarb CLI and ensure `rhubarb` is available on PATH.
```

- [ ] **Step 2: Run full project checks used in this repo**

Run: `npm run check && npm run build`  
Expected: Type-check and build succeed.

- [ ] **Step 3: Smoke run backend in dev mode**

Run: `npm run dev:api`  
Expected: FastAPI starts without import/runtime errors for lip-sync service.

- [ ] **Step 4: Commit final docs/setup adjustments**

```bash
git add README.md
git commit -m "docs: document Rhubarb setup for avatar lip-sync"
```
