"""Text cleaning and normalization utilities."""

import re
import unicodedata


def normalize_whitespace(text: str) -> str:
    """Normalize whitespace characters in text.

    Replaces multiple spaces, tabs, newlines with single spaces,
    and strips leading/trailing whitespace.
    """
    if not text:
        return ""
    # Replace various whitespace chars with space
    text = re.sub(r"[\t\n\r\f\v]+", " ", text)
    # Replace multiple spaces with single space
    text = re.sub(r" +", " ", text)
    return text.strip()


def remove_line_numbers(text: str) -> str:
    """Remove line numbers commonly found in PDF extractions.

    Matches patterns like:
    - "  1  " at start of line
    - "  12  " in margins
    """
    if not text:
        return ""
    # Remove line numbers at start of lines (common in PDFs)
    text = re.sub(r"^\s*\d+\s+(?=[A-Z])", "", text, flags=re.MULTILINE)
    # Remove standalone numbers in margins
    text = re.sub(r"^\s*\d+\s*$", "", text, flags=re.MULTILINE)
    return normalize_whitespace(text)


def clean_doi(doi: str) -> str | None:
    """Clean and validate DOI string.

    Returns cleaned DOI or None if invalid.
    """
    if not doi:
        return None

    # Remove common prefixes
    doi = re.sub(r"^(https?://(dx\.)?doi\.org/|doi:\s*|DOI:\s*)", "", doi.strip())

    # Basic DOI validation: 10.xxxx/...
    if re.match(r"^10\.\d{4,}/.+", doi):
        return doi

    return None


def extract_doi_from_url(url: str) -> str | None:
    """Extract DOI from a URL string.

    Handles common DOI URL patterns.
    """
    if not url:
        return None

    # Match DOI in URL
    patterns = [
        r"doi\.org/(10\.\d{4,}/[^\s&]+)",
        r"dx\.doi\.org/(10\.\d{4,}/[^\s&]+)",
        r"doi=(10\.\d{4,}/[^\s&]+)",
    ]

    for pattern in patterns:
        match = re.search(pattern, url, re.IGNORECASE)
        if match:
            doi = match.group(1)
            # Clean trailing punctuation
            doi = re.sub(r"[.,;]+$", "", doi)
            return doi

    return None


def normalize_turkish_chars(text: str) -> str:
    """Normalize Turkish characters for consistent processing.

    Converts common problematic characters while preserving Turkish letters.
    Handles cases where Turkish chars might be encoded incorrectly.
    """
    if not text:
        return ""

    # Fix common encoding issues with Turkish characters
    replacements = {
        "Ä±": "ı",
        "Ä°": "İ",
        "Ã§": "ç",
        "Ã‡": "Ç",
        "ÄŸ": "ğ",
        "Ä": "Ğ",
        "Ã¶": "ö",
        "Ã–": "Ö",
        "ÅŸ": "ş",
        "Å": "Ş",
        "Ã¼": "ü",
        "Ãœ": "Ü",
    }

    for bad, good in replacements.items():
        text = text.replace(bad, good)

    # Normalize unicode to ensure consistent representation
    text = unicodedata.normalize("NFC", text)

    return text


def clean_reference_text(text: str) -> str:
    """Comprehensive cleaning for reference text.

    Applies all cleaning functions in sequence.
    """
    if not text:
        return ""

    text = normalize_turkish_chars(text)
    text = remove_line_numbers(text)
    text = normalize_whitespace(text)

    # Remove common PDF artifacts
    text = re.sub(r"\(cid:\d+\)", "", text)

    # Fix common OCR errors
    text = text.replace("—", "-")  # em dash to hyphen
    text = text.replace("–", "-")  # en dash to hyphen

    return text.strip()
