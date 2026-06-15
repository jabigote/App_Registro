import { calculateScheduleMinutes, parseHoursInput, roundDateToNearest30 } from '@/utils/time';

describe('time utilities', () => {
  test('detects overlapping schedule segments', () => {
    expect(calculateScheduleMinutes('08:00', '13:00', '12:30', '17:00')).toEqual({
      minutes: null,
      error: 'Los tramos horarios no pueden solaparse.',
    });
  });

  test('calculates two valid schedule segments', () => {
    expect(calculateScheduleMinutes('08:00', '13:00', '14:00', '17:30')).toEqual({
      minutes: 510,
      error: null,
    });
  });

  test('rejects malformed hour inputs', () => {
    expect(parseHoursInput('2:75')).toBeNull();
    expect(parseHoursInput('abc')).toBeNull();
    expect(parseHoursInput('2abc')).toBeNull();
  });

  test('rounding after 23:45 advances the date', () => {
    const rounded = roundDateToNearest30(new Date(2026, 5, 10, 23, 50));
    expect(rounded.time).toBe('00:00');
    expect(rounded.date.getDate()).toBe(11);
  });

  test('calculates a shift that ends the next day when explicitly allowed', () => {
    expect(calculateScheduleMinutes('23:30', '00:30', '', '', true)).toEqual({
      minutes: 60,
      error: null,
    });
  });
});
