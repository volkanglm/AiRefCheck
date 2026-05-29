"""Turkish name handling and parsing utilities."""

import re

from app.models.types import Author


class TurkishNameHandler:
    """Handles parsing of Turkish author names in various formats.

    Supports:
    - "Yılmaz, Mehmet" → lastName: Yılmaz, firstName: Mehmet
    - "Öztürk, A. F." → lastName: Öztürk, firstName: A. F.
    - "Kaya, M., ve Demir, A." → [Kaya M., Demir A.]
    - "Aydın et al." / "Aydın vd."
    - Two-word surnames (Özdemir Yılmaz, M.)
    - Turkish characters (ç, ğ, ı, ö, ş, ü, İ, Ç, Ğ, Ö, Ş, Ü)
    - "ve" conjunction (instead of &)
    - "vd." abbreviation (instead of et al.)
    """

    # Turkish character set
    TURKISH_CHARS = "çğıöşüÇĞİÖŞÜ"

    # Common Turkish surname prefixes that form compound surnames
    COMPOUND_PREFIXES = [
        "öz", "alt", "üst", "yan", "ara", "dış", "iç", "ön", "arka",
        "doğu", "batı", "kuzey", "güney", "yeni", "eski",
    ]

    def __init__(self) -> None:
        self.turkish_pattern = re.compile(
            r"[A-ZÇĞİÖŞÜ][a-zçğıöşü]+"
        )

    def parse_authors(self, author_str: str) -> list[Author]:
        """Parse a string containing one or more authors.

        Args:
            author_str: Raw author string from reference

        Returns:
            List of parsed Author objects
        """
        if not author_str or not author_str.strip():
            return []

        author_str = author_str.strip()

        # Handle et al. / vd.
        if self._has_et_al(author_str):
            author_str = self._remove_et_al(author_str)

        # Split by common separators
        # Use & or "ve" (Turkish for "and") as separators
        # But be careful with "ve" - it might be part of a name
        authors = self._split_authors(author_str)

        parsed = []
        for author in authors:
            author = author.strip()
            if not author:
                continue

            parsed_author = self._parse_single_author(author)
            if parsed_author:
                parsed.append(parsed_author)

        return parsed

    def _has_et_al(self, text: str) -> bool:
        """Check if text contains et al. or Turkish equivalent."""
        et_al_patterns = [
            r"\bet\s+al\.?\b",
            r"\bvd\.?\b",
            r"\bve\s+diğerleri\b",
            r"\band\s+others\b",
        ]
        for pattern in et_al_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        return False

    def _remove_et_al(self, text: str) -> str:
        """Remove et al. and similar from text."""
        patterns = [
            r"\s*et\s+al\.?\b",
            r"\s*vd\.?\b",
            r"\s*ve\s+diğerleri\b",
            r"\s*and\s+others\b",
        ]
        for pattern in patterns:
            text = re.sub(pattern, "", text, flags=re.IGNORECASE)
        return text.strip()

    def _split_authors(self, author_str: str) -> list[str]:
        """Split author string into individual authors.

        Handles various separator patterns while being careful
        not to split on names containing "ve".
        """
        # First try ampersand
        if " & " in author_str:
            parts = re.split(r"\s*&\s*", author_str)
            return parts

        # Try comma separation with "and" or "ve"
        # Pattern: "Author1, Author2, and Author3" or "Author1, Author2 ve Author3"
        # But avoid splitting "A. ve B." as a name

        # Check for explicit "and" or "ve" before last author
        and_match = re.search(
            r",\s+(?:and|ve)\s+([A-ZÇĞİÖŞÜ][^,]+)$",
            author_str,
            re.IGNORECASE,
        )
        if and_match:
            # Split on the "and/ve" but keep the last author
            prefix = author_str[: and_match.start()]
            last_author = and_match.group(1)
            parts = [p.strip() for p in prefix.split(",") if p.strip()]
            parts.append(last_author)
            return parts

        # Simple comma separation
        if "," in author_str:
            # Check if it's "Last, First" format for single author
            # vs "Author1, Author2" format for multiple
            comma_count = author_str.count(",")
            if comma_count == 1:
                # Likely single author "Last, First"
                return [author_str]

            # Multiple authors separated by comma
            # But be careful: "Öztürk, A. F., Yılmaz, B." should split into 2
            parts = []
            current = ""
            segments = author_str.split(",")

            for i, segment in enumerate(segments):
                segment = segment.strip()
                if not segment:
                    continue

                current += segment

                # Check if this completes an author
                # An author usually has a name that starts with uppercase
                # and either has initials or is a full name
                if i < len(segments) - 1:
                    next_seg = segments[i + 1].strip() if i + 1 < len(segments) else ""
                    # If next segment starts with uppercase and looks like a last name,
                    # current author is complete
                    if next_seg and next_seg[0].isupper():
                        # Check if current looks like a complete author
                        if self._looks_like_complete_author(current):
                            parts.append(current)
                            current = ""
                        else:
                            current += ", "
                    else:
                        current += ", "

            if current:
                parts.append(current)

            if parts:
                return parts

        # No clear separation found, treat as single author
        return [author_str]

    def _looks_like_complete_author(self, text: str) -> bool:
        """Check if text looks like a complete author name."""
        text = text.strip()
        if not text:
            return False

        # "Last, First" format
        if "," in text:
            parts = text.split(",")
            if len(parts) >= 2 and parts[1].strip():
                return True

        # "First Last" format with at least 2 words
        words = text.split()
        if len(words) >= 2:
            return True

        return False

    def _parse_single_author(self, author: str) -> Author | None:
        """Parse a single author string.

        Handles formats:
        - "Yılmaz, Mehmet"
        - "Öztürk, A. F."
        - "Mehmet Yılmaz"
        - "M. Yılmaz"
        - "WHO" (corporate)
        """
        author = author.strip()
        if not author:
            return None

        # Check for corporate author (all caps, no comma, known patterns)
        if self._is_corporate_author(author):
            return Author(
                last_name=author,
                first_name=None,
                is_corporate=True,
            )

        # "Last, First" format
        if "," in author:
            return self._parse_last_first_format(author)

        # "First Last" or "Initial(s) Last" format
        return self._parse_first_last_format(author)

    def _is_corporate_author(self, author: str) -> bool:
        """Check if author is a corporate/institutional author."""
        # All uppercase (likely acronym)
        if author.isupper() and len(author) <= 10:
            return True

        # Known corporate patterns
        corporate_patterns = [
            r"^World\s+Health\s+Organization",
            r"^WHO\b",
            r"^United\s+Nations",
            r"^UN\b",
            r"^Ministry\s+of",
            r"^Department\s+of",
            r"^National\s+",
            r"^European\s+",
            r"^TÜBİTAK",
            r"^YÖK",
            r"^TBMM",
        ]

        for pattern in corporate_patterns:
            if re.match(pattern, author, re.IGNORECASE):
                return True

        return False

    def _parse_last_first_format(self, author: str) -> Author:
        """Parse "Last, First" format author.

        Handles compound surnames like "Özdemir Yılmaz, M."
        """
        parts = author.split(",", 1)
        last_name = parts[0].strip()
        first_name = parts[1].strip() if len(parts) > 1 else None

        # Clean up first name
        if first_name:
            first_name = re.sub(r"\s+", " ", first_name)

        return Author(
            last_name=last_name,
            first_name=first_name,
            is_corporate=False,
        )

    def _parse_first_last_format(self, author: str) -> Author:
        """Parse "First Last" or "Initial(s) Last" format.

        Handles Turkish compound surnames.
        """
        words = author.split()

        if len(words) == 1:
            # Single word, treat as last name
            return Author(last_name=words[0], first_name=None)

        if len(words) == 2:
            # "First Last" or "Initial Last"
            return Author(last_name=words[1], first_name=words[0])

        # More than 2 words - could be compound surname
        # Check for compound surname patterns
        last_name = self._extract_compound_surname(words)
        first_name = " ".join(words[: -len(last_name.split())])

        return Author(
            last_name=last_name,
            first_name=first_name if first_name else None,
        )

    def _extract_compound_surname(self, words: list[str]) -> str:
        """Extract compound surname from word list.

        Examples:
        - ["M.", "Özdemir", "Yılmaz"] → "Özdemir Yılmaz"
        - ["Ayşe", "Fatma", "Öztürk"] → "Öztürk"
        """
        if len(words) <= 2:
            return words[-1] if words else ""

        # Check if last two words form a compound surname
        last_two = f"{words[-2]} {words[-1]}".lower()
        first_of_last_two = words[-2].lower()

        if first_of_last_two in self.COMPOUND_PREFIXES:
            return f"{words[-2]} {words[-1]}"

        # Check if second to last is an initial (single letter or X.)
        if re.match(r"^[A-ZÇĞİÖŞÜ]\.?$", words[-2], re.IGNORECASE):
            return words[-1]

        # Default: last word is surname
        return words[-1]

    def normalize_turkish_name(self, name: str) -> str:
        """Normalize Turkish name for consistent comparison.

        Handles common variations and encoding issues.
        """
        if not name:
            return ""

        name = name.strip()

        # Ensure Turkish characters are properly represented
        replacements = {
            "i": "ı",  # Be careful - only in Turkish context
            "I": "İ",
        }

        # Only replace if it looks like Turkish context
        if any(c in self.TURKISH_CHARS for c in name):
            for old, new in replacements.items():
                # Only replace standalone, not in words
                name = name.replace(old, new)

        return name

    def format_author_for_comparison(self, author: Author) -> str:
        """Format author name for comparison/fuzzy matching.

        Returns normalized string suitable for matching.
        """
        if author.is_corporate:
            return author.last_name.lower()

        last = author.last_name.lower()
        if author.first_name:
            first = author.first_name.lower()
            # Use initials only for comparison
            initials = "".join(
                word[0] for word in first.split() if word and word[0].isalpha()
            )
            return f"{last} {initials}".strip()

        return last
