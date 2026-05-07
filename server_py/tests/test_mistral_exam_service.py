import unittest

from services.mistral_exam_service import (
    normalize_blooms_distribution,
    score_live_exam_answers,
)


class MistralExamServiceTests(unittest.TestCase):
    def test_normalize_blooms_distribution_scales_to_question_count(self):
        requested = {
            "remember": 1,
            "understand": 1,
            "apply": 1,
            "analyze": 1,
            "evaluate": 1,
            "create": 1,
        }
        result = normalize_blooms_distribution(requested, question_count=10)

        self.assertEqual(sum(result.values()), 10)
        self.assertEqual(set(result.keys()), set(requested.keys()))

    def test_score_live_exam_answers_scores_objective_questions(self):
        questions = [
            {"question": "Q1", "marks": 2, "answer": 1, "options": ["A", "B"]},
            {"question": "Q2", "marks": 3, "answer": "blue"},
            {"question": "Q3", "marks": 5},
        ]
        answers = [1, "Blue", "anything"]

        result = score_live_exam_answers(questions, answers)

        self.assertEqual(result["score"], 5)
        self.assertEqual(result["total_marks"], 10)
        self.assertEqual(result["correct_answers"], 2)
        self.assertEqual(result["auto_graded_questions"], 2)


if __name__ == "__main__":
    unittest.main()
