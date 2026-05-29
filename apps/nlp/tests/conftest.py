"""Shared fixtures for AiRefCheck NLP tests."""

import os
from pathlib import Path

import pytest

from app.models.types import (
    Author,
    CitationStyle,
    FabricationResult,
    ParsedReference,
    ReferenceType,
)
from app.parsers.reference_parser import ReferenceParser
from app.detectors.style_detector import StyleDetector
from app.detectors.fabrication_detector import FabricationDetector


FIXTURES_DIR = Path(__file__).parent / "fixtures"
REFERENCES_DIR = FIXTURES_DIR / "references"
APA7_DIR = REFERENCES_DIR / "apa7"


@pytest.fixture
def parser() -> ReferenceParser:
    """Provide a fresh ReferenceParser instance."""
    return ReferenceParser()


@pytest.fixture
def style_detector() -> StyleDetector:
    """Provide a fresh StyleDetector instance."""
    return StyleDetector()


@pytest.fixture
def fabrication_detector() -> FabricationDetector:
    """Provide a fresh FabricationDetector instance."""
    return FabricationDetector()


@pytest.fixture
def apa7_journal_refs() -> list[str]:
    """Load APA7 journal article fixtures."""
    return _load_fixture_lines(APA7_DIR / "journal_article.txt")


@pytest.fixture
def apa7_book_refs() -> list[str]:
    """Load APA7 book fixtures."""
    return _load_fixture_lines(APA7_DIR / "book.txt")


@pytest.fixture
def apa7_chapter_refs() -> list[str]:
    """Load APA7 book chapter fixtures."""
    return _load_fixture_lines(APA7_DIR / "book_chapter.txt")


@pytest.fixture
def apa7_thesis_refs() -> list[str]:
    """Load APA7 thesis fixtures."""
    return _load_fixture_lines(APA7_DIR / "thesis.txt")


@pytest.fixture
def apa7_web_refs() -> list[str]:
    """Load APA7 web page fixtures."""
    return _load_fixture_lines(APA7_DIR / "web_page.txt")


@pytest.fixture
def apa7_doi_refs() -> list[str]:
    """Load APA7 DOI-included fixtures."""
    return _load_fixture_lines(APA7_DIR / "doi_included.txt")


@pytest.fixture
def apa7_turkish_refs() -> list[str]:
    """Load APA7 Turkish author fixtures."""
    return _load_fixture_lines(APA7_DIR / "turkish_authors.txt")


@pytest.fixture
def apa7_multi_author_refs() -> list[str]:
    """Load APA7 multi-author fixtures."""
    return _load_fixture_lines(APA7_DIR / "multi_author.txt")


def _load_fixture_lines(path: Path) -> list[str]:
    """Load fixture file and return non-empty lines."""
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return lines


# ── Sample reference strings for various styles ──────────────────────────

@pytest.fixture
def sample_ieee_refs() -> list[str]:
    """Provide IEEE-style reference strings."""
    return [
        '[1] A. Krizhevsky, I. Sutskever, and G. E. Hinton, "ImageNet classification with deep convolutional neural networks," Advances in Neural Information Processing Systems, vol. 25, no. 1, pp. 1097-1105, 2012.',
        '[2] Y. LeCun, Y. Bengio, and G. Hinton, "Deep learning," Nature, vol. 521, no. 7553, pp. 436-444, 2015. doi:10.1038/nature14539',
        '[3] J. Devlin, M.-W. Chang, K. Lee, and K. Toutanova, "BERT: Pre-training of deep bidirectional transformers," in Proc. NAACL-HLT, 2019, pp. 4171-4186.',
        '[4] A. Vaswani, N. Shazeer, N. Parmar, and I. Polosukhin, "Attention is all you need," in Proc. NeurIPS, 2017, pp. 5998-6008.',
        '[5] K. He, X. Zhang, S. Ren, and J. Sun, "Deep residual learning for image recognition," in Proc. IEEE CVPR, 2016, pp. 770-778.',
        '[6] I. Goodfellow, J. Pouget-Abadie, M. Mirza, and Y. Bengio, "Generative adversarial nets," Advances in Neural Information Processing Systems, vol. 27, no. 1, pp. 2672-2680, 2014.',
        '[7] T. Brown, B. Mann, and N. Ryder, "Language models are few-shot learners," Advances in Neural Information Processing Systems, vol. 33, no. 1, pp. 1877-1901, 2020.',
        '[8] D. Silver, T. Hubert, and D. Hassabis, "A general reinforcement learning algorithm," Science, vol. 362, no. 6419, pp. 1140-1144, 2018. doi:10.1126/science.aar6404',
        '[9] R. S. Sutton and A. G. Barto, Reinforcement Learning: An Introduction, 2nd ed. MIT Press, 2018.',
        '[10] Y. Bengio, A. Courville, and I. Goodfellow, Deep Learning. MIT Press, 2016.',
    ]


