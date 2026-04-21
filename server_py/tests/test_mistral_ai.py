import unittest
from unittest.mock import patch

from services.mistral_ai import generate_chapter_content


class GenerateChapterContentTests(unittest.IsolatedAsyncioTestCase):
    @patch("services.mistral_ai._web_search", return_value="")
    @patch(
        "services.mistral_ai._call_mistral",
        return_value='```json\n{"content":"Lesson body","quiz":{"questions":[]},"tts_script":"Narration"}\n```',
    )
    async def test_generate_chapter_content_parses_fenced_json(self, _mock_call, _mock_search):
        result = await generate_chapter_content(
            course_title="Cybersecurity 101",
            chapter_title="Threat Modeling",
            chapter_summary="How to identify threats",
        )

        self.assertEqual(result["content"], "Lesson body")
        self.assertIn("quiz", result)
        self.assertEqual(result["tts_script"], "Narration")


if __name__ == "__main__":
    unittest.main()
