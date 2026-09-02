from __future__ import annotations

import re
from pathlib import Path

from PIL import Image
from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    ArrayObject,
    BooleanObject,
    DictionaryObject,
    NameObject,
    NumberObject,
    TextStringObject,
)
from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "aster-ui-platform-portfolio.pdf"
TMP = ROOT / "tmp" / "pdfs"

PAGE_W, PAGE_H = landscape(A4)
MARGIN = 36
CONTENT_W = PAGE_W - MARGIN * 2

INK = HexColor("#161719")
TEXT = HexColor("#30333A")
MUTED = HexColor("#656A73")
SUBTLE = HexColor("#69707A")
LINE = HexColor("#DEE1E6")
PAPER = HexColor("#F5F6F8")
CARD = white
CORAL = HexColor("#C7352D")
CORAL_SOFT = HexColor("#FCEBE9")
BLUE = HexColor("#2563EB")
BLUE_SOFT = HexColor("#EAF1FF")
GREEN = HexColor("#15803D")
GREEN_SOFT = HexColor("#EAF7EE")
PURPLE = HexColor("#6D4AFF")
PURPLE_SOFT = HexColor("#F0EDFF")


def register_fonts() -> None:
    bundled_fonts = ROOT / "portfolio" / "fonts"
    runtime_fonts = (
        Path.home()
        / ".cache/codex-runtimes/codex-primary-runtime/dependencies/native/libreoffice-headless/"
        "libreoffice/LibreOfficeDev.app/Contents/Resources/fonts/truetype"
    )

    def resolve_font(label: str, candidates: list[Path]) -> Path:
        for candidate in candidates:
            if candidate.is_file():
                return candidate
        choices = "\n  - ".join(str(candidate) for candidate in candidates)
        raise FileNotFoundError(f"{label} font not found. Checked:\n  - {choices}")

    korean = resolve_font(
        "Korean",
        [
            bundled_fonts / "NotoSansKR-Regular.ttf",
            Path("/System/Library/Fonts/Supplemental/AppleGothic.ttf"),
            Path("/Library/Fonts/NotoSansKR-Regular.otf"),
            Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
        ],
    )
    latin = resolve_font(
        "Latin regular",
        [
            bundled_fonts / "LiberationSans-Regular.ttf",
            runtime_fonts / "LiberationSans-Regular.ttf",
            Path("/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"),
        ],
    )
    latin_bold = resolve_font(
        "Latin bold",
        [
            bundled_fonts / "LiberationSans-Bold.ttf",
            runtime_fonts / "LiberationSans-Bold.ttf",
            Path("/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"),
        ],
    )
    mono = resolve_font(
        "Monospace",
        [
            bundled_fonts / "LiberationMono-Regular.ttf",
            runtime_fonts / "LiberationMono-Regular.ttf",
            Path("/usr/share/fonts/truetype/liberation2/LiberationMono-Regular.ttf"),
        ],
    )
    pdfmetrics.registerFont(TTFont("Korean", str(korean)))
    pdfmetrics.registerFont(TTFont("Latin", str(latin)))
    pdfmetrics.registerFont(TTFont("LatinBold", str(latin_bold)))
    pdfmetrics.registerFont(TTFont("Mono", str(mono)))


def top_y(top: float) -> float:
    return PAGE_H - top


def set_font(c: canvas.Canvas, font: str, size: float, color: Color = TEXT) -> None:
    c.setFont(font, size)
    c.setFillColor(color)


def start_page_tags(c: canvas.Canvas) -> None:
    c._next_mcid = 0
    c._tag_records = []


def begin_marked_content(
    c: canvas.Canvas,
    role: str = "P",
    alt: str | None = None,
) -> None:
    if role == "Artifact":
        c._code.append("/Artifact BMC")
        return
    mcid = c._next_mcid
    c._next_mcid += 1
    c._tag_records.append({"mcid": mcid, "role": role, "alt": alt})
    c._code.append(f"/{role} <</MCID {mcid}>> BDC")


def end_marked_content(c: canvas.Canvas) -> None:
    c._code.append("EMC")


def draw_text(
    c: canvas.Canvas,
    text: str,
    x: float,
    top: float,
    size: float = 10.5,
    font: str = "Korean",
    color: Color = TEXT,
    role: str = "P",
) -> None:
    begin_marked_content(c, role)
    set_font(c, font, size, color)
    c.drawString(x, top_y(top + size), text)
    end_marked_content(c)


def wrap_lines(text: str, font: str, size: float, width: float) -> list[str]:
    lines: list[str] = []
    for paragraph in text.split("\n"):
        if not paragraph:
            lines.append("")
            continue
        tokens = re.findall(r"\S+\s*", paragraph)
        current = ""
        for token in tokens:
            candidate = current + token
            if pdfmetrics.stringWidth(candidate.rstrip(), font, size) <= width:
                current = candidate
                continue
            if current.strip():
                lines.append(current.rstrip())
                current = ""
            raw = token.rstrip()
            while raw and pdfmetrics.stringWidth(raw, font, size) > width:
                cut = 1
                while cut < len(raw) and pdfmetrics.stringWidth(raw[: cut + 1], font, size) <= width:
                    cut += 1
                lines.append(raw[:cut])
                raw = raw[cut:]
            current = raw + (" " if token.endswith(" ") else "")
        if current.strip():
            lines.append(current.rstrip())
    return lines


def draw_wrapped(
    c: canvas.Canvas,
    text: str,
    x: float,
    top: float,
    width: float,
    size: float = 10.5,
    leading: float | None = None,
    font: str = "Korean",
    color: Color = TEXT,
    max_lines: int | None = None,
    role: str = "P",
) -> float:
    leading = leading or size * 1.55
    lines = wrap_lines(text, font, size, width)
    if max_lines is not None:
        lines = lines[:max_lines]
    begin_marked_content(c, role)
    set_font(c, font, size, color)
    for index, line in enumerate(lines):
        c.drawString(x, top_y(top + size + index * leading), line)
    end_marked_content(c)
    return top + len(lines) * leading


def draw_bullet(
    c: canvas.Canvas,
    text: str,
    x: float,
    top: float,
    width: float,
    size: float = 10,
    color: Color = TEXT,
    accent: Color = CORAL,
    leading: float | None = None,
    role: str = "P",
) -> float:
    leading = leading or size * 1.55
    lines = wrap_lines(text, "Korean", size, width - 17)
    c.setFillColor(accent)
    c.circle(x + 4, top_y(top + size * 0.72), 2.3, fill=1, stroke=0)
    begin_marked_content(c, role)
    set_font(c, "Korean", size, color)
    for index, line in enumerate(lines):
        c.drawString(x + 15, top_y(top + size + index * leading), line)
    end_marked_content(c)
    return top + len(lines) * leading


