"""
AiRefCheck - AMA 11th, ACS 3rd, CSE, ASA 7th, APSA 7th Parsers
Simplified parsers for additional citation styles.
"""

import re
import uuid
from app.models.types import Author, CitationStyle, ParsedReference, ReferenceType


def _parse_vancouver_authors(text: str) -> list[Author]:
    parts = [p.strip() for p in text.split(",")]
    authors = []
    for p in parts:
        tokens = p.strip().split()
        if len(tokens) >= 2:
            authors.append(Author(last_name=tokens[0], first_name=" ".join(tokens[1:])))
        elif tokens:
            authors.append(Author(last_name=tokens[0]))
    return authors


def _parse_apa_authors(text: str) -> list[Author]:
    text = text.strip().rstrip(".")
    # Normalize ", and " to " and "
    text = re.sub(r",\s+and\s+", " and ", text)
    parts = re.split(r"\s*[&]\s*|\s+and\s+", text)
    authors = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        if "," in p:
            comma_parts = [s.strip() for s in p.split(",")]
            # First two comma-parts are "Last, First" of the first author
            if len(comma_parts) >= 2:
                authors.append(Author(last_name=comma_parts[0], first_name=comma_parts[1]))
                # Remaining parts are additional authors in "FirstName LastName" format
                for cp in comma_parts[2:]:
                    cp = cp.strip()
                    if cp:
                        tokens = cp.split()
                        if len(tokens) >= 2:
                            authors.append(Author(last_name=tokens[-1], first_name=" ".join(tokens[:-1])))
                        else:
                            authors.append(Author(last_name=cp))
            else:
                authors.append(Author(last_name=p))
        else:
            # "First Last" format
            tokens = p.split()
            if len(tokens) >= 2:
                authors.append(Author(last_name=tokens[-1], first_name=" ".join(tokens[:-1])))
            else:
                authors.append(Author(last_name=p))
    return authors


class AMA11Parser:
    """AMA 11th: Author AA. Title. Journal. Year;Vol(Issue):Pages."""
    JOURNAL_RE = re.compile(
        r"^(?P<authors>[^.]+)\.\s*(?P<title>[^.]+)\.\s*"
        r"(?P<journal>.+?)\.\s*(?P<year>\d{4});(?P<volume>\d+)(?:\((?P<issue>[^)]+)\))?:\s*(?P<pages>[\d]+(?:-[\d]+)?)\.?"
    )

    def parse(self, text):
        m = self.JOURNAL_RE.match(text.strip())
        if m:
            return ParsedReference(
                id=str(uuid.uuid4()), raw_text=text.strip(),
                authors=_parse_vancouver_authors(m.group("authors")),
                year=int(m.group("year")), title=m.group("title").strip(),
                journal=m.group("journal").strip(), volume=m.group("volume"),
                issue=m.group("issue"), pages=m.group("pages"),
                type=ReferenceType.JOURNAL_ARTICLE, parse_confidence=0.80,
                style=CitationStyle.AMA11,
            )
        return self._partial(text)

    def _partial(self, text):
        y = re.search(r"\b((?:19|20)\d{2})\b", text)
        return ParsedReference(id=str(uuid.uuid4()), raw_text=text.strip(),
            year=int(y.group(1)) if y else None, type=ReferenceType.OTHER,
            parse_confidence=0.3, style=CitationStyle.AMA11, warnings=["Partial parse"])


class ACS3Parser:
    """ACS 3rd: Author, A. A. Journal Year, Vol, Pages."""
    JOURNAL_RE = re.compile(
        r"^(?P<authors>.+?)\s*(?P<journal>[A-Za-z\s]+)\s*(?P<year>\d{4}),\s*(?P<volume>\w+),\s*(?P<pages>[\d]+(?:-[\d]+)?)\.?"
    )

    def parse(self, text):
        m = self.JOURNAL_RE.match(text.strip())
        if m:
            return ParsedReference(
                id=str(uuid.uuid4()), raw_text=text.strip(),
                authors=_parse_apa_authors(m.group("authors")),
                year=int(m.group("year")), title=None,
                journal=m.group("journal").strip(), volume=m.group("volume"),
                pages=m.group("pages"),
                type=ReferenceType.JOURNAL_ARTICLE, parse_confidence=0.70,
                style=CitationStyle.ACS3,
            )
        return self._partial(text)

    def _partial(self, text):
        y = re.search(r"\b((?:19|20)\d{2})\b", text)
        return ParsedReference(id=str(uuid.uuid4()), raw_text=text.strip(),
            year=int(y.group(1)) if y else None, type=ReferenceType.OTHER,
            parse_confidence=0.3, style=CitationStyle.ACS3, warnings=["Partial parse"])


