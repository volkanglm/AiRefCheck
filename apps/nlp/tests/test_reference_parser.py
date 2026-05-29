"""
Integration tests for ReferenceParser (main parser engine).

Tests routing to correct style parsers, batch parsing, generic fallback,
and mixed reference lists.
"""

import pytest

from app.models.types import CitationStyle, ReferenceType
from app.parsers.reference_parser import ReferenceParser


class TestReferenceParserRouting:
    """Test that ReferenceParser routes to the correct style parser."""

    def setup_method(self):
        self.parser = ReferenceParser()

    def test_routes_to_apa7(self):
        ref = "Smith, J. A., & Jones, B. C. (2020). Machine learning applications. Nature Medicine, 26(8), 1221-1229. https://doi.org/10.1038/s41591-020-1040-9"
        result = self.parser.parse(ref, CitationStyle.APA7)
        assert result.style == CitationStyle.APA7
        assert result.year == 2020
        assert result.type == ReferenceType.JOURNAL_ARTICLE

    def test_routes_to_ieee(self):
        ref = '[1] A. Smith, "Deep learning," Nature, vol. 521, no. 1, pp. 436-444, 2020.'
        result = self.parser.parse(ref, CitationStyle.IEEE)
        assert result.style == CitationStyle.IEEE
        assert result.year == 2020

    def test_routes_to_vancouver(self):
        ref = "1. Smith JA, Johnson BC. Machine learning. Nature. 2023;26(8):1221-1229."
        result = self.parser.parse(ref, CitationStyle.VANCOUVER)
        assert result.style == CitationStyle.VANCOUVER
        assert result.year == 2023

    def test_routes_to_mla9(self):
        ref = 'Smith, John A. "Machine Learning." Nature Medicine, vol. 26, no. 8, 2020, pp. 1221-1229.'
        result = self.parser.parse(ref, CitationStyle.MLA9)
        assert result.style == CitationStyle.MLA9
        assert result.year == 2020

    def test_routes_to_chicago_nb(self):
        ref = 'Smith, John A. "Machine Learning." Nature Medicine 26, no. 8 (2020): 1221-1229.'
        result = self.parser.parse(ref, CitationStyle.CHICAGO_NB)
        assert result.style == CitationStyle.CHICAGO_NB
        assert result.year == 2020

    def test_routes_to_harvard(self):
        ref = "Smith, J.A. (2020) 'Machine learning', Nature, 26(8), pp. 1221-1229."
        result = self.parser.parse(ref, CitationStyle.HARVARD)
        assert result.style == CitationStyle.HARVARD
        assert result.year == 2020

    def test_routes_to_ama11(self):
        ref = "Smith JA, Johnson BC. Machine learning. Nat Med. 2023;26(8):1221-1229."
        result = self.parser.parse(ref, CitationStyle.AMA11)
        assert result.style == CitationStyle.AMA11
        assert result.year == 2023

    def test_routes_to_apa6(self):
        ref = "Smith, J. A. (2020). Machine learning. Nature, 26(8), 1221-1229."
        result = self.parser.parse(ref, CitationStyle.APA6)
        assert result.style == CitationStyle.APA6

    def test_routes_to_mla8(self):
        ref = 'Smith, John. "A Study." Nature, vol. 1, no. 1, 2020, pp. 1-10.'
        result = self.parser.parse(ref, CitationStyle.MLA8)
        assert result.style == CitationStyle.MLA8

    def test_routes_to_chicago_ad(self):
        ref = "Bishop, C. M. Pattern Recognition. New York: Springer, 2006."
        result = self.parser.parse(ref, CitationStyle.CHICAGO_AD)
        assert result.style == CitationStyle.CHICAGO_AD

    def test_routes_to_turabian(self):
        ref = "Bishop, C. M. Pattern Recognition. New York: Springer, 2006."
        result = self.parser.parse(ref, CitationStyle.TURABIAN9)
        # Turabian uses Chicago NB parser
        assert result.style == CitationStyle.CHICAGO_NB

    def test_routes_to_apa7_book(self):
        ref = "Sutton, R. S., & Barto, A. G. (2018). Reinforcement learning: An introduction (2nd ed.). MIT Press."
        result = self.parser.parse(ref, CitationStyle.APA7)
        assert result.style == CitationStyle.APA7
        assert result.type == ReferenceType.BOOK


