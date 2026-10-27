---
name: xlsx-architect
description: Use this skill when creating, styling, or exporting Excel (.xlsx) spreadsheets, financial reports, billing registries, or operational tables using openpyxl or pandas.
---

# Excel Workbook (.xlsx) Architect Skill

This skill enforces financial-grade presentation, structural clarity, and robust formatting for Excel (`.xlsx`) files generated with Python (`openpyxl`).

---

## 1. Professional Visual Standards

Spreadsheets must look like engineered financial artifacts, not raw data dumps.

1. **Header Hierarchy**:
   - Title Row: 14pt bold, dark fill with white text, or clean top banner.
   - Column Headers: 10-11pt bold, muted background fill (`PatternFill(start_color="1F2937", end_color="1F2937", fill_type="solid")` with white text, or light gray `#E5E7EB` with dark text).
   - Centered vertically and horizontally.
2. **Freeze Panes**:
   - Always freeze the header row so column names remain visible during vertical scrolling:
     ```python
     ws.freeze_panes = "A2"  # Freezes row 1
     ```
3. **Show Gridlines**:
   - Explicitly ensure gridlines are visible across Excel viewers:
     ```python
     ws.views.sheetView[0].showGridLines = True
     ```

---

## 2. Number & Date Formatting (Never Raw Strings)

Never write pre-formatted strings (like `"$1,200.50"` or `"S/ 350.00"`) into cells! Always write numeric `float` or `int` values and apply explicit `number_format`:

- **Currency (Peruvian Soles)**:
  ```python
  cell.value = 1250.50
  cell.number_format = '"S/" #,##0.00'
  ```
- **Currency (US Dollars)**:
  ```python
  cell.number_format = '"$" #,##0.00'
  ```
- **Quantities / Integers**:
  ```python
  cell.number_format = '#,##0'
  ```
- **Dates**:
  ```python
  cell.number_format = 'YYYY-MM-DD'
  ```

---

## 3. Dynamic Column Auto-Fitting

Always calculate and set appropriate column widths based on content length + padding to avoid clipped text or `###` display errors:

```python
from openpyxl.utils import get_column_letter

def autofit_columns(ws, min_width=12, padding=3):
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            if cell.value:
                val_str = str(cell.value)
                max_len = max(max_len, len(val_str))
        ws.column_dimensions[col_letter].width = max(max_len + padding, min_width)
```

---

## 4. Totals & Summaries
- **Use Excel Formulas, Not Pre-Calculated Hardcodes**:
  - Example: `cell.value = f"=SUM(F2:F{last_row})"`
  - This preserves dynamic auditing when users modify numbers in Excel.
- **Double Bottom Border**:
  - Apply accounting-style bottom double border on total summary rows:
    ```python
    from openpyxl.styles import Border, Side
    double_bottom = Border(bottom=Side(style='double', color='000000'),
                           top=Side(style='thin', color='CCCCCC'))
    ```
