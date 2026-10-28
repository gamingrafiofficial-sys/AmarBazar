// Utility for calculating monthly salary cycles, 1st to last-day date ranges,
// and salary payout dates (next month 1st).

export interface SalaryMonthCycle {
  id: string; // YYYY-MM
  year: number;
  monthIndex: number; // 0-11
  daysInMonth: number; // 28, 29, 30, or 31
  monthNameBn: string;
  nextMonthNameBn: string;
  payoutYear: number;
  labelBn: string; // e.g. "অক্টোবর ২০২৬ (০১-৩১ অক্টোবর) • সেলারি ডেট: ০১ নভেম্বর"
  shortLabelBn: string; // e.g. "অক্টোবর ২০২৬"
  dateRangeBn: string; // e.g. "০১ অক্টোবর – ৩১ অক্টোবর ২০২৬"
  payoutDateBn: string; // e.g. "০১ নভেম্বর ২০২৬"
  startDate: Date; // 1st of month at 00:00:00.000
  endDate: Date; // Last day of month at 23:59:59.999
}

export const BN_MONTH_NAMES = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

/**
 * Returns salary cycle details for a specific year and monthIndex (0-11)
 */
export function getSalaryMonthCycle(year: number, monthIndex: number): SalaryMonthCycle {
  const startDate = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  // Last day of month: day 0 of monthIndex + 1 gives the exact last day (28, 29, 30, or 31)
  const lastDayDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  const daysInMonth = lastDayDate.getDate();

  const monthNum = monthIndex + 1;
  const monthId = `${year}-${String(monthNum).padStart(2, '0')}`;
  const monthNameBn = BN_MONTH_NAMES[monthIndex];

  const nextMonthIndex = (monthIndex + 1) % 12;
  const nextMonthNameBn = BN_MONTH_NAMES[nextMonthIndex];
  const payoutYear = monthIndex === 11 ? year + 1 : year;

  const paddedLastDay = String(daysInMonth).padStart(2, '0');

  return {
    id: monthId,
    year,
    monthIndex,
    daysInMonth,
    monthNameBn,
    nextMonthNameBn,
    payoutYear,
    labelBn: `${monthNameBn} ${year} (০১-${paddedLastDay} ${monthNameBn}) • সেলারি ডেট: ০১ ${nextMonthNameBn}`,
    shortLabelBn: `${monthNameBn} ${year}`,
    dateRangeBn: `০১ ${monthNameBn} – ${paddedLastDay} ${monthNameBn} ${year}`,
    payoutDateBn: `০১ ${nextMonthNameBn} ${payoutYear}`,
    startDate,
    endDate: lastDayDate,
  };
}

/**
 * Generates an array of salary cycles for up to 12 months (or active order months).
 */
export function getAvailableSalaryCycles(extraDates?: string[], count: number = 12): SalaryMonthCycle[] {
  const cyclesMap = new Map<string, SalaryMonthCycle>();
  const now = new Date();

  // Generate for the last `count` months starting from current month
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const cycle = getSalaryMonthCycle(d.getFullYear(), d.getMonth());
    cyclesMap.set(cycle.id, cycle);
  }

  // Include any extra months present in order/transaction dates
  if (extraDates && extraDates.length > 0) {
    for (const dStr of extraDates) {
      if (!dStr) continue;
      const parsed = new Date(dStr);
      if (!isNaN(parsed.getTime())) {
        const cycle = getSalaryMonthCycle(parsed.getFullYear(), parsed.getMonth());
        if (!cyclesMap.has(cycle.id)) {
          cyclesMap.set(cycle.id, cycle);
        }
      }
    }
  }

  // Sort descending (most recent first)
  return Array.from(cyclesMap.values()).sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
}

/**
 * Checks if an order or event timestamp falls strictly between:
 * 1st day of month 00:00:00 and Last day of month 23:59:59.999
 * Anything on the 1st of next month belongs to the next month!
 */
export function isTimestampInSalaryCycle(
  timestampStr: string | undefined,
  cycle: SalaryMonthCycle
): boolean {
  if (!timestampStr) return false;
  const d = new Date(timestampStr);
  if (isNaN(d.getTime())) return false;
  const time = d.getTime();
  return time >= cycle.startDate.getTime() && time <= cycle.endDate.getTime();
}
