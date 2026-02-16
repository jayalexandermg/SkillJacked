export class SkillJackError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'SkillJackError';
  }
}

export class ExtractionError extends SkillJackError {
  constructor(message: string) {
    super(message, 'EXTRACTION_ERROR');
    this.name = 'ExtractionError';
  }
}

export interface TransformErrorDetails {
  kind: 'api' | 'validation' | 'parse' | 'timeout';
  statusCode?: number;
  errorType?: string;
  requestId?: string;
  detail?: string;
}

export class TransformError extends SkillJackError {
  public details?: TransformErrorDetails;
  constructor(message: string, details?: TransformErrorDetails) {
    super(message, 'TRANSFORM_ERROR');
    this.name = 'TransformError';
    this.details = details;
  }
}

export class ValidationError extends SkillJackError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class SegmenterParseError extends TransformError {
  constructor(message: string, public rawOutput: string) {
    super(message);
    this.name = 'SegmenterParseError';
  }
}
