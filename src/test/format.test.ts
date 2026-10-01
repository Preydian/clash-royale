import { describe, expect, it } from 'vitest';
import { elixir, percent } from '../lib/format';

describe('elixir', () => {
  it('shows one decimal', () => {
    expect(elixir(2.34)).toBe('2.3');
    expect(elixir(12.68)).toBe('12.7');
  });

  it('keeps the decimal on whole numbers and zero', () => {
    expect(elixir(4)).toBe('4.0');
    expect(elixir(0)).toBe('0.0');
  });

  it('uses the same placeholder as other missing values', () => {
    expect(elixir(null)).toBe(percent(null));
  });
});
