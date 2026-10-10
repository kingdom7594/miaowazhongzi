import Ajv, { type ErrorObject } from 'ajv';
import draftSchema from '../../../docs/contracts/draft.schema.json';
import contentBriefSchema from '../../../docs/contracts/contentBrief.schema.json';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const ajv = new Ajv({ allErrors: true, strict: false });
const draftValidator = ajv.compile(draftSchema);
const contentBriefValidator = ajv.compile(contentBriefSchema);

function formatErrors(errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message ?? ''}`.trim());
}

/** Validate an object against docs/contracts/draft.schema.json. */
export function validateDraft(data: unknown): ValidationResult {
  const valid = draftValidator(data) as boolean;
  return { valid, errors: valid ? [] : formatErrors(draftValidator.errors) };
}

/** Validate an object against docs/contracts/contentBrief.schema.json. */
export function validateContentBrief(data: unknown): ValidationResult {
  const valid = contentBriefValidator(data) as boolean;
  return { valid, errors: valid ? [] : formatErrors(contentBriefValidator.errors) };
}
