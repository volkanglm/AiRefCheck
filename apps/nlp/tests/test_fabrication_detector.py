"""
Tests for FabricationDetector.

Tests fabrication detection with fabricated references, real-looking
references, and various anomaly types.
"""

import pytest

from app.models.types import (
    Author,
    CitationStyle,
    ParsedReference,
    ReferenceType,
)
from app.detectors.fabrication_detector import FabricationDetector


class TestFabricationDetectorRealRefs:
    """Test with well-formed, legitimate references."""

    def setup_method(self):
        self.detector = FabricationDetector()

    def test_well_formed_reference(self):
        ref = ParsedReference(
            raw_text="Smith, J. A. (2020). Machine learning in healthcare. Nature Medicine, 26(8), 1221-1229.",
            authors=[Author(last_name="Smith", first_name="J. A.")],
            year=2020,
            title="Machine learning in healthcare",
            journal="Nature Medicine",
            volume="26",
            issue="8",
            pages="1221-1229",
            doi="10.1038/s41591-020-1040-9",
            type=ReferenceType.JOURNAL_ARTICLE,
            parse_confidence=0.85,
            style=CitationStyle.APA7,
        )
        result = self.detector.analyze(ref)
        assert result.suspicion_level in ("none", "low")
        assert result.suspicion_score < 30

    def test_well_formed_book(self):
        ref = ParsedReference(
            raw_text="Sutton, R. S. (2018). Reinforcement learning. MIT Press.",
            authors=[Author(last_name="Sutton", first_name="R. S.")],
            year=2018,
            title="Reinforcement learning",
            publisher="MIT Press",
            type=ReferenceType.BOOK,
            parse_confidence=0.85,
            style=CitationStyle.APA7,
        )
        result = self.detector.analyze(ref)
        assert result.suspicion_level in ("none", "low")


class TestFabricationDetectorFabricatedRefs:
    """Test with obviously fabricated references."""

    def setup_method(self):
        self.detector = FabricationDetector()

    def test_future_year(self):
        ref = ParsedReference(
            raw_text="Smith, J. A. (2099). A paper from the future. Nature, 1(1), 1-10.",
            authors=[Author(last_name="Smith", first_name="J. A.")],
            year=2099,
            title="A paper from the future",
            type=ReferenceType.JOURNAL_ARTICLE,
            parse_confidence=0.85,
            style=CitationStyle.APA7,
        )
        result = self.detector.analyze(ref)
        assert result.suspicion_score > 0
        # Should have a year anomaly reason
        reason_types = [r.type for r in result.reasons]
        assert "year_anomaly" in reason_types

    def test_very_old_year(self):
        ref = ParsedReference(
            raw_text="Smith, J. A. (1750). Ancient paper. Journal, 1(1), 1-10.",
            authors=[Author(last_name="Smith", first_name="J. A.")],
            year=1750,
            title="Ancient paper",
            type=ReferenceType.JOURNAL_ARTICLE,
            parse_confidence=0.85,
            style=CitationStyle.APA7,
        )
        result = self.detector.analyze(ref)
        reason_types = [r.type for r in result.reasons]
        assert "year_anomaly" in reason_types

    def test_invalid_doi_format(self):
        ref = ParsedReference(
            raw_text="Smith, J. A. (2020). Paper with bad DOI. Nature, 1(1), 1-10.",
            authors=[Author(last_name="Smith", first_name="J. A.")],
            year=2020,
            title="Paper with bad DOI",
            doi="not-a-valid-doi",
            type=ReferenceType.JOURNAL_ARTICLE,
            parse_confidence=0.85,
            style=CitationStyle.APA7,
        )
        result = self.detector.analyze(ref)
        reason_types = [r.type for r in result.reasons]
        assert "invalid_doi" in reason_types

    def test_missing_all_fields(self):
        ref = ParsedReference(
            raw_text="Some random text",
            type=ReferenceType.OTHER,
            parse_confidence=0.1,
            style=CitationStyle.UNKNOWN,
        )
        result = self.detector.analyze(ref)
        assert result.suspicion_score > 0
        reason_types = [r.type for r in result.reasons]
        assert "missing_fields" in reason_types

    def test_very_short_reference(self):
        ref = ParsedReference(
            raw_text="Short ref",
            authors=[Author(last_name="A")],
            year=2020,
            title="T",
            type=ReferenceType.OTHER,
            parse_confidence=0.5,
            style=CitationStyle.UNKNOWN,
        )
        result = self.detector.analyze(ref)
        reason_types = [r.type for r in result.reasons]
        assert "length_anomaly" in reason_types

    def test_low_parse_confidence(self):
        ref = ParsedReference(
            raw_text="Smith (2020) some unparseable text that is long enough to pass length checks",
            year=2020,
            type=ReferenceType.OTHER,
            parse_confidence=0.1,
            style=CitationStyle.UNKNOWN,
        )
        result = self.detector.analyze(ref)
        reason_types = [r.type for r in result.reasons]
        assert "parse_failure" in reason_types

    def test_no_authors(self):
        ref = ParsedReference(
            raw_text="A reference with no author but has a title and year 2020.",
            year=2020,
            title="A title",
            type=ReferenceType.OTHER,
            parse_confidence=0.5,
            style=CitationStyle.APA7,
        )
        result = self.detector.analyze(ref)
        reason_types = [r.type for r in result.reasons]
        assert "missing_fields" in reason_types


