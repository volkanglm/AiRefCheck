"""
AiRefCheck - Vancouver Style Parser
Vancouver format: 1. Author AA. Title. Journal. Year;Vol(Issue):Pages.
"""

import re
import uuid

from app.models.types import Author, CitationStyle, ParsedReference, ReferenceType


class VancouverParser:
    """Vancouver (ICMJE) reference parser."""

    # 1. Smith JA, Johnson BC. Title. Journal. 2023;15(3):234-256.
    JOURNAL_RE = re.compile(
        r"^(?P<num>\d+)\.\s*"
        r"(?P<authors>[^.]+)\.\s*"
        r"(?P<title>[^.]+)\.\s*"
        r"(?P<journal>[^.]+)\.\s*"
        r"(?P<year>\d{4});(?P<volume>\d+)\((?P<issue>[^)]+)\):(?P<pages>[\d]+(?:-[\d]+)?)\.?",
        re.DOTALL,
    )

    # 1. Author AA. Book Title. Edition. Publisher; Year.
    BOOK_RE = re.compile(
        r"^(?P<num>\d+)\.\s*"
        r"(?P<authors>[^.]+)\.\s*"
        r"(?P<title>[^.]+)\.\s*"
        r"(?:\w+\s+ed\.\s*)?"  # edition
        r"(?P<publisher>[^;]+);\s*"
        r"(?P<year>\d{4})\.?",
        re.DOTALL,
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

    def _build(self, m: re.Match, raw: str, ref_type: ReferenceType) -> ParsedReference:
        authors = self._parse_authors(m.group("authors"))
        return ParsedReference(
            id=str(uuid.uuid4()),
            raw_text=raw,
            authors=authors,
            year=int(m.group("year")) if m.group("year") else None,
            title=(m.group("title") or "").strip(),
            journal=m.groupdict().get("journal"),
            publisher=m.groupdict().get("publisher"),
            volume=m.groupdict().get("volume"),
            issue=m.groupdict().get("issue"),
            pages=m.groupdict().get("pages"),
            type=ref_type,
            parse_confidence=0.85,
            style=CitationStyle.VANCOUVER,
        )

    def _parse_authors(self, text: str) -> list[Author]:
        """Parse Vancouver authors: 'Smith JA, Johnson BC, Williams DE'"""
        if not text:
            return []
        # Split by comma
        parts = [p.strip() for p in text.split(",")]
        authors = []
        for part in parts:
            part = part.strip()
            if not part:
                continue
            # Vancouver: "Smith JA" → last=Smith, first=JA
            tokens = part.split()
            if len(tokens) >= 2:
                last = tokens[0]
                first = " ".join(tokens[1:])
                authors.append(Author(last_name=last, first_name=first))
            else:
                authors.append(Author(last_name=part))
        return authors

    def _partial_parse(self, text: str) -> ParsedReference:
        year_match = re.search(r"\b((?:19|20)\d{2})\b", text)
        return ParsedReference(
            id=str(uuid.uuid4()),
            raw_text=text,
            year=int(year_match.group(1)) if year_match else None,
            type=ReferenceType.OTHER,
            parse_confidence=0.3,
            style=CitationStyle.VANCOUVER,
            warnings=["Partial parse - Vancouver pattern not fully matched"],
        )