class TestReferenceParserFallback:
    """Test generic fallback for unknown styles."""

    def setup_method(self):
        self.parser = ReferenceParser()

    def test_unknown_style_fallback(self):
        ref = "Smith, J. A. (2020). Some paper. Nature, 26, 1221-1229. https://doi.org/10.1234/test"
        result = self.parser.parse(ref, CitationStyle.UNKNOWN)
        assert result is not None
        assert result.style == CitationStyle.UNKNOWN
        assert result.parse_confidence <= 0.5
        # Should still extract DOI and year
        assert result.year == 2020
        assert result.doi is not None

    def test_fallback_extracts_year(self):
        ref = "Something from 2015 that doesn't match any pattern"
        result = self.parser.parse(ref, CitationStyle.UNKNOWN)
        assert result.year == 2015

    def test_fallback_extracts_doi(self):
        ref = "Random text with DOI 10.1234/some-doi-string in it"
        result = self.parser.parse(ref, CitationStyle.UNKNOWN)
        assert result.doi is not None
        assert "10.1234/some-doi-string" in result.doi

    def test_fallback_no_year_no_doi(self):
        ref = "Just some text without year or DOI"
        result = self.parser.parse(ref, CitationStyle.UNKNOWN)
        assert result is not None
        assert result.year is None
        assert result.doi is None


class TestReferenceParserBatch:
    """Test batch parsing."""

    def setup_method(self):
        self.parser = ReferenceParser()

    def test_parse_batch_apa(self):
        refs = [
            "Smith, J. A. (2020). Machine learning. Nature, 26(8), 1221-1229.",
            "Jones, B. C. (2019). Deep learning. Science, 150(3), 300-310.",
        ]
        results = self.parser.parse_batch(refs, CitationStyle.APA7)
        assert len(results) == 2
        assert all(r.style == CitationStyle.APA7 for r in results)

    def test_parse_batch_ieee(self):
        refs = [
            '[1] A. Smith, "Paper 1," Journal, vol. 1, no. 1, pp. 1-10, 2020.',
            '[2] B. Jones, "Paper 2," Journal, vol. 2, no. 1, pp. 11-20, 2021.',
        ]
        results = self.parser.parse_batch(refs, CitationStyle.IEEE)
        assert len(results) == 2
        assert all(r.style == CitationStyle.IEEE for r in results)

    def test_parse_batch_empty(self):
        results = self.parser.parse_batch([], CitationStyle.APA7)
        assert results == []

    def test_parse_batch_mixed_quality(self):
        """Batch with some parseable and some unparseable references."""
        refs = [
            "Smith, J. A. (2020). Machine learning. Nature, 26(8), 1221-1229.",
            "Unparseable garbage text",
        ]
        results = self.parser.parse_batch(refs, CitationStyle.APA7)
        assert len(results) == 2
        # First should parse well, second should be partial
        assert results[0].parse_confidence > results[1].parse_confidence


class TestReferenceParserAllStyles:
    """Cross-validation: each style's fixture references parse correctly."""

    def setup_method(self):
        self.parser = ReferenceParser()

    def test_apa7_fixtures(self, apa7_journal_refs):
        for ref_text in apa7_journal_refs:
            result = self.parser.parse(ref_text, CitationStyle.APA7)
            assert result is not None
            assert result.year is not None

    def test_ieee_fixtures(self, sample_ieee_refs):
        for ref_text in sample_ieee_refs:
            result = self.parser.parse(ref_text, CitationStyle.IEEE)
            assert result is not None

    def test_vancouver_fixtures(self, sample_vancouver_refs):
        for ref_text in sample_vancouver_refs:
            result = self.parser.parse(ref_text, CitationStyle.VANCOUVER)
            assert result is not None

    def test_mla_fixtures(self, sample_mla_refs):
        for ref_text in sample_mla_refs:
            result = self.parser.parse(ref_text, CitationStyle.MLA9)
            assert result is not None

    def test_chicago_fixtures(self, sample_chicago_refs):
        for ref_text in sample_chicago_refs:
            result = self.parser.parse(ref_text, CitationStyle.CHICAGO_NB)
            assert result is not None

    def test_harvard_fixtures(self, sample_harvard_refs):
        for ref_text in sample_harvard_refs:
            result = self.parser.parse(ref_text, CitationStyle.HARVARD)
            assert result is not None

    def test_ama_fixtures(self, sample_ama_refs):
        for ref_text in sample_ama_refs:
            result = self.parser.parse(ref_text, CitationStyle.AMA11)
            assert result is not None