def draw_link_text(
    c: canvas.Canvas,
    label: str,
    url: str,
    x: float,
    top: float,
    size: float = 8,
    font: str = "Latin",
    color: Color = BLUE,
) -> float:
    draw_text(c, label, x, top, size, font, color)
    width = pdfmetrics.stringWidth(label, font, size)
    baseline = top_y(top + size)
    c.linkURL(url, (x, baseline - 2, x + width, baseline + size + 2), relative=0, thickness=0)
    c.setStrokeColor(color)
    c.setLineWidth(0.45)
    c.line(x, baseline - 2.5, x + width, baseline - 2.5)
    return width


def rounded_card(
    c: canvas.Canvas,
    x: float,
    top: float,
    width: float,
    height: float,
    fill: Color = CARD,
    stroke: Color = LINE,
    radius: float = 12,
    shadow: bool = False,
) -> None:
    if shadow:
        c.setFillColor(Color(0, 0, 0, alpha=0.05))
        c.roundRect(x + 2, top_y(top + height) - 2, width, height, radius, fill=1, stroke=0)
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(0.75)
    c.roundRect(x, top_y(top + height), width, height, radius, fill=1, stroke=1)


def pill(
    c: canvas.Canvas,
    label: str,
    x: float,
    top: float,
    fill: Color = CORAL_SOFT,
    color: Color = CORAL,
    font: str = "Korean",
    size: float = 8.5,
    pad_x: float = 9,
) -> float:
    width = pdfmetrics.stringWidth(label, font, size) + pad_x * 2
    height = 22
    c.setFillColor(fill)
    c.roundRect(x, top_y(top + height), width, height, 7, fill=1, stroke=0)
    draw_text(c, label, x + pad_x, top + 5.2, size=size, font=font, color=color)
    return width


def page_shell(c: canvas.Canvas, page: int, section: str, dark: bool = False) -> None:
    c.setFillColor(INK if dark else PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    if dark:
        return
    draw_text(c, "ASTER UI PLATFORM", MARGIN, 22, 8.5, "LatinBold", INK, "Artifact")
    draw_text(c, section, MARGIN + 116, 22, 8.5, "Korean", MUTED, "Artifact")
    c.setStrokeColor(LINE)
    c.setLineWidth(0.7)
    c.line(MARGIN, top_y(44), PAGE_W - MARGIN, top_y(44))
    draw_text(
        c,
        f"{page:02d} / 10",
        PAGE_W - MARGIN - 34,
        PAGE_H - 23,
        8,
        "Latin",
        SUBTLE,
        "Artifact",
    )


def page_title(
    c: canvas.Canvas,
    eyebrow: str,
    title: str,
    subtitle: str | None = None,
    top: float = 62,
    width: float = 750,
) -> float:
    draw_text(c, eyebrow.upper(), MARGIN, top, 8.5, "LatinBold", CORAL, "Artifact")
    y = draw_wrapped(c, title, MARGIN, top + 20, width, 24, 31, "Korean", INK, None, "H1")
    if subtitle:
        y = draw_wrapped(c, subtitle, MARGIN, y + 8, width, 10.5, 16.5, "Korean", MUTED)
    return y


def metric_card(
    c: canvas.Canvas,
    x: float,
    top: float,
    width: float,
    value: str,
    label: str,
    accent: Color = CORAL,
) -> None:
    rounded_card(c, x, top, width, 72, CARD, LINE, 10)
    draw_text(c, value, x + 14, top + 12, 22, "LatinBold", accent)
    draw_wrapped(c, label, x + 14, top + 42, width - 28, 8.5, 12, "Korean", MUTED, 2)


def draw_image_fit(
    c: canvas.Canvas,
    path: Path,
    x: float,
    top: float,
    width: float,
    height: float,
    border: bool = True,
    bg: Color = white,
    alt: str | None = None,
) -> None:
    img = ImageReader(str(path))
    iw, ih = img.getSize()
    scale = min(width / iw, height / ih)
    dw, dh = iw * scale, ih * scale
    dx = x + (width - dw) / 2
    dy = top_y(top + height) + (height - dh) / 2
    c.setFillColor(bg)
    c.roundRect(x, top_y(top + height), width, height, 10, fill=1, stroke=0)
    begin_marked_content(c, "Figure", alt or path.stem)
    c.drawImage(img, dx, dy, dw, dh, preserveAspectRatio=True, mask="auto")
    end_marked_content(c)
    if border:
        c.setStrokeColor(LINE)
        c.setLineWidth(0.8)
        c.roundRect(x, top_y(top + height), width, height, 10, fill=0, stroke=1)


def crop_image(source: Path, box: tuple[int, int, int, int], name: str) -> Path:
    TMP.mkdir(parents=True, exist_ok=True)
    output = TMP / name
    with Image.open(source) as image:
        scale_x = image.width / 1440
        scale_y = image.height / 1024
        scaled_box = (
            round(box[0] * scale_x),
            round(box[1] * scale_y),
            round(box[2] * scale_x),
            round(box[3] * scale_y),
        )
        image.crop(scaled_box).save(output, format="PNG", optimize=True)
    return output


def add_accessibility_structure(
    source: Path,
    destination: Path,
    page_tags: list[list[dict[str, object]]],
) -> None:
    reader = PdfReader(source)
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)

    structure = DictionaryObject({NameObject("/Type"): NameObject("/StructTreeRoot")})
    structure_ref = writer._add_object(structure)
    document = DictionaryObject(
        {
            NameObject("/Type"): NameObject("/StructElem"),
            NameObject("/S"): NameObject("/Document"),
            NameObject("/P"): structure_ref,
            NameObject("/K"): ArrayObject(),
        }
    )
    document_ref = writer._add_object(document)
    structure[NameObject("/K")] = ArrayObject([document_ref])

    parent_tree_numbers = ArrayObject()
    document_children = document[NameObject("/K")]
    for page_index, (page, records) in enumerate(zip(writer.pages, page_tags)):
        page[NameObject("/StructParents")] = NumberObject(page_index)
        page[NameObject("/Tabs")] = NameObject("/S")
        section = DictionaryObject(
            {
                NameObject("/Type"): NameObject("/StructElem"),
                NameObject("/S"): NameObject("/Sect"),
                NameObject("/P"): document_ref,
                NameObject("/Pg"): page.indirect_reference,
                NameObject("/K"): ArrayObject(),
            }
        )
        section_ref = writer._add_object(section)
        document_children.append(section_ref)
        section_children = section[NameObject("/K")]
        parent_entries = ArrayObject()
        for record in records:
            element = DictionaryObject(
                {
                    NameObject("/Type"): NameObject("/StructElem"),
                    NameObject("/S"): NameObject(f"/{record['role']}"),
                    NameObject("/P"): section_ref,
                    NameObject("/Pg"): page.indirect_reference,
                    NameObject("/K"): NumberObject(int(record["mcid"])),
                }
            )
            if record.get("alt"):
                element[NameObject("/Alt")] = TextStringObject(str(record["alt"]))
            element_ref = writer._add_object(element)
            section_children.append(element_ref)
            parent_entries.append(element_ref)
        parent_tree_numbers.extend([NumberObject(page_index), parent_entries])

    parent_tree = DictionaryObject({NameObject("/Nums"): parent_tree_numbers})
    structure[NameObject("/ParentTree")] = writer._add_object(parent_tree)
    structure[NameObject("/ParentTreeNextKey")] = NumberObject(len(page_tags))
    writer.root_object[NameObject("/StructTreeRoot")] = structure_ref
    writer.root_object[NameObject("/MarkInfo")] = DictionaryObject(
        {NameObject("/Marked"): BooleanObject(True)}
    )
    writer.root_object[NameObject("/Lang")] = TextStringObject("ko-KR")
    writer.root_object[NameObject("/ViewerPreferences")] = DictionaryObject(
        {NameObject("/DisplayDocTitle"): BooleanObject(True)}
    )
    with destination.open("wb") as stream:
        writer.write(stream)


