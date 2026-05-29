"""Pydantic models for the AiRefCheck NLP service."""

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class CitationStyle(str, Enum):
    """Supported citation styles."""

    APA7 = "apa7"
    APA6 = "apa6"
    MLA9 = "mla9"
    MLA8 = "mla8"
    CHICAGO_NB = "chicago-nb"
    CHICAGO_AD = "chicago-ad"
    IEEE = "ieee"
    VANCOUVER = "vancouver"
    HARVARD = "harvard"
    AMA11 = "ama11"
    ACS3 = "acs3"
    CSE = "cse"
    ASA7 = "asa7"
    APSA7 = "apsa7"
    TURABIAN9 = "turabian9"
    MIXED = "mixed"
    UNKNOWN = "unknown"


class ReferenceType(str, Enum):
    """Types of academic references."""

    JOURNAL_ARTICLE = "journal_article"
    BOOK = "book"
    BOOK_CHAPTER = "book_chapter"
    CONFERENCE_PAPER = "conference_paper"
    THESIS = "thesis"
    DISSERTATION = "dissertation"
    TECHNICAL_REPORT = "technical_report"
    WEB_PAGE = "web_page"
    ONLINE_RESOURCE = "online_resource"
    NEWSPAPER_ARTICLE = "newspaper_article"
    MAGAZINE_ARTICLE = "magazine_article"
    FILM = "film"
    INTERVIEW = "interview"
    LEGAL_DOCUMENT = "legal_document"
    PATENT = "patent"
    PREPRINT = "preprint"
    DATASET = "dataset"
    SOFTWARE = "software"
    OTHER = "other"


class Author(BaseModel):
    """Represents an author of a reference."""

    last_name: str = Field(..., description="Author's last name")
    first_name: str | None = Field(None, description="Author's first name or initials")
    is_corporate: bool = Field(False, description="Whether this is a corporate author")

    def __str__(self) -> str:
        if self.first_name:
            return f"{self.last_name}, {self.first_name}"
        return self.last_name


class ParsedReference(BaseModel):
    """A fully parsed academic reference."""

    id: str = Field(default="", description="Unique identifier")
    raw_text: str = Field(..., description="Original unparsed reference text")
    authors: list[Author] = Field(default_factory=list, description="List of authors")
    year: int | None = Field(None, description="Publication year")
    title: str | None = Field(None, description="Article or book title")
    journal: str | None = Field(None, description="Journal name")
    book_title: str | None = Field(None, description="Book title for chapters")
    publisher: str | None = Field(None, description="Publisher name")
    volume: str | None = Field(None, description="Volume number")
    issue: str | None = Field(None, description="Issue number")
    pages: str | None = Field(None, description="Page range")
    doi: str | None = Field(None, description="DOI identifier")
    url: str | None = Field(None, description="URL for online resources")
    isbn: str | None = Field(None, description="ISBN for books")
    type: ReferenceType = Field(default=ReferenceType.OTHER, description="Reference type")
    parse_confidence: float = Field(
        default=0.0, ge=0.0, le=1.0, description="Confidence score of parsing (0.0-1.0)"
    )
    style: CitationStyle = Field(
        default=CitationStyle.UNKNOWN, description="Detected citation style"
    )
    warnings: list[str] = Field(default_factory=list, description="Parsing warnings")
    metadata: dict[str, Any] = Field(
        default_factory=dict, description="Additional style-specific metadata"
    )


class StyleMatchResult(BaseModel):
    """Result of citation style detection."""

    style: CitationStyle = Field(..., description="Detected citation style")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence")
    detected_styles: list[dict[str, Any]] = Field(
        default_factory=list, description="Top matching styles with scores"
    )
    warning: str | None = Field(None, description="Warning message for mixed styles")


class InTextCitation(BaseModel):
    """Represents an in-text citation found in document body."""

    text: str = Field(..., description="Raw citation text")
    style: CitationStyle = Field(..., description="Expected citation style")
    authors: list[str] = Field(default_factory=list, description="Author names if applicable")
    year: int | None = Field(None, description="Year if applicable")
    number: int | None = Field(None, description="Citation number for numeric styles")
    page: str | None = Field(None, description="Page number if applicable")
    start_pos: int = Field(..., description="Start position in text")
    end_pos: int = Field(..., description="End position in text")


class ParseRequest(BaseModel):
    """Request model for reference parsing endpoint."""

    references: list[str] = Field(..., min_length=1, description="List of reference strings to parse")
    style: CitationStyle | None = Field(None, description="Citation style (auto-detect if null)")
    language: str = Field(default="auto", description="Document language")


class ParseResponse(BaseModel):
    """Response model for reference parsing endpoint."""

    parsed_references: list[ParsedReference] = Field(
        default_factory=list, description="Parsed references"
    )
    detected_style: CitationStyle = Field(..., description="Detected or provided style")
    style_confidence: float = Field(..., ge=0.0, le=1.0, description="Style detection confidence")
    total_references: int = Field(..., description="Total number of references processed")
    successful_parses: int = Field(..., description="Number of successfully parsed references")
    failed_parses: int = Field(..., description="Number of failed parses")


class StyleDetectRequest(BaseModel):
    """Request model for style detection endpoint."""

    references: list[str] = Field(..., min_length=1, description="Sample references for detection")


class StyleDetectResponse(BaseModel):
    """Response model for style detection endpoint."""

    result: StyleMatchResult = Field(..., description="Detection result")
    sample_count: int = Field(..., description="Number of references analyzed")


class FabricationReason(BaseModel):
    """Reason for fabrication suspicion."""

    type: str = Field(..., description="Suspicion type")
    description: str = Field(..., description="Human-readable explanation")
    severity: str = Field(..., description="Severity: info, warning, error")
    evidence: str = Field(..., description="Supporting evidence")


class FabricationResult(BaseModel):
    """Result of fabrication analysis for a single reference."""

    suspicion_level: str = Field(..., description="none, low, medium, high, critical")
    suspicion_score: float = Field(..., ge=0.0, le=100.0, description="Suspicion score 0-100")
    reasons: list[FabricationReason] = Field(default_factory=list, description="Suspicion reasons")
    recommendations: list[str] = Field(default_factory=list, description="Recommendations")


class FabricationAnalysis(BaseModel):
    """Batch fabrication analysis result."""

    results: list[FabricationResult] = Field(default_factory=list)
    total_analyzed: int = Field(...)
    suspicious_count: int = Field(...)


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = Field(...)
    version: str = Field(...)
    spacy_loaded: bool = Field(default=False)
