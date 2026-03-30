export * from './types';
export * from './timeline-builder';
export * from './judicial-title-resolver';
export * from './incidence-engine';
export * from './rubric-classifier';
export * from './reflection-engine';
// offset-engine: lib dependency deleted, exports moved to local stubs
export { applyDomainOffsets, type DomainOffsetContext, type DomainPaidItem, type DomainOffsetResult } from './offset-engine';
