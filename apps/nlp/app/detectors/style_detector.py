"""
AiRefCheck - Citation Style Detector
Automatically detects citation style from reference samples.
"""

import re
from app.models.types import CitationStyle, StyleMatchResult


class StyleDetector:
    """Detects citation style by analyzing structural patterns."""

    # Signature patterns for each style
    SIGNATURES = {
        CitationStyle.IEEE: {
            "starts_with_bracket": r"^\[\d+\]",
            "vol_no_pp": r"vol\.\s*\d+",
            "quoted_title": r'"[^"]+",',
            "weight": 3.0,
        },
        CitationStyle.VANCOUVER: {
            "starts_with_dot_num": r"^\d+\.\s",
            "semicolon_year_vol": r"\d{4};\d+",
            "compact_author": r"[A-Z]{2,}",
            "weight": 3.0,
        },
        CitationStyle.APA7: {
            "author_year_parens": r"[A-Z][a-z]+.*?\(\d{4}\)",
            "ampersand": r"&",
            "doi_org": r"https?://doi\.org/",
            "weight": 2.0,
        },
        CitationStyle.APA6: {
            "author_year_parens": r"[A-Z][a-z]+.*?\(\d{4}\)",
            "doi_no_url": r"doi:\s*10\.",
            "weight": 1.5,
        },
        CitationStyle.MLA9: {
            "quoted_title": r'"[^"]+"\.?',
            "vol_no_pp": r"vol\.\s*\d+.*?no\.\s*\d+",
            "pp_period": r"pp\.\s*\d+",
            "weight": 2.5,
        },
        CitationStyle.CHICAGO_NB: {
            "place_colon_pub": r"[^:]+:\s*[^,]+,\s*\d{4}",
            "no_paren_year": r"[^(]*\d{4}",
            "weight": 2.0,
        },
        CitationStyle.HARVARD: {
            "single_quote_title": r"'[^']+'",
            "year_in_parens": r"\(\d{4}\)",
            "pp_pages": r"pp\.\s*\d+",
            "weight": 2.5,
        },
        CitationStyle.AMA11: {
            "compact_author": r"[A-Z]{2,}",
            "year_semicolon_vol": r"\d{4};\d+",
            "weight": 2.0,
        },
    }

    def detect(self, references: list[str]) -> StyleMatchResult:
        """Detect citation style from a list of references."""
        if not references:
            return StyleMatchResult(
                style=CitationStyle.UNKNOWN, confidence=0.0,
                warning="No references provided",
            )

        scores: dict[CitationStyle, float] = {}

        for style, sigs in self.SIGNATURES.items():
            score = 0.0
            weight = sigs.get("weight", 1.0)

            for key, pattern in sigs.items():
                if key == "weight":
                    continue
                matches = sum(1 for ref in references if re.search(pattern, ref))
                ratio = matches / len(references)
                score += ratio * weight

            scores[style] = score

        if not scores or max(scores.values()) == 0:
            return StyleMatchResult(style=CitationStyle.UNKNOWN, confidence=0.0)

        # Sort by score
        sorted_styles = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        best_style, best_score = sorted_styles[0]

        # Normalize confidence
        max_possible = sum(s.get("weight", 1.0) * len([k for k in s if k != "weight"]) for s in self.SIGNATURES.values()) / len(self.SIGNATURES)
        confidence = min(best_score / max(max_possible, 1), 1.0) if max_possible > 0 else 0.0

        # Check for mixed styles
        if confidence < 0.3:
            return StyleMatchResult(
                style=CitationStyle.MIXED, confidence=confidence,
                detected_styles=[{"style": s.value, "score": round(sc, 3)} for s, sc in sorted_styles[:3]],
                warning="Kaynakça birden fazla stil içeriyor olabilir",
            )

        return StyleMatchResult(
            style=best_style,
            confidence=round(confidence, 3),
            detected_styles=[{"style": s.value, "score": round(sc, 3)} for s, sc in sorted_styles[:3]],
        )