def draw_step(
    c: canvas.Canvas,
    number: int,
    title: str,
    detail: str,
    x: float,
    top: float,
    width: float,
    accent: Color,
) -> None:
    rounded_card(c, x, top, width, 92, CARD, LINE, 10)
    c.setFillColor(accent)
    c.circle(x + 20, top_y(top + 21), 11, fill=1, stroke=0)
    set_font(c, "LatinBold", 9, white)
    c.drawCentredString(x + 20, top_y(top + 24.5), str(number))
    draw_text(c, title, x + 39, top + 12, 10.5, "Korean", INK)
    draw_wrapped(c, detail, x + 14, top + 39, width - 28, 8.7, 13, "Korean", MUTED, 3)


def draw_progress(
    c: canvas.Canvas,
    x: float,
    top: float,
    width: float,
    label: str,
    value: int,
    budget: int,
    unit: str,
    color: Color,
) -> None:
    ratio = min(value / budget, 1)
    draw_text(c, label, x, top, 8.8, "Korean", TEXT)
    draw_text(c, f"{value:,} / {budget:,} {unit}", x + width - 120, top, 8.2, "Latin", MUTED)
    c.setFillColor(HexColor("#E8EAF0"))
    c.roundRect(x, top_y(top + 25), width, 7, 3.5, fill=1, stroke=0)
    c.setFillColor(color)
    c.roundRect(x, top_y(top + 25), width * ratio, 7, 3.5, fill=1, stroke=0)


def draw_progress_compact(
    c: canvas.Canvas,
    x: float,
    top: float,
    width: float,
    label: str,
    value: int,
    budget: int,
    unit: str,
    color: Color,
) -> None:
    ratio = min(value / budget, 1)
    draw_text(c, label, x, top, 8.2, "Korean", TEXT)
    draw_text(c, f"{value:,} / {budget:,} {unit}", x + width - 120, top, 7.9, "Latin", MUTED)
    c.setFillColor(HexColor("#E8EAF0"))
    c.roundRect(x, top_y(top + 16), width, 5, 2.5, fill=1, stroke=0)
    c.setFillColor(color)
    c.roundRect(x, top_y(top + 16), width * ratio, 5, 2.5, fill=1, stroke=0)


def page_cover(c: canvas.Canvas) -> None:
    page_shell(c, 1, "", dark=True)
    c.setFillColor(CORAL)
    c.rect(0, PAGE_H - 7, PAGE_W, 7, fill=1, stroke=0)
    draw_text(
        c,
        "FRONTEND DESIGN SYSTEM PORTFOLIO",
        42,
        46,
        9.5,
        "LatinBold",
        HexColor("#F29B94"),
        "Artifact",
    )
    begin_marked_content(c, "H1")
    set_font(c, "LatinBold", 33, white)
    c.drawString(42, top_y(79 + 33), "Aster UI")
    c.drawString(42, top_y(117 + 33), "Platform")
    end_marked_content(c)
    draw_wrapped(
        c,
        "디자인 변경을 검토하고 배포 준비 상태를 판단하는 내부 도구를 설계한 포트폴리오",
        42,
        176,
        205,
        14,
        22,
        "Korean",
        HexColor("#E6E7EA"),
    )
    tags = ["React / TypeScript", "Turborepo", "DTCG Tokens", "Figma / AI", "A11y / Release"]
    y = 286
    for label in tags:
        pill(c, label, 42, y, HexColor("#292B30"), HexColor("#F2F3F5"), "Latin", 8.3)
        y += 30
    screenshot = ROOT / "design" / "implementation-desktop-final.png"
    rounded_card(c, 278, 54, 525, 474, HexColor("#202226"), HexColor("#3A3D43"), 13, True)
    draw_image_fit(
        c,
        screenshot,
        290,
        67,
        501,
        449,
        True,
        white,
        "Aster UI Studio의 데스크톱 컴포넌트 검토 화면",
    )
    draw_text(c, "곽현 / Frontend Engineer", 42, 516, 8.7, "Korean", HexColor("#D9DBE0"))
    draw_link_text(
        c,
        "github.com/kwakhyun/aster-ui-platform",
        "https://github.com/kwakhyun/aster-ui-platform",
        42,
        531,
        7.4,
        "Latin",
        HexColor("#AEBFEF"),
    )
    draw_link_text(
        c,
        "kwakhyun.github.io/aster-ui-platform",
        "https://kwakhyun.github.io/aster-ui-platform/",
        42,
        547,
        7.2,
        "Latin",
        HexColor("#AEBFEF"),
    )
    draw_link_text(
        c,
        "linkedin.com/in/hyun-kwak-598a49250",
        "https://www.linkedin.com/in/hyun-kwak-598a49250/",
        42,
        563,
        7.1,
        "Latin",
        HexColor("#AEBFEF"),
    )
    draw_text(c, "개인 PoC / 검증 기준 2026.09.02", 42, 580, 7.2, "Korean", HexColor("#A3A8B0"))


