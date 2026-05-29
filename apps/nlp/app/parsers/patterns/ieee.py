"""
AiRefCheck - IEEE Style Parser
IEEE format: [1] A. Author and B. Author, "Title," Journal, vol. X, no. Y, pp. X-Y, Year.
"""

import re
import uuid

from app.models.types import Author, CitationStyle, ParsedReference, ReferenceType


class IEEEParser:
    """IEEE reference parser."""

    # [1] A. A. Smith and B. C. Johnson, "Title," Journal, vol. 15, no. 3, pp. 234-256, 2023.
    JOURNAL_RE = re.compile(
        r"^\[(?P<num>\d+)\]\s*"
        r"(?P<authors>.+?),\s*"
        r'"(?P<title>[^"]+)",?\s*'
        r"(?P<journal>[^,]+),\s*"
        r"vol\.\s*(?P<volume>\d+),\s*"
        r"no\.\s*(?P<issue>\d+),\s*"
        r"pp\.\s*(?P<pages>[\d]+(?:-[\d]+)?),\s*"
        r"(?P<year>\d{4})\.?\s*"
        r"(?:doi:\s*(?P<doi>[^\s]+))?$",
        re.DOTALL,
    )

    # [1] A. Author, "Title," in Proc. Conference, Year, pp. X-Y.
    CONFERENCE_RE = re.compile(
        r"^\[(?P<num>\d+)\]\s*"
        r"(?P<authors>.+?),\s*"
        r'"(?P<title>[^"]+)",?\s*'
        r"in\s+(?P<book_title>[^,]+),\s*"
        r"(?P<year>\d{4}),\s*"
        r"pp\.\s*(?P<pages>[\d]+(?:-[\d]+)?)\.?",
        re.DOTALL,
    )

    # [1] A. Author, Book Title, Xth ed. Publisher, Year.
    BOOK_RE = re.compile(
        r"^\[(?P<num>\d+)\]\s*"
        r"(?P<authors>.+?),\s*"
        r"(?P<title>[^.]+),\s*"
        r"(?:(?P<edition>\d+\w+\s+ed\.)\s*)?"
        r"(?P<publisher>[^,]+),\s*"
        r"(?P<year>\d{4})\.?",
        re.DOTALL,
    )

    def parse(self, text: str) -> ParsedReference:
        text = text.strip()

        for pattern, ref_type in [
            (self.JOURNAL_RE, ReferenceType.JOURNAL_ARTICLE),
            (self.CONFERENCE_RE, ReferenceType.CONFERENCE_PAPER),
            (self.BOOK_RE, ReferenceType.BOOK),
        ]:
            m = pattern.match(text)
            if m:
                return self._build(m, text, ref_type)

        return self._partial_parse(text)

    def _build(self, m: re.Match, raw: str, ref_type: ReferenceType) -> ParsedReference:
        authors = self._parse_authors(m.group("authors"))
        return ParsedReference(
            id=str(uuid.uuid4()),
            raw_text=raw,
            authors=authors,
            year=int(m.group("year")) if m.group("year") else None,
            title=(m.group("title") or "").strip(),
            journal=m.groupdict().get("journal"),
            book_title=m.groupdict().get("book_title"),
            publisher=m.groupdict().get("publisher"),
            volume=m.groupdict().get("volume"),
            issue=m.groupdict().get("issue"),
            pages=m.groupdict().get("pages"),
            doi=m.groupdict().get("doi"),
            type=ref_type,
            parse_confidence=0.85,
            style=CitationStyle.IEEE,
        )

    def _parse_authors(self, text: str) -> list[Author]:
        """Parse IEEE authors: 'A. A. Smith and B. C. Johnson'"""
        if not text:
            return []

        parts = re.split(r"\s+and\s+", text)
        authors = []
        for part in parts:
            part = part.strip()
            # IEEE: "A. A. Smith" → initials first, then last name
            tokens = part.split()
            if len(tokens) >= 2:
                # Last token is last name, rest are initials
                last = tokens[-1]
                first = " ".join(tokens[:-1])
                authors.append(Author(last_name=last, first_name=first))
            elif tokens:
                authors.append(Author(last_name=tokens[0]))
        return authors

    def _partial_parse(self, text: str) -> ParsedReference:
        year_match = re.search(r"\b((?:19|20)\d{2})\b", text)
        num_match = re.match(r"^\[(\d+)\]", text)
        title_match = re.search(r'"([^"]+)"', text)

        return ParsedReference(
            id=str(uuid.uuid4()),
            raw_text=text,
            year=int(year_match.group(1)) if year_match else None,
            title=title_match.group(1) if title_match else None,
            type=ReferenceType.OTHER,
            parse_confidence=0.3,
            style=CitationStyle.IEEE,
            warnings=["Partial parse - IEEE pattern not fully matched"],
        )
