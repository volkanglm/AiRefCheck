"""Bibliography section detection in academic documents."""

import re


def detect_bibliography(text: str) -> tuple[int, int]:
    """Detect bibliography section in academic text.

    Looks for common section headers like "References", "Bibliography",
    "Kaynakça", "Literature Cited", "Works Cited", etc.

    Args:
        text: Full document text

    Returns:
        Tuple of (start_index, end_index). Returns (-1, -1) if not found.
    """
    if not text:
        return -1, -1

    # Common bibliography headers in multiple languages
    header_patterns = [
        # English
        r"\bReferences\b",
        r"\bBibliography\b",
        r"\bLiterature\s+Cited\b",
        r"\bWorks\s+Cited\b",
        r"\bReferences\s+Cited\b",
        # Turkish
        r"\bKaynakça\b",
        r"\bKAYNAKÇA\b",
        r"\bKaynaklar\b",
        r"\bKAYNAKLAR\b",
        r"\bBibliyografya\b",
        # Other common variants
        r"\bREFERENCES\b",
        r"\bBIBLIOGRAPHY\b",
        r"\bKaynakça\s+ve\s+Ek\s+Kaynaklar\b",
    ]

    # Find the first matching header
    best_match: tuple[int, str] | None = None

    for pattern in header_patterns:
        for match in re.finditer(pattern, text):
            pos = match.start()
            # Validate it's likely a section header (near start of line or after newline)
            line_start = text.rfind("\n", 0, pos)
            line_text = text[line_start + 1 : pos + 20]

            # Check if it looks like a header (not inline text)
            if _is_likely_header(line_text, match.group()):
                if best_match is None or pos < best_match[0]:
                    best_match = (pos, match.group())

    if best_match is None:
        return -1, -1

    start_idx = best_match[0]

    # Find the end of the bibliography section
    end_idx = _find_bibliography_end(text, start_idx)

    return start_idx, end_idx


def _is_likely_header(line_text: str, header: str) -> bool:
    """Check if matched text is likely a section header.

    Headers are typically:
    - At the start of a line (possibly with whitespace)
    - In bold or uppercase (we approximate with position)
    - Followed by newline or minimal text
    """
    line_text = line_text.strip()

    # Should be near the start of the line
    header_pos = line_text.find(header)
    if header_pos > 20:
        return False

    # Check if followed by reasonable content or newline
    after_header = line_text[header_pos + len(header) :].strip()

    # Header should be followed by newline, colon, or minimal text
    if not after_header or after_header.startswith("\n"):
        return True

    if len(after_header) < 5:
        return True

    # If it's all caps and short, likely a header
    if header.isupper() and len(header) < 30:
        return True

    return False


def _find_bibliography_end(text: str, start_idx: int) -> int:
    """Find the end of bibliography section.

    Bibliography typically ends when:
    - Another major section starts
    - Document ends
    - Significant whitespace gap
    """
    # Look for common section headers that would end bibliography
    end_patterns = [
        r"\n\s*\n\s*[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ\s]{2,50}\s*\n",  # ALL CAPS section
        r"\n\s*(?:Appendix|Ek|Appendices)\s*[A-Z0-9]?\s*\n",
        r"\n\s*(?:Index|Dizin)\s*\n",
        r"\n\s*(?:Abstract|Özet)\s*\n",
        r"\n\s*(?:ÖZET|ABSTRACT)\s*\n",
    ]

    search_start = start_idx + 100  # Skip past the header itself

    for pattern in end_patterns:
        match = re.search(pattern, text[search_start:])
        if match:
            return search_start + match.start()

    # If no end marker found, return end of text
    return len(text)
