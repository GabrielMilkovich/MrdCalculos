/**
 * =====================================================
 * CANONICAL CASE INPUT — BARREL EXPORT
 * =====================================================
 */

export * from './types';
export { validateCanonicalInput } from './validator';
export { resolveCanonicalInput, type ResolverSources } from './resolver';
export { generateConfidenceReport } from './confidence-report';
export {
  RUBRIC_CATALOG,
  findCanonicalRubric,
  compareRubrics,
  mapToCanonical,
  type CanonicalRubric,
} from './rubric-taxonomy';
