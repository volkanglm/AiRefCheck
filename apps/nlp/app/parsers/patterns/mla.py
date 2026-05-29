"""
AiRefCheck - MLA Style Parsers (8th & 9th Edition)
MLA format: Author. "Title." Journal, vol. X, no. Y, Year, pp. X-Y.
"""

import re
import uuid

from app.models.types import Author, CitationStyle, ParsedReference, ReferenceType


class MLA9Parser:
    """MLA 9th Edition reference parser."""

    JOURNAL_RE = re.compile(
        r"^(?P<authors>[^.]+)\.\s*"
        r'"(?P<title>[^"]+)"\.\s*'
        r"(?P<journal>[^,]+),\s*"
        r"vol\.\s*(?P<volume>\d+),\s*"
        r"no\.\s*(?P<issue>\d+),\s*"
        r"(?P<year>\d{4}),\s*"
        r"pp\.\s*(?P<pages>[\d]+(?:-[\d]+)?)\.?",
        re.DOTALL,
    )

    BOOK_RE = re.compile(
        r"^(?P<authors>[^.]+)\.\s*"
        r"(?P<title>[^.]+)\.\s*"
        r"(?P<publisher>[^,]+),\s*"
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
            style=CitationStyle.MLA9,
        )

    def _parse_authors(self, text: str) -> list[Author]:
        """Parse MLA authors: 'Smith, John A., and Johnson, Beth C.'"""
        parts = re.split(r"\s*,\s*and\s+|\s+and\s+", text)
        authors = []
        for part in parts:
            part = part.strip().rstrip(".")
            if "," in part:
                last, first = part.split(",", 1)
                authors.append(Author(last_name=last.strip(), first_name=first.strip()))
            else:
                authors.append(Author(last_name=part))
        return authors

    def _partial_parse(self, text: str) -> ParsedReference:
        year_match = re.search(r"\b((?:19|20)\d{2})\b", text)
        title_match = re.search(r'"([^"]+)"', text)
        return ParsedReference(
            id=str(uuid.uuid4()),
            raw_text=text,
            year=int(year_match.group(1)) if year_match else None,
            title=title_match.group(1) if title_match else None,
            type=ReferenceType.OTHER,
            parse_confidence=0.3,
            style=CitationStyle.MLA9,
            warnings=["Partial parse"],
        )


class MLA8Parser(MLA9Parser):
    """MLA 8th Edition — structurally very similar to MLA 9."""
    def parse(self, text: str) -> ParsedReference:
        ref = super().parse(text)
        ref.style = CitationStyle.MLA8
        return ref
