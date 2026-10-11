import { describe, it, expect } from 'vitest';
import { isValidBriefDate, parseIngestBody } from './ingest';

describe('isValidBriefDate (F-09)', () => {
  it('accepts a well-formed calendar date', () => {
    expect(isValidBriefDate('2026-10-11')).toBe(true);
    expect(isValidBriefDate('2024-02-29')).toBe(true);
  });

  it('rejects malformed or impossible dates', () => {
    expect(isValidBriefDate('2026-13-01')).toBe(false);
    expect(isValidBriefDate('2026-02-30')).toBe(false);
    expect(isValidBriefDate('20231011')).toBe(false);
    expect(isValidBriefDate('2026/10/11')).toBe(false);
    expect(isValidBriefDate('')).toBe(false);
    expect(isValidBriefDate(20261011)).toBe(false);
    expect(isValidBriefDate(null)).toBe(false);
    expect(isValidBriefDate(undefined)).toBe(false);
  });
});

describe('parseIngestBody (F-09)', () => {
  it('treats an empty body as "ingest latest"', () => {
    expect(parseIngestBody('')).toEqual({ ok: true });
    expect(parseIngestBody('   ')).toEqual({ ok: true });
  });

  it('accepts a valid date', () => {
    expect(parseIngestBody('{"date":"2026-10-11"}')).toEqual({ ok: true, date: '2026-10-11' });
  });

  it('treats a null/missing date as "ingest latest"', () => {
    expect(parseIngestBody('{}')).toEqual({ ok: true });
    expect(parseIngestBody('{"date":null}')).toEqual({ ok: true });
  });

  it('rejects malformed JSON with an explicit message', () => {
    const res = parseIngestBody('{not json');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/合法 JSON/);
  });

  it('rejects non-object JSON', () => {
    expect(parseIngestBody('"2026-10-11"').ok).toBe(false);
    expect(parseIngestBody('123').ok).toBe(false);
    expect(parseIngestBody('[]').ok).toBe(false);
  });

  it('rejects an invalid date with an explicit message', () => {
    const res = parseIngestBody('{"date":"2026-13-01"}');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/YYYY-MM-DD/);
  });
});
