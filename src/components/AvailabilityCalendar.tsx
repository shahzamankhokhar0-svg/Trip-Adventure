import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  RefreshCw,
} from 'lucide-react';
import type { AvailabilityPayload } from '../types.ts';

interface AvailabilityCalendarProps {
  mode: 'select' | 'admin';
  availability: AvailabilityPayload | null;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  minDate?: string;
  loading?: boolean;
  onRefresh?: () => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatYmd(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function formatDisplayDate(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d));
  return utcDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  mode,
  availability,
  selectedDate,
  onSelectDate,
  minDate,
  loading = false,
  onRefresh,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const effectiveMinDate = minDate ?? (mode === 'select' ? todayStr : undefined);

  const initialAnchor = useMemo(() => {
    const source = selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate) ? selectedDate : todayStr;
    const [y, m] = source.split('-').map(Number);
    return { year: y, month: m - 1 };
  }, [selectedDate, todayStr]);

  const [viewYear, setViewYear] = useState(initialAnchor.year);
  const [viewMonth, setViewMonth] = useState(initialAnchor.month);

  const blockedMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of availability?.blockedDates || []) {
      map.set(item.date, item.reason || 'Unavailable');
    }
    return map;
  }, [availability]);

  const bookedMap = availability?.bookedDates || {};
  const autoBlockConfirmed = availability?.autoBlockConfirmedDates !== false;

  const [todayYear, todayMonth] = useMemo(() => {
    const [y, m] = todayStr.split('-').map(Number);
    return [y, m - 1];
  }, [todayStr]);

  const canGoPrevMonth =
    mode === 'admin' ||
    viewYear > todayYear ||
    (viewYear === todayYear && viewMonth > todayMonth);

  const handlePrevMonth = () => {
    if (!canGoPrevMonth) return;
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToday = () => {
    setViewYear(todayYear);
    setViewMonth(todayMonth);
  };

  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();

    const cells: Array<{ day: number | null; dateStr: string | null }> = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ day: null, dateStr: null });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({
        day,
        dateStr: formatYmd(viewYear, viewMonth, day),
      });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ day: null, dateStr: null });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const selectedInfo = useMemo(() => {
    if (!selectedDate) return null;
    const manualReason = blockedMap.get(selectedDate);
    const counts = bookedMap[selectedDate];
    const confirmedCount = counts?.confirmed || 0;
    const pendingCount = counts?.pending || 0;
    const isAutoBlocked = autoBlockConfirmed && confirmedCount > 0;
    return {
      manualReason,
      confirmedCount,
      pendingCount,
      isAutoBlocked,
      isBlocked: Boolean(manualReason) || isAutoBlocked,
    };
  }, [selectedDate, blockedMap, bookedMap, autoBlockConfirmed]);

  return (
    <div className="rounded-xl border border-neutral-200 bg-[#FAF9F6] p-4 sm:p-5">
      {/* Header & Month Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B0B0D] text-[#C59B38]">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-display text-lg font-semibold leading-tight text-[#111114]">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h4>
            <p className="text-[11px] text-neutral-500">
              {mode === 'select'
                ? 'Live availability synced with our guide schedule'
                : 'Click any date to inspect, block, or unblock availability'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              title="Refresh live availability"
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 text-[11px] font-semibold text-neutral-700 hover:border-[#C59B38] hover:text-[#111114] disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin text-[#C59B38]' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleJumpToday}
            className="h-8 rounded-lg border border-neutral-200 bg-white px-2.5 text-[11px] font-semibold text-neutral-700 hover:border-[#C59B38] hover:text-[#111114]"
          >
            Today
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={!canGoPrevMonth}
            aria-label="Previous month"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:border-[#C59B38] hover:text-[#111114] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next month"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:border-[#C59B38] hover:text-[#111114]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="mt-3 grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAYS.map((dayName) => (
          <div
            key={dayName}
            className="py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500"
          >
            {dayName}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="mt-1 grid grid-cols-7 gap-1.5" role="grid" aria-label="Travel date availability calendar">
        {calendarCells.map((cell, idx) => {
          if (!cell.day || !cell.dateStr) {
            return <div key={`empty-${idx}`} className="h-12 sm:h-14" aria-hidden="true" />;
          }

          const dateStr = cell.dateStr;
          const isToday = dateStr === todayStr;
          const isPast = Boolean(effectiveMinDate && dateStr < effectiveMinDate);
          const manualReason = blockedMap.get(dateStr);
          const bookingCounts = bookedMap[dateStr];
          const confirmedCount = bookingCounts?.confirmed || 0;
          const pendingCount = bookingCounts?.pending || 0;
          const isAutoBlocked = autoBlockConfirmed && confirmedCount > 0;
          const isBlocked = Boolean(manualReason) || isAutoBlocked;
          const isSelected = selectedDate === dateStr;
          const disabledInSelect = mode === 'select' && (isPast || isBlocked);

          let cellClasses =
            'relative flex h-12 sm:h-14 flex-col items-center justify-center rounded-lg border text-xs transition-all select-none ';

          if (isSelected) {
            cellClasses +=
              'border-[#C59B38] bg-[#0B0B0D] text-white ring-2 ring-[#C59B38]/40 font-semibold';
          } else if (disabledInSelect) {
            if (isBlocked && !isPast) {
              cellClasses +=
                'border-red-200 bg-red-50/90 text-red-700 cursor-not-allowed';
            } else {
              cellClasses +=
                'border-neutral-200/60 bg-neutral-100/70 text-neutral-400 cursor-not-allowed';
            }
          } else if (isBlocked) {
            // Admin mode viewing blocked date
            cellClasses +=
              'border-red-300 bg-red-50 text-red-900 hover:border-red-500 font-medium';
          } else if (isPast) {
            // Admin mode viewing past date
            cellClasses +=
              'border-neutral-200 bg-neutral-50 text-neutral-500 hover:border-neutral-400';
          } else if (pendingCount > 0 || (!autoBlockConfirmed && confirmedCount > 0)) {
            cellClasses +=
              'border-amber-300/80 bg-amber-50/70 text-[#111114] hover:border-[#C59B38] hover:bg-white font-medium';
          } else {
            cellClasses +=
              'border-neutral-200 bg-white text-[#111114] hover:border-[#C59B38] hover:bg-[#FFFDF8] font-medium';
          }

          const titleText = manualReason
            ? `${dateStr} — Blocked: ${manualReason}`
            : isAutoBlocked
              ? `${dateStr} — Fully booked (confirmed reservation)`
              : confirmedCount > 0
                ? `${dateStr} — ${confirmedCount} confirmed booking(s)`
                : pendingCount > 0
                  ? `${dateStr} — ${pendingCount} pending inquiry (still available)`
                  : isPast
                    ? `${dateStr} — Past date`
                    : `${dateStr} — Available`;

          return (
            <button
              key={dateStr}
              type="button"
              disabled={disabledInSelect}
              onClick={() => onSelectDate(dateStr)}
              title={titleText}
              aria-label={titleText}
              aria-pressed={isSelected}
              className={cellClasses}
            >
              <span className="font-mono-num text-xs sm:text-sm leading-none">
                {cell.day}
              </span>

              {/* Status indicator underneath day number */}
              <div className="mt-1 flex items-center justify-center gap-0.5">
                {isBlocked && !isPast ? (
                  <>
                    <Lock
                      className={`h-2.5 w-2.5 ${
                        isSelected ? 'text-red-300' : 'text-red-600'
                      }`}
                    />
                    <span
                      className={`hidden sm:inline text-[9px] font-semibold leading-none ${
                        isSelected ? 'text-red-200' : 'text-red-700'
                      }`}
                    >
                      {manualReason ? 'Blocked' : 'Booked'}
                    </span>
                  </>
                ) : !isPast && confirmedCount > 0 ? (
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      isSelected ? 'bg-emerald-400' : 'bg-emerald-600'
                    }`}
                  />
                ) : !isPast && pendingCount > 0 ? (
                  <>
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        isSelected ? 'bg-[#C59B38]' : 'bg-amber-600'
                      }`}
                    />
                    <span
                      className={`hidden sm:inline text-[9px] font-medium leading-none ${
                        isSelected ? 'text-[#C59B38]' : 'text-amber-800'
                      }`}
                    >
                      Pending
                    </span>
                  </>
                ) : isToday ? (
                  <span
                    className={`text-[9px] font-semibold leading-none ${
                      isSelected ? 'text-[#C59B38]' : 'text-[#8B6816]'
                    }`}
                  >
                    Today
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-neutral-200 pt-3 text-[11px] text-neutral-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-neutral-300 bg-white" />
          Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-[#C59B38] bg-[#0B0B0D]" />
          Selected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-amber-300 bg-amber-100" />
          Pending Request (Available)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-red-300 bg-red-100" />
          Blocked / Booked
        </span>
      </div>

      {/* Selected Date Live Summary */}
      {selectedDate && selectedInfo && (
        <div
          className={`mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
            selectedInfo.isBlocked
              ? 'border-red-200 bg-red-50 text-red-900'
              : 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
          }`}
        >
          <div className="flex items-center gap-2">
            {selectedInfo.isBlocked ? (
              <Lock className="h-3.5 w-3.5 shrink-0 text-red-700" />
            ) : selectedInfo.pendingCount > 0 ? (
              <Clock className="h-3.5 w-3.5 shrink-0 text-amber-700" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
            )}
            <span>
              <strong className="font-mono-num">{selectedDate}</strong> ({formatDisplayDate(selectedDate)})
              {' — '}
              {selectedInfo.manualReason
                ? `Blocked (${selectedInfo.manualReason})`
                : selectedInfo.isAutoBlocked
                  ? 'Unavailable (Confirmed Booking)'
                  : selectedInfo.pendingCount > 0
                    ? `Available (${selectedInfo.pendingCount} pending inquiry)`
                    : 'Available for booking'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
