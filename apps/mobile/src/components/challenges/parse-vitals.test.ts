import { parseVitalsForm } from './parse-vitals';

describe('parseVitalsForm', () => {
  it('accepts a required reading with optional fields omitted', () => {
    expect(
      parseVitalsForm({
        systolic: '120',
        diastolic: '80',
        pulse: '',
        notes: '  ',
      }),
    ).toEqual({
      success: true,
      data: { systolic: 120, diastolic: 80 },
    });
  });

  it('keeps pulse and notes when they are present', () => {
    expect(
      parseVitalsForm({
        systolic: '118',
        diastolic: '76',
        pulse: '72',
        notes: 'After a walk',
      }),
    ).toEqual({
      success: true,
      data: {
        systolic: 118,
        diastolic: 76,
        pulse: 72,
        notes: 'After a walk',
      },
    });
  });

  it('rejects out-of-range or blank required fields', () => {
    const result = parseVitalsForm({
      systolic: '10',
      diastolic: '',
      pulse: '12',
      notes: '',
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.errors.systolic).toMatch(/systolic/);
    expect(result.errors.diastolic).toMatch(/diastolic/);
    expect(result.errors.pulse).toMatch(/Pulse/);
  });
});
