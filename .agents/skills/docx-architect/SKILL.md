---
name: docx-architect
description: Use this skill when creating, modifying, or debugging Word (.docx) documents, invoice or quote templates, or document generators using python-docx or direct XML manipulation.
---

# Word Document (.docx) Architect Skill

This skill provides specialized procedures and design patterns for generating, editing, and formatting Microsoft Word (`.docx`) documents using Python's `python-docx` library and OpenXML manipulations.

---

## 1. Core Architecture of .docx Files
A `.docx` file is a zipped archive of XML files complying with ECMA-376 (Office Open XML):
- `word/document.xml`: Primary content body.
- `word/styles.xml`: Style definitions (fonts, sizes, colors, headings).
- `word/header1.xml` / `word/footer1.xml`: Running headers and footers.
- `word/_rels/`: Relationship mappings (images, hyperlinks).

---

## 2. Template-Based Generation in Nicole
Nicole generates client quotes and service records from `templates/cotizacion_base.docx`.

### A. Preserving Placeholders & Run Integrity
When replacing placeholder tags (e.g. `{{CLIENTE}}`, `{{RUC}}`, `{{TOTAL}}`):
- Word often splits text across multiple `<w:r>` (runs) if edited or spellchecked.
- To replace placeholders without breaking formatting:
  ```python
  def replace_placeholder_in_paragraphs(paragraphs, placeholder, replacement):
      for p in paragraphs:
          if placeholder in p.text:
              # Simple replace if entire placeholder is in one run
              for run in p.runs:
                  if placeholder in run.text:
                      run.text = run.text.replace(placeholder, str(replacement))
                      break
              else:
                  # Placeholder spans multiple runs: combine text, preserve first run style
                  full_text = p.text.replace(placeholder, str(replacement))
                  if p.runs:
                      p.runs[0].text = full_text
                      for r in p.runs[1:]:
                          r.text = ""
                  else:
                      p.text = full_text
  ```

### B. High-Precision Table Formatting
- **Cell Padding / Margins**: Default cell padding is often too loose. Set XML margins:
  ```python
  from docx.oxml import parse_xml
  from docx.oxml.ns import nsdecls

  def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
      tcPr = cell._tc.get_or_add_tcPr()
      tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}>'
                        f'<w:top w:w="{top}" w:type="dxa"/>'
                        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
                        f'<w:left w:w="{left}" w:type="dxa"/>'
                        f'<w:right w:w="{right}" w:type="dxa"/>'
                        f'</w:tcMar>')
      tcPr.append(tcMar)
  ```
- **Custom Subtle Table Borders**: Avoid harsh black borders. Use light gray (`#D1D5DB` / `#E5E7EB`):
  ```python
  def set_cell_shading(cell, color_hex="F3F4F6"):
      shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
      cell._tc.get_or_add_tcPr().append(shading)
  ```

### C. Repeat Header Rows Across Pages
When tables break across page boundaries, ensure the header repeats on every page:
```python
trPr = row._tr.get_or_add_trPr()
trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))
```

---

## 3. Typography & Styling Checklist
1. **Fonts**: Standardize on clean typefaces (e.g., Calibri, Aptos, Arial).
2. **Alignment**:
   - Right-align numeric columns (Prices, Quantities, IGV, Totals).
   - Left-align descriptions and item codes.
   - Center status tags and item numbering (`#`).
3. **Verification**: Always open and verify the generated `.docx` without XML parsing errors before deploying.
