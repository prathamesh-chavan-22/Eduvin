import os
from datetime import datetime

from jinja2 import Environment, FileSystemLoader


def render_exam_paper_pdf(
    course_title: str,
    questions: list[dict],
    total_marks: int,
) -> bytes:
    try:
        from weasyprint import HTML
    except Exception as exc:
        raise RuntimeError(
            "PDF generation dependencies are missing. Install WeasyPrint system libraries "
            "(macOS/Homebrew: pango gdk-pixbuf libffi) and reinstall Python deps."
        ) from exc

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
