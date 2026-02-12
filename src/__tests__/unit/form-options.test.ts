import { describe, expect, it } from 'bun:test';

import { COLOR_OPTIONS, MODEL_SUBMODELS, TRANSMISSION_OPTIONS } from '@/lib/form-options';

describe('form options', () => {
  it('has non-empty option lists', () => {
    expect(Object.keys(MODEL_SUBMODELS).length).toBeGreaterThan(0);
    expect(TRANSMISSION_OPTIONS.length).toBeGreaterThan(0);
    expect(COLOR_OPTIONS.length).toBeGreaterThan(0);
  });

  it('every model has at least one submodel', () => {
    for (const [model, submodels] of Object.entries(MODEL_SUBMODELS)) {
      expect(model.length).toBeGreaterThan(0);
      expect(Array.isArray(submodels)).toBe(true);
      expect(submodels.length).toBeGreaterThan(0);
    }
  });
});
