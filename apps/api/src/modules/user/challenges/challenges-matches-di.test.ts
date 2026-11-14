import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { MATCHES_SERVICE } from '../matches/matches.tokens.js';
import { ChallengesService } from './challenges.service.js';

/** Nest stores these on the class; avoid importing deep Nest paths in tests. */
const SELF_DECLARED_DEPS_METADATA = 'self:paramtypes';
const OPTIONAL_DEPS_METADATA = 'optional:paramtypes';

/**
 * Contest credit after a habit finish depends on MatchesService. Marking that
 * injection optional used to let Nest boot with matches === undefined and
 * silently drop board credit.
 */
describe('ChallengesService ↔ MatchesService DI', () => {
  it('requires MATCHES_SERVICE and does not mark it optional', () => {
    const selfDeps =
      (Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, ChallengesService) as
        | { index: number; param: unknown }[]
        | undefined) ?? [];
    const optionalIndexes =
      (Reflect.getMetadata(OPTIONAL_DEPS_METADATA, ChallengesService) as number[] | undefined) ??
      [];

    const matchesDep = selfDeps.find((dep) => {
      const param = dep.param;
      if (param === MATCHES_SERVICE) {
        return true;
      }
      if (
        typeof param === 'object' &&
        param !== null &&
        'forwardRef' in param &&
        typeof (param as { forwardRef: () => unknown }).forwardRef === 'function'
      ) {
        return (param as { forwardRef: () => unknown }).forwardRef() === MATCHES_SERVICE;
      }
      return false;
    });

    expect(matchesDep).toBeDefined();
    expect(optionalIndexes).not.toContain(matchesDep!.index);
  });
});