def page_problem(c: canvas.Canvas) -> None:
    page_shell(c, 2, "문제 정의와 역할")
    y = page_title(
        c,
        "01 / PROBLEM",
        "컴포넌트를 만드는 것보다 변경을 안전하게 전달하는 일이 더 어렵다",
        "갤러리의 완성도보다 여러 제품과 플랫폼에 변경을 전달하는 운영 흐름을 먼저 설계했습니다.",
    )
    left_x, left_w = MARGIN, 468
    rounded_card(c, left_x, y + 18, left_w, 244, CARD, LINE, 12)
    draw_text(c, "해결하려고 한 운영 질문", left_x + 18, y + 36, 12, "Korean", INK)
    questions = [
        "Figma의 시맨틱 별칭 변경을 코드 계약과 어떻게 일치시킬 것인가",
        "여러 개발자가 쓰는 API의 하위 호환성과 문서를 어떻게 자동으로 유지할 것인가",
        "공용 컴포넌트 도입 현황과 지원 중단 예정 API 사용을 어떻게 재현 가능하게 계산할 것인가",
        "AI가 만든 변경안을 어디까지 자동화하고 어느 단계에서 사람 검토로 전환할 것인가",
        "로컬 통과, CI 통과, 실제 배포를 어떻게 구분해 근거로 남길 것인가",
    ]
    qy = y + 68
    for q in questions:
        qy = draw_bullet(c, q, left_x + 18, qy, left_w - 36, 9.3, TEXT, CORAL, 13.6) + 18

    right_x, right_w = 525, PAGE_W - 525 - MARGIN
    rounded_card(c, right_x, y + 18, right_w, 116, INK, INK, 12)
    draw_text(c, "핵심 판단", right_x + 18, y + 36, 9, "Korean", HexColor("#F39A93"))
    draw_wrapped(
        c,
        "디자인 시스템을 라이브러리가 아니라 변경을 검토하고 릴리스 준비 상태를 판단하는 내부 제품으로 본다.",
        right_x + 18,
        y + 62,
        right_w - 36,
        11.4,
        17,
        "Korean",
        white,
    )
    rounded_card(c, right_x, y + 146, right_w, 116, CARD, LINE, 12)
    draw_text(c, "개인 프로젝트에서 맡은 범위", right_x + 18, y + 164, 10.5, "Korean", INK)
    roles = [
        "제품 문제 정의와 정보 구조",
        "운영 도구 UI와 반응형 구현",
        "React API, 토큰, Figma 계약",
        "AI 검증, 접근성, 릴리스 자동화",
    ]
    ry = y + 191
    for role in roles:
        ry = draw_bullet(c, role, right_x + 18, ry, right_w - 36, 8.7, TEXT, BLUE, 12.8) + 3

    rounded_card(c, MARGIN, y + 278, PAGE_W - MARGIN * 2, 119, CARD, LINE, 12)
    draw_text(c, "프로젝트 상태", MARGIN + 18, y + 296, 10.5, "Korean", INK)
    status = [
        ("개인 PoC", "실제 회사 코드와 사용자 데이터를 사용하지 않음"),
        ("검증 환경", "로컬 근거, 공개 CI, Pages 데모로 상태를 구분해 확인"),
        ("외부 쓰기", "Figma에 쓰기 작업과 npm 배포는 실행하지 않음"),
        ("구현 범위", "UI, API, 토큰, AI, 품질, 릴리스 자동화"),
    ]
    col_w = (PAGE_W - MARGIN * 2 - 36) / 4
    for index, (label, detail) in enumerate(status):
        x = MARGIN + 18 + index * col_w
        if index:
            c.setStrokeColor(LINE)
            c.line(x - 10, top_y(y + 321), x - 10, top_y(y + 374))
        draw_text(c, label, x, y + 326, 8.7, "Korean", CORAL if index == 0 else BLUE)
        draw_wrapped(c, detail, x, y + 348, col_w - 20, 8.2, 12.4, "Korean", MUTED)


def page_product(c: canvas.Canvas) -> None:
    page_shell(c, 3, "운영 제품 화면")
    y = page_title(
        c,
        "02 / PRODUCT",
        "현재 상태와 릴리스 근거를 한 화면에서 함께 검토",
        "정적 데모 목록 대신 공용 패키지 매니페스트와 저장소 검증 근거를 화면의 데이터 소스로 사용합니다.",
    )
    screenshot = ROOT / "design" / "implementation-desktop-final.png"
    content_h = 400
    screenshot_w = content_h * 1440 / 1024
    content_gap = 18
    draw_image_fit(
        c,
        screenshot,
        MARGIN,
        y + 14,
        screenshot_w,
        content_h,
        True,
        white,
        "Aster UI Studio 전체 화면과 컴포넌트, 토큰, 품질 검사 영역",
    )
    right_x = MARGIN + screenshot_w + content_gap
    right_w = PAGE_W - MARGIN - right_x
    callouts = [
        ("1", "탐색", "실제 컴포넌트 6개를 생성 매니페스트에서 읽습니다."),
        ("2", "작업 영역", "미리보기, 상태, 테마, 플랫폼 영향을 같은 문맥에서 확인합니다."),
        ("3", "검사 패널", "API, 토큰 변경, 현재 소스와 연결된 검증 결과를 전환해 봅니다."),
    ]
    cy = y + 14
    callout_h = (content_h - 30) / 3
    for num, title, body in callouts:
        rounded_card(c, right_x, cy, right_w, callout_h, CARD, LINE, 10)
        c.setFillColor(CORAL if num == "1" else BLUE if num == "2" else PURPLE)
        c.circle(right_x + 20, top_y(cy + 21), 11, fill=1, stroke=0)
        set_font(c, "LatinBold", 9, white)
        c.drawCentredString(right_x + 20, top_y(cy + 24.5), num)
        draw_text(c, title, right_x + 40, cy + 13, 10.5, "Korean", INK)
        draw_wrapped(c, body, right_x + 14, cy + 47, right_w - 28, 8.7, 13.4, "Korean", MUTED)
        cy += callout_h + 15