class CSEParser:
    """CSE (Council of Science Editors): Author AA. Title. Journal. Year;Vol:Pages."""
    JOURNAL_RE = re.compile(
        r"^(?P<authors>[^.]+)\.\s*(?P<title>[^.]+)\.\s*"
        r"(?P<journal>[^.]+)\.\s*(?P<year>\d{4});(?P<volume>\d+):(?P<pages>[\d]+(?:-[\d]+)?)\.?"
    )

    def parse(self, text):
        m = self.JOURNAL_RE.match(text.strip())
        if m:
            return ParsedReference(
                id=str(uuid.uuid4()), raw_text=text.strip(),
                authors=_parse_vancouver_authors(m.group("authors")),
                year=int(m.group("year")), title=m.group("title").strip(),
                journal=m.group("journal").strip(), volume=m.group("volume"),
                pages=m.group("pages"),
                type=ReferenceType.JOURNAL_ARTICLE, parse_confidence=0.80,
                style=CitationStyle.CSE,
            )
        return self._partial(text)

    def _partial(self, text):
        y = re.search(r"\b((?:19|20)\d{2})\b", text)
        return ParsedReference(id=str(uuid.uuid4()), raw_text=text.strip(),
            year=int(y.group(1)) if y else None, type=ReferenceType.OTHER,
            parse_confidence=0.3, style=CitationStyle.CSE, warnings=["Partial parse"])


class ASA7Parser:
    """ASA 7th: Author, A. A. Year. "Title." Journal Vol(Issue):Pages."""
    JOURNAL_RE = re.compile(
        r"^(?P<authors>.+?)\s*(?P<year>\d{4})\.\s*"
        r'"(?P<title>[^"]+)"(?:\.)?\s+'
        r"(?P<journal>.+?)\s+(?P<volume>\d+)\((?P<issue>[^)]+)\):(?P<pages>[\d]+(?:-[\d]+)?)\.?\s*$"
    )

    def parse(self, text):
        m = self.JOURNAL_RE.match(text.strip())
        if m:
            return ParsedReference(
                id=str(uuid.uuid4()), raw_text=text.strip(),
                authors=_parse_apa_authors(m.group("authors")),
                year=int(m.group("year")), title=m.group("title").strip(),
                journal=m.group("journal").strip(), volume=m.group("volume"),
                issue=m.group("issue"), pages=m.group("pages"),
                type=ReferenceType.JOURNAL_ARTICLE, parse_confidence=0.80,
                style=CitationStyle.ASA7,
            )
        return self._partial(text)

    def _partial(self, text):
        y = re.search(r"\b((?:19|20)\d{2})\b", text)
        return ParsedReference(id=str(uuid.uuid4()), raw_text=text.strip(),
            year=int(y.group(1)) if y else None, type=ReferenceType.OTHER,
            parse_confidence=0.3, style=CitationStyle.ASA7, warnings=["Partial parse"])


class APSA7Parser:
    """APSA 7th: Similar to ASA/APA format."""
    JOURNAL_RE = re.compile(
        r"^(?P<authors>.+?)\s*\((?P<year>\d{4})\)\.\s*"
        r'"(?P<title>[^"]+)"(?:\.)?\s+'
        r"(?P<journal>[^,]+),\s*(?P<volume>\d+)\((?P<issue>[^)]+)\),\s*"
        r"(?P<pages>[\d]+(?:-[\d]+)?)\.?",
        re.DOTALL,
    )

    def parse(self, text):
        m = self.JOURNAL_RE.match(text.strip())
        if m:
            return ParsedReference(
                id=str(uuid.uuid4()), raw_text=text.strip(),
                authors=_parse_apa_authors(m.group("authors")),
                year=int(m.group("year")), title=m.group("title").strip(),
                journal=m.group("journal").strip(), volume=m.group("volume"),
                issue=m.group("issue"), pages=m.group("pages"),
                type=ReferenceType.JOURNAL_ARTICLE, parse_confidence=0.80,
                style=CitationStyle.APSA7,
            )
        return self._partial(text)

    def _partial(self, text):
        y = re.search(r"\b((?:19|20)\d{2})\b", text)
        return ParsedReference(id=str(uuid.uuid4()), raw_text=text.strip(),
            year=int(y.group(1)) if y else None, type=ReferenceType.OTHER,
            parse_confidence=0.3, style=CitationStyle.APSA7, warnings=["Partial parse"])