@pytest.fixture
def sample_vancouver_refs() -> list[str]:
    """Provide Vancouver-style reference strings."""
    return [
        "1. Smith JA, Johnson BC. Machine learning applications in healthcare. Nature Medicine. 2023;26(8):1221-1229.",
        "2. LeCun Y, Bengio Y, Hinton GE. Deep learning. Nature. 2015;521(7553):436-444.",
        "3. Vaswani A, Shazeer N, Parmar N. Attention is all you need. Advances in Neural Information Processing Systems. 2017;30:5998-6008.",
        "4. Krizhevsky A, Sutskever I, Hinton GE. ImageNet classification with deep convolutional neural networks. Communications of the ACM. 2012;60(6):84-90.",
        "5. Devlin J, Chang MW, Lee K. BERT: Pre-training of deep bidirectional transformers. Proceedings of NAACL-HLT. 2019;1:4171-4186.",
        "6. Sutton RS, Barto AG. Reinforcement Learning: An Introduction. MIT Press; 2018.",
        "7. Goodfellow I, Pouget-Abadie J, Mirza M. Generative adversarial nets. Advances in Neural Information Processing Systems. 2014;27:2672-2680.",
        "8. He K, Zhang X, Ren S. Deep residual learning for image recognition. Proceedings of IEEE CVPR. 2016;1:770-778.",
        "9. Brown TB, Mann B, Ryder N. Language models are few-shot learners. Advances in Neural Information Processing Systems. 2020;33:1877-1901.",
        "10. World Health Organization. Global health report. WHO Press; 2023.",
    ]


@pytest.fixture
def sample_mla_refs() -> list[str]:
    """Provide MLA9-style reference strings."""
    return [
        'Smith, John A. "Machine Learning Applications in Healthcare." Nature Medicine, vol. 26, no. 8, 2020, pp. 1221-1229.',
        'LeCun, Yann, et al. "Deep Learning." Nature, vol. 521, no. 7553, 2015, pp. 436-444.',
        'Vaswani, Ashish, et al. "Attention Is All You Need." Advances in Neural Information Processing Systems, vol. 30, no. 1, 2017, pp. 5998-6008.',
        'Sutton, Richard S., and Andrew G. Barto. Reinforcement Learning: An Introduction. MIT Press, 2018.',
        'Goodfellow, Ian, et al. Deep Learning. MIT Press, 2016.',
        'Devlin, Jacob, et al. "BERT: Pre-training of Deep Bidirectional Transformers." Proceedings of NAACL-HLT, 2019, pp. 4171-4186.',
        'Russell, Stuart, and Peter Norvig. Artificial Intelligence: A Modern Approach. Pearson, 2020.',
        'Bishop, Christopher M. Pattern Recognition and Machine Learning. Springer, 2006.',
    ]


@pytest.fixture
def sample_chicago_refs() -> list[str]:
    """Provide Chicago Notes-Bibliography reference strings."""
    return [
        'Smith, John A. "Machine Learning Applications in Healthcare." Nature Medicine 26, no. 8 (2020): 1221-1229.',
        'LeCun, Yann, Yoshua Bengio, and Geoffrey Hinton. "Deep Learning." Nature 521, no. 7553 (2015): 436-444.',
        'Sutton, Richard S., and Andrew G. Barto. Reinforcement Learning: An Introduction. Cambridge: MIT Press, 2018.',
        'Goodfellow, Ian, Yoshua Bengio, and Aaron Courville. Deep Learning. Cambridge: MIT Press, 2016.',
        'Russell, Stuart, and Peter Norvig. Artificial Intelligence: A Modern Approach. London: Pearson, 2020.',
        'Bishop, Christopher M. Pattern Recognition and Machine Learning. New York: Springer, 2006.',
        'Mitchell, Tom M. Machine Learning. New York: McGraw-Hill, 1997.',
        'Kahneman, Daniel. Thinking, Fast and Slow. New York: Farrar, Straus and Giroux, 2011.',
    ]


@pytest.fixture
def sample_harvard_refs() -> list[str]:
    """Provide Harvard-style reference strings."""
    return [
        "Smith, J.A. and Johnson, B.C. (2020) 'Machine learning applications in healthcare', Nature Medicine, 26(8), pp. 1221-1229.",
        "LeCun, Y., Bengio, Y. and Hinton, G. (2015) 'Deep learning', Nature, 521(7553), pp. 436-444.",
        "Vaswani, A. et al. (2017) 'Attention is all you need', Advances in Neural Information Processing Systems, 30, pp. 5998-6008.",
        "Sutton, R.S. and Barto, A.G. (2018) Reinforcement learning: an introduction. MIT Press.",
        "Goodfellow, I., Bengio, Y. and Courville, A. (2016) Deep learning. MIT Press.",
        "Devlin, J. et al. (2019) 'BERT: pre-training of deep bidirectional transformers', Proceedings of NAACL-HLT, 2019, pp. 4171-4186.",
        "Russell, S. and Norvig, P. (2020) Artificial intelligence: a modern approach. Pearson.",
        "He, K. et al. (2016) 'Deep residual learning for image recognition', Proceedings of IEEE CVPR, 770(1), pp. 770-778.",
    ]