class TestFabricationDetectorCombined:
    """Test combination of multiple suspicion factors."""

    def setup_method(self):
        self.detector = FabricationDetector()

    def test_multiple_issues_high_suspicion(self):
        """Reference with many issues should get high suspicion."""
        ref = ParsedReference(
            raw_text="Short",
            year=2099,
            doi="bad-doi",
            type=ReferenceType.OTHER,
            parse_confidence=0.1,
            style=CitationStyle.UNKNOWN,
        )
        result = self.detector.analyze(ref)
        assert result.suspicion_score >= 50
        assert result.suspicion_level in ("high", "critical")

    def test_minimal_issues_low_suspicion(self):
        """Reference with minor issues should get low suspicion."""
        ref = ParsedReference(
            raw_text="Smith, J. A. (2020). A comprehensive study on machine learning applications. Nature Medicine, 26(8), 1221-1229.",
            authors=[Author(last_name="Smith", first_name="J. A.")],
            year=2020,
            title="A comprehensive study on machine learning applications",
            journal="Nature Medicine",
            type=ReferenceType.JOURNAL_ARTICLE,
            parse_confidence=0.85,
            style=CitationStyle.APA7,
        )
        result = self.detector.analyze(ref)
        assert result.suspicion_level == "none"
        assert result.suspicion_score == 0

    def test_recommendations_for_high_suspicion(self):
        """High suspicion references should generate recommendations."""
        ref = ParsedReference(
            raw_text="Short",
            year=2099,
            doi="10.1234/fake",
            type=ReferenceType.OTHER,
            parse_confidence=0.05,
            style=CitationStyle.UNKNOWN,
        )
        result = self.detector.analyze(ref)
        if result.suspicion_level in ("high", "critical"):
            assert len(result.recommendations) > 0

    def test_suspicion_score_bounded(self):
        """Suspicion score should be bounded 0-100."""
        ref = ParsedReference(
            raw_text="",
            type=ReferenceType.OTHER,
            parse_confidence=0.0,
            style=CitationStyle.UNKNOWN,
        )
        result = self.detector.analyze(ref)
        assert 0 <= result.suspicion_score <= 100

    def test_result_structure(self):
        ref = ParsedReference(
            raw_text="Test reference text",
            year=2020,
            type=ReferenceType.OTHER,
            parse_confidence=0.5,
            style=CitationStyle.APA7,
        )
        result = self.detector.analyze(ref)
        assert hasattr(result, "suspicion_level")
        assert hasattr(result, "suspicion_score")
        assert hasattr(result, "reasons")
        assert hasattr(result, "recommendations")
        assert result.suspicion_level in ("none", "low", "medium", "high", "critical")
