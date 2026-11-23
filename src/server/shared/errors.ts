/**
 * Application errors.
 *
 * Services throw these instead of framework-specific errors so the core stays
 * independent from Next.js. The presentation layer (server actions / pages)
 * translates them into HTTP responses or form states.
 */
export abstract class AppError extends Error {
  abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export type FieldErrors = Record<string, string[]>;

export class ValidationError extends AppError {
  readonly code = "VALIDATION_ERROR";

  constructor(
    message: string,
    readonly fieldErrors: FieldErrors = {},
  ) {
    super(message);
  }
}

/**
 * Also used when the user is not allowed to *see* a resource, so we never
 * leak the existence of trips the user does not belong to.
 */
export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND";

  constructor(resource: string) {
    super(`${resource} no encontrado`);
  }
}

export class ForbiddenError extends AppError {
  readonly code = "FORBIDDEN";

  constructor(message = "No tenés permisos para realizar esta acción") {
    super(message);
  }
}

export class BusinessRuleError extends AppError {
  readonly code = "BUSINESS_RULE";

  constructor(message: string) {
    super(message);
  }
}
