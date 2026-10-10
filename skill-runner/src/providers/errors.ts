export type ProviderErrorCode =
  | 'submit_failed'
  | 'poll_timeout'
  | 'task_failed'
  | 'content_empty'
  | 'download_failed'
  | 'not_configured'
  | 'quota_exceeded';

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly detail?: unknown;

  constructor(code: ProviderErrorCode, message: string, detail?: unknown) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.detail = detail;
  }
}
