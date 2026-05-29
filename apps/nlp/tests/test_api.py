"""
Tests for FastAPI endpoints.

Uses httpx.AsyncClient and pytest-asyncio to test API routes
without requiring external services.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    """Provide an async HTTP test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ── Health endpoint ───────────────────────────────────────────────────────

class TestHealthEndpoint:
    """Test GET /health endpoint."""

    @pytest.mark.asyncio
    async def test_health_returns_200(self, client):
        response = await client.get("/health")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_health_response_structure(self, client):
        response = await client.get("/health")
        data = response.json()
        assert "status" in data
        assert "version" in data
        assert data["status"] == "healthy"
        assert data["version"] == "0.1.0"

    @pytest.mark.asyncio
    async def test_health_has_spacy_field(self, client):
        response = await client.get("/health")
        data = response.json()
        assert "spacy_loaded" in data
        assert isinstance(data["spacy_loaded"], bool)


# ── Parse endpoint ────────────────────────────────────────────────────────

class TestParseEndpoint:
    """Test POST /api/v1/parse endpoint."""

    @pytest.mark.asyncio
    async def test_parse_apa7(self, client):
        payload = {
            "references": [
                "Smith, J. A., & Jones, B. C. (2020). Machine learning applications. Nature Medicine, 26(8), 1221-1229."
            ],
            "style": "apa7",
        }
        response = await client.post("/api/v1/parse", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "parsed_references" in data
        assert "detected_style" in data
        assert "total_references" in data
        assert data["total_references"] == 1
        assert data["detected_style"] == "apa7"
        assert data["style_confidence"] == 1.0

    @pytest.mark.asyncio
    async def test_parse_auto_detect(self, client):
        payload = {
            "references": [
                '[1] A. Smith, "Deep learning," Nature, vol. 521, no. 1, pp. 436-444, 2020.',
                '[2] B. Jones, "AI review," Science, vol. 300, no. 2, pp. 50-60, 2021.',
            ],
        }
        response = await client.post("/api/v1/parse", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["total_references"] == 2
        assert "detected_style" in data
        assert "parsed_references" in data
        assert len(data["parsed_references"]) == 2

    @pytest.mark.asyncio
    async def test_parse_batch(self, client):
        payload = {
            "references": [
                "Smith, J. A. (2020). Paper one. Nature, 26(8), 1221-1229.",
                "Jones, B. C. (2019). Paper two. Science, 150(3), 300-310.",
            ],
            "style": "apa7",
        }
        response = await client.post("/api/v1/parse", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["total_references"] == 2
        assert data["successful_parses"] + data["failed_parses"] == 2

    @pytest.mark.asyncio
    async def test_parse_response_structure(self, client):
        payload = {
            "references": ["Smith, J. A. (2020). A paper. Nature, 1(1), 1-10."],
            "style": "apa7",
        }
        response = await client.post("/api/v1/parse", json=payload)
        data = response.json()
        assert "parsed_references" in data
        assert "detected_style" in data
        assert "style_confidence" in data
        assert "total_references" in data
        assert "successful_parses" in data
        assert "failed_parses" in data

    @pytest.mark.asyncio
    async def test_parse_parsed_ref_structure(self, client):
        payload = {
            "references": [
                "Smith, J. A., & Jones, B. C. (2020). Machine learning applications. Nature Medicine, 26(8), 1221-1229. https://doi.org/10.1038/s41591-020-1040-9"
            ],
            "style": "apa7",
        }
        response = await client.post("/api/v1/parse", json=payload)
        data = response.json()
        ref = data["parsed_references"][0]
        assert "raw_text" in ref
        assert "authors" in ref
        assert "year" in ref
        assert "title" in ref
        assert "style" in ref
        assert "parse_confidence" in ref

    @pytest.mark.asyncio
    async def test_parse_invalid_empty_list(self, client):
        """Empty references list should be rejected by Pydantic (min_length=1)."""
        payload = {"references": []}
        response = await client.post("/api/v1/parse", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_parse_missing_references(self, client):
        payload = {"style": "apa7"}
        response = await client.post("/api/v1/parse", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_parse_ieee_style(self, client):
        payload = {
            "references": [
                '[1] A. Smith, "Deep learning," Nature, vol. 521, no. 1, pp. 436-444, 2020.'
            ],
            "style": "ieee",
        }
        response = await client.post("/api/v1/parse", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["detected_style"] == "ieee"


# ── Detect-style endpoint ────────────────────────────────────────────────

class TestDetectStyleEndpoint:
    """Test POST /api/v1/detect-style endpoint."""

    @pytest.mark.asyncio
    async def test_detect_ieee(self, client):
        payload = {
            "references": [
                '[1] A. Smith, "Title," Journal, vol. 5, no. 2, pp. 10-20, 2020.',
                '[2] B. Jones, "Another," Conference, 2021, pp. 30-40.',
            ]
        }
        response = await client.post("/api/v1/detect-style", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert "sample_count" in data
        assert data["sample_count"] == 2
        assert "style" in data["result"]
        assert "confidence" in data["result"]

    @pytest.mark.asyncio
    async def test_detect_apa(self, client):
        payload = {
            "references": [
                "Smith, J. A. (2020). Machine learning. Nature, 26(8), 1221-1229.",
                "Jones, B. C. (2019). Deep learning. Science, 150(3), 300-310.",
            ]
        }
        response = await client.post("/api/v1/detect-style", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["result"]["style"] is not None

    @pytest.mark.asyncio
    async def test_detect_empty_list_rejected(self, client):
        payload = {"references": []}
        response = await client.post("/api/v1/detect-style", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_detect_response_structure(self, client):
        payload = {
            "references": [
                "Smith, J. A. (2020). Paper. Nature, 1(1), 1-10."
            ]
        }
        response = await client.post("/api/v1/detect-style", json=payload)
        data = response.json()
        assert "result" in data
        assert "style" in data["result"]
        assert "confidence" in data["result"]
        assert "detected_styles" in data["result"]


# ── Analyze-fabrication endpoint ──────────────────────────────────────────

class TestAnalyzeFabricationEndpoint:
    """Test POST /api/v1/analyze-fabrication endpoint."""

    @pytest.mark.asyncio
    async def test_analyze_single_ref(self, client):
        payload = [
            {
                "raw_text": "Smith, J. A. (2020). Machine learning. Nature, 26(8), 1221-1229.",
                "authors": [{"last_name": "Smith", "first_name": "J. A.", "is_corporate": False}],
                "year": 2020,
                "title": "Machine learning",
                "journal": "Nature",
                "volume": "26",
                "issue": "8",
                "pages": "1221-1229",
                "type": "journal_article",
                "parse_confidence": 0.85,
                "style": "apa7",
                "warnings": [],
                "metadata": {},
            }
        ]
        response = await client.post("/api/v1/analyze-fabrication", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert "total_analyzed" in data
        assert "suspicious_count" in data
        assert data["total_analyzed"] == 1
        assert len(data["results"]) == 1

    @pytest.mark.asyncio
    async def test_analyze_suspicious_ref(self, client):
        payload = [
            {
                "raw_text": "Short",
                "year": 2099,
                "doi": "bad-doi",
                "type": "other",
                "parse_confidence": 0.1,
                "style": "unknown",
                "warnings": [],
                "metadata": {},
            }
        ]
        response = await client.post("/api/v1/analyze-fabrication", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["suspicious_count"] >= 0
        result = data["results"][0]
        assert "suspicion_level" in result
        assert "suspicion_score" in result

    @pytest.mark.asyncio
    async def test_analyze_batch(self, client):
        payload = [
            {
                "raw_text": "Smith, J. A. (2020). Good paper. Nature, 26(8), 1221-1229.",
                "authors": [{"last_name": "Smith", "first_name": "J. A.", "is_corporate": False}],
                "year": 2020,
                "title": "Good paper",
                "type": "journal_article",
                "parse_confidence": 0.85,
                "style": "apa7",
                "warnings": [],
                "metadata": {},
            },
            {
                "raw_text": "Bad",
                "year": 2099,
                "type": "other",
                "parse_confidence": 0.05,
                "style": "unknown",
                "warnings": [],
                "metadata": {},
            },
        ]
        response = await client.post("/api/v1/analyze-fabrication", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["total_analyzed"] == 2
        assert len(data["results"]) == 2

    @pytest.mark.asyncio
    async def test_analyze_result_structure(self, client):
        payload = [
            {
                "raw_text": "Test reference",
                "year": 2020,
                "type": "other",
                "parse_confidence": 0.5,
                "style": "apa7",
                "warnings": [],
                "metadata": {},
            }
        ]
        response = await client.post("/api/v1/analyze-fabrication", json=payload)
        data = response.json()
        result = data["results"][0]
        assert "suspicion_level" in result
        assert "suspicion_score" in result
        assert "reasons" in result
        assert "recommendations" in result
