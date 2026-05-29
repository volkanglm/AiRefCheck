"""
Tests for APA 6th & 7th Edition reference parsers.

Covers journal articles, books, book chapters, theses, web pages,
DOI-included, Turkish authors, multi-author references, and edge cases.
"""

import pytest

from app.models.types import CitationStyle, ReferenceType
from app.parsers.patterns.apa import APA7Parser, APA6Parser


# ── Helpers ───────────────────────────────────────────────────────────────

def _parse(parser: APA7Parser, text: str):
    return parser.parse(text)


# ── Journal Articles ──────────────────────────────────────────────────────

class TestAPA7JournalArticles:
    """Test APA7 journal article parsing."""

    def setup_method(self):
        self.parser = APA7Parser()

    def test_basic_journal_article(self):
        ref = "Smith, J. A., & Jones, B. C. (2020). Machine learning applications in healthcare: A systematic review. Nature Medicine, 26(8), 1221-1229. https://doi.org/10.1038/s41591-020-1040-9"
        result = _parse(self.parser, ref)
        assert result.style == CitationStyle.APA7
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2020
        assert result.title is not None
        assert "Machine learning" in result.title
        assert result.journal is not None
        assert "Nature Medicine" in result.journal
        assert result.volume == "26"
        assert result.issue == "8"
        assert result.pages == "1221-1229"
        assert result.doi == "10.1038/s41591-020-1040-9"
        assert len(result.authors) >= 2
        assert result.parse_confidence >= 0.5

    def test_journal_article_no_doi(self):
        ref = "Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, L., & Polosukhin, I. (2017). Attention is all you need. Advances in Neural Information Processing Systems, 30, 5998-6008."
        result = _parse(self.parser, ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2017
        assert result.title is not None
        assert "Attention" in result.title
        assert result.journal is not None
        assert result.volume == "30"
        assert result.pages == "5998-6008"
        assert result.doi is None

    def test_journal_article_many_authors(self):
        ref = "Silver, D., Hubert, T., Schrittwieser, J., Antonoglou, I., Lai, M., Guez, A., Lanctot, M., Sifre, L., Kumaran, D., Graepel, T., Lillicrap, T., Simonyan, K., & Hassabis, D. (2018). A general reinforcement learning algorithm that masters chess, shogi, and Go through self-play. Science, 362(6419), 1140-1144. https://doi.org/10.1126/science.aar6404"
        result = _parse(self.parser, ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2018
        assert result.journal is not None
        assert "Science" in result.journal
        assert result.doi is not None
        assert "10.1126/science.aar6404" in result.doi

    def test_journal_article_lecun_2015(self):
        ref = "LeCun, Y., Bengio, Y., & Hinton, G. (2015). Deep learning. Nature, 521(7553), 436-444. https://doi.org/10.1038/nature14539"
        result = _parse(self.parser, ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2015
        assert result.title is not None
        assert "Deep learning" in result.title
        assert result.volume == "521"
        assert result.issue == "7553"
        assert result.pages == "436-444"

    def test_journal_article_mcculloch_1943(self):
        ref = "McCulloch, W. S., & Pitts, W. (1943). A logical calculus of the ideas immanent in nervous activity. The Bulletin of Mathematical Biophysics, 5(4), 115-133. https://doi.org/10.1007/BF02459570"
        result = _parse(self.parser, ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 1943
        assert result.pages == "115-133"
        assert len(result.authors) >= 2

    def test_journal_article_without_issue(self):
        ref = "Krizhevsky, A., Sutskever, I., & Hinton, G. E. (2012). ImageNet classification with deep convolutional neural networks. Advances in Neural Information Processing Systems, 25, 1097-1105."
        result = _parse(self.parser, ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2012
        assert result.volume == "25"
        assert result.pages == "1097-1105"

    def test_journal_article_doi_only(self):
        ref = "He, K., Zhang, X., Ren, S., & Sun, J. (2016). Deep residual learning for image recognition. Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, 770-778. https://doi.org/10.1109/CVPR.2016.90"
        result = _parse(self.parser, ref)
        assert result.year == 2016
        assert result.doi is not None

    def test_journal_article_rumelhart_1986(self):
        ref = "Rumelhart, D. E., Hinton, G. E., & Williams, R. J. (1986). Learning representations by back-propagating errors. Nature, 323(6088), 533-536. https://doi.org/10.1038/323533a0"
        result = _parse(self.parser, ref)
        assert result.year == 1986
        assert result.volume == "323"
        assert result.issue == "6088"
        assert result.pages == "533-536"


# ── Books ─────────────────────────────────────────────────────────────────

class TestAPA7Books:
    """Test APA7 book parsing."""

    def setup_method(self):
        self.parser = APA7Parser()

    def test_basic_book(self):
        ref = "Sutton, R. S., & Barto, A. G. (2018). Reinforcement learning: An introduction (2nd ed.). MIT Press."
        result = _parse(self.parser, ref)
        assert result.type == ReferenceType.BOOK
        assert result.year == 2018
        assert result.title is not None
        assert "Reinforcement learning" in result.title
        assert result.publisher is not None
        assert "MIT Press" in result.publisher
        assert len(result.authors) >= 2

    def test_book_three_authors(self):
        ref = "Goodfellow, I., Bengio, Y., & Courville, A. (2016). Deep learning. MIT Press."
        result = _parse(self.parser, ref)
        assert result.type == ReferenceType.BOOK
        assert result.year == 2016
        assert result.publisher is not None
        assert "MIT Press" in result.publisher

    def test_book_fourth_edition(self):
        ref = "Russell, S., & Norvig, P. (2020). Artificial intelligence: A modern approach (4th ed.). Pearson."
        result = _parse(self.parser, ref)
        assert result.type == ReferenceType.BOOK
        assert result.year == 2020
        assert result.publisher is not None
        assert "Pearson" in result.publisher

    def test_book_single_author(self):
        ref = "Bishop, C. M. (2006). Pattern recognition and machine learning. Springer."
        result = _parse(self.parser, ref)
        assert result.type == ReferenceType.BOOK
        assert result.year == 2006
        assert result.publisher is not None
        assert "Springer" in result.publisher

    def test_book_kahneman(self):
        ref = "Kahneman, D. (2011). Thinking, fast and slow. Farrar, Straus and Giroux."
        result = _parse(self.parser, ref)
        assert result.type == ReferenceType.BOOK
        assert result.year == 2011
        assert result.title is not None
        assert "Thinking" in result.title

    def test_book_mitchell(self):
        ref = "Mitchell, T. M. (1997). Machine learning. McGraw-Hill."
        result = _parse(self.parser, ref)
        assert result.type == ReferenceType.BOOK
        assert result.year == 1997
        assert result.publisher is not None

    def test_book_with_edition(self):
        ref = "Duda, R. O., Hart, P. E., & Stork, D. G. (2001). Pattern classification (2nd ed.). Wiley."
        result = _parse(self.parser, ref)
        assert result.type == ReferenceType.BOOK
        assert result.year == 2001


# ── Book Chapters ─────────────────────────────────────────────────────────

class TestAPA7BookChapters:
    """Test APA7 book chapter parsing."""

    def setup_method(self):
        self.parser = APA7Parser()

    def test_basic_chapter(self):
        ref = "Vasquez, M., & Chen, H. (2022). Deep learning for medical imaging. In A. Kumar & B. Singh (Eds.), Medical image analysis: Methods and applications (pp. 145-189). Academic Press."
        result = _parse(self.parser, ref)
        assert result.type == ReferenceType.BOOK_CHAPTER
        assert result.year == 2022
        assert result.title is not None
        assert "Deep learning" in result.title
        assert result.book_title is not None
        assert result.pages == "145-189"
        assert result.publisher is not None

    def test_chapter_with_doi(self):
        ref = "Zhang, Y., & Rodriguez, A. (2021). Neural networks for natural language processing. In J. Smith (Ed.), Handbook of computational linguistics (pp. 302-345). Springer."
        result = _parse(self.parser, ref)
        assert result.type == ReferenceType.BOOK_CHAPTER
        assert result.year == 2021
        assert result.pages == "302-345"

    def test_chapter_healthcare(self):
        ref = "Robinson, A., & Chung, S. (2019). Machine learning in healthcare. In H. Zhang (Ed.), Healthcare data analytics (pp. 89-112). Wiley."
        result = _parse(self.parser, ref)
        assert result.type == ReferenceType.BOOK_CHAPTER
        assert result.year == 2019
        assert result.pages == "89-112"


# ── Theses ────────────────────────────────────────────────────────────────

class TestAPA7Theses:
    """Test APA7 thesis / dissertation parsing."""

    def setup_method(self):
        self.parser = APA7Parser()

    def test_doctoral_dissertation(self):
        ref = "Yilmaz, M. (2023). Artificial intelligence supported education systems: A case study in Turkish universities [Doctoral dissertation, Ankara University]. YOK Thesis Database."
        result = _parse(self.parser, ref)
        assert result.type in (ReferenceType.THESIS, ReferenceType.DISSERTATION)
        assert result.year == 2023
        assert result.title is not None

    def test_masters_thesis(self):
        ref = "Kaya, E. (2021). Machine learning applications in Turkish language processing [Master's thesis, Middle East Technical University]. METU Library Archive."
        result = _parse(self.parser, ref)
        assert result.type == ReferenceType.THESIS
        assert result.year == 2021


# ── Web Pages ─────────────────────────────────────────────────────────────

class TestAPA7WebPages:
    """Test APA7 web page parsing."""

    def setup_method(self):
        self.parser = APA7Parser()

    def test_web_page_with_date(self):
        ref = "World Health Organization. (2023, March 15). Global health report 2023. https://www.who.int/health-topics/global-health"
        result = _parse(self.parser, ref)
        assert result.type == ReferenceType.WEB_PAGE
        assert result.year == 2023
        assert result.url is not None
        assert "who.int" in result.url

    def test_web_page_no_date(self):
        ref = "OpenAI. (2024). GPT-4 technical report. https://openai.com/research/gpt-4"
        result = _parse(self.parser, ref)
        assert result.type == ReferenceType.WEB_PAGE
        assert result.year == 2024
        assert result.url is not None
        assert "openai.com" in result.url

    def test_web_page_ec(self):
        ref = "European Commission. (2022, September). Digital education action plan 2021-2027. https://education.ec.europa.eu/"
        result = _parse(self.parser, ref)
        assert result.type == ReferenceType.WEB_PAGE
        assert result.year == 2022


# ── Turkish Authors ───────────────────────────────────────────────────────

class TestAPA7TurkishAuthors:
    """Test APA7 with Turkish author names."""

    def setup_method(self):
        self.parser = APA7Parser()

    def test_turkish_journal_ref(self):
        ref = "Yilmaz, O., & Demir, A. (2020). Turkiye'de yazilim gelistirme endustrisinin durumu. Bilgisayar Muhendisligi Dergisi, 15(2), 45-62."
        result = _parse(self.parser, ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2020
        assert len(result.authors) >= 2
        assert result.volume == "15"
        assert result.issue == "2"

    def test_turkish_three_authors(self):
        ref = "Cengiz, M. A., Kaya, F. R., & Ozturk, B. (2019). Yapay zeka algoritmalarinin Turkce metin siniflandirmasinda kullanimi. Istanbul Universitesi Bilgisayar Bilimleri Dergisi, 8(1), 23-38."
        result = _parse(self.parser, ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2019
        assert len(result.authors) >= 2

    def test_turkish_with_special_chars(self):
        ref = "Acar, S., Gunes, H., & Yildirim, E. (2021). Derin ogrenme yontemleri ile akilli sistem tasarimi. Ankara Universitesi Mühendislik Fakültesi Dergisi, 36(4), 112-129."
        result = _parse(self.parser, ref)
        assert result.year == 2021
        assert result.volume == "36"


# ── Multi-Author ──────────────────────────────────────────────────────────

class TestAPA7MultiAuthor:
    """Test APA7 with many authors."""

    def setup_method(self):
        self.parser = APA7Parser()

    def test_five_authors(self):
        ref = "Wang, J., Zhang, L., Chen, X., Li, M., & Liu, H. (2022). Multi-task learning for natural language understanding. Journal of Machine Learning Research, 23(1), 1-25."
        result = _parse(self.parser, ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2022
        assert len(result.authors) >= 2

    def test_six_authors(self):
        ref = "Zhang, H., Wang, Y., Li, J., Chen, S., Liu, M., & Yang, K. (2020). Graph neural networks for social network analysis. ACM Computing Surveys, 53(3), 1-35. https://doi.org/10.1145/3389434"
        result = _parse(self.parser, ref)
        assert result.type == ReferenceType.JOURNAL_ARTICLE
        assert result.year == 2020
        assert result.doi is not None


# ── APA 6th Edition ──────────────────────────────────────────────────────

class TestAPA6Parser:
    """Test APA 6th Edition parser (inherits APA7 but sets different style)."""

    def setup_method(self):
        self.parser = APA6Parser()

    def test_apa6_journal(self):
        ref = "Smith, J. A., & Jones, B. C. (2020). Machine learning applications in healthcare. Nature Medicine, 26(8), 1221-1229."
        result = _parse(self.parser, ref)
        assert result.style == CitationStyle.APA6
        assert result.year == 2020

    def test_apa6_book(self):
        ref = "Bishop, C. M. (2006). Pattern recognition and machine learning. Springer."
        result = _parse(self.parser, ref)
        assert result.style == CitationStyle.APA6
        assert result.year == 2006


# ── Edge Cases ────────────────────────────────────────────────────────────

class TestAPA7EdgeCases:
    """Test edge cases and unusual formatting."""

    def setup_method(self):
        self.parser = APA7Parser()

    def test_partial_parse_garbage(self):
        ref = "This is not a valid reference at all 12345"
        result = _parse(self.parser, ref)
        # Should still return a ParsedReference, possibly with partial parse
        assert result is not None
        assert result.raw_text == ref
        assert result.parse_confidence <= 0.5

    def test_missing_year(self):
        ref = "Smith, J. A. Machine learning applications. Nature Medicine, 26(8), 1221-1229."
        result = _parse(self.parser, ref)
        assert result is not None
        assert result.raw_text == ref

    def test_very_short_reference(self):
        ref = "Smith (2020)"
        result = _parse(self.parser, ref)
        assert result is not None
        assert result.raw_text == ref

    def test_empty_string(self):
        result = _parse(self.parser, "")
        assert result is not None

    def test_whitespace_only(self):
        result = _parse(self.parser, "   \n\t  ")
        assert result is not None

    def test_doi_extraction(self):
        ref = "Devlin, J., Chang, M.-W., Lee, K., & Toutanova, K. (2019). BERT: Pre-training of deep bidirectional transformers for language understanding. Proceedings of the 2019 Conference of the North American Chapter of the Association for Computational Linguistics, 4171-4186. https://doi.org/10.18653/v1/N19-1423"
        result = _parse(self.parser, ref)
        assert result.doi is not None
        assert "10.18653/v1/N19-1423" in result.doi

    def test_year_extraction(self):
        ref = "Hopfield, J. J. (1982). Neural networks and physical systems with emergent collective computational abilities. Proceedings of the National Academy of Sciences, 79(8), 2554-2558. https://doi.org/10.1073/pnas.79.8.2554"
        result = _parse(self.parser, ref)
        assert result.year == 1982

    def test_fixture_journal_articles(self, apa7_journal_refs):
        """Validate all journal article fixtures parse."""
        for ref_text in apa7_journal_refs:
            result = _parse(self.parser, ref_text)
            assert result is not None
            assert result.raw_text == ref_text
            assert result.year is not None

    def test_fixture_books(self, apa7_book_refs):
        """Validate all book fixtures parse."""
        for ref_text in apa7_book_refs:
            result = _parse(self.parser, ref_text)
            assert result is not None

    def test_fixture_turkish(self, apa7_turkish_refs):
        """Validate Turkish author fixtures parse."""
        for ref_text in apa7_turkish_refs:
            result = _parse(self.parser, ref_text)
            assert result is not None
            assert result.year is not None
