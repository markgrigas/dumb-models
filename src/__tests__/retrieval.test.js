import { describe, it, expect } from 'vitest';
import { search } from '../rag/retrieval.js';

describe('search()', () => {
  it('returns 5 results by default', () => {
    const results = search('sphere');
    expect(results).toHaveLength(5);
  });

  it('returns topN results when specified', () => {
    expect(search('box', 3)).toHaveLength(3);
  });

  it('returns shapes with correct structure', () => {
    const [first] = search('donut');
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('geometry.type');
  });

  it('ranks sphere shapes highly for "sphere" query', () => {
    const results = search('sphere', 10);
    const types = results.map(r => r.geometry.type);
    expect(types).toContain('sphere');
    expect(types[0]).toBe('sphere');
  });

  it('ranks torus shapes highly for "donut" query', () => {
    const results = search('donut', 5);
    expect(results[0].geometry.type).toBe('torus');
  });

  it('returns shapes for "asteroid" query', () => {
    const results = search('asteroid', 5);
    expect(results.some(r => r.id === 'low_poly_asteroid')).toBe(true);
  });

  it('returns first topN shapes for empty query', () => {
    const results = search('', 5);
    expect(results).toHaveLength(5);
  });

  it('returns first topN shapes for whitespace query', () => {
    const results = search('   ', 5);
    expect(results).toHaveLength(5);
  });

  it('handles unknown query gracefully without throwing', () => {
    expect(() => search('xyzzy_nonexistent_term_123')).not.toThrow();
  });

  it('geometry type matches expected for cone query', () => {
    const results = search('cone spire', 5);
    expect(results.some(r => r.geometry.type === 'cone')).toBe(true);
  });
});
