import logging
import os

import edge_tts

logger = logging.getLogger(__name__)

# Voice mapping for different languages
VOICE_MAP = {
    "en": "en-US-AriaNeural",
    "hi": "hi-IN-SwaraNeural",  # Hindi (India) - Female voice
    "mr": "mr-IN-AarohiNeural",  # Marathi (India) - Female voice
}

AUDIO_DIR = os.path.join(os.path.dirname(__file__), "..", "static", "audio")


async def generate_audio(text: str, filename: str, language: str = "en") -> str:
    """Generate MP3 audio from text using Edge TTS. Returns URL path.
    
    Args:
        text: The text to convert to speech
        filename: The output filename (e.g., 'lesson_123.mp3')
        language: Language code ('en', 'hi', 'mr')
    
    Returns:
        URL path to the generated audio file
    """
    os.makedirs(AUDIO_DIR, exist_ok=True)
    filepath = os.path.join(AUDIO_DIR, filename)
    
    # Get the appropriate voice for the language
    voice = VOICE_MAP.get(language, VOICE_MAP["en"])

    try:
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(filepath)
        return f"/api/static/audio/{filename}"
    except Exception as e:
        logger.error(f"Edge TTS generation failed for {filename} with language {language}: {e}")
        raise
