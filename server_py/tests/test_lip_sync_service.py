import json
import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from services.lip_sync_service import derive_lipsync_url, generate_lipsync_json


class LipSyncServiceTests(unittest.TestCase):
    # ── derive_lipsync_url ──────────────────────────────────────────────────

    def test_derive_lipsync_url_from_audio_url(self):
        self.assertEqual(
            derive_lipsync_url("/api/static/audio/course_1_module_2.mp3"),
            "/api/static/audio/course_1_module_2.json",
        )

    def test_derive_lipsync_url_from_longer_path(self):
        self.assertEqual(
            derive_lipsync_url("/api/static/audio/course_4_module_8.mp3"),
            "/api/static/audio/course_4_module_8.json",
        )

    def test_derive_lipsync_url_returns_none_for_none(self):
        self.assertIsNone(derive_lipsync_url(None))

    def test_derive_lipsync_url_returns_none_for_non_mp3(self):
        self.assertIsNone(derive_lipsync_url("/static/audio/file.wav"))

    def test_derive_lipsync_url_returns_none_for_empty_string(self):
        self.assertIsNone(derive_lipsync_url(""))

    # ── generate_lipsync_json ───────────────────────────────────────────────

    @patch("services.lip_sync_service.subprocess.run")
    def test_generate_lipsync_json_calls_rhubarb(self, mock_run: MagicMock):
        mock_run.return_value = MagicMock(returncode=0, stderr="")
        with tempfile.TemporaryDirectory() as tmp:
            out_json = os.path.join(tmp, "a.json")
            with open(out_json, "w", encoding="utf-8") as f:
                json.dump({"mouthCues": []}, f)
            result = generate_lipsync_json("/tmp/a.mp3", out_json, "rhubarb")
            self.assertEqual(result, out_json)
            mock_run.assert_called_once()

    @patch("services.lip_sync_service.subprocess.run")
    def test_generate_lipsync_json_raises_on_nonzero_exit(self, mock_run: MagicMock):
        mock_run.return_value = MagicMock(returncode=1, stderr="something went wrong")
        with self.assertRaises(RuntimeError) as ctx:
            generate_lipsync_json("/tmp/a.mp3", "/tmp/a.json", "rhubarb")
        self.assertIn("Rhubarb failed", str(ctx.exception))

    @patch("services.lip_sync_service.subprocess.run")
    def test_generate_lipsync_json_raises_on_missing_mouth_cues(self, mock_run: MagicMock):
        mock_run.return_value = MagicMock(returncode=0, stderr="")
        with tempfile.TemporaryDirectory() as tmp:
            out_json = os.path.join(tmp, "bad.json")
            with open(out_json, "w", encoding="utf-8") as f:
                json.dump({"unexpected": "field"}, f)
            with self.assertRaises(RuntimeError) as ctx:
                generate_lipsync_json("/tmp/a.mp3", out_json, "rhubarb")
            self.assertIn("mouthCues", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
