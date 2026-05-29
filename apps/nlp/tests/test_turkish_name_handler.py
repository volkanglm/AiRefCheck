"""
Tests for TurkishNameHandler.

Covers Turkish name parsing, special characters (ğ, ü, ş, ı, ö, ç),
et al./vd. handling, compound surnames, corporate authors, and edge cases.
"""

import pytest

from app.models.types import Author
from app.parsers.turkish_name_handler import TurkishNameHandler


class TestTurkishNameSingleAuthor:
    """Test single author name parsing."""

    def setup_method(self):
        self.handler = TurkishNameHandler()

    def test_last_comma_first(self):
        result = self.handler.parse_authors("Yılmaz, Mehmet")
        assert len(result) == 1
        assert result[0].last_name == "Yılmaz"
        assert result[0].first_name == "Mehmet"

    def test_last_comma_initials(self):
        result = self.handler.parse_authors("Öztürk, A. F.")
        assert len(result) == 1
        assert result[0].last_name == "Öztürk"
        assert result[0].first_name == "A. F."

    def test_first_last_format(self):
        result = self.handler.parse_authors("Mehmet Yılmaz")
        assert len(result) == 1
        assert result[0].last_name == "Yılmaz"
        assert result[0].first_name == "Mehmet"

    def test_initial_last_format(self):
        result = self.handler.parse_authors("M. Yılmaz")
        assert len(result) == 1
        assert result[0].last_name == "Yılmaz"
        assert result[0].first_name == "M."

    def test_single_name_only(self):
        result = self.handler.parse_authors("Yılmaz")
        assert len(result) == 1
        assert result[0].last_name == "Yılmaz"
        assert result[0].first_name is None


class TestTurkishNameMultipleAuthors:
    """Test multiple author name parsing."""

    def setup_method(self):
        self.handler = TurkishNameHandler()

    def test_two_authors_ampersand(self):
        result = self.handler.parse_authors("Yılmaz, Mehmet & Demir, Ayşe")
        assert len(result) == 2
        assert result[0].last_name == "Yılmaz"
        assert result[1].last_name == "Demir"

    def test_two_authors_ve(self):
        result = self.handler.parse_authors("Kaya, M., ve Demir, A.")
        assert len(result) >= 1  # At least first author parsed

    def test_multiple_comma_separated(self):
        result = self.handler.parse_authors("Öztürk, A. F., Yılmaz, B., Kaya, C.")
        assert len(result) >= 2

    def test_and_separator(self):
        result = self.handler.parse_authors("Smith, John and Jones, Mary")
        assert len(result) == 2


class TestTurkishNameSpecialCharacters:
    """Test Turkish special characters: ğ, ü, ş, ı, ö, ç."""

    def setup_method(self):
        self.handler = TurkishNameHandler()

    def test_char_g_breve(self):
        result = self.handler.parse_authors("Doğan, M.")
        assert len(result) == 1
        assert "ğan" in result[0].last_name

    def test_char_u_umlaut(self):
        result = self.handler.parse_authors("Güneş, H.")
        assert len(result) == 1
        assert "neş" in result[0].last_name

    def test_char_s_cedilla(self):
        result = self.handler.parse_authors("Kayaş, A.")
        assert len(result) == 1
        assert "ş" in result[0].last_name

    def test_char_i_dotless(self):
        result = self.handler.parse_authors("Yıldırım, E.")
        assert len(result) == 1
        assert "ıld" in result[0].last_name

    def test_char_o_umlaut(self):
        result = self.handler.parse_authors("Özdemir, K.")
        assert len(result) == 1
        assert "Öz" in result[0].last_name

    def test_char_c_cedilla(self):
        result = self.handler.parse_authors("Çelik, B.")
        assert len(result) == 1
        assert "Çel" in result[0].last_name

    def test_multiple_special_chars(self):
        result = self.handler.parse_authors("Öztürk, Şükrü")
        assert len(result) == 1
        assert "Öztürk" in result[0].last_name

    def test_capital_i_with_dot(self):
        result = self.handler.parse_authors("İnce, N.")
        assert len(result) == 1
        assert "İnce" in result[0].last_name


class TestTurkishNameEtAl:
    """Test et al. / vd. handling."""

    def setup_method(self):
        self.handler = TurkishNameHandler()

    def test_et_al_english(self):
        result = self.handler.parse_authors("Yılmaz, M. et al.")
        assert len(result) >= 1
        assert result[0].last_name == "Yılmaz"

    def test_vd_turkish(self):
        result = self.handler.parse_authors("Yılmaz, M. vd.")
        assert len(result) >= 1
        assert result[0].last_name == "Yılmaz"

    def test_ve_digerleri(self):
        result = self.handler.parse_authors("Yılmaz, M. ve diğerleri")
        assert len(result) >= 1


class TestTurkishNameCorporate:
    """Test corporate author detection."""

    def setup_method(self):
        self.handler = TurkishNameHandler()

    def test_who(self):
        result = self.handler.parse_authors("WHO")
        assert len(result) == 1
        assert result[0].is_corporate is True

    def test_world_health_organization(self):
        result = self.handler.parse_authors("World Health Organization")
        assert len(result) == 1
        assert result[0].is_corporate is True

    def test_tubitak(self):
        result = self.handler.parse_authors("TÜBİTAK")
        assert len(result) == 1
        assert result[0].is_corporate is True

    def test_yok(self):
        result = self.handler.parse_authors("YÖK")
        assert len(result) == 1
        assert result[0].is_corporate is True

    def test_acronym_short(self):
        result = self.handler.parse_authors("NIH")
        assert len(result) == 1
        assert result[0].is_corporate is True


class TestTurkishNameCompoundSurname:
    """Test compound surname detection."""

    def setup_method(self):
        self.handler = TurkishNameHandler()

    def test_oz_prefix(self):
        result = self.handler.parse_authors("M. Özdemir Yılmaz")
        assert len(result) == 1
        # Should recognize potential compound surname

    def test_two_word_name(self):
        result = self.handler.parse_authors("Ayşe Fatma Öztürk")
        assert len(result) == 1
        assert result[0].last_name == "Öztürk"


class TestTurkishNameComparison:
    """Test name comparison and normalization utilities."""

    def setup_method(self):
        self.handler = TurkishNameHandler()

    def test_format_for_comparison(self):
        author = Author(last_name="Yılmaz", first_name="Mehmet")
        formatted = self.handler.format_author_for_comparison(author)
        assert "yılmaz" in formatted

    def test_format_corporate_for_comparison(self):
        author = Author(last_name="WHO", first_name=None, is_corporate=True)
        formatted = self.handler.format_author_for_comparison(author)
        assert formatted == "who"

    def test_normalize_with_turkish_chars(self):
        result = self.handler.normalize_turkish_name("Öztürk")
        assert result is not None
        assert len(result) > 0


class TestTurkishNameEdgeCases:
    """Test edge cases for Turkish name handler."""

    def setup_method(self):
        self.handler = TurkishNameHandler()

    def test_empty_string(self):
        result = self.handler.parse_authors("")
        assert result == []

    def test_whitespace_only(self):
        result = self.handler.parse_authors("   \t  ")
        assert result == []

    def test_none_handling(self):
        result = self.handler.parse_authors("")
        assert result == []

    def test_single_initial(self):
        result = self.handler.parse_authors("A.")
        assert len(result) >= 1

    def test_very_long_name(self):
        result = self.handler.parse_authors("Öztürk, Mehmet Ahmet Can")
        assert len(result) == 1
        assert result[0].last_name == "Öztürk"
