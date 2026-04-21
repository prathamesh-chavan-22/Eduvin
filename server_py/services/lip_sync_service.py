"""Lip-sync service: derives JSON timeline URLs and invokes Rhubarb CLI."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path


def derive_lipsync_url(audio_url: str | None) -> str | None:
    """Return the companion .json timeline URL for an .mp3 audio URL.

    Returns ``None`` when the input is falsy or does not end with ``.mp3``.
    """
    if not audio_url or not audio_url.endswith(".mp3"):
        return None
    return audio_url[:-4] + ".json"


def generate_lipsync_json(
    audio_path: str,
    output_path: str,
    executable: str = "rhubarb",
) -> str:
    """Run Rhubarb on *audio_path* and write the timeline JSON to *output_path*.

    Args:
        audio_path: Absolute or relative path to the source ``.mp3`` file.
        output_path: Destination path for the Rhubarb JSON output.
        executable: Name / path of the Rhubarb CLI binary (default: ``rhubarb``).

    Returns:
        *output_path* on success.

    Raises:
        RuntimeError: If Rhubarb exits with a non-zero status or the output is
            missing the ``mouthCues`` key.
    """
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        executable,
        "--machineReadable",
        "-f", "json",
        "-o", output_path,
        audio_path,
    ]
    completed = subprocess.run(cmd, capture_output=True, text=True)

    if completed.returncode != 0:
        raise RuntimeError(f"Rhubarb failed: {completed.stderr.strip()}")

    with open(output_path, "r", encoding="utf-8") as fh:
        payload = json.load(fh)

    if "mouthCues" not in payload:
        raise RuntimeError("Invalid Rhubarb output: missing mouthCues key")

    return output_path
