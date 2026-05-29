"""
AiRefCheck - Fabrication Detector
Analyzes references for signs of fabrication.
"""

import re
from datetime import datetime

from app.models.types import ParsedReference, FabricationResult, FabricationReason


class FabricationDetector:
    """Detects potentially fabricated references."""

    def analyze(self, ref: ParsedReference) -> FabricationResult:
        reasons: list[FabricationReason] = []
        suspicion_score = 0.0

        # 1. Year check
        if ref.year:
            current_year = datetime.now().year
            if ref.year > current_year + 1:
                reasons.append(FabricationReason(
                    type="year_anomaly", severity="warning",
                    description=f"Yıl gelecekte: {ref.year}",
                    evidence=f"Mevcut yıl: {current_year}, referans yılı: {ref.year}",
                ))
                suspicion_score += 15

            if ref.year < 1800:
                reasons.append(FabricationReason(
                    type="year_anomaly", severity="info",
                    description=f"Çok eski yıl: {ref.year}",
                    evidence=f"Referans yılı: {ref.year}",
                ))
                suspicion_score += 5

        # 2. DOI format check
        if ref.doi:
            if not re.match(r"^10\.\d{4,}/", ref.doi):
                reasons.append(FabricationReason(
                    type="invalid_doi", severity="warning",
                    description="DOI formatı geçersiz",
                    evidence=f"DOI: {ref.doi}",
                ))
                suspicion_score += 20

        # 3. URL check
        if ref.url:
            if not ref.url.startswith(("http://", "https://")):
                reasons.append(FabricationReason(
                    type="url_anomaly", severity="warning",
                    description="URL formatı geçersiz",
                    evidence=f"URL: {ref.url}",
                ))
                suspicion_score += 10

        # 4. Missing essential fields
        missing = []
        if not ref.authors:
            missing.append("yazar")
        if not ref.year:
            missing.append("yıl")
        if not ref.title:
            missing.append("başlık")

        if missing:
            reasons.append(FabricationReason(
                type="missing_fields", severity="info",
                description=f"Eksik alanlar: {', '.join(missing)}",
                evidence="Parse edilen referansta kritik alanlar boş",
            ))
            suspicion_score += len(missing) * 5

        # 5. Very short or very long reference
        if len(ref.raw_text) < 20:
            reasons.append(FabricationReason(
                type="length_anomaly", severity="warning",
                description="Referans çok kısa",
                evidence=f"Uzunluk: {len(ref.raw_text)} karakter",
            ))
            suspicion_score += 15

        # 6. Parse confidence
        if ref.parse_confidence < 0.3:
            reasons.append(FabricationReason(
                type="parse_failure", severity="warning",
                description="Referans ayrıştırılamadı",
                evidence=f"Güven skoru: {ref.parse_confidence:.2f}",
            ))
            suspicion_score += 20

        # Determine suspicion level
        if suspicion_score >= 50:
            level = "critical"
        elif suspicion_score >= 30:
            level = "high"
        elif suspicion_score >= 15:
            level = "medium"
        elif suspicion_score >= 5:
            level = "low"
        else:
            level = "none"

        recommendations = []
        if level in ("high", "critical"):
            recommendations.append("Bu referans manuel olarak kontrol edilmeli")
        if ref.doi:
            recommendations.append(f"DOI doğrulaması yapın: {ref.doi}")

        return FabricationResult(
            suspicion_level=level,
            suspicion_score=min(suspicion_score, 100),
            reasons=reasons,
            recommendations=recommendations,
        )
