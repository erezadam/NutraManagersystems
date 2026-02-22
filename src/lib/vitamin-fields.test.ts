import { describe, expect, it } from 'vitest';
import { collectChoiceOptions, labelsFromConflictsWithDetails, mergeLabDeficiencyFields } from './vitamin-fields';

describe('mergeLabDeficiencyFields', () => {
  it('keeps base value when legacy fields are empty', () => {
    const merged = mergeLabDeficiencyFields({
      labTestDeficiency: 'B12 נמוך',
      labTestDeficiencyDescription: '',
      labTestDeficiencyDetails: ''
    });

    expect(merged).toContain('B12 נמוך');
  });

  it('merges legacy description and details into target field', () => {
    const merged = mergeLabDeficiencyFields({
      labTestDeficiency: 'Ferritin נמוך',
      labTestDeficiencyDescription: 'ערך גבולי',
      labTestDeficiencyDetails: 'נדרש מעקב חוזר בעוד 6 שבועות'
    });

    expect(merged).toContain('Ferritin נמוך');
    expect(merged).toContain('תיאור החוסר');
    expect(merged).toContain('ערך גבולי');
    expect(merged).toContain('נדרש מעקב חוזר בעוד 6 שבועות');
  });

  it('avoids duplicate append when base already contains legacy text', () => {
    const merged = mergeLabDeficiencyFields({
      labTestDeficiency: 'תיאור החוסר: B12 נמוך',
      labTestDeficiencyDescription: 'B12 נמוך',
      labTestDeficiencyDetails: ''
    });

    const normalized = merged.replace(/\s+/g, ' ');
    expect(normalized.match(/B12 נמוך/g)?.length).toBe(1);
  });
});

describe('collectChoiceOptions', () => {
  it('merges defaults, stored and entity values without duplicates', () => {
    const options = collectChoiceOptions(['מים', 'שמן'], ['מים', ' הגוף ', undefined, 'המזון'], ['שמן', 'נוסף']);
    expect(options).toEqual(['הגוף', 'המזון', 'מים', 'נוסף', 'שמן']);
  });
});

describe('labelsFromConflictsWithDetails', () => {
  it('keeps explanation inline under התנגשויות', () => {
    const labels = labelsFromConflictsWithDetails(
      [
        { vitaminId: 'v1', explanation: 'מפחית ספיגה' },
        { vitaminId: 'v2', explanation: '' }
      ],
      new Map([
        ['v1', 'אבץ'],
        ['v2', 'ברזל']
      ])
    );

    expect(labels).toContain('אבץ: מפחית ספיגה');
    expect(labels).toContain('ברזל');
  });
});