def page_architecture(c: canvas.Canvas) -> None:
    page_shell(c, 4, "변경 전달 아키텍처")
    y = page_title(
        c,
        "03 / SYSTEM",
        "하나의 디자인 변경을 검증 가능한 계약으로 연결",
        "단계마다 입력과 실패 조건을 분리해 Figma, 코드, 소비 앱, 릴리스가 같은 변경 근거를 보도록 했습니다.",
    )
    steps = [
        ("Figma 읽기", "Variables REST 응답 또는 비식별 테스트 픽스처", PURPLE),
        ("별칭 검증", "컬렉션, 모드, 대상 변수와 DTCG 경로 확인", PURPLE),
        ("토큰 생성", "Coral / Ocean에서 CSS, JSON, Swift, Compose 생성", BLUE),
        ("React API", "레지스트리와 TypeScript AST에서 공개 계약 생성", BLUE),
        ("소비 앱", "실제 import와 JSX 사용으로 도입 현황 계산", CORAL),
        ("AI 제안", "JSON Schema 출력과 결정론적 위험 검증", CORAL),
        ("검증 결과", "단위, axe, 시각, 성능, 보안 결과 결합", GREEN),
        ("사람 검토", "변경 내용과 근거를 확인하고 별도 승인 기록", GREEN),
        ("릴리스", "로컬 리허설 또는 검증 뒤 release-please", INK),
    ]
    start_top = y + 20
    gap = 17
    card_w = (CONTENT_W - gap * 2) / 3
    path = [(0, 0), (0, 1), (0, 2), (1, 2), (1, 1), (1, 0), (2, 0), (2, 1), (2, 2)]
    placements: list[tuple[float, float]] = []
    for row, col in path:
        placements.append((MARGIN + col * (card_w + gap), start_top + row * 111))

    c.setStrokeColor(HexColor("#AEB4BE"))
    c.setLineWidth(1.3)
    for (x1, top1), (x2, top2) in zip(placements, placements[1:]):
        if top1 == top2:
            if x2 > x1:
                start_x, end_x = x1 + card_w + 4, x2 - 4
            else:
                start_x, end_x = x1 - 4, x2 + card_w + 4
            line_y = top_y(top1 + 46)
            c.line(start_x, line_y, end_x, line_y)
            c.setFillColor(HexColor("#AEB4BE"))
            c.circle(end_x, line_y, 2, fill=1, stroke=0)
        else:
            line_x = x1 + card_w / 2
            start_y, end_y = top_y(top1 + 96), top_y(top2 - 4)
            c.line(line_x, start_y, line_x, end_y)
            c.setFillColor(HexColor("#AEB4BE"))
            c.circle(line_x, end_y, 2, fill=1, stroke=0)

    for index, ((title, detail, accent), (x, top)) in enumerate(zip(steps, placements), start=1):
        draw_step(c, index, title, detail, x, top, card_w, accent)
    rounded_card(c, MARGIN, start_top + 347, PAGE_W - MARGIN * 2, 62, INK, INK, 10)
    draw_text(c, "설계 원칙", MARGIN + 16, start_top + 365, 9.2, "Korean", HexColor("#F39A93"))
    draw_wrapped(
        c,
        "표시용 성공 문구를 하드코딩하지 않고, 현재 소스 리비전과 산출물 해시가 일치하는 근거만 릴리스 준비 상태로 인정합니다.",
        MARGIN + 91,
        start_top + 361,
        PAGE_W - MARGIN * 2 - 108,
        10,
        15,
        "Korean",
        white,
    )


def page_figma_tokens(c: canvas.Canvas, token_crop: Path) -> None:
    page_shell(c, 5, "Figma와 토큰")
    y = page_title(
        c,
        "04 / DESIGN TO CODE",
        "값을 복사하는 대신 시맨틱 별칭의 의미를 검증",
        "Figma 변경을 그대로 적용하지 않고 이전 스냅샷, 별칭 대상, DTCG 핵심 계약을 모두 통과한 정보만 검토 화면에 표시합니다.",
    )
    left_w = 532
    metric_gap = 12
    metric_w = (left_w - metric_gap * 2) / 3
    metric_card(c, MARGIN, y + 18, metric_w, "31", "DTCG 핵심 경로", PURPLE)
    metric_card(c, MARGIN + metric_w + metric_gap, y + 18, metric_w, "2", "Coral / Ocean 테마", BLUE)
    metric_card(
        c,
        MARGIN + (metric_w + metric_gap) * 2,
        y + 18,
        metric_w,
        "4",
        "CSS / JSON / Swift / Compose",
        CORAL,
    )

    rounded_card(c, MARGIN, y + 105, left_w, 183, CARD, LINE, 11)
    draw_text(c, "Figma 변경을 검토 화면에 표시하는 조건", MARGIN + 17, y + 124, 11.5, "Korean", INK)
    checks = [
        "컬렉션과 모드가 존재하고 추적 대상 변수가 별칭을 사용해야 합니다.",
        "변경 전후 별칭이 생성된 DTCG 핵심 경로에 모두 존재해야 합니다.",
        "중복 ID, 잘못된 토큰 이름, 변화 없는 별칭, 비어 있는 범위를 거부합니다.",
        "검증을 통과해도 사람 검토가 필요하며 Figma에 쓰기 작업을 수행하지 않습니다.",
    ]
    by = y + 156
    for item in checks:
        by = draw_bullet(c, item, MARGIN + 17, by, left_w - 34, 9.4, TEXT, PURPLE, 14.2) + 4

    rounded_card(c, MARGIN, y + 301, left_w, 131, INK, INK, 11)
    draw_text(c, "테스트 픽스처의 실제 변경 3건", MARGIN + 17, y + 320, 10, "Korean", HexColor("#D8D9DD"))
    items = [
        ("color.action.primary", "Coral 500 -> Coral 700"),
        ("color.focus.ring", "Coral 300 -> Blue 500"),
        ("color.text.accent", "Coral 500 -> Coral 700"),
    ]
    iy = y + 348
    for name, change in items:
        draw_text(c, name, MARGIN + 17, iy, 8.8, "LatinBold", white)
        draw_text(c, change, MARGIN + 266, iy, 8.5, "Latin", HexColor("#BFC3CB"))
        iy += 24

    draw_image_fit(
        c,
        token_crop,
        592,
        y + 18,
        214,
        300,
        True,
        white,
        "Studio에서 세 가지 시맨틱 토큰 별칭 변경을 비교하는 화면",
    )
    draw_text(c, "Studio 토큰 검토 화면", 592, y + 327, 8.3, "Korean", SUBTLE)
    rounded_card(c, 592, y + 350, 214, 82, PURPLE_SOFT, PURPLE_SOFT, 10)
    draw_text(c, "인증과 테스트 경계", 606, y + 366, 9, "Korean", PURPLE)
    draw_wrapped(
        c,
        "PAT와 OAuth 헤더를 분리하고 CI에서는 비식별 픽스처만 사용합니다.",
        606,
        y + 389,
        186,
        8.3,
        12.7,
        "Korean",
        TEXT,
    )


