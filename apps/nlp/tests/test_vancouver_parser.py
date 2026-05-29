"""
Tests for Vancouver reference parser.

Covers journal articles, books, numbered format, author parsing, and edge cases.
"""

import pytest

from app.models.types import CitationStyle, ReferenceType
from app.parsers.patterns.vancouver import VancouverParser


class TestVancouverJournalArticles:
    """Test Vancouver journal article parsing."""

    def setup_method(self):
        self.parser = VancouverParser()

    def test_basic_journal(self):
        ref = "1. Smith JA, Johnson BC. Machine learning applications in healthcare. Nature Medicine. 2023;26(8):1221-1229."
        result = self.parser.parse(ref)
        assert result.style == CitationStyle.VANCOUVER
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2023
        assert result.title is not None
        assert "Machine learning" in result.title
        assert result.journal is not None
        assert "Nature Medicine" in result.journal
        assert result.volume == "26"
        assert result.issue == "8"
        assert result.pages == "1221-1229"
        assert len(result.authors) >= 2
        assert result.parse_confidence >= 0.5

    def test_journal_lecun_2015(self):
        ref = "2. LeCun Y, Bengio Y, Hinton GE. Deep learning. Nature. 2015;521(7553):436-444."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2015
        assert result.title is not None
        assert "Deep learning" in result.title
        assert result.journal is not None
        assert "Nature" in result.journal
        assert result.volume == "521"
        assert result.issue == "7553"
        assert result.pages == "436-444"

    def test_journal_attention(self):
        ref = "3. Vaswani A, Shazeer N, Parmar N. Attention is all you need. Advances in Neural Information Processing Systems. 2017;30:5998-6008."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2017
        assert result.volume == "30"

    def test_journal_krizhevsky(self):
        ref = "4. Krizhevsky A, Sutskever I, Hinton GE. ImageNet classification with deep convolutional neural networks. Communications of the ACM. 2012;60(6):84-90."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2012
        assert result.volume == "60"
        assert result.issue == "6"

    def test_journal_bert(self):
        ref = "5. Devlin J, Chang MW, Lee K. BERT: Pre-training of deep bidirectional transformers. Proceedings of NAACL-HLT. 2019;1:4171-4186."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2019

    def test_journal_generative(self):
        ref = "7. Goodfellow I, Pouget-Abadie J, Mirza M. Generative adversarial nets. Advances in Neural Information Processing Systems. 2014;27:2672-2680."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2014
        assert result.pages == "2672-2680"

    def test_journal_residual(self):
        ref = "8. He K, Zhang X, Ren S. Deep residual learning for image recognition. Proceedings of IEEE CVPR. 2016;1:770-778."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2016

    def test_journal_few_shot(self):
        ref = "9. Brown TB, Mann B, Ryder N. Language models are few-shot learners. Advances in Neural Information Processing Systems. 2020;33:1877-1901."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2020
        assert result.pages == "1877-1901"


class TestVancouverBooks:
    """Test Vancouver book parsing."""

    def setup_method(self):
        self.parser = VancouverParser()

    def test_basic_book(self):
        ref = "6. Sutton RS, Barto AG. Reinforcement Learning: An Introduction. MIT Press; 2018."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.BOOK
        assert result.year == 2018
        assert result.title is not None
        assert "Reinforcement Learning" in result.title
        assert result.publisher is not None
        assert "MIT Press" in result.publisher

    def test_corporate_author_book(self):
        ref = "10. World Health Organization. Global health report. WHO Press; 2023."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.BOOK
        assert result.year == 2023
        assert result.publisher is not None


class TestVancouverAuthorParsing:
    """Test Vancouver author name parsing."""

    def setup_method(self):
        self.parser = VancouverParser()

    def test_single_author(self):
        ref = "1. Smith JA. A study on AI. Nature. 2020;1(1):1-10."
        result = self.parser.parse(ref)
        assert len(result.authors) == 1
        assert result.authors[0].last_name == "Smith"
        assert result.authors[0].first_name == "JA"

    def test_two_authors(self):
        ref = "1. Smith JA, Johnson BC. A study on AI. Nature. 2020;1(1):1-10."
        result = self.parser.parse(ref)
        assert len(result.authors) == 2
        assert result.authors[0].last_name == "Smith"
        assert result.authors[1].last_name == "Johnson"

    def test_three_authors(self):
        ref = "1. Smith JA, Johnson BC, Lee DW. Deep learning review. Nature. 2020;1(1):1-10."
        result = self.parser.parse(ref)
        assert len(result.authors) == 3


class TestVancouverEdgeCases:
    """Test edge cases for Vancouver parser."""

    def setup_method(self):
        self.parser = VancouverParser()

    def test_partial_parse(self):
        ref = "This is not a Vancouver reference"
        result = self.parser.parse(ref)
        assert result is not None
        assert result.style == CitationStyle.VANCOUVER
        assert result.parse_confidence <= 0.5

    def test_empty_string(self):
        result = self.parser.parse("")
        assert result is not None

    def test_year_extraction_partial(self):
        ref = "11. Smith JA. An incomplete reference from 2021."
        result = self.parser.parse(ref)
        assert result is not None
        # Partial parse should still extract year
        assert result.year == 2021 or result.year is not None

    def test_fixture_all_refs(self, sample_vancouver_refs):
        """Validate all Vancouver fixture references parse."""
        for ref_text in sample_vancouver_refs:
            result = self.parser.parse(ref_text)
            assert result is not None
            assert result.style == CitationStyle.VANCOUVER