@pytest.fixture
def sample_ama_refs() -> list[str]:
    """Provide AMA 11th edition reference strings."""
    return [
        "Smith JA, Johnson BC. Machine learning applications in healthcare. Nat Med. 2023;26(8):1221-1229.",
        "LeCun Y, Bengio Y, Hinton GE. Deep learning. Nature. 2015;521(7553):436-444.",
        "Vaswani A, Shazeer N, Parmar N. Attention is all you need. Adv Neural Inf Process Syst. 2017;30:5998-6008.",
        "Devlin J, Chang MW, Lee K. BERT: pre-training of deep bidirectional transformers. Proc NAACL-HLT. 2019;1:4171-4186.",
        "He K, Zhang X, Ren S. Deep residual learning for image recognition. Proc IEEE CVPR. 2016;1:770-778.",
    ]


@pytest.fixture
def sample_acs_refs() -> list[str]:
    """Provide ACS 3rd edition reference strings."""
    return [
        "Smith, J. A.; Johnson, B. C. J. Am. Chem. Soc. 2023, 145, 1221-1229.",
        "LeCun, Y.; Bengio, Y.; Hinton, G. Nature 2015, 521, 436-444.",
        "Kr̆izhevsky, A.; Sutskever, I.; Hinton, G. E. Commun. ACM 2012, 60, 84-90.",
        "Devlin, J.; Chang, M.-W.; Lee, K. Chem. Rev. 2019, 119, 4171-4186.",
        "He, K.; Zhang, X.; Ren, S. Anal. Chem. 2016, 88, 770-778.",
    ]


@pytest.fixture
def sample_cse_refs() -> list[str]:
    """Provide CSE reference strings."""
    return [
        "Smith JA, Johnson BC. Machine learning in healthcare. Nat Med. 2023;26:1221-1229.",
        "LeCun Y, Bengio Y, Hinton GE. Deep learning. Nature. 2015;521:436-444.",
        "Vaswani A, Shazeer N, Parmar N. Attention is all you need. Adv Neural Inf Process Syst. 2017;30:5998-6008.",
        "Devlin J, Chang MW, Lee K. BERT pre-training. Proc NAACL. 2019;1:4171-4186.",
        "He K, Zhang X, Ren S. Deep residual learning. Proc IEEE CVPR. 2016;1:770-778.",
    ]


@pytest.fixture
def sample_asa_refs() -> list[str]:
    """Provide ASA 7th edition reference strings."""
    return [
        'Smith, John A. 2020. "Machine Learning Applications in Healthcare." Nature Medicine 26(8):1221-1229.',
        'LeCun, Yann, Yoshua Bengio, and Geoffrey Hinton. 2015. "Deep Learning." Nature 521(7553):436-444.',
        'Sutton, Richard S. and Andrew G. Barto. 2018. "Reinforcement Learning." Annual Review of Psychology 69(1):115-142.',
        'Devlin, Jacob, Ming-Wei Chang, and Kenton Lee. 2019. "BERT: Pre-training." Proceedings of NAACL 2019(1):4171-4186.',
        'He, Kaiming, Xiangyu Zhang, and Shaoqing Ren. 2016. "Deep Residual Learning." Proc IEEE CVPR 1(1):770-778.',
    ]


@pytest.fixture
def sample_apsa_refs() -> list[str]:
    """Provide APSA 7th edition reference strings."""
    return [
        'Smith, John A. (2020). "Machine Learning Applications in Healthcare." Nature Medicine, 26(8), 1221-1229.',
        'LeCun, Yann, Yoshua Bengio, and Geoffrey Hinton. (2015). "Deep Learning." Nature, 521(7553), 436-444.',
        'Sutton, Richard S. and Andrew G. Barto. (2018). "Reinforcement Learning." American Political Science Review, 112(3), 550-565.',
        'Devlin, Jacob, Ming-Wei Chang, and Kenton Lee. (2019). "BERT: Pre-training." Proceedings of NAACL, 2019(1), 4171-4186.',
        'He, Kaiming, Xiangyu Zhang, and Shaoqing Ren. (2016). "Deep Residual Learning." Proc IEEE CVPR, 1(1), 770-778.',
    ]
