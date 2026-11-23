/**
 * Small infrastructure ports. Injecting them (instead of calling `new Date()`
 * or `crypto` directly) keeps services deterministic and easy to test.
 */
export interface Clock {
  now(): Date;
}

export interface TokenGenerator {
  generate(): string;
}

export const systemClock: Clock = {
  now: () => new Date(),
};
