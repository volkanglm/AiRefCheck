"""
AiRefCheck - Chicago Style Parsers (Notes-Bibliography & Author-Date)
"""

import re
import uuid

from app.models.types import Author, CitationStyle, ParsedReference, ReferenceType


class ChicagoNBParser:
    """Chicago Notes-Bibliography: Smith, John. Title. Place: Publisher, 2023."""

    BOOK_RE = re.compile(
        r"^(?P<authors>[^.]+)\.\s*"
        r"(?P<title>[^.]+)\.\s*"
        r"(?P<city>[^:]+):\s*"
        r"(?P<publisher>[^,]+),\s*"
        r"(?P<year>\d{4})\.?",
    )

    JOURNAL_RE = re.compile(
        r"^(?P<authors>[^.]+)\.\s*"
        r'"(?P<title>[^"]+)"\.\s*'
        r"(?P<journal>[^,]+)\s+"
        r"(?P<volume>\d+),\s*no\.\s*(?P<issue>\d+)\s*"
        r"\((?P<year>\d{4})\):\s*"
        r"(?P<pages>[\d]+(?:-[\d]+)?)\.?",
    )

    def parse(self, text: str) -> ParsedReference:
        text = text.strip()
        for pattern, ref_type in [
            (self.JOURNAL_RE, ReferenceType.JOURNAL_ARTICLE),
            (self.BOOK_RE, ReferenceType.BOOK),
        ]:
            m = pattern.match(text)
            if m:
                return self._build(m, text, ref_type)
        return self._partial_parse(text)

    def _build(self, m, raw, ref_type):
        return ParsedReference(
            id=str(uuid.uuid4()),
            raw_text=raw,
            authors=self._parse_authors(m.group("authors")),
            year=int(m.group("year")) if m.group("year") else None,
            title=(m.group("title") or "").strip(),
            journal=m.groupdict().get("journal"),
            publisher=m.groupdict().get("publisher"),
            volume=m.groupdict().get("volume"),
            issue=m.groupdict().get("issue"),
            pages=m.groupdict().get("pages"),
            type=ref_type,
            parse_confidence=0.80,
            style=CitationStyle.CHICAGO_NB,
        )

    def _parse_authors(self, text):
        parts = re.split(r",\s*and\s+|\s+and\s+", text)
        authors = []
        for p in parts:
            p = p.strip().rstrip(".")
            if "," in p:
                last, first = p.split(",", 1)
                authors.append(Author(last_name=last.strip(), first_name=first.strip()))
            else:
                authors.append(Author(last_name=p))
        return authors

    def _partial_parse(self, text):
        year_match = re.search(r"\b((?:19|20)\d{2})\b", text)
        return ParsedReference(
            id=str(uuid.uuid4()), raw_text=text,
            year=int(year_match.group(1)) if year_match else None,
            type=ReferenceType.OTHER, parse_confidence=0.3,
            style=CitationStyle.CHICAGO_NB, warnings=["Partial parse"],
        )


class ChicagoADParser(ChicagoNBParser):
    """Chicago Author-Date: Smith, John. 2023. Title. Place: Publisher."""
    def parse(self, text):
        ref = super().parse(text)
        ref.style = CitationStyle.CHICAGO_AD
        return ref