def page_api(c: canvas.Canvas, api_crop: Path) -> None:
    page_shell(c, 6, "공용 API와 도입 현황")
    y = page_title(
        c,
        "05 / DX AND API",
        "여러 사람이 쓰는 코드는 API, 문서, 하위 호환성을 함께 관리",
        "레지스트리와 소스 인터페이스가 다르면 생성 문서와 호환성 검사가 실패하도록 구성했습니다.",
    )
    left_w = 491
    metric_gap = 12
    metric_w = (left_w - metric_gap * 2) / 3
    metric_card(c, MARGIN, y + 18, metric_w, "6", "배포 가능한 React 컴포넌트", CORAL)
    metric_card(c, MARGIN + metric_w + metric_gap, y + 18, metric_w, "38", "자동 추출한 공개 prop", BLUE)
    metric_card(
        c,
        MARGIN + (metric_w + metric_gap) * 2,
        y + 18,
        metric_w,
        "7",
        "자동 생성 API 문서",
        PURPLE,
    )

    rounded_card(c, MARGIN, y + 104, 491, 172, CARD, LINE, 11)
    draw_text(c, "하위 호환성이 깨지는 변경을 차단", MARGIN + 17, y + 123, 11.5, "Korean", INK)
    contracts = [
        "컴포넌트와 prop 제거, 타입과 기본값 변경",
        "선택적 prop의 필수 전환, ref와 DOM 속성 계약 변경",
        "토큰 산출물 제거와 공개 상호작용 의미 변경",
    ]
    by = y + 157
    for item in contracts:
        by = draw_bullet(c, item, MARGIN + 17, by, 457, 9.4, TEXT, CORAL, 14) + 7
    pill(c, "선택적 API 추가는 허용하고 SemVer 근거를 남김", MARGIN + 17, y + 237, BLUE_SOFT, BLUE, "Korean", 8.3)

    rounded_card(c, MARGIN, y + 290, 491, 142, INK, INK, 11)
    draw_text(c, "공용 컴포넌트 도입 현황", MARGIN + 17, y + 308, 10.5, "Korean", white)
    draw_text(c, "3", MARGIN + 18, y + 342, 22, "LatinBold", HexColor("#F39A93"))
    draw_text(c, "소비 앱", MARGIN + 50, y + 350, 8.7, "Korean", HexColor("#C5C8CE"))
    draw_text(c, "13 / 13", MARGIN + 148, y + 342, 22, "LatinBold", HexColor("#8EB6FF"))
    draw_text(c, "선언 대상 실제 사용", MARGIN + 245, y + 350, 8.7, "Korean", HexColor("#C5C8CE"))
    draw_text(c, "0", MARGIN + 18, y + 384, 22, "LatinBold", HexColor("#8FE2A6"))
    draw_text(c, "지원 중단 예정 API 사용", MARGIN + 50, y + 392, 8.7, "Korean", HexColor("#C5C8CE"))
    draw_text(c, "AST가 실제 import와 JSX 사용만 집계", MARGIN + 245, y + 392, 8.4, "Korean", HexColor("#C5C8CE"))

    draw_image_fit(
        c,
        api_crop,
        553,
        y + 18,
        253,
        414,
        True,
        white,
        "TreatmentCard의 공개 prop 타입과 필수 여부를 보여 주는 API 문서",
    )


def page_ai(c: canvas.Canvas) -> None:
    page_shell(c, 7, "AI 제안 워크플로")
    y = page_title(
        c,
        "06 / AI GOVERNANCE",
        "AI에는 구현 권한 대신 제한된 제안 권한만 부여",
        "AI 결과를 신뢰의 근거로 삼지 않고, 현재 저장소 계약에 대해 다시 계산할 수 있는 입력으로 다룹니다.",
    )
    steps = [
        ("요청 고정", "허용된 요청 디렉터리와 현재 매니페스트를 입력"),
        ("구조화 출력", "도구 사용을 끄고 JSON Schema 제안만 반환"),
        ("결정론적 검증", "API, SemVer, 테스트, 문서, 위험을 별도 검사"),
        ("사람 승인 기록", "현재 해시를 다시 확인하고 별도 기록 생성"),
        ("일반 구현", "브랜치 검토와 전체 pnpm verify를 다시 수행"),
    ]
    sx = MARGIN
    step_gap = 11
    card_w = (CONTENT_W - step_gap * 4) / 5
    for index, (title, detail) in enumerate(steps):
        draw_step(c, index + 1, title, detail, sx, y + 22, card_w, PURPLE if index < 2 else CORAL if index < 4 else GREEN)
        if index < len(steps) - 1:
            c.setStrokeColor(HexColor("#C4C8D0"))
            c.line(sx + card_w + 3, top_y(y + 68), sx + card_w + 11, top_y(y + 68))
        sx += card_w + step_gap

    left_w = 474
    rounded_card(c, MARGIN, y + 133, left_w, 276, CARD, LINE, 11)
    draw_text(c, "검증 실패 시 중단하는 경계", MARGIN + 17, y + 152, 11.5, "Korean", INK)
    boundaries = [
        "필수 prop 추가, prop 제거, 타입 변경의 SemVer 오분류",
        "단위 또는 접근성 테스트, 문서, 위험과 완화책 누락",
        "요청, 프롬프트, 매니페스트 해시 변조",
        "허용 디렉터리 이탈과 기존 보고서 덮어쓰기",
        "제공자 응답 제한 시간 또는 출력 상한 초과",
        "검증 전후 소스 리비전 변경",
    ]
    by = y + 185
    for item in boundaries:
        by = draw_bullet(c, item, MARGIN + 17, by, left_w - 34, 9.2, TEXT, CORAL, 13.8) + 5
    draw_text(c, "승인 시 다시 결합하는 값", MARGIN + 17, y + 343, 8.7, "Korean", SUBTLE)
    hash_labels = ["request hash", "prompt hash", "manifest hash", "proposal digest"]
    hx = MARGIN + 17
    for label in hash_labels:
        pill(c, label, hx, y + 368, BLUE_SOFT, BLUE, "Latin", 7.5)
        hx += 103

    right_x = 526
    rounded_card(c, right_x, y + 133, 280, 132, INK, INK, 11)
    draw_text(c, "검증 결과", right_x + 17, y + 152, 9.2, "Korean", HexColor("#C5C8CE"))
    draw_text(c, "6", right_x + 17, y + 182, 24, "LatinBold", HexColor("#F39A93"))
    draw_text(c, "제안 검사", right_x + 48, y + 191, 8.6, "Korean", white)
    draw_text(c, "7", right_x + 126, y + 182, 24, "LatinBold", HexColor("#8EB6FF"))
    draw_text(c, "실패 우선 경계", right_x + 157, y + 191, 8.6, "Korean", white)
    draw_text(c, "0", right_x + 17, y + 224, 24, "LatinBold", HexColor("#8FE2A6"))
    draw_text(c, "검증 단계의 소스 변경", right_x + 48, y + 233, 8.6, "Korean", white)
    rounded_card(c, right_x, y + 279, 280, 130, PURPLE_SOFT, PURPLE_SOFT, 11)
    draw_text(c, "자동 승인하지 않는 결정", right_x + 17, y + 298, 10.5, "Korean", PURPLE)
    draw_wrapped(
        c,
        "공개 API 변경, 시맨틱 토큰 의미 변경, 접근성 기준 완화, 지원 중단 유예 종료, 패키지 배포와 소비 앱 병합",
        right_x + 17,
        y + 328,
        246,
        9.2,
        14.5,
        "Korean",
        TEXT,
    )


