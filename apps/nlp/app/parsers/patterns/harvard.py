"""
AiRefCheck - Harvard Style Parser
Harvard: Author, A.A. (Year) 'Title', Journal, Vol(Issue), pp. Pages.
"""

import re
import uuid
from app.models.types import Author, CitationStyle, ParsedReference, ReferenceType


class HarvardParser:
    JOURNAL_RE = re.compile(
        r"^(?P<authors>.+?)\s*\((?P<year>\d{4})\)\s*"
        r"'(?P<title>[^']+)',?\s*"
        r"(?P<journal>[^,]+),\s*"
        r"(?P<volume>\d+)\((?P<issue>[^)]+)\),\s*"
        r"pp\.\s*(?P<pages>[\d]+(?:-[\d]+)?)\.?",
        re.DOTALL,
    )

    BOOK_RE = re.compile(
        r"^(?P<authors>.+?)\s*\((?P<year>\d{4})\)\s*"
        r"(?P<title>[^.]+)\.\s*"
        r"(?P<publisher>[^.]+)\.",
        re.DOTALL,
    )

    def parse(self, text):
        text = text.strip()
        for pattern, ref_type in [(self.JOURNAL_RE, ReferenceType.JOURNAL_ARTICLE), (self.BOOK_RE, ReferenceType.BOOK)]:
            m = pattern.match(text)
            if m:
                return self._build(m, text, ref_type)
        return self._partial_parse(text)

    def _build(self, m, raw, ref_type):
        return ParsedReference(
            id=str(uuid.uuid4()), raw_text=raw,
            authors=self._parse_authors(m.group("authors")),
            year=int(m.group("year")) if m.group("year") else None,
            title=(m.group("title") or "").strip(),
            journal=m.groupdict().get("journal"),
            publisher=m.groupdict().get("publisher"),
            volume=m.groupdict().get("volume"),
            issue=m.groupdict().get("issue"),
            pages=m.groupdict().get("pages"),
            type=ref_type, parse_confidence=0.80, style=CitationStyle.HARVARD,
        )

    def _parse_authors(self, text):
        text = text.strip().rstrip(".")
        parts = re.split(r"\s+and\s+|\s*&\s*", text)
        authors = []
        for p in parts:
            p = p.strip()
            if "," in p:
                last, first = p.split(",", 1)
                authors.append(Author(last_name=last.strip(), first_name=first.strip()))
            else:
                authors.append(Author(last_name=p))
        return authors

    def _partial_parse(self, text):
        year_match = re.search(r"\((\d{4})\)", text)
        return ParsedReference(
            id=str(uuid.uuid4()), raw_text=text,
            year=int(year_match.group(1)) if year_match else None,
            type=ReferenceType.OTHER, parse_confidence=0.3,
            style=CitationStyle.HARVARD, warnings=["Partial parse"],
        )
