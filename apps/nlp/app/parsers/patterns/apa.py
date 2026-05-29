"""
AiRefCheck - APA Style Parsers (6th & 7th Edition)
APA is the most common citation style in social sciences.
"""

import re
import uuid
from typing import Optional

from app.models.types import Author, CitationStyle, ParsedReference, ReferenceType


class APA7Parser:
    """APA 7th Edition reference parser."""

    # APA7 Journal: Author, A. A., & Author, B. B. (Year). Title. Journal, Vol(Issue), Pages. DOI
    JOURNAL_RE = re.compile(
        r"^(?P<authors>.+?)\s*\((?P<year>\d{4})\)\.\s*"
        r"(?P<title>[^.]+(?:\.\s*)?)\.\s*"
        r"(?P<journal>[^,]+),\s*"
        r"(?P<volume>\d+)(?:\((?P<issue>[^)]+)\))?,\s*"
        r"(?P<pages>[\d]+(?:-[\d]+)?)\."
        r'(?:\s*(?:https?://doi\.org/(?P<doi>[^\s]+)|(?P<url>https?://[^\s]+)))?$',
        re.DOTALL,
    )

    # APA7 Book: Author, A. A. (Year). Title (Edition). Publisher. DOI
    BOOK_RE = re.compile(
        r"^(?P<authors>.+?)\s*\((?P<year>\d{4})\)\.\s*"
        r"(?P<title>[^.]+(?:\([^)]+\))?)\.\s*"
        r"(?P<publisher>[^.]+)\."
        r'(?:\s*(?:https?://doi\.org/(?P<doi>[^\s]+)|(?P<isbn>ISBN\s+[\d\-X]+)|(?P<url>https?://[^\s]+)))?$',
        re.DOTALL,
    )

    # APA7 Book Chapter: Author, A. A. (Year). Chapter title. In E. Editor (Ed.), Book title (pp. X-Y). Publisher.
    CHAPTER_RE = re.compile(
        r"^(?P<authors>.+?)\s*\((?P<year>\d{4})\)\.\s*"
        r"(?P<title>[^.]+)\.\s*"
        r"In\s+(?P<editors>[^,(]+(?:,\s*[^,]+)*),?\s*(?:\(Eds?\.?\))?,?\s*"
        r"(?P<book_title>[^(]+)\((?:pp\.\s*)?(?P<pages>[\d]+(?:-[\d]+)?)\)\.\s*"
        r"(?P<publisher>[^.]+)\.",
        re.DOTALL,
    )

    # APA7 Thesis: Author, A. A. (Year). Title [Doctoral dissertation, University]. 
    THESIS_RE = re.compile(
        r"^(?P<authors>.+?)\s*\((?P<year>\d{4})\)\.\s*"
        r"(?P<title>[^[]+)\[(?P<thesis_type>[^]]+)\]\.\s*"
        r"(?P<institution>[^.]+)\.",
        re.DOTALL,
    )

    # APA7 Web: Author or Org. (Year, Month Day). Title. [Site. ]URL
    WEB_RE = re.compile(
        r"^(?P<authors>.+?)\s*\((?P<year>\d{4})(?:,\s*\w+(?:\s+\d+)?)?\)\.\s*"
        r"(?P<title>[^.]+)\.\s*"
        r"(?:\s*(?P<site>(?!https?://)[^.]+)\.\s*)?"
        r"(?P<url>https?://[^\s]+)$",
        re.DOTALL,
    )

    def parse(self, text: str) -> ParsedReference:
        """Parse an APA7 reference string."""
        text = text.strip()

        # Try each pattern
        for pattern, ref_type, extra_fn in [
            (self.CHAPTER_RE, ReferenceType.BOOK_CHAPTER, None),
            (self.JOURNAL_RE, ReferenceType.JOURNAL_ARTICLE, None),
            (self.THESIS_RE, ReferenceType.THESIS, self._thesis_extra),
            (self.BOOK_RE, ReferenceType.BOOK, None),
            (self.WEB_RE, ReferenceType.WEB_PAGE, None),
        ]:
            m = pattern.match(text)
            if m:
                return self._build(m, text, ref_type, extra_fn)

        # Partial parse fallback
        return self._partial_parse(text)

    def _build(self, m: re.Match, raw: str, ref_type: ReferenceType, extra_fn=None) -> ParsedReference:
        """Build ParsedReference from regex match."""
        authors = self._parse_authors(m.group("authors"))
        year = int(m.group("year")) if m.group("year") else None
        title = (m.group("title") or "").strip().rstrip(".")
        doi = m.groupdict().get("doi")
        url = m.groupdict().get("url")

        result = ParsedReference(
            id=str(uuid.uuid4()),
            raw_text=raw,
            authors=authors,
            year=year,
            title=title,
            journal=m.groupdict().get("journal"),
            book_title=m.groupdict().get("book_title"),
            publisher=m.groupdict().get("publisher"),
            volume=m.groupdict().get("volume"),
            issue=m.groupdict().get("issue"),
            pages=m.groupdict().get("pages"),
            doi=doi,
            url=url,
            type=ref_type,
            parse_confidence=0.85,
            style=CitationStyle.APA7,
        )

        if extra_fn:
            result = extra_fn(result, m)

        return result

    def _thesis_extra(self, ref: ParsedReference, m: re.Match) -> ParsedReference:
        thesis_type = m.groupdict().get("thesis_type", "")
        if "doctoral" in thesis_type.lower() or "doktora" in thesis_type.lower():
            ref.type = ReferenceType.DISSERTATION
        ref.metadata["thesis_type"] = thesis_type
        ref.metadata["institution"] = m.groupdict().get("institution", "").strip()
        return ref

    def _parse_authors(self, text: str) -> list[Author]:
        """Parse APA author string: 'Smith, J. A., & Johnson, B. C.'"""
        if not text:
            return []

        text = text.strip().rstrip(".")

        # Split by & or "ve" (Turkish)
        parts = re.split(r"\s*[&]\s*|\s+ve\s+", text)

        authors = []
        for part in parts:
            part = part.strip()
            if not part:
                continue

            # Handle "et al." / "vd."
            if "et al" in part or "vd." in part:
                # Just get the first author
                first = parts[0] if parts else part
                single = first.split(",")[0].strip()
                authors.append(Author(last_name=single))
                break

            # "Last, F. M." format
            comma_split = part.split(",", 1)
            if len(comma_split) == 2:
                last = comma_split[0].strip()
                first = comma_split[1].strip()
                authors.append(Author(last_name=last, first_name=first))
            else:
                authors.append(Author(last_name=part))

        return authors

    def _partial_parse(self, text: str) -> ParsedReference:
        """Fallback when no pattern matches."""
        year_match = re.search(r"\((\d{4})\)", text)
        doi_match = re.search(r"(?:10\.\d{4,}/[^\s]+)", text)
        authors = self._parse_authors(text.split("(")[0]) if "(" in text else []

        return ParsedReference(
            id=str(uuid.uuid4()),
            raw_text=text,
            authors=authors,
            year=int(year_match.group(1)) if year_match else None,
            doi=doi_match.group(0) if doi_match else None,
            type=ReferenceType.OTHER,
            parse_confidence=0.3,
            style=CitationStyle.APA7,
            warnings=["Partial parse - pattern not fully matched"],
        )


class APA6Parser(APA7Parser):
    """APA 6th Edition — very similar to APA7, minor differences."""

    def parse(self, text: str) -> ParsedReference:
        ref = super().parse(text)
        ref.style = CitationStyle.APA6
        return ref
