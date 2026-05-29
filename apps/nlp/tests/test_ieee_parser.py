"""
Tests for IEEE reference parser.

Covers journal articles, conference papers, books, DOI variants,
bracket numbering, and edge cases.
"""

import pytest

from app.models.types import CitationStyle, ReferenceType
from app.parsers.patterns.ieee import IEEEParser


class TestIEEEJournalArticles:
    """Test IEEE journal article parsing."""

    def setup_method(self):
        self.parser = IEEEParser()

    def test_basic_journal(self):
        ref = '[1] A. Krizhevsky, I. Sutskever, and G. E. Hinton, "ImageNet classification with deep convolutional neural networks," Advances in Neural Information Processing Systems, vol. 25, no. 1, pp. 1097-1105, 2012.'
        result = self.parser.parse(ref)
        assert result.style == CitationStyle.IEEE
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2012
        assert result.title is not None
        assert "ImageNet" in result.title
        assert result.journal is not None
        assert "Neural Information Processing Systems" in result.journal
        assert result.volume == "25"
        assert result.issue == "1"
        assert result.pages == "1097-1105"
        assert len(result.authors) >= 2
        assert result.parse_confidence >= 0.5

    def test_journal_with_doi(self):
        ref = '[2] Y. LeCun, Y. Bengio, and G. Hinton, "Deep learning," Nature, vol. 521, no. 7553, pp. 436-444, 2015. doi:10.1038/nature14539'
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2015
        assert result.title is not None
        assert "Deep learning" in result.title
        assert result.doi is not None
        assert "10.1038/nature14539" in result.doi
        assert result.journal is not None
        assert "Nature" in result.journal

    def test_journal_generative_adversarial(self):
        ref = '[6] I. Goodfellow, J. Pouget-Abadie, M. Mirza, and Y. Bengio, "Generative adversarial nets," Advances in Neural Information Processing Systems, vol. 27, no. 1, pp. 2672-2680, 2014.'
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2014
        assert result.volume == "27"
        assert result.pages == "2672-2680"

    def test_journal_few_shot(self):
        ref = '[7] T. Brown, B. Mann, and N. Ryder, "Language models are few-shot learners," Advances in Neural Information Processing Systems, vol. 33, no. 1, pp. 1877-1901, 2020.'
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2020
        assert result.volume == "33"

    def test_journal_reinforcement(self):
        ref = '[8] D. Silver, T. Hubert, and D. Hassabis, "A general reinforcement learning algorithm," Science, vol. 362, no. 6419, pp. 1140-1144, 2018. doi:10.1126/science.aar6404'
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2018
        assert result.doi is not None


class TestIEEEConferencePapers:
    """Test IEEE conference paper parsing."""

    def setup_method(self):
        self.parser = IEEEParser()

    def test_basic_conference(self):
        ref = '[3] J. Devlin, M.-W. Chang, K. Lee, and K. Toutanova, "BERT: Pre-training of deep bidirectional transformers," in Proc. NAACL-HLT, 2019, pp. 4171-4186.'
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.CONFERENCE_PAPER
        assert result.year == 2019
        assert result.title is not None
        assert "BERT" in result.title
        assert result.book_title is not None
        assert result.pages == "4171-4186"

    def test_conference_attention(self):
        ref = '[4] A. Vaswani, N. Shazeer, N. Parmar, and I. Polosukhin, "Attention is all you need," in Proc. NeurIPS, 2017, pp. 5998-6008.'
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.CONFERENCE_PAPER
        assert result.year == 2017
        assert result.title is not None
        assert "Attention" in result.title

    def test_conference_resnet(self):
        ref = '[5] K. He, X. Zhang, S. Ren, and J. Sun, "Deep residual learning for image recognition," in Proc. IEEE CVPR, 2016, pp. 770-778.'
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.CONFERENCE_PAPER
        assert result.year == 2016
        assert result.pages == "770-778"


class TestIEEEBooks:
    """Test IEEE book parsing."""

    def setup_method(self):
        self.parser = IEEEParser()

    def test_book_with_edition(self):
        ref = '[9] R. S. Sutton and A. G. Barto, Reinforcement Learning: An Introduction, 2nd ed. MIT Press, 2018.'
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.BOOK
        assert result.year == 2018
        assert result.title is not None
        assert result.publisher is not None
        assert "MIT Press" in result.publisher

    def test_book_no_edition(self):
        ref = '[10] Y. Bengio, A. Courville, and I. Goodfellow, Deep Learning. MIT Press, 2016.'
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.BOOK
        assert result.year == 2016
        assert result.publisher is not None


class TestIEEEAuthorParsing:
    """Test IEEE author name parsing."""

    def setup_method(self):
        self.parser = IEEEParser()

    def test_single_author(self):
        ref = '[1] A. Smith, "A paper title," Journal, vol. 1, no. 1, pp. 1-10, 2020.'
        result = self.parser.parse(ref)
        assert len(result.authors) >= 1
        assert result.authors[0].last_name == "Smith"

    def test_two_authors(self):
        ref = '[1] A. Smith and B. Jones, "Title," Journal, vol. 1, no. 1, pp. 1-10, 2020.'
        result = self.parser.parse(ref)
        assert len(result.authors) == 2
        assert result.authors[0].last_name == "Smith"
        assert result.authors[1].last_name == "Jones"

    def test_three_authors(self):
        ref = '[1] A. Smith, B. Jones, and C. Lee, "Title," Journal, vol. 1, no. 1, pp. 1-10, 2020.'
        result = self.parser.parse(ref)
        assert len(result.authors) == 3


class TestIEEEEdgeCases:
    """Test edge cases for IEEE parser."""

    def setup_method(self):
        self.parser = IEEEParser()

    def test_partial_parse_no_bracket(self):
        ref = "Some random text without IEEE format"
        result = self.parser.parse(ref)
        assert result is not None
        assert result.style == CitationStyle.IEEE
        assert result.parse_confidence <= 0.5

    def test_partial_parse_with_bracket_and_year(self):
        ref = "[5] Some text with a year 2020."
        result = self.parser.parse(ref)
        assert result is not None
        assert result.year == 2020

    def test_partial_parse_extracts_quoted_title(self):
        ref = '[99] A. Author, "This is a quoted title," and some more text.'
        result = self.parser.parse(ref)
        assert result.title is not None
        assert "quoted title" in result.title

    def test_empty_string(self):
        result = self.parser.parse("")
        assert result is not None

    def test_high_numbered_ref(self):
        ref = '[42] A. B. Smith and C. D. Jones, "A study on deep learning," IEEE Trans. Neural Networks, vol. 15, no. 3, pp. 500-512, 2021.'
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2021

    def test_fixture_all_refs(self, sample_ieee_refs):
        """Validate all IEEE fixture references parse."""
        for ref_text in sample_ieee_refs:
            result = self.parser.parse(ref_text)
            assert result is not None
            assert result.style == CitationStyle.IEEE
