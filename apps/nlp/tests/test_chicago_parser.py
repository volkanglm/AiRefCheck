"""
Tests for Chicago Notes-Bibliography and Author-Date parsers.

Covers books, journal articles, author parsing, and edge cases.
"""

import pytest

from app.models.types import CitationStyle, ReferenceType
from app.parsers.patterns.chicago import ChicagoNBParser, ChicagoADParser


class TestChicagoNBJournals:
    """Test Chicago Notes-Bibliography journal parsing."""

    def setup_method(self):
        self.parser = ChicagoNBParser()

    def test_basic_journal(self):
        ref = 'Smith, John A. "Machine Learning Applications in Healthcare." Nature Medicine 26, no. 8 (2020): 1221-1229.'
        result = self.parser.parse(ref)
        assert result.style == CitationStyle.CHICAGO_NB
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

    def test_journal_deep_learning(self):
        ref = 'LeCun, Yann, Yoshua Bengio, and Geoffrey Hinton. "Deep Learning." Nature 521, no. 7553 (2015): 436-444.'
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2015
        assert result.volume == "521"
        assert result.issue == "7553"
        assert result.pages == "436-444"
        assert len(result.authors) >= 2


class TestChicagoNBBooks:
    """Test Chicago NB book parsing."""

    def setup_method(self):
        self.parser = ChicagoNBParser()

    def test_basic_book(self):
        ref = "Sutton, Richard S., and Andrew G. Barto. Reinforcement Learning: An Introduction. Cambridge: MIT Press, 2018."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.BOOK
        assert result.year == 2018
        assert result.title is not None
        assert "Reinforcement Learning" in result.title
        assert result.publisher is not None
        assert "MIT Press" in result.publisher

    def test_book_three_authors(self):
        ref = "Goodfellow, Ian, Yoshua Bengio, and Aaron Courville. Deep Learning. Cambridge: MIT Press, 2016."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.BOOK
        assert result.year == 2016
        assert result.publisher is not None
        assert "MIT Press" in result.publisher

    def test_book_ai_modern(self):
        ref = "Russell, Stuart, and Peter Norvig. Artificial Intelligence: A Modern Approach. London: Pearson, 2020."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.BOOK
        assert result.year == 2020
        assert result.publisher is not None
        assert "Pearson" in result.publisher

    def test_book_single_author(self):
        ref = "Bishop, Christopher M. Pattern Recognition and Machine Learning. New York: Springer, 2006."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.BOOK
        assert result.year == 2006

    def test_book_mitchell(self):
        ref = "Mitchell, Tom M. Machine Learning. New York: McGraw-Hill, 1997."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.BOOK
        assert result.year == 1997
        assert result.publisher is not None

    def test_book_kahneman(self):
        ref = "Kahneman, Daniel. Thinking, Fast and Slow. New York: Farrar, Straus and Giroux, 2011."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.BOOK
        assert result.year == 2011


class TestChicagoNBAuthorParsing:
    """Test Chicago NB author name parsing."""

    def setup_method(self):
        self.parser = ChicagoNBParser()

    def test_single_author(self):
        ref = "Smith, John. A Study on AI. Chicago: University Press, 2020."
        result = self.parser.parse(ref)
        assert len(result.authors) >= 1
        assert result.authors[0].last_name == "Smith"

    def test_two_authors_with_and(self):
        ref = "Smith, John, and Mary Jones. A Study on AI. Chicago: University Press, 2020."
        result = self.parser.parse(ref)
        assert len(result.authors) == 2

    def test_three_authors(self):
        ref = "LeCun, Yann, Yoshua Bengio, and Geoffrey Hinton. Deep Learning. Cambridge: MIT Press, 2016."
        result = self.parser.parse(ref)
        assert len(result.authors) == 3


class TestChicagoADParser:
    """Test Chicago Author-Date parser (inherits NB but sets different style)."""

    def setup_method(self):
        self.parser = ChicagoADParser()

    def test_ad_journal(self):
        ref = 'Smith, John A. "Machine Learning Applications." Nature Medicine 26, no. 8 (2020): 1221-1229.'
        result = self.parser.parse(ref)
        assert result.style == CitationStyle.CHICAGO_AD
        assert result.year == 2020

    def test_ad_book(self):
        ref = "Bishop, Christopher M. Pattern Recognition and Machine Learning. New York: Springer, 2006."
        result = self.parser.parse(ref)
        assert result.style == CitationStyle.CHICAGO_AD


class TestChicagoNBEdgeCases:
    """Test edge cases for Chicago NB parser."""

    def setup_method(self):
        self.parser = ChicagoNBParser()

    def test_partial_parse(self):
        ref = "Random text without Chicago format"
        result = self.parser.parse(ref)
        assert result is not None
        assert result.style == CitationStyle.CHICAGO_NB
        assert result.parse_confidence <= 0.5

    def test_empty_string(self):
        result = self.parser.parse("")
        assert result is not None

    def test_fixture_all_refs(self, sample_chicago_refs):
        """Validate all Chicago fixture references parse."""
        for ref_text in sample_chicago_refs:
            result = self.parser.parse(ref_text)
            assert result is not None
            assert result.style == CitationStyle.CHICAGO_NB
