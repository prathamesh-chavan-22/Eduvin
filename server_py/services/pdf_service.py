import os
from datetime import datetime
from io import BytesIO
from typing import Any

from jinja2 import Environment, FileSystemLoader


def render_exam_paper_pdf(
    course_title: str,
    questions: list[dict],
    total_marks: int,
) -> bytes:
    try:
        return _render_with_reportlab(
            course_title=course_title,
            questions=questions,
            total_marks=total_marks,
        )
    except Exception as reportlab_exc:
        try:
            return _render_with_weasyprint(
                course_title=course_title,
                questions=questions,
                total_marks=total_marks,
            )
        except Exception as weasy_exc:
            raise RuntimeError(
                "PDF generation failed with both ReportLab and WeasyPrint backends. "
                "Install dependencies with `pip install -r server_py/requirements.txt`. "
                "If using WeasyPrint on macOS, install system libs: pango gdk-pixbuf libffi. "
                f"ReportLab error: {reportlab_exc}; WeasyPrint error: {weasy_exc}"
            ) from weasy_exc


def _render_with_reportlab(
    course_title: str,
    questions: list[dict],
    total_marks: int,
) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

    styles = getSampleStyleSheet()
    title_style = styles["Title"]
    heading_style = styles["Heading3"]
    normal_style = styles["BodyText"]

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"Exam Paper - {course_title}",
        author="EduVin AI",
    )

    story = [
        Paragraph(course_title or "Exam Paper", title_style),
        Spacer(1, 6),
        Paragraph(f"Date: {datetime.now().strftime('%B %d, %Y')}", normal_style),
        Paragraph(f"Total Marks: {int(total_marks or 0)}", heading_style),
        Spacer(1, 10),
    ]

    safe_questions = questions if isinstance(questions, list) else []
    for idx, q in enumerate(safe_questions, start=1):
        q = q if isinstance(q, dict) else {}
        q_type = str(q.get("type", "question")).title()
        q_marks = int(q.get("marks", 0) or 0)
        q_text = str(q.get("question", "")).strip() or "(No question text provided)"
        q_rubric = str(q.get("rubric", "")).strip()

        story.append(Paragraph(f"Q{idx}. [{q_type}] ({q_marks} marks)", heading_style))
        story.append(Paragraph(q_text, normal_style))

        if q_rubric:
            story.append(Spacer(1, 4))
            story.append(Paragraph(f"Rubric: {q_rubric}", normal_style))

        story.append(Spacer(1, 10))

    doc.build(story)
    return buffer.getvalue()


def _render_with_weasyprint(
    course_title: str,
    questions: list[dict[str, Any]],
    total_marks: int,
) -> bytes:
    from weasyprint import HTML

    template_dir = os.path.join(os.path.dirname(__file__), "..", "templates")
    env = Environment(loader=FileSystemLoader(template_dir))
    template = env.get_template("exam_paper.html")

    html_content = template.render(
        course_title=course_title,
        date=datetime.now().strftime("%B %d, %Y"),
        questions=questions,
        total_marks=total_marks,
    )

    pdf_bytes = HTML(string=html_content).write_pdf()
    return pdf_bytes
