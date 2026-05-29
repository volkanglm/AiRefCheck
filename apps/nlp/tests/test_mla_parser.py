"""
Tests for MLA 8th & 9th Edition reference parsers.

Covers journal articles, books, web resources, and edge cases.
"""

import pytest

from app.models.types import CitationStyle, ReferenceType
from app.parsers.patterns.mla import MLA9Parser, MLA8Parser


class TestMLA9JournalArticles:
    """Test MLA9 journal article parsing."""

    def setup_method(self):
        self.parser = MLA9Parser()

    def test_basic_journal(self):
        ref = 'Smith, John A. "Machine Learning Applications in Healthcare." Nature Medicine, vol. 26, no. 8, 2020, pp. 1221-1229.'
        result = self.parser.parse(ref)
        assert result.style == CitationStyle.MLA9
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2020
        assert result.title is not None
        assert "Machine Learning" in result.title
        assert result.journal is not None
        assert "Nature Medicine" in result.journal
        assert result.volume == "26"
        assert result.issue == "8"
        assert result.pages == "1221-1229"
        assert len(result.authors) >= 1
        assert result.parse_confidence >= 0.5

    def test_journal_et_al(self):
        ref = 'LeCun, Yann, et al. "Deep Learning." Nature, vol. 521, no. 7553, 2015, pp. 436-444.'
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2015
        assert result.title is not None
        assert "Deep Learning" in result.title

    def test_journal_attention(self):
        ref = 'Vaswani, Ashish, et al. "Attention Is All You Need." Advances in Neural Information Processing Systems, vol. 30, no. 1, 2017, pp. 5998-6008.'
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2017
        assert result.volume == "30"
        assert result.pages == "5998-6008"

    def test_journal_bert(self):
        ref = 'Devlin, Jacob, et al. "BERT: Pre-training of Deep Bidirectional Transformers." Proceedings of NAACL-HLT, 2019, pp. 4171-4186.'
        result = self.parser.parse(ref)
        assert result is not None
        assert result.title is not None
        assert "BERT" in result.title


class TestMLA9Books:
    """Test MLA9 book parsing."""

    def setup_method(self):
        self.parser = MLA9Parser()

    def test_basic_book(self):
        ref = "Sutton, Richard S., and Andrew G. Barto. Reinforcement Learning: An Introduction. MIT Press, 2018."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.BOOK
        assert result.year == 2018
        assert result.title is not None
        assert "Reinforcement Learning" in result.title
        assert result.publisher is not None
        assert "MIT Press" in result.publisher

    def test_book_deep_learning(self):
        ref = "Goodfellow, Ian, et al. Deep Learning. MIT Press, 2016."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.BOOK
        assert result.year == 2016
        assert result.publisher is not None

    def test_book_ai_modern(self):
        ref = "Russell, Stuart, and Peter Norvig. Artificial Intelligence: A Modern Approach. Pearson, 2020."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.BOOK
        assert result.year == 2020
        assert result.publisher is not None
        assert "Pearson" in result.publisher

    def test_book_single_author(self):
        ref = "Bishop, Christopher M. Pattern Recognition and Machine Learning. Springer, 2006."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.BOOK
        assert result.year == 2006


class TestMLA9AuthorParsing:
    """Test MLA9 author name parsing."""

    def setup_method(self):
        self.parser = MLA9Parser()

    def test_single_author(self):
        ref = 'Smith, John A. "A Study." Nature, vol. 1, no. 1, 2020, pp. 1-10.'
        result = self.parser.parse(ref)
        assert len(result.authors) >= 1
        assert result.authors[0].last_name == "Smith"

    def test_two_authors_with_and(self):
        ref = 'Smith, John, and Mary Jones. "A Study." Nature, vol. 1, no. 1, 2020, pp. 1-10.'
        result = self.parser.parse(ref)
        assert len(result.authors) == 2


class TestMLA8Parser:
    """Test MLA 8th Edition parser (inherits MLA9 but sets different style)."""

    def setup_method(self):
        self.parser = MLA8Parser()

    def test_mla8_journal(self):
        ref = 'Smith, John A. "Machine Learning Applications." Nature Medicine, vol. 26, no. 8, 2020, pp. 1221-1229.'
        result = self.parser.parse(ref)
        assert result.style == CitationStyle.MLA8
        assert result.year == 2020

    def test_mla8_book(self):
        ref = "Sutton, Richard S., and Andrew G. Barto. Reinforcement Learning: An Introduction. MIT Press, 2018."
        result = self.parser.parse(ref)
        assert result.style == CitationStyle.MLA8


class TestMLA9EdgeCases:
    """Test edge cases for MLA9 parser."""

    def setup_method(self):
        self.parser = MLA9Parser()

    def test_partial_parse(self):
        ref = "Some random text without MLA format"
        result = self.parser.parse(ref)
        assert result is not None
        assert result.style == CitationStyle.MLA9
        assert result.parse_confidence <= 0.5

    def test_empty_string(self):
        result = self.parser.parse("")
        assert result is not None

    def test_fixture_all_refs(self, sample_mla_refs):
        """Validate all MLA fixture references parse."""
        for ref_text in sample_mla_refs:
            result = self.parser.parse(ref_text)
            assert result is not None
            assert result.style == CitationStyle.MLA9
