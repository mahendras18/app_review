import io
import re
from typing import Any, Dict, List, Optional
import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from backend.schemas.responses import ReviewItem

EXCEL_COLUMNS = [
    "Platform",
    "App Name",
    "Review ID",
    "Reviewer Name",
    "Rating",
    "Review Title",
    "Review Text",
    "Review Date",
    "App Version"
]

def format_platform_name(platform: Optional[str]) -> str:
    if not platform:
        return "Unknown"
    p = platform.lower().strip()
    if p in ("apple", "ios", "appstore", "apple app store"):
        return "Apple App Store"
    elif p in ("google", "android", "playstore", "play", "google play"):
        return "Google Play"
    return platform

def populate_review_worksheet(
    ws,
    reviews: List[ReviewItem],
    app_name: str = "App"
) -> None:
    """
    Populates an openpyxl worksheet with formatted customer reviews.
    Applies bold header formatting, column widths, auto-filters, and frozen panes.
    """
    # Add header row
    ws.append(EXCEL_COLUMNS)

    # Styles
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")  # Slate-800
    header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)

    regular_font = Font(name="Calibri", size=10)
    center_align = Alignment(horizontal="center", vertical="top")
    left_align = Alignment(horizontal="left", vertical="top")
    text_align = Alignment(horizontal="left", vertical="top", wrap_text=True)

    thin_border = Border(
        left=Side(style="thin", color="E2E8F0"),
        right=Side(style="thin", color="E2E8F0"),
        top=Side(style="thin", color="E2E8F0"),
        bottom=Side(style="thin", color="E2E8F0")
    )

    # Apply header styling
    ws.row_dimensions[1].height = 28
    for col_idx in range(1, len(EXCEL_COLUMNS) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_align
        cell.border = thin_border

    # Add data rows
    for row_idx, r in enumerate(reviews, start=2):
        platform_label = format_platform_name(r.platform)
        row_values = [
            platform_label,
            app_name,
            r.id or "",
            r.reviewer_name or "",
            r.rating,
            r.title or "",
            r.text or "",
            r.date or "",
            r.version or ""
        ]
        ws.append(row_values)

        for col_idx in range(1, len(EXCEL_COLUMNS) + 1):
            cell = ws.cell(row=row_idx, column=col_idx)
            cell.font = regular_font
            cell.border = thin_border
            if col_idx in (1, 5, 8, 9):  # Platform, Rating, Review Date, App Version
                cell.alignment = center_align
            elif col_idx == 7:  # Review Text
                cell.alignment = text_align
            else:
                cell.alignment = left_align

    # Enable filters on the header row
    total_rows = max(len(reviews) + 1, 1)
    last_col_letter = get_column_letter(len(EXCEL_COLUMNS))
    ws.auto_filter.ref = f"A1:{last_col_letter}{total_rows}"

    # Freeze header row
    ws.freeze_panes = "A2"

    # Auto-adjust column widths with appropriate margins
    for col in ws.columns:
        col_letter = get_column_letter(col[0].column)
        max_len = 0
        for cell in col:
            val = str(cell.value or "")
            if len(val) > max_len:
                max_len = len(val)

        if col_letter == "G":  # Review Text (allow wide wrapping)
            ws.column_dimensions[col_letter].width = 60
        elif col_letter in ("A", "B", "C", "D", "F", "H"):
            ws.column_dimensions[col_letter].width = min(max(max_len + 4, 15), 35)
        elif col_letter in ("E", "I"):  # Rating, Version
            ws.column_dimensions[col_letter].width = max(max_len + 4, 12)
        else:
            ws.column_dimensions[col_letter].width = max(max_len + 4, 14)

def generate_platform_reviews_excel(
    ios_reviews: Optional[List[ReviewItem]] = None,
    android_reviews: Optional[List[ReviewItem]] = None,
    app_name: str = "App",
    platform: str = "both"
) -> io.BytesIO:
    """
    Generates a properly formatted Microsoft Excel (.xlsx) file with platform worksheets.

    Requirements:
    - When Both platforms are selected:
      Generate ONE Excel workbook containing two separate worksheets:
      Sheet 1: iOS Reviews
      Sheet 2: Android Reviews
    - When only iOS is selected:
      Generate one Excel workbook containing only the iOS Reviews sheet.
    - When only Android is selected:
      Generate one Excel workbook containing only the Android Reviews sheet.
    - Both sheets retain standard formatting, freeze panes, filters, and full text.
    """
    wb = openpyxl.Workbook()
    clean_platform = (platform or "both").lower().strip()

    if clean_platform in ("ios", "apple"):
        ws = wb.active
        ws.title = "iOS Reviews"
        populate_review_worksheet(ws, ios_reviews or [], app_name=app_name)
    elif clean_platform in ("android", "google"):
        ws = wb.active
        ws.title = "Android Reviews"
        populate_review_worksheet(ws, android_reviews or [], app_name=app_name)
    else:
        # Both platforms selected
        # Sheet 1: iOS Reviews
        # Sheet 2: Android Reviews
        ws_ios = wb.active
        ws_ios.title = "iOS Reviews"
        populate_review_worksheet(ws_ios, ios_reviews or [], app_name=app_name)

        ws_android = wb.create_sheet(title="Android Reviews")
        populate_review_worksheet(ws_android, android_reviews or [], app_name=app_name)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output

def generate_reviews_excel(
    reviews: List[ReviewItem],
    app_name: str = "App",
    platform: str = "both"
) -> io.BytesIO:
    """
    Wrapper around generate_platform_reviews_excel that partitions reviews by platform.
    """
    ios_reviews = [r for r in reviews if r.platform.lower() in ("apple", "ios")]
    android_reviews = [r for r in reviews if r.platform.lower() in ("google", "android")]
    return generate_platform_reviews_excel(
        ios_reviews=ios_reviews,
        android_reviews=android_reviews,
        app_name=app_name,
        platform=platform
    )

def build_excel_filename(
    date_range: Optional[str],
    app_name: Optional[str] = None,
    current_date_str: Optional[str] = None,
    platform: Optional[str] = None,
    unique_suffix: Optional[str] = None
) -> str:
    """
    Constructs standard filenames:
    - With platform specified (Standard Excel report format):
      boAt_Hearables_Both_7_Days_2026-11-17.xlsx
      boAt_Hearables_Android_30_Days_2026-11-17.xlsx
      boAt_Hearables_iOS_All_Reviews_2026-11-17.xlsx
    - Without platform (backward-compatible legacy format):
      App_Reviews_Last_7_Days_2026-11-17.xlsx
      boAt_Hearables_Reviews_Last_7_Days_2026-11-17.xlsx
    """
    from datetime import datetime
    today = current_date_str or datetime.now().strftime("%Y-%m-%d")

    range_clean = (date_range or "7").lower().strip()

    if platform is not None:
        if range_clean in ("7", "7d", "last_7_days"):
            range_label = "7_Days"
        elif range_clean in ("15", "15d", "last_15_days"):
            range_label = "15_Days"
        elif range_clean in ("30", "30d", "last_30_days"):
            range_label = "30_Days"
        elif range_clean in ("all", "all_available"):
            range_label = "All_Reviews"
        else:
            range_label = f"{range_clean}_Days"

        plat_clean = platform.lower().strip()
        if plat_clean in ("ios", "apple"):
            plat_label = "iOS"
        elif plat_clean in ("android", "google"):
            plat_label = "Android"
        else:
            plat_label = "Both"

        name_label = "boAt_Hearables"
        if app_name and app_name.strip() and app_name.strip().lower() != "app":
            name_label = re.sub(r"[^a-zA-Z0-9_\-]", "_", app_name.strip())
            name_label = re.sub(r"_+", "_", name_label).strip("_")

        suffix = f"_{unique_suffix}" if unique_suffix else ""
        return f"{name_label}_{plat_label}_{range_label}_{today}{suffix}.xlsx"

    # Backward-compatible format
    if range_clean in ("7", "7d", "last_7_days"):
        range_label = "Last_7_Days"
    elif range_clean in ("15", "15d", "last_15_days"):
        range_label = "Last_15_Days"
    elif range_clean in ("30", "30d", "last_30_days"):
        range_label = "Last_30_Days"
    elif range_clean in ("all", "all_available"):
        range_label = "All_Available"
    else:
        range_label = f"Last_{range_clean}_Days"

    if app_name and app_name.strip() and app_name.strip().lower() != "app":
        sanitized_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", app_name.strip())
        sanitized_name = re.sub(r"_+", "_", sanitized_name).strip("_")
        return f"{sanitized_name}_Reviews_{range_label}_{today}.xlsx"

    return f"App_Reviews_{range_label}_{today}.xlsx"
