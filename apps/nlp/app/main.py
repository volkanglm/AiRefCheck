"""
AiRefCheck NLP Service - FastAPI Application
Reference parsing, citation style detection, and text analysis.
"""

from contextlib import asynccontextmanager

import structlog
import spacy
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.models.types import HealthResponse

logger = structlog.get_logger()

# Global NLP model
nlp_model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load spaCy models on startup."""
    global nlp_model
    try:
        nlp_model = spacy.load("en_core_web_sm")
        logger.info("spaCy en_core_web_sm loaded")
    except OSError:
        logger.warning("spaCy en_core_web_sm not found, downloading...")
        spacy.cli.download("en_core_web_sm")  # type: ignore
        nlp_model = spacy.load("en_core_web_sm")

    try:
        spacy.load("tr_core_news_md")
        logger.info("spaCy tr_core_news_md loaded")
    except OSError:
        logger.warning("Turkish spaCy model not available, Turkish support may be limited")

    yield
    logger.info("Shutting down NLP service")


app = FastAPI(
    title="AiRefCheck NLP Service",
    description="Academic reference parsing and citation style detection",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="healthy",
        version="0.1.0",
        spacy_loaded=nlp_model is not None,
    )
