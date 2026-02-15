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

export class TransformError extends SkillJackError {
  constructor(message: string) {
    super(message, 'TRANSFORM_ERROR');
    this.name = 'TransformError';
  }
}

export class ValidationError extends SkillJackError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}
