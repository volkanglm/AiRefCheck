"""
Tests for AMA 11th, ACS 3rd, CSE, ASA 7th, and APSA 7th parsers.

Each style has at least 5 reference test cases.
"""

import pytest

from app.models.types import CitationStyle, ReferenceType
from app.parsers.patterns.ama_acs_cse_asa_apsa import (
    AMA11Parser,
    ACS3Parser,
    CSEParser,
    ASA7Parser,
    APSA7Parser,
)


# ══════════════════════════════════════════════════════════════════════════
# AMA 11th Edition
# ══════════════════════════════════════════════════════════════════════════

class TestAMA11Parser:
    """Test AMA 11th Edition parser."""

    def setup_method(self):
        self.parser = AMA11Parser()

    def test_basic_journal(self):
        ref = "Smith JA, Johnson BC. Machine learning applications in healthcare. Nat Med. 2023;26(8):1221-1229."
        result = self.parser.parse(ref)
        assert result.style == CitationStyle.AMA11
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2023
        assert result.title is not None
        assert "Machine learning" in result.title
        assert result.journal is not None
        assert result.volume == "26"
        assert result.issue == "8"
        assert result.pages == "1221-1229"
        assert len(result.authors) >= 2
        assert result.parse_confidence >= 0.5

    def test_deep_learning(self):
        ref = "LeCun Y, Bengio Y, Hinton GE. Deep learning. Nature. 2015;521(7553):436-444."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2015
        assert result.journal is not None
        assert "Nature" in result.journal

    def test_attention_paper(self):
        ref = "Vaswani A, Shazeer N, Parmar N. Attention is all you need. Adv Neural Inf Process Syst. 2017;30:5998-6008."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2017

    def test_bert_paper(self):
        ref = "Devlin J, Chang MW, Lee K. BERT: pre-training of deep bidirectional transformers. Proc NAACL-HLT. 2019;1:4171-4186."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2019

    def test_residual_learning(self):
        ref = "He K, Zhang X, Ren S. Deep residual learning for image recognition. Proc IEEE CVPR. 2016;1:770-778."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2016

    def test_partial_parse(self):
        ref = "Some random AMA-like text 2021."
        result = self.parser.parse(ref)
        assert result is not None
        assert result.style == CitationStyle.AMA11
        assert result.parse_confidence <= 0.5

    def test_empty_string(self):
        result = self.parser.parse("")
        assert result is not None


# ══════════════════════════════════════════════════════════════════════════
# ACS 3rd Edition
# ══════════════════════════════════════════════════════════════════════════

class TestACS3Parser:
    """Test ACS 3rd Edition parser."""

    def setup_method(self):
        self.parser = ACS3Parser()

    def test_basic_journal(self):
        ref = "Smith, J. A.; Johnson, B. C. J. Am. Chem. Soc. 2023, 145, 1221-1229."
        result = self.parser.parse(ref)
        assert result.style == CitationStyle.ACS3
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2023
        assert result.journal is not None
        assert result.volume == "145"
        assert result.pages == "1221-1229"

    def test_nature_paper(self):
        ref = "LeCun, Y.; Bengio, Y.; Hinton, G. Nature 2015, 521, 436-444."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2015

    def test_cacm_paper(self):
        ref = "Križhevsky, A.; Sutskever, I.; Hinton, G. E. Commun. ACM 2012, 60, 84-90."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2012

    def test_chem_review(self):
        ref = "Devlin, J.; Chang, M.-W.; Lee, K. Chem. Rev. 2019, 119, 4171-4186."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2019

    def test_anal_chem(self):
        ref = "He, K.; Zhang, X.; Ren, S. Anal. Chem. 2016, 88, 770-778."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2016

    def test_partial_parse(self):
        ref = "Non-ACS format text 2020."
        result = self.parser.parse(ref)
        assert result is not None
        assert result.style == CitationStyle.ACS3
        assert result.parse_confidence <= 0.5

    def test_empty_string(self):
        result = self.parser.parse("")
        assert result is not None


# ══════════════════════════════════════════════════════════════════════════
# CSE (Council of Science Editors)
# ══════════════════════════════════════════════════════════════════════════

class TestCSEParser:
    """Test CSE parser."""

    def setup_method(self):
        self.parser = CSEParser()

    def test_basic_journal(self):
        ref = "Smith JA, Johnson BC. Machine learning in healthcare. Nat Med. 2023;26:1221-1229."
        result = self.parser.parse(ref)
        assert result.style == CitationStyle.CSE
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2023
        assert result.title is not None
        assert result.journal is not None
        assert result.volume == "26"
        assert result.pages == "1221-1229"

    def test_deep_learning(self):
        ref = "LeCun Y, Bengio Y, Hinton GE. Deep learning. Nature. 2015;521:436-444."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2015

    def test_attention(self):
        ref = "Vaswani A, Shazeer N, Parmar N. Attention is all you need. Adv Neural Inf Process Syst. 2017;30:5998-6008."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2017

    def test_bert(self):
        ref = "Devlin J, Chang MW, Lee K. BERT pre-training. Proc NAACL. 2019;1:4171-4186."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2019

    def test_residual(self):
        ref = "He K, Zhang X, Ren S. Deep residual learning. Proc IEEE CVPR. 2016;1:770-778."
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2016

    def test_partial_parse(self):
        ref = "Not a CSE reference 2021."
        result = self.parser.parse(ref)
        assert result is not None
        assert result.parse_confidence <= 0.5


