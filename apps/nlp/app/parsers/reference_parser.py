"""
AiRefCheck NLP - Reference Parser Engine
Routes references to style-specific parsers.
"""

import re
import uuid
import traceback

import structlog

from app.models.types import CitationStyle, ParsedReference
from app.parsers.patterns.apa import APA7Parser, APA6Parser
from app.parsers.patterns.ieee import IEEEParser
from app.parsers.patterns.vancouver import VancouverParser
from app.parsers.patterns.mla import MLA9Parser, MLA8Parser
from app.parsers.patterns.chicago import ChicagoNBParser, ChicagoADParser
from app.parsers.patterns.harvard import HarvardParser
from app.parsers.patterns.ama_acs_cse_asa_apsa import (
    AMA11Parser,
    ACS3Parser,
    CSEParser,
    ASA7Parser,
    APSA7Parser,
)

logger = structlog.get_logger()


class ReferenceParser:
    """Main reference parser that delegates to style-specific parsers."""

    def __init__(self):
        self._parsers = {
            CitationStyle.APA7: APA7Parser(),
            CitationStyle.APA6: APA6Parser(),
            CitationStyle.IEEE: IEEEParser(),
            CitationStyle.VANCOUVER: VancouverParser(),
            CitationStyle.MLA9: MLA9Parser(),
            CitationStyle.MLA8: MLA8Parser(),
            CitationStyle.CHICAGO_NB: ChicagoNBParser(),
            CitationStyle.CHICAGO_AD: ChicagoADParser(),
            CitationStyle.HARVARD: HarvardParser(),
            CitationStyle.AMA11: AMA11Parser(),
            CitationStyle.ACS3: ACS3Parser(),
            CitationStyle.CSE: CSEParser(),
            CitationStyle.ASA7: ASA7Parser(),
            CitationStyle.APSA7: APSA7Parser(),
            CitationStyle.TURABIAN9: ChicagoNBParser(),  # Turabian close to Chicago NB
        }

    def parse(self, text: str, style: CitationStyle) -> ParsedReference:
        """Parse a single reference string."""
        parser = self._parsers.get(style)
        if parser:
            return parser.parse(text)
        # Fallback: generic parse
        return self._generic_parse(text)

    def parse_batch(self, references: list[str], style: CitationStyle) -> list[ParsedReference]:
        """Parse a batch of references.

        Each reference is parsed individually so that a single failure
        does not crash the entire batch.  Failed references are returned
        as low-confidence fallback parses with a warning.
        """
        results: list[ParsedReference] = []
        for idx, ref in enumerate(references):
            try:
                results.append(self.parse(ref, style))
            except Exception as exc:
                logger.warning(
                    "parse_batch: individual ref failed, using fallback",
                    index=idx,
                    error=str(exc),
                    ref_preview=ref[:80],
                )
                results.append(self._error_fallback(ref, exc))
        return results

    def _generic_parse(self, text: str) -> ParsedReference:
        """Fallback parser for unknown styles."""
        year_match = re.search(r"\b((?:19|20)\d{2})\b", text)
        doi_match = re.search(r"(?:10\.\d{4,}/[^\s]+)", text)

        return ParsedReference(
            id=str(uuid.uuid4()),
            raw_text=text,
            year=int(year_match.group(1)) if year_match else None,
            doi=doi_match.group(0) if doi_match else None,
            parse_confidence=0.1,
            style=CitationStyle.UNKNOWN,
            warnings=["Unknown citation style - partial parse only"],
        )

    def _error_fallback(self, text: str, exc: Exception) -> ParsedReference:
        """Create a minimal fallback result when a parser crashes."""
        year_match = re.search(r"\b((?:19|20)\d{2})\b", text)
        return ParsedReference(
            id=str(uuid.uuid4()),
            raw_text=text[:2000],  # Cap stored text length
            year=int(year_match.group(1)) if year_match else None,
            parse_confidence=0.05,
            style=CitationStyle.UNKNOWN,
            warnings=[f"Parser error: {exc!s}"],
        )
