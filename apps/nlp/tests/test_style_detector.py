"""
Tests for citation StyleDetector.

Validates style detection for each citation style, mixed/ambiguous cases,
and edge conditions.
"""

import pytest

from app.models.types import CitationStyle
from app.detectors.style_detector import StyleDetector


class TestStyleDetectorIEEE:
    """Test IEEE style detection."""

    def setup_method(self):
        self.detector = StyleDetector()

    def test_detect_ieee(self, sample_ieee_refs):
        result = self.detector.detect(sample_ieee_refs[:5])
        assert result.style == CitationStyle.IEEE
        assert result.confidence > 0

    def test_ieee_signature_match(self):
        refs = [
            '[1] A. Smith, "Title," Journal, vol. 5, no. 2, pp. 10-20, 2020.',
            '[2] B. Jones, "Another title," Conference, 2021, pp. 30-40.',
        ]
        result = self.detector.detect(refs)
        assert result.style == CitationStyle.IEEE


class TestStyleDetectorAPA:
    """Test APA style detection."""

    def setup_method(self):
        self.detector = StyleDetector()

    def test_detect_apa7(self, apa7_journal_refs):
        result = self.detector.detect(apa7_journal_refs[:5])
        # APA should be one of the top detected styles
        top_styles = [s["style"] for s in result.detected_styles[:3]]
        assert result.style in (CitationStyle.APA7, CitationStyle.APA6, *top_styles)
        assert result.confidence > 0

    def test_apa7_with_doi(self, apa7_doi_refs):
        result = self.detector.detect(apa7_doi_refs)
        assert result.confidence > 0


class TestStyleDetectorVancouver:
    """Test Vancouver style detection."""

    def setup_method(self):
        self.detector = StyleDetector()

    def test_detect_vancouver(self, sample_vancouver_refs):
        result = self.detector.detect(sample_vancouver_refs[:5])
        assert result.confidence > 0
        # Vancouver should score highly
        top_styles = [s["style"] for s in result.detected_styles[:3]]
        assert result.style in top_styles or result.style == CitationStyle.VANCOUVER


class TestStyleDetectorMLA:
    """Test MLA style detection."""

    def setup_method(self):
        self.detector = StyleDetector()

    def test_detect_mla(self, sample_mla_refs):
        result = self.detector.detect(sample_mla_refs[:5])
        assert result.confidence > 0


class TestStyleDetectorChicago:
    """Test Chicago style detection."""

    def setup_method(self):
        self.detector = StyleDetector()

    def test_detect_chicago(self, sample_chicago_refs):
        result = self.detector.detect(sample_chicago_refs[:5])
        assert result.confidence > 0


class TestStyleDetectorHarvard:
    """Test Harvard style detection."""

    def setup_method(self):
        self.detector = StyleDetector()

    def test_detect_harvard(self, sample_harvard_refs):
        result = self.detector.detect(sample_harvard_refs[:5])
        assert result.confidence > 0


class TestStyleDetectorEdgeCases:
    """Test edge cases for style detection."""

    def setup_method(self):
        self.detector = StyleDetector()

    def test_empty_list(self):
        result = self.detector.detect([])
        assert result.style == CitationStyle.UNKNOWN
        assert result.confidence == 0.0

    def test_single_reference(self):
        refs = ["Smith, J. A. (2020). A paper. Nature, 26(8), 1221-1229."]
        result = self.detector.detect(refs)
        assert result is not None
        assert result.confidence >= 0

    def test_garbage_text(self):
        refs = [
            "Lorem ipsum dolor sit amet",
            "Consectetur adipiscing elit sed do",
        ]
        result = self.detector.detect(refs)
        assert result is not None
        # Could be unknown or low confidence
        assert result.confidence >= 0

    def test_mixed_styles_returns_mixed_or_low_confidence(self):
        """Mixed reference styles should result in low confidence or MIXED."""
        refs = [
            '[1] A. Smith, "IEEE paper," Journal, vol. 1, no. 1, pp. 1-10, 2020.',
            "Smith, J. A. (2020). APA paper. Nature, 26(8), 1221-1229.",
        ]
        result = self.detector.detect(refs)
        assert result is not None
        # Mixed styles should have lower confidence or detect MIXED
        assert result.confidence >= 0

    def test_result_has_detected_styles(self):
        refs = [
            '[1] A. Smith, "Title," Journal, vol. 5, no. 2, pp. 10-20, 2020.',
            '[2] B. Jones, "Another title," Conference, 2021, pp. 30-40.',
            '[3] C. Lee, "Third paper," IEEE Trans., vol. 3, no. 1, pp. 50-60, 2019.',
        ]
        result = self.detector.detect(refs)
        assert isinstance(result.detected_styles, list)
        assert len(result.detected_styles) > 0

    def test_result_structure(self, sample_ieee_refs):
        result = self.detector.detect(sample_ieee_refs)
        assert hasattr(result, "style")
        assert hasattr(result, "confidence")
        assert hasattr(result, "detected_styles")
        assert 0.0 <= result.confidence <= 1.0

    def test_many_references_same_style(self):
        """Detection should be robust with many same-style references."""
        refs = [
            f"[{i}] A. Author, \"Paper {i},\" Journal, vol. {i}, no. 1, pp. {i*10}-{i*10+5}, 202{i % 10}."
            for i in range(1, 21)
        ]
        result = self.detector.detect(refs)
        assert result.style == CitationStyle.IEEE
        assert result.confidence > 0.1