def page_quality(c: canvas.Canvas) -> None:
    page_shell(c, 8, "품질과 검증 근거")
    y = page_title(
        c,
        "07 / QUALITY",
        "성공 문구가 아니라 소스 리비전과 해시가 결합된 근거를 표시",
        "자동 검증 결과가 현재 소스와 일치할 때만 릴리스 리허설을 실행할 수 있습니다.",
    )
    metrics = [
        ("6", "패키지 검증 스위트"),
        ("8", "브라우저 시나리오"),
        ("11 x 2", "macOS / Linux 시각 기준"),
        ("11", "실제 브라우저 axe 검사"),
        ("0", "알려진 프로덕션 취약점"),
    ]
    mx = MARGIN
    metric_gap = 12
    metric_w = (CONTENT_W - metric_gap * 4) / 5
    for index, (value, label) in enumerate(metrics):
        metric_card(c, mx, y + 18, metric_w, value, label, [CORAL, BLUE, PURPLE, GREEN, INK][index])
        mx += metric_w + metric_gap

    rounded_card(c, MARGIN, y + 106, 486, 172, CARD, LINE, 11)
    draw_text(c, "테스트 커버리지", MARGIN + 17, y + 125, 11, "Korean", INK)
    coverages = [
        ("Studio", 96.43, CORAL),
        ("React package", 98.59, BLUE),
        ("Figma bridge", 97.64, PURPLE),
        ("Token / consumer apps", 100.0, GREEN),
    ]
    cy = y + 154
    for label, value, color in coverages:
        draw_text(c, label, MARGIN + 17, cy, 8.5, "Latin", TEXT)
        draw_text(c, f"{value:.2f}%", MARGIN + 404, cy, 8.3, "LatinBold", color)
        c.setFillColor(HexColor("#E8EAF0"))
        c.roundRect(MARGIN + 124, top_y(cy + 9), 270, 7, 3.5, fill=1, stroke=0)
        c.setFillColor(color)
        c.roundRect(MARGIN + 124, top_y(cy + 9), 270 * value / 100, 7, 3.5, fill=1, stroke=0)
        cy += 30

    rounded_card(c, MARGIN, y + 291, 486, 141, CARD, LINE, 11)
    draw_text(c, "성능 예산", MARGIN + 17, y + 310, 11, "Korean", INK)
    draw_progress_compact(c, MARGIN + 17, y + 337, 452, "JavaScript gzip", 92689, 190000, "B", CORAL)
    draw_progress_compact(c, MARGIN + 17, y + 359, 452, "CSS gzip", 10403, 35000, "B", BLUE)
    draw_progress_compact(c, MARGIN + 17, y + 381, 452, "Font", 48256, 120000, "B", GREEN)
    draw_progress_compact(c, MARGIN + 17, y + 403, 452, "가장 큰 반응형 이미지", 33812, 60000, "B", PURPLE)

    right_x = 543
    rounded_card(c, right_x, y + 106, 263, 326, CARD, LINE, 11)
    draw_text(c, "검증 결과가 현재 소스인지 확인", right_x + 17, y + 125, 11, "Korean", INK)
    draw_wrapped(
        c,
        "화면에 표시된 성공 여부만 믿지 않고 네 식별자를 순서대로 대조합니다.",
        right_x + 17,
        y + 151,
        229,
        8.6,
        13.2,
        "Korean",
        MUTED,
    )
    evidence_steps = [
        ("1", "Source revision", "검증을 시작한 저장소 상태"),
        ("2", "Run ID", "같은 실행에서 나온 결과 묶음"),
        ("3", "Artifact digest", "변경되지 않은 산출물 해시"),
        ("4", "Rehearsal gate", "일치할 때만 로컬 리허설 허용"),
    ]
    for index, (num, label, detail) in enumerate(evidence_steps):
        top = y + 194 + index * 51
        step_fill = BLUE_SOFT if index < 3 else GREEN_SOFT
        rounded_card(c, right_x + 17, top, 229, 39, step_fill, step_fill, 8)
        c.setFillColor(BLUE if index < 3 else GREEN)
        c.circle(right_x + 33, top_y(top + 19.5), 9, fill=1, stroke=0)
        set_font(c, "LatinBold", 7.5, white)
        c.drawCentredString(right_x + 33, top_y(top + 22), num)
        draw_text(c, label, right_x + 50, top + 7, 8.2, "LatinBold", INK)
        draw_text(c, detail, right_x + 50, top + 22, 7.6, "Korean", MUTED)


def page_accessibility(c: canvas.Canvas) -> None:
    page_shell(c, 9, "접근성과 반응형")
    y = page_title(
        c,
        "08 / ACCESSIBILITY",
        "키보드와 모바일 흐름을 부가 기능이 아닌 제품 계약으로 다룸",
        "JSDOM axe와 실제 Chrome 검증을 분리하고, 화면 크기와 입력 방식이 달라도 같은 검토 흐름을 완료할 수 있게 했습니다.",
    )
    tablet = ROOT / "design" / "implementation-tablet-820x1024.png"
    mobile = ROOT / "design" / "implementation-mobile-390x844.png"
    media_height = 356
    tablet_width = 285
    mobile_x = MARGIN + 296
    mobile_width = 164
    pill(c, "820 px tablet", MARGIN, y + 18, BLUE_SOFT, BLUE, "Latin", 7.8)
    pill(c, "390 px mobile", mobile_x, y + 18, PURPLE_SOFT, PURPLE, "Latin", 7.8)
    draw_image_fit(
        c,
        tablet,
        MARGIN,
        y + 42,
        tablet_width,
        media_height,
        True,
        white,
        "820 CSS px 태블릿에서 표시한 Aster UI Studio 검토 화면",
    )
    draw_image_fit(
        c,
        mobile,
        mobile_x,
        y + 42,
        mobile_width,
        media_height,
        True,
        white,
        "390 CSS px 모바일에서 표시한 Aster UI Studio 검토 화면",
    )

    right_x = 507
    rounded_card(c, right_x, y + 18, 299, 245, CARD, LINE, 11)
    draw_text(c, "접근성 계약", right_x + 17, y + 37, 11.5, "Korean", INK)
    items = [
        "모든 핵심 조작을 키보드로 완료",
        "모달과 서랍의 초점 고정, Escape 닫기, 이전 초점 복귀",
        "선택 상태를 ARIA 속성과 시각 표현으로 함께 전달",
        "중복 상태 샘플을 inert와 aria-hidden으로 제외",
        "reduced motion과 forced-colors 대응",
    ]
    by = y + 70
    for item in items:
        by = draw_bullet(c, item, right_x + 17, by, 265, 9.2, TEXT, BLUE, 13.8) + 6

    rounded_card(c, right_x, y + 277, 299, 134, INK, INK, 11)
    draw_text(c, "자동화가 대신하지 않는 검증", right_x + 17, y + 296, 10.5, "Korean", HexColor("#F39A93"))
    draw_wrapped(
        c,
        "VoiceOver와 NVDA의 실제 발화, 보조 기술의 읽기 순서와 안내 문구는 배포 전 수동 확인이 필요합니다. 이 저장소는 해당 수동 인증을 완료했다고 주장하지 않습니다.",
        right_x + 17,
        y + 328,
        265,
        9.1,
        14.5,
        "Korean",
        white,
    )


