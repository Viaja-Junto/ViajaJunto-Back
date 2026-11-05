export abstract class DomainError extends Error {
  constructor(readonly detail: string | string[]) {
    super(Array.isArray(detail) ? detail.join('; ') : detail);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {}

export class ForbiddenError extends DomainError {}

export class ConflictError extends DomainError {}

export class InvalidInputError extends DomainError {}

export class UnauthorizedError extends DomainError {}

export class UnavailableError extends DomainError {}