# ══════════════════════════════════════════════════════════════════════════
# ASA 7th Edition
# ══════════════════════════════════════════════════════════════════════════

class TestASA7Parser:
    """Test ASA 7th Edition parser."""

    def setup_method(self):
        self.parser = ASA7Parser()

    def test_basic_journal(self):
        ref = 'Smith, John A. 2020. "Machine Learning Applications in Healthcare." Nature Medicine 26(8):1221-1229.'
        result = self.parser.parse(ref)
        assert result.style == CitationStyle.ASA7
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2020
        assert result.title is not None
        assert "Machine Learning" in result.title
        assert result.journal is not None
        assert result.volume == "26"
        assert result.issue == "8"
        assert result.pages == "1221-1229"

    def test_deep_learning(self):
        ref = 'LeCun, Yann, Yoshua Bengio, and Geoffrey Hinton. 2015. "Deep Learning." Nature 521(7553):436-444.'
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2015

    def test_reinforcement(self):
        ref = 'Sutton, Richard S. and Andrew G. Barto. 2018. "Reinforcement Learning." Annual Review of Psychology 69(1):115-142.'
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2018

    def test_bert(self):
        ref = 'Devlin, Jacob, Ming-Wei Chang, and Kenton Lee. 2019. "BERT: Pre-training." Proceedings of NAACL 2019(1):4171-4186.'
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2019

    def test_residual(self):
        ref = 'He, Kaiming, Xiangyu Zhang, and Shaoqing Ren. 2016. "Deep Residual Learning." Proc IEEE CVPR 1(1):770-778.'
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2016

    def test_partial_parse(self):
        ref = "Not ASA format 2020."
        result = self.parser.parse(ref)
        assert result is not None
        assert result.parse_confidence <= 0.5


# ══════════════════════════════════════════════════════════════════════════
# APSA 7th Edition
# ══════════════════════════════════════════════════════════════════════════

class TestAPSA7Parser:
    """Test APSA 7th Edition parser."""

    def setup_method(self):
        self.parser = APSA7Parser()

    def test_basic_journal(self):
        ref = 'Smith, John A. (2020). "Machine Learning Applications in Healthcare." Nature Medicine, 26(8), 1221-1229.'
        result = self.parser.parse(ref)
        assert result.style == CitationStyle.APSA7
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2020
        assert result.title is not None
        assert "Machine Learning" in result.title
        assert result.journal is not None
        assert result.volume == "26"
        assert result.issue == "8"
        assert result.pages == "1221-1229"

    def test_deep_learning(self):
        ref = 'LeCun, Yann, Yoshua Bengio, and Geoffrey Hinton. (2015). "Deep Learning." Nature, 521(7553), 436-444.'
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2015

    def test_political_science(self):
        ref = 'Sutton, Richard S. and Andrew G. Barto. (2018). "Reinforcement Learning." American Political Science Review, 112(3), 550-565.'
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2018

    def test_bert(self):
        ref = 'Devlin, Jacob, Ming-Wei Chang, and Kenton Lee. (2019). "BERT: Pre-training." Proceedings of NAACL, 2019(1), 4171-4186.'
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2019

    def test_residual(self):
        ref = 'He, Kaiming, Xiangyu Zhang, and Shaoqing Ren. (2016). "Deep Residual Learning." Proc IEEE CVPR, 1(1), 770-778.'
        result = self.parser.parse(ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2016

    def test_partial_parse(self):
        ref = "Not APSA format (2020)."
        result = self.parser.parse(ref)
        assert result is not None
        assert result.parse_confidence <= 0.5


# ══════════════════════════════════════════════════════════════════════════
# Cross-style fixture validation
# ══════════════════════════════════════════════════════════════════════════

class TestFixtureValidation:
    """Validate all sample fixtures from conftest parse correctly."""

    def test_ama_fixtures(self, sample_ama_refs):
        parser = AMA11Parser()
        for ref_text in sample_ama_refs:
            result = parser.parse(ref_text)
            assert result is not None
            assert result.style == CitationStyle.AMA11

    def test_acs_fixtures(self, sample_acs_refs):
        parser = ACS3Parser()
        for ref_text in sample_acs_refs:
            result = parser.parse(ref_text)
            assert result is not None
            assert result.style == CitationStyle.ACS3

    def test_cse_fixtures(self, sample_cse_refs):
        parser = CSEParser()
        for ref_text in sample_cse_refs:
            result = parser.parse(ref_text)
            assert result is not None
            assert result.style == CitationStyle.CSE

    def test_asa_fixtures(self, sample_asa_refs):
        parser = ASA7Parser()
        for ref_text in sample_asa_refs:
            result = parser.parse(ref_text)
            assert result is not None
            assert result.style == CitationStyle.ASA7

    def test_apsa_fixtures(self, sample_apsa_refs):
        parser = APSA7Parser()
        for ref_text in sample_apsa_refs:
            result = parser.parse(ref_text)
            assert result is not None
            assert result.style == CitationStyle.APSA7
