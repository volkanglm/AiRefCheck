"""
Tests for Harvard reference parser.

Covers journal articles, books, author parsing, and edge cases.
"""

import pytest

from app.models.types import CitationStyle, ReferenceType
from app.parsers.patterns.harvard import HarvardParser


class TestHarvardJournalArticles:
    """Test Harvard journal article parsing."""

    def setup_method(self):
        self.parser = HarvardParser()

    def test_basic_journal(self):
        ref = "Smith, J.A. and Johnson, B.C. (2020) 'Machine learning applications in healthcare', Nature Medicine, 26(8), pp. 1221-1229."
        result = self.parser.parse(ref)
        assert result.style == CitationStyle.HARVARD
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2020
        assert result.title is not None
        assert "Machine learning" in result.title
        assert result.journal is not None
        assert "Nature Medicine" in result.journal
        assert result.volume == "26"
        assert result.issue == "8"
        assert result.pages == "1221-1229"
        assert len(result.authors) >= 2
        assert result.parse_confidence >= 0.5

    def test_journal_deep_learning(self):
        ref = "LeCun, Y., Bengio, Y. and Hinton, G. (2015) 'Deep learning', Nature, 521(7553), pp. 436-444."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2015
        assert result.title is not None
        assert "Deep learning" in result.title
        assert result.volume == "521"
        assert result.issue == "7553"
        assert result.pages == "436-444"

    def test_journal_attention(self):
        ref = "Vaswani, A. et al. (2017) 'Attention is all you need', Advances in Neural Information Processing Systems, 30, pp. 5998-6008."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2017
        assert result.volume == "30"

    def test_journal_bert(self):
        ref = "Devlin, J. et al. (2019) 'BERT: pre-training of deep bidirectional transformers', Proceedings of NAACL-HLT, 2019, pp. 4171-4186."
        result = self.parser.parse(ref)
        assert result is not None
        assert result.year == 2019
        assert result.title is not None

    def test_journal_residual(self):
        ref = "He, K. et al. (2016) 'Deep residual learning for image recognition', Proceedings of IEEE CVPR, 770(1), pp. 770-778."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2016


class TestHarvardBooks:
    """Test Harvard book parsing."""

    def setup_method(self):
        self.parser = HarvardParser()

    def test_basic_book(self):
        ref = "Sutton, R.S. and Barto, A.G. (2018) Reinforcement learning: an introduction. MIT Press."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.BOOK
        assert result.year == 2018
        assert result.title is not None
        assert "Reinforcement learning" in result.title
        assert result.publisher is not None
        assert "MIT Press" in result.publisher

    def test_book_deep_learning(self):
        ref = "Goodfellow, I., Bengio, Y. and Courville, A. (2016) Deep learning. MIT Press."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.BOOK
        assert result.year == 2016
        assert result.publisher is not None

    def test_book_ai_modern(self):
        ref = "Russell, S. and Norvig, P. (2020) Artificial intelligence: a modern approach. Pearson."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.BOOK
        assert result.year == 2020
        assert result.publisher is not None
        assert "Pearson" in result.publisher


class TestHarvardAuthorParsing:
    """Test Harvard author name parsing."""

    def setup_method(self):
        self.parser = HarvardParser()

    def test_two_authors_and(self):
        ref = "Smith, J.A. and Jones, B.C. (2020) 'A study', Nature, 1(1), pp. 1-10."
        result = self.parser.parse(ref)
        assert len(result.authors) == 2
        assert result.authors[0].last_name == "Smith"
        assert result.authors[1].last_name == "Jones"

    def test_three_authors(self):
        ref = "LeCun, Y., Bengio, Y. and Hinton, G. (2015) 'Deep learning', Nature, 521(7553), pp. 436-444."
        result = self.parser.parse(ref)
        assert len(result.authors) == 3

    def test_authors_with_ampersand(self):
        ref = "Smith, J. & Jones, B. (2020) 'A study', Nature, 1(1), pp. 1-10."
        result = self.parser.parse(ref)
        assert len(result.authors) == 2


class TestHarvardEdgeCases:
    """Test edge cases for Harvard parser."""

    def setup_method(self):
        self.parser = HarvardParser()

    def test_partial_parse(self):
        ref = "Random text without Harvard format"
        result = self.parser.parse(ref)
        assert result is not None
        assert result.style == CitationStyle.HARVARD
        assert result.parse_confidence <= 0.5

    def test_empty_string(self):
        result = self.parser.parse("")
        assert result is not None

    def test_year_extraction_partial(self):
        ref = "Some text (2021) more text"
        result = self.parser.parse(ref)
        assert result is not None
        assert result.year == 2021

    def test_fixture_all_refs(self, sample_harvard_refs):
        """Validate all Harvard fixture references parse."""
        for ref_text in sample_harvard_refs:
            result = self.parser.parse(ref_text)
            assert result is not None
            assert result.style == CitationStyle.HARVARD
