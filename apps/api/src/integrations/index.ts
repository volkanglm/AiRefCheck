/**
 * AiRefCheck - Integration Exports
 */

export { BaseApiClient, IntegrationResult, ParsedRef } from "./base-client";
export { CrossRefClient } from "./crossref";
export { SemanticScholarClient } from "./semantic-scholar";
export { OpenAlexClient } from "./openalex";
export { PubMedClient } from "./pubmed";
export { ArxivClient } from "./arxiv";
export { OrcidClient } from "./orcid";
export { SpringerClient } from "./springer";
export { PlosClient } from "./plos";
export { GutenbergClient } from "./gutenberg";
export { ValidatorPipeline, PipelineResult } from "./validator-pipeline";
export { GeminiService } from "./gemini-service";
export type { GeminiParsedRef, GeminiSearchQuery } from "./gemini-service";
