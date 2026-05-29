"""
AiRefCheck NLP - API Routes
"""

from fastapi import APIRouter

from app.models.types import (
    ParseRequest,
    ParseResponse,
    StyleDetectRequest,
    StyleDetectResponse,
    FabricationAnalysis,
    FabricationResult,
    ParsedReference,
)
from app.parsers.reference_parser import ReferenceParser
from app.parsers.bibliography_detector import detect_bibliography
from app.detectors.style_detector import StyleDetector
from app.detectors.fabrication_detector import FabricationDetector

router = APIRouter()

# Initialize components
parser = ReferenceParser()
style_detector = StyleDetector()
fabrication_detector = FabricationDetector()


@router.post("/parse", response_model=ParseResponse)
async def parse_references(request: ParseRequest):
    """Parse a list of reference strings into structured data."""
    # Auto-detect style if not provided
    if request.style is None:
        style_result = style_detector.detect(request.references)
        detected_style = style_result.style
        style_confidence = style_result.confidence
    else:
        detected_style = request.style
        style_confidence = 1.0

    # Parse each reference
    parsed_refs = parser.parse_batch(request.references, detected_style)

    successful = sum(1 for r in parsed_refs if r.parse_confidence > 0.3)
    failed = len(parsed_refs) - successful

    return ParseResponse(
        parsed_references=parsed_refs,
        detected_style=detected_style,
        style_confidence=style_confidence,
        total_references=len(request.references),
        successful_parses=successful,
        failed_parses=failed,
    )


@router.post("/detect-style", response_model=StyleDetectResponse)
async def detect_style(request: StyleDetectRequest):
    """Detect citation style from reference samples."""
    result = style_detector.detect(request.references)
    return StyleDetectResponse(
        result=result,
        sample_count=len(request.references),
    )


@router.post("/analyze-fabrication", response_model=FabricationAnalysis)
async def analyze_fabrication(references: list[ParsedReference]):
    """Analyze references for fabrication suspicion."""
    results = [fabrication_detector.analyze(ref) for ref in references]
    suspicious = sum(1 for r in results if r.suspicion_level in ("medium", "high", "critical"))

    return FabricationAnalysis(
        results=results,
        total_analyzed=len(references),
        suspicious_count=suspicious,
    )
