"""Reference splitting utilities for bibliography text."""

import re

from app.models.types import CitationStyle


def split_references(bibliography_text: str, style: CitationStyle) -> list[str]:
    """Split bibliography text into individual references.

    Uses style-specific strategies combined with general heuristics.

    Args:
        bibliography_text: Text from bibliography section
        style: Detected citation style

    Returns:
        List of individual reference strings
    """
    if not bibliography_text:
        return []

    # Clean up the text first
    text = _clean_bibliography_text(bibliography_text)

    # Try style-specific splitting first
    references = _split_by_style(text, style)

    if references:
        return _filter_and_clean(references)

    # Fallback to general heuristics
    references = _split_general(text)

    return _filter_and_clean(references)


def _clean_bibliography_text(text: str) -> str:
    """Clean bibliography text before splitting."""
    # Remove the header line if present
    header_patterns = [
        r"^\s*Kaynakça\s*\n",
        r"^\s*KAYNAKÇA\s*\n",
        r"^\s*References\s*\n",
        r"^\s*REFERENCES\s*\n",
        r"^\s*Bibliography\s*\n",
        r"^\s*Works\s+Cited\s*\n",
        r"^\s*Literature\s+Cited\s*\n",
    ]

    for pattern in header_patterns:
        text = re.sub(pattern, "", text, flags=re.IGNORECASE | re.MULTILINE)

    # Normalize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    return text.strip()


def _split_by_style(text: str, style: CitationStyle) -> list[str]:
    """Split references using style-specific patterns."""
    if style in (CitationStyle.IEEE, CitationStyle.VANCOUVER):
        return _split_numbered(text)
    elif style in (
        CitationStyle.APA7,
        CitationStyle.APA6,
        CitationStyle.MLA9,
        CitationStyle.MLA8,
        CitationStyle.HARVARD,
        CitationStyle.CHICAGO_AD,
        CitationStyle.CHICAGO_NB,
        CitationStyle.ASA7,
        CitationStyle.APSA7,
        CitationStyle.TURABIAN9,
    ):
        return _split_author_year(text)
    elif style in (CitationStyle.AMA11, CitationStyle.ACS3, CitationStyle.CSE):
        return _split_numbered(text) or _split_author_year(text)

    return []


def _split_numbered(text: str) -> list[str]:
    """Split numbered references (IEEE, Vancouver, etc.).

    Patterns:
    - [1] Author...
    - 1. Author...
    - 1 Author...
    """
    references = []

    # Pattern: [N] or N. or N at start of line
    pattern = r"(?:^|\n)\s*(?:\[(\d+)\]|(\d+)\.?)\s+"

    matches = list(re.finditer(pattern, text))
    if len(matches) < 2:
        return []

    for i, match in enumerate(matches):
        start = match.start()
        if i + 1 < len(matches):
            end = matches[i + 1].start()
        else:
            end = len(text)

        ref = text[start:end].strip()
        if ref:
            references.append(ref)

    return references


def _split_author_year(text: str) -> list[str]:
    """Split author-year style references.

    References typically start with an author name.
    """
    references = []

    # Pattern: Author name at start of line (Last, F. or Last, First)
    # Be careful with lines that are just continuations
    author_pattern = r"(?:^|\n)\s*([A-ZÇĞİÖŞÜ][a-zçğıöşüA-ZÇĞİÖŞÜ\s]+,\s*[A-ZÇĞİÖŞÜ])"

    matches = list(re.finditer(author_pattern, text))
    if len(matches) < 2:
        # Try alternative: just uppercase start
        author_pattern = r"(?:^|\n)\s*([A-ZÇĞİÖŞÜ][a-zçğıöşü]+)"
        matches = list(re.finditer(author_pattern, text))

    if len(matches) < 2:
        return []

    for i, match in enumerate(matches):
        start = match.start()
        if i + 1 < len(matches):
            end = matches[i + 1].start()
        else:
            end = len(text)

        ref = text[start:end].strip()
        if ref and len(ref) > 20:  # Minimum reasonable reference length
            references.append(ref)

    return references


def _split_general(text: str) -> list[str]:
    """General splitting using heuristics."""
    references = []

    # Try splitting by double newlines (empty line separator)
    blocks = re.split(r"\n\s*\n", text)
    if len(blocks) > 1:
        for block in blocks:
            block = block.strip()
            if block and len(block) > 20:
                references.append(block)
        if len(references) >= 2:
            return references

    # Try splitting by lines that start with numbers or brackets
    lines = text.split("\n")
    current_ref = ""

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Check if this line starts a new reference
        if _is_new_reference_start(line):
            if current_ref:
                references.append(current_ref.strip())
            current_ref = line
        else:
            current_ref += " " + line

    if current_ref:
        references.append(current_ref.strip())

    return references


def _is_new_reference_start(line: str) -> bool:
    """Check if a line starts a new reference.

    Heuristics:
    - Starts with [N] or N. or N)
    - Starts with author name (Last, F. or F. Last)
    - Starts with uppercase word followed by comma
    """
    if not line:
        return False

    # Numbered start
    if re.match(r"^\[\d+\]", line):
        return True
    if re.match(r"^\d+[\.\)]\s+[A-ZÇĞİÖŞÜ]", line):
        return True

    # Author name start
    if re.match(r"^[A-ZÇĞİÖŞÜ][a-zçğıöşü]+,\s*[A-ZÇĞİÖŞÜ]", line):
        return True

    # Initial + Last name
    if re.match(r"^[A-ZÇĞİÖŞÜ]\.\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+", line):
        return True

    # Corporate author (all caps or known pattern)
    if re.match(r"^[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ\s]{2,30}\b", line):
        return True

    return False


def _filter_and_clean(references: list[str]) -> list[str]:
    """Filter out invalid references and clean them."""
    cleaned = []

    for ref in references:
        ref = ref.strip()

        # Skip too short
        if len(ref) < 15:
            continue

        # Skip lines that are just headers
        if re.match(r"^(Kaynakça|References|Bibliography|Works\s+Cited)$", ref, re.IGNORECASE):
            continue

        # Skip page numbers
        if re.match(r"^\d+$", ref):
            continue

        # Normalize whitespace
        ref = re.sub(r"\s+", " ", ref)

        cleaned.append(ref)

    return cleaned