def page_summary(c: canvas.Canvas) -> None:
    page_shell(c, 10, "지원 포트폴리오 요약")
    y = page_title(
        c,
        "09 / SUMMARY",
        "디자인 시스템을 제품으로 운영하는 프론트엔드 역량",
        "구현 수보다 변경 규칙, 개발자 경험, 검증 가능성, 사람과 AI의 책임 경계를 함께 설계한 프로젝트입니다.",
    )
    cards = [
        ("React / TypeScript", "공용 API, ref와 DOM 계약, 하위 호환성, 생성 문서", CORAL),
        ("Tokens / Figma", "DTCG 토큰, 다중 플랫폼 산출물, Variables REST 변경 검토", PURPLE),
        ("Monorepo / Release", "Turborepo, release-please, 성능과 공급망 검증", BLUE),
        ("Accessibility", "키보드, ARIA, axe, 확대, 모바일, forced-colors", GREEN),
        ("AI Workflow", "구조화 제안, 결정론적 검증, 사람 승인, 소스 무변경", INK),
        ("Developer Experience", "API 문서, 도입 현황, AST 마이그레이션, 재현 가능한 명령", CORAL),
    ]
    card_w, card_h = 242, 105
    for index, (title, detail, accent) in enumerate(cards):
        row, col = divmod(index, 3)
        x = MARGIN + col * (card_w + 20)
        top = y + 19 + row * (card_h + 17)
        rounded_card(c, x, top, card_w, card_h, CARD, LINE, 11)
        c.setFillColor(accent)
        c.rect(x, top_y(top + card_h), 5, card_h, fill=1, stroke=0)
        draw_text(c, title, x + 18, top + 17, 10.5, "LatinBold", INK)
        draw_wrapped(c, detail, x + 18, top + 46, card_w - 36, 9.1, 14.2, "Korean", MUTED)

    rounded_card(c, MARGIN, y + 258, 477, 124, INK, INK, 12)
    draw_text(c, "5분 검토 순서", MARGIN + 18, y + 277, 11, "Korean", white)
    review = [
        "Studio에서 컴포넌트와 API가 함께 바뀌는지 확인",
        "Figma 별칭 변경과 Web, iOS, Android 영향을 검토",
        "Quality 패널에서 소스 리비전과 근거 해시 확인",
        "외부 배포 없는 릴리스 리허설 실행",
    ]
    ry = y + 309
    for item in review:
        ry = draw_bullet(c, item, MARGIN + 18, ry, 441, 8.8, white, HexColor("#F39A93"), 13.2) + 3

    right_x = 533
    rounded_card(c, right_x, y + 258, 273, 124, CORAL_SOFT, CORAL_SOFT, 12)
    draw_text(c, "현재 범위와 한계", right_x + 17, y + 277, 11, "Korean", CORAL)
    limits = [
        "Figma에 쓰기 작업과 npm 배포는 범위 밖",
        "네이티브 산출물은 토큰이며 UI 컴포넌트가 아님",
        "도입 현황은 저장소 내부 근거이며 조직 성과 지표가 아님",
        "커밋 검증 근거와 공개 CI 결과를 구분",
    ]
    ly = y + 309
    for item in limits:
        ly = draw_bullet(c, item, right_x + 17, ly, 239, 8.1, TEXT, CORAL, 11.8) + 2

    bar_top = 526
    c.setFillColor(CORAL)
    c.roundRect(MARGIN, top_y(bar_top + 34), PAGE_W - MARGIN * 2, 34, 9, fill=1, stroke=0)
    draw_text(c, "재현 명령", MARGIN + 14, bar_top + 8, 8.7, "Korean", white)
    draw_text(c, "pnpm install --frozen-lockfile   &&   pnpm verify", MARGIN + 91, bar_top + 8, 9, "Mono", white)


def build() -> None:
    register_fonts()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    TMP.mkdir(parents=True, exist_ok=True)

    desktop = ROOT / "design" / "implementation-desktop-final.png"
    inspector = ROOT / "design" / "qa-focus-inspector-final.png"
    token_crop = crop_image(desktop, (1064, 62, 1440, 590), "token-inspector.png")
    api_crop = crop_image(inspector, (1064, 62, 1440, 670), "api-inspector.png")

    raw_output = TMP / "aster-ui-platform-portfolio.raw.pdf"
    c = canvas.Canvas(str(raw_output), pagesize=(PAGE_W, PAGE_H), pageCompression=1)
    c.setTitle("Aster UI Platform - Frontend Design System Portfolio")
    c.setSubject("Design system operations PoC portfolio")
    c.setKeywords("React, TypeScript, Design System, Turborepo, Figma, Accessibility, AI Workflow")
    c.setAuthor("곽현")
    c.setCreator("ReportLab")

    pages = [
        ("Cover", page_cover, ()),
        ("Problem", page_problem, ()),
        ("Product", page_product, ()),
        ("System", page_architecture, ()),
        ("Design to Code", page_figma_tokens, (token_crop,)),
        ("Developer Experience", page_api, (api_crop,)),
        ("AI Governance", page_ai, ()),
        ("Quality", page_quality, ()),
        ("Accessibility", page_accessibility, ()),
        ("Summary", page_summary, ()),
    ]

    page_tags: list[list[dict[str, object]]] = []
    for index, (bookmark, painter, args) in enumerate(pages, start=1):
        start_page_tags(c)
        key = f"page-{index}"
        c.bookmarkPage(key)
        c.addOutlineEntry(bookmark, key, level=0, closed=False)
        painter(c, *args)
        page_tags.append(list(c._tag_records))
        c.showPage()

    c.save()
    add_accessibility_structure(raw_output, OUTPUT, page_tags)
    raw_output.unlink(missing_ok=True)
    token_crop.unlink(missing_ok=True)
    api_crop.unlink(missing_ok=True)
    try:
        TMP.rmdir()
    except OSError:
        pass
    print(OUTPUT)


if __name__ == "__main__":
    build()
