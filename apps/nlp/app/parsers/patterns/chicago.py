"""
AiRefCheck - Chicago Style Parsers (Notes-Bibliography & Author-Date)
"""

import re
import uuid

from app.models.types import Author, CitationStyle, ParsedReference, ReferenceType


class ChicagoNBParser:
    """Chicago Notes-Bibliography: Smith, John. Title. Place: Publisher, 2023."""

    # Books: match "Front. City: Publisher, Year" from end.
    # "Front" is split in code at the last ". " to separate authors from title.
    # Greedy ".+" for front ensures the longest match, so the period-space
    # boundary falls between title and city rather than inside author initials.
    BOOK_RE = re.compile(
        r"^(?P<front>.+)\.\s+"
        r"(?P<city>[^:]+):\s*"
        r"(?P<publisher>.+?),\s*"
        r"(?P<year>\d{4})\.?\s*$",
    )

    # Journals: quoted title may end with period inside quotes ("Title.").
    # The closing quote can be followed by optional . or , then whitespace.
    JOURNAL_RE = re.compile(
        r"^(?P<authors>[^.]+)\.\s*"
        r'"(?P<title>[^"]+)"[.,]?\s*'
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
                if ref_type == ReferenceType.BOOK:
                    return self._build_book(m, text)
                return self._build(m, text, ref_type)
        return self._partial_parse(text)

    def _build_book(self, m, raw):
        front = m.group("front")
        # Split at last ". " to separate authors from title.
        # Titles never contain ". " in Chicago NB, but author initials
        # can (e.g. "Richard S., and" does NOT produce ". " because
        # the period is followed by a comma).
        last_dot = front.rfind(". ")
        if last_dot > 0:
            authors_text = front[:last_dot]
            title = front[last_dot + 2:]
        else:
            authors_text = front
            title = ""
        return ParsedReference(
            id=str(uuid.uuid4()),
            raw_text=raw,
            authors=self._parse_authors(authors_text),
            year=int(m.group("year")) if m.group("year") else None,
            title=title.strip(),
            publisher=m.group("publisher").strip(),
            type=ReferenceType.BOOK,
            parse_confidence=0.80,
            style=CitationStyle.CHICAGO_NB,
        )

    def _build(self, m, raw, ref_type):
        return ParsedReference(
            id=str(uuid.uuid4()),
            raw_text=raw,
            authors=self._parse_authors(m.group("authors")),
            year=int(m.group("year")) if m.group("year") else None,
            title=(m.group("title") or "").strip().rstrip("."),
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
        text = text.strip()
        # Normalise ", and " → " and " so we can split on a single delimiter.
        text = re.sub(r",\s+and\s+", " and ", text)
        # Split on " and " to separate the last author group.
        and_parts = re.split(r"\s+and\s+", text)

        authors: list[Author] = []
        for part in and_parts:
            part = part.strip().rstrip(".")
            if not part:
                continue
            if "," in part:
                # Chicago first-author format: "Last, First" followed by
                # zero or more "FirstName LastName" co-authors separated
                # by commas.  e.g. "LeCun, Yann, Yoshua Bengio" →
                #   [Author(LeCun, Yann), Author(Bengio, Yoshua)]
                comma_parts = [cp.strip() for cp in part.split(",")]
                if len(comma_parts) >= 2:
                    # First two comma-parts are always Last, First of the
                    # lead author.
                    authors.append(
                        Author(last_name=comma_parts[0], first_name=comma_parts[1])
                    )
                    # Remaining comma-parts are additional authors in
                    # "FirstName LastName" format (no comma inversion).
                    for cp in comma_parts[2:]:
                        cp = cp.strip()
                        if not cp:
                            continue
                        tokens = cp.split()
                        if len(tokens) >= 2:
                            authors.append(
                                Author(
                                    last_name=tokens[-1],
                                    first_name=" ".join(tokens[:-1]),
                                )
                            )
                        else:
                            authors.append(Author(last_name=cp))
                else:
                    authors.append(Author(last_name=part))
            else:
                # "FirstName LastName" format (no comma) — e.g. "Andrew G. Barto"
                tokens = part.split()
                if len(tokens) >= 2:
                    authors.append(
                        Author(last_name=tokens[-1], first_name=" ".join(tokens[:-1]))
                    )
                else:
                    authors.append(Author(last_name=part))
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
