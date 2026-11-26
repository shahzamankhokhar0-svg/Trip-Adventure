import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Ticket,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import type {
  AvailabilityPayload,
  BookingStatus,
  SiteSettings,
  TourPackage,
} from '../types.ts';
import { buildBookingMailtoUrl, buildWhatsAppUrl } from '../lib/whatsapp.ts';
import { usePreferences } from '../context/PreferencesContext.tsx';
import { AvailabilityCalendar, formatDisplayDate } from './AvailabilityCalendar.tsx';

interface BookingSectionProps {
  tours: TourPackage[];
  settings: SiteSettings;
  preselectedTourId?: string | null;
  preselectedBookingOption?: string | null;
  bookingRequestNonce?: number;
  initialMode?: 'book' | 'status';
}

interface BookingReceipt {
  referenceCode: string;
  fullName: string;
  whatsappNumber: string;
  email: string;
  tourTitle: string;
  travelDate: string;
  adults: number;
  children: number;
  pickupLocation: string;
  requirements: string;
  status: BookingStatus;
  createdAt: string;
}

interface LookupResult {
  referenceCode: string;
  fullName: string;
  tourTitle: string;
  travelDate: string;
  adults: number;
  children: number;
  pickupLocation: string;
  status: BookingStatus;
  adminNotes: string;
  updatedAt?: string;
}

interface SavedTicketPointer {
  referenceCode: string;
  email: string;
}

interface SavedTicketEntry extends LookupResult {
  email: string;
}

const SAVED_TICKETS_KEY = 'ta_saved_tickets_v1';

function readSavedTicketPointers(): SavedTicketPointer[] {
  try {
    const raw = window.localStorage.getItem(SAVED_TICKETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedTicketPointer =>
        Boolean(item?.referenceCode && item?.email)
    );
  } catch {
    return [];
  }
}

function saveTicketPointer(referenceCode: string, email: string): SavedTicketPointer[] {
  const normalizedRef = referenceCode.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();
  const existing = readSavedTicketPointers().filter(
    (item) => item.referenceCode.toUpperCase() !== normalizedRef
  );
  const next = [{ referenceCode: normalizedRef, email: normalizedEmail }, ...existing].slice(0, 10);
  try {
    window.localStorage.setItem(SAVED_TICKETS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors
  }
  return next;
}

function removeTicketPointer(referenceCode: string): SavedTicketPointer[] {
  const normalizedRef = referenceCode.trim().toUpperCase();
  const next = readSavedTicketPointers().filter(
    (item) => item.referenceCode.toUpperCase() !== normalizedRef
  );
  try {
    window.localStorage.setItem(SAVED_TICKETS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors
  }
  return next;
}

const LOCAL_OFFLINE_TICKETS_KEY = 'ta_local_offline_bookings_v1';

interface LocalOfflineTicket {
  referenceCode: string;
  fullName: string;
  email: string;
  tourTitle: string;
  travelDate: string;
  adults: number;
  children: number;
  pickupLocation: string;
  requirements: string;
  status: BookingStatus;
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
}

function readLocalOfflineTickets(): LocalOfflineTicket[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_OFFLINE_TICKETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalOfflineTickets(list: LocalOfflineTicket[]): void {
  try {
    window.localStorage.setItem(LOCAL_OFFLINE_TICKETS_KEY, JSON.stringify(list.slice(0, 30)));
  } catch {
    // Ignore storage errors
  }
}

function generateLocalReferenceCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `TA-DXB-${suffix}`;
}

export const BookingSection: React.FC<BookingSectionProps> = ({
  tours,
  settings,
  preselectedTourId,
  preselectedBookingOption,
  bookingRequestNonce = 0,
  initialMode = 'book',
}) => {
  const { formatAmount, formatText, t } = usePreferences();
  const [sectionTab, setSectionTab] = useState<'book' | 'status'>(initialMode);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [nationality, setNationality] = useState('');
  const [tourId, setTourId] = useState(preselectedTourId || tours[0]?.id || '');
  const [selectedOption, setSelectedOption] = useState(preselectedBookingOption || '');
  const [travelDate, setTravelDate] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [pickupLocation, setPickupLocation] = useState('');
  const [requirements, setRequirements] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null);

  // Live availability state synced with Admin bookings & blocked dates
  const [availability, setAvailability] = useState<AvailabilityPayload | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Saved & Looked-Up Tickets
  const [savedTickets, setSavedTickets] = useState<SavedTicketEntry[]>([]);
  const [syncingTickets, setSyncingTickets] = useState(false);
  const [cancellingRef, setCancellingRef] = useState<string | null>(null);
  const [confirmCancelRef, setConfirmCancelRef] = useState<string | null>(null);
  const [ticketActionMessage, setTicketActionMessage] = useState<string | null>(null);

  // Manual ticket lookup form state
  const [lookupRef, setLookupRef] = useState('');
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<SavedTicketEntry | null>(null);

  useEffect(() => {
    setSectionTab(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (bookingRequestNonce > 0) {
      setReceipt(null);
      setError(null);
      setSectionTab('book');
    }
  }, [bookingRequestNonce]);

  const fetchAvailability = useCallback(async () => {
    setLoadingAvailability(true);
    try {
      const res = await fetch('/api/availability', { cache: 'no-store' });
      if (res.ok) {
        const data: AvailabilityPayload = await res.json();
        setAvailability(data);
      }
    } catch {
      // Non-fatal fallback; calendar stays usable
    } finally {
      setLoadingAvailability(false);
    }
  }, []);

  const refreshSavedTickets = useCallback(async () => {
    const pointers = readSavedTicketPointers();
    if (pointers.length === 0) {
      setSavedTickets([]);
      return;
    }
    setSyncingTickets(true);
    try {
      const localList = readLocalOfflineTickets();
      const resolved = await Promise.all(
        pointers.map(async (ptr): Promise<SavedTicketEntry | null> => {
          const localMatch = localList.find(
            (item) =>
              item.referenceCode.toUpperCase() === ptr.referenceCode.toUpperCase() &&
              item.email.toLowerCase() === ptr.email.toLowerCase()
          );
          try {
            const params = new URLSearchParams({
              ref: ptr.referenceCode,
              email: ptr.email,
            });
            const res = await fetch(`/api/bookings/lookup?${params.toString()}`, {
              cache: 'no-store',
            });
            const contentType = res.headers.get('content-type') || '';
            if (res.ok && contentType.includes('application/json')) {
              const data = await res.json();
              if (data.booking) {
                return { ...data.booking, email: ptr.email };
              }
            }
            return localMatch ? { ...localMatch } : null;
          } catch {
            return localMatch ? { ...localMatch } : null;
          }
        })
      );
      setSavedTickets(resolved.filter((item): item is SavedTicketEntry => item !== null));
    } finally {
      setSyncingTickets(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailability();
    refreshSavedTickets();
  }, [fetchAvailability, refreshSavedTickets]);

  useEffect(() => {
    if (preselectedTourId) {
      setTourId(preselectedTourId);
    } else if (!tourId && tours.length > 0) {
      setTourId(tours[0].id);
    }
  }, [preselectedTourId, tours, tourId]);

  const selectedTour = tours.find((t) => t.id === tourId) || tours[0];
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!selectedTour) {
      setSelectedOption('');
      return;
    }
    const opts = selectedTour.bookingOptions || [];
    if (preselectedBookingOption && opts.includes(preselectedBookingOption)) {
      setSelectedOption(preselectedBookingOption);
      return;
    }
    setSelectedOption((prev) => (prev && opts.includes(prev) ? prev : opts[0] || ''));
  }, [selectedTour, preselectedBookingOption]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!travelDate) {
      setError('Please select an available travel date from the calendar below.');
      return;
    }

    const safeAdults = Math.min(20, Math.max(1, Number(adults) || 1));
    const safeChildren = Math.min(20, Math.max(0, Number(children) || 0));
    const resolvedTourTitle =
      selectedTour && selectedOption
        ? `${selectedTour.title} — ${formatText(selectedOption)}`
        : selectedTour?.title || 'Dubai Tour';

    setSubmitting(true);

    const saveOfflineReceipt = () => {
      const now = new Date().toISOString();
      const created: BookingReceipt = {
        referenceCode: generateLocalReferenceCode(),
        fullName: fullName.trim(),
        whatsappNumber: whatsappNumber.trim(),
        email: email.trim().toLowerCase(),
        tourTitle: resolvedTourTitle,
        travelDate,
        adults: safeAdults,
        children: safeChildren,
        pickupLocation: pickupLocation.trim(),
        requirements: requirements.trim(),
        status: 'pending',
        createdAt: now,
      };
      const localList = readLocalOfflineTickets();
      writeLocalOfflineTickets([
        {
          ...created,
          adminNotes: '',
          updatedAt: now,
        },
        ...localList,
      ]);
      setReceipt(created);
      if (created.email) {
        saveTicketPointer(created.referenceCode, created.email);
        setLookupEmail(created.email);
      }
      setLookupRef(created.referenceCode);
      void refreshSavedTickets();
    };

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          whatsappNumber,
          nationality,
          tourId,
          tourOption: selectedOption ? formatText(selectedOption) : '',
          travelDate,
          adults: safeAdults,
          children: safeChildren,
          pickupLocation,
          requirements,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        saveOfflineReceipt();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not submit booking request.');
        if (res.status === 409) {
          await fetchAvailability();
        }
      } else {
        const created: BookingReceipt = {
          ...data.booking,
          whatsappNumber: whatsappNumber.trim(),
        };
        setReceipt(created);
        if (created.email) {
          saveTicketPointer(created.referenceCode, created.email);
          setLookupEmail(created.email);
        }
        setLookupRef(created.referenceCode);
        await Promise.all([fetchAvailability(), refreshSavedTickets()]);
      }
    } catch {
      saveOfflineReceipt();
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    setLookupResult(null);
    setTicketActionMessage(null);
    setLookupLoading(true);
    const refVal = lookupRef.trim().toUpperCase();
    const emailVal = lookupEmail.trim().toLowerCase();
    const checkLocalTicket = () => {
      const localMatch = readLocalOfflineTickets().find(
        (item) =>
          item.referenceCode.toUpperCase() === refVal &&
          item.email.toLowerCase() === emailVal
      );
      if (localMatch) {
        setLookupResult({ ...localMatch });
        saveTicketPointer(localMatch.referenceCode, emailVal);
        void refreshSavedTickets();
        return true;
      }
      return false;
    };

    try {
      const params = new URLSearchParams({
        ref: refVal,
        email: emailVal,
      });
      const res = await fetch(`/api/bookings/lookup?${params.toString()}`, {
        cache: 'no-store',
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        if (!checkLocalTicket()) {
          setLookupError('No matching booking request found on this device.');
        }
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        if (!checkLocalTicket()) {
          setLookupError(data.error || 'No matching booking found.');
        }
      } else {
        const entry: SavedTicketEntry = { ...data.booking, email: emailVal };
        setLookupResult(entry);
        saveTicketPointer(entry.referenceCode, emailVal);
        await refreshSavedTickets();
      }
    } catch {
      if (!checkLocalTicket()) {
        setLookupError('No matching booking request found for that reference and email.');
      }
    } finally {
      setLookupLoading(false);
    }
  };

  const handleGuestCancelTicket = async (ticket: SavedTicketEntry) => {
    setCancellingRef(ticket.referenceCode);
    setTicketActionMessage(null);
    setLookupError(null);

    const cancelOfflineTicket = () => {
      const localList = readLocalOfflineTickets();
      const idx = localList.findIndex(
        (item) =>
          item.referenceCode.toUpperCase() === ticket.referenceCode.toUpperCase() &&
          item.email.toLowerCase() === ticket.email.toLowerCase()
      );
      if (idx === -1) {
        setLookupError('Could not cancel booking ticket.');
        return;
      }
      const updated: LocalOfflineTicket = {
        ...localList[idx],
        status: 'rejected',
        adminNotes: localList[idx].adminNotes
          ? `${localList[idx].adminNotes} · Cancelled by guest`
          : 'Cancelled by guest',
        updatedAt: new Date().toISOString(),
      };
      localList[idx] = updated;
      writeLocalOfflineTickets(localList);
      setConfirmCancelRef(null);
      setTicketActionMessage(
        `Booking ${ticket.referenceCode} has been marked as Cancelled.`
      );
      if (lookupResult?.referenceCode === ticket.referenceCode) {
        setLookupResult({ ...updated });
      }
      void refreshSavedTickets();
    };

    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref: ticket.referenceCode,
          email: ticket.email,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        cancelOfflineTicket();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.error || 'Could not cancel booking ticket.');
      } else {
        setConfirmCancelRef(null);
        setTicketActionMessage(
          `Booking ${ticket.referenceCode} has been marked as Cancelled.`
        );
        if (lookupResult?.referenceCode === ticket.referenceCode) {
          setLookupResult({ ...data.booking, email: ticket.email });
        }
        await Promise.all([refreshSavedTickets(), fetchAvailability()]);
      }
    } catch {
      cancelOfflineTicket();
    } finally {
      setCancellingRef(null);
    }
  };

  const handleForgetSavedTicket = (refCode: string) => {
    removeTicketPointer(refCode);
    setSavedTickets((prev) => prev.filter((item) => item.referenceCode !== refCode));
    if (lookupResult?.referenceCode === refCode) {
      setLookupResult(null);
    }
  };

  const draftWhatsAppUrl = buildWhatsAppUrl(settings.whatsappNumber || '+971542218616', {
    customerName: fullName,
    customerWhatsapp: whatsappNumber,
    tourTitle:
      selectedTour && selectedOption
        ? `${selectedTour.title} — ${formatText(selectedOption)}`
        : selectedTour?.title,
    preferredDate: travelDate,
    adults,
    children,
    pickupLocation,
    specialRequests: requirements,
  });

  const statusMeta = (status: BookingStatus) => {
    if (status === 'confirmed') {
      return {
        label: 'Approved',
        subLabel: 'Confirmed Reservation',
        description:
          'Your visit is approved! Our guide desk will coordinate pickup at your hotel or terminal.',
        badgeClass: 'border-emerald-300 bg-emerald-50 text-emerald-900',
        bannerClass: 'border-emerald-200 bg-emerald-50/70 text-emerald-950',
      };
    }
    if (status === 'completed') {
      return {
        label: 'Completed',
        subLabel: 'Tour Finished',
        description:
          'Your Dubai visit has been marked Completed. Thank you for travelling with TRIP ADVENTURE!',
        badgeClass: 'border-blue-300 bg-blue-50 text-blue-900',
        bannerClass: 'border-blue-200 bg-blue-50/70 text-blue-950',
      };
    }
    if (status === 'rejected') {
      return {
        label: 'Cancelled',
        subLabel: 'Declined / Cancelled',
        description:
          'This booking ticket has been cancelled or the requested slot is unavailable. You can book another date below.',
        badgeClass: 'border-red-300 bg-red-50 text-red-900',
        bannerClass: 'border-red-200 bg-red-50/70 text-red-950',
      };
    }
    return {
      label: 'Pending',
      subLabel: 'Awaiting Approval',
      description:
        'Your request is queued for review by Program Organizer Shahzaman Khokhar.',
      badgeClass: 'border-amber-300 bg-amber-50 text-amber-900',
      bannerClass: 'border-amber-200 bg-amber-50/70 text-amber-950',
    };
  };

  const renderTicketPassCard = (ticket: SavedTicketEntry, allowForget = false) => {
    const meta = statusMeta(ticket.status);
    const isCancelling = cancellingRef === ticket.referenceCode;
    const isConfirmingCancel = confirmCancelRef === ticket.referenceCode;

    return (
      <article
        key={ticket.referenceCode}
        className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"
      >
        <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5 ${meta.bannerClass}`}>
          <div className="flex items-center gap-2.5">
            {ticket.status === 'confirmed' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
            ) : ticket.status === 'completed' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-700" />
            ) : ticket.status === 'rejected' ? (
              <XCircle className="h-5 w-5 shrink-0 text-red-700" />
            ) : (
              <Clock className="h-5 w-5 shrink-0 text-amber-700" />
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide">
                Trip Status: {meta.label} · {meta.subLabel}
              </p>
              <p className="text-[11px] opacity-85">{meta.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono-num rounded-md border border-black/10 bg-white/80 px-2.5 py-1 text-xs font-bold text-[#111114]">
              {ticket.referenceCode}
            </span>
            {allowForget && (
              <button
                type="button"
                onClick={() => handleForgetSavedTicket(ticket.referenceCode)}
                title="Remove from saved browser tickets"
                aria-label={`Remove ${ticket.referenceCode} from saved tickets`}
                className="rounded-md p-1 text-neutral-500 hover:bg-black/5 hover:text-[#111114]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8B6816]">
                Dubai Tour / Visit Pass
              </p>
              <h4 className="mt-0.5 font-display text-2xl font-semibold text-[#111114]">
                {ticket.tourTitle}
              </h4>
              <p className="mt-1 text-xs text-neutral-600">
                Guest: <strong className="text-[#111114]">{ticket.fullName}</strong> ({ticket.email})
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${meta.badgeClass}`}
            >
              {ticket.status === 'confirmed' ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
              ) : ticket.status === 'completed' ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-700" />
              ) : ticket.status === 'rejected' ? (
                <XCircle className="h-3.5 w-3.5 text-red-700" />
              ) : (
                <Clock className="h-3.5 w-3.5 text-amber-700" />
              )}
              {meta.label}
            </span>
          </div>

          <dl className="grid gap-3 rounded-xl border border-neutral-200 bg-[#FAF9F6] p-4 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-neutral-500">Travel Date</dt>
              <dd className="font-mono-num mt-0.5 font-semibold text-[#111114]">
                {ticket.travelDate}
              </dd>
              <dd className="text-[11px] text-neutral-500">{formatDisplayDate(ticket.travelDate)}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1 text-neutral-500">
                <Users className="h-3 w-3" />
                Party Size
              </dt>
              <dd className="font-mono-num mt-0.5 font-semibold text-[#111114]">
                {ticket.adults} Adult(s)
                {ticket.children > 0 ? `, ${ticket.children} Child(ren)` : ''}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1 text-neutral-500">
                <MapPin className="h-3 w-3" />
                Pickup Point
              </dt>
              <dd className="mt-0.5 font-medium text-[#111114]">{ticket.pickupLocation}</dd>
            </div>
          </dl>

          {ticket.adminNotes && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-xs text-neutral-700">
              <strong className="text-[#111114]">Guide Note:</strong> {ticket.adminNotes}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-3">
            <p className="font-mono-num text-[11px] text-neutral-500">
              {ticket.updatedAt
                ? `Last updated: ${new Date(ticket.updatedAt).toLocaleString()}`
                : 'Live synced from booking desk'}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {ticket.status === 'pending' && (
                isConfirmingCancel ? (
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={() => handleGuestCancelTicket(ticket)}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                    >
                      {isCancelling ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      Confirm Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmCancelRef(null)}
                      className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                    >
                      Keep
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmCancelRef(ticket.referenceCode)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Cancel Request
                  </button>
                )
              )}

              <a
                href={buildWhatsAppUrl(settings.whatsappNumber, {
                  referenceCode: ticket.referenceCode,
                  customerName: ticket.fullName,
                  tourTitle: `${ticket.tourTitle} (${meta.label})`,
                  preferredDate: ticket.travelDate,
                  guests: `${ticket.adults} Adult(s), ${ticket.children} Child(ren)`,
                  pickupLocation: ticket.pickupLocation,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#15803D] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#166534]"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp Support
              </a>

              <button
                type="button"
                onClick={() => setSectionTab('book')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B0B0D] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1F1F25]"
              >
                <Calendar className="h-3.5 w-3.5 text-[#C59B38]" />
                Book Another Visit
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Top Booking vs Trip Status Switcher */}
      <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-[#8B6816]">
            Visit Reservations &amp; Trip Status Portal
          </p>
          <p className="mt-0.5 text-xs text-neutral-600">
            Book a new Dubai visit on the availability calendar or view your{' '}
            <strong className="text-emerald-800">Approved</strong>,{' '}
            <strong className="text-amber-800">Pending</strong>, or{' '}
            <strong className="text-red-800">Cancelled</strong> trip status.
          </p>
        </div>
        <div
          className="inline-flex shrink-0 flex-wrap items-center gap-1.5 rounded-xl bg-neutral-100 p-1"
          role="tablist"
          aria-label="Booking and trip status views"
        >
          <button
            type="button"
            role="tab"
            aria-selected={sectionTab === 'book'}
            onClick={() => setSectionTab('book')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              sectionTab === 'book'
                ? 'bg-[#0B0B0D] text-white'
                : 'text-neutral-700 hover:text-[#111114]'
            }`}
          >
            <Calendar className={`h-3.5 w-3.5 ${sectionTab === 'book' ? 'text-[#C59B38]' : ''}`} />
            Book a Visit
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sectionTab === 'status'}
            onClick={() => {
              setSectionTab('status');
              refreshSavedTickets();
            }}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              sectionTab === 'status'
                ? 'bg-[#0B0B0D] text-white'
                : 'text-neutral-700 hover:text-[#111114]'
            }`}
          >
            <Ticket className={`h-3.5 w-3.5 ${sectionTab === 'status' ? 'text-[#C59B38]' : ''}`} />
            Check Trip Status
            {savedTickets.length > 0 && (
              <span className="font-mono-num rounded-full bg-[#C59B38] px-1.5 py-0.5 text-[10px] font-bold text-[#0B0B0D]">
                {savedTickets.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {sectionTab === 'status' ? (
        <div className="space-y-8">
          {/* Lookup & Saved Tickets Portal */}
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-neutral-200 bg-white p-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0B0B0D] text-[#C59B38]">
                    <Search className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-[#111114]">
                      Look Up Your Trip
                    </h2>
                    <p className="text-xs text-neutral-500">
                      Check live Approved, Pending, or Cancelled trip status
                    </p>
                  </div>
                </div>

                <form onSubmit={handleLookup} className="mt-5 space-y-3.5">
                  <div>
                    <label
                      htmlFor="ticket-lookup-ref"
                      className="block text-xs font-semibold text-neutral-700"
                    >
                      Booking Reference Code *
                    </label>
                    <input
                      id="ticket-lookup-ref"
                      type="text"
                      required
                      value={lookupRef}
                      onChange={(e) => setLookupRef(e.target.value)}
                      placeholder="e.g. TA-DXB-XXXXXX"
                      className="font-mono-num mt-1 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-xs uppercase text-[#111114] focus:border-[#C59B38] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="ticket-lookup-email"
                      className="block text-xs font-semibold text-neutral-700"
                    >
                      Email Used During Booking *
                    </label>
                    <input
                      id="ticket-lookup-email"
                      type="email"
                      required
                      value={lookupEmail}
                      onChange={(e) => setLookupEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-xs text-[#111114] focus:border-[#C59B38] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={lookupLoading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B0B0D] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1F1F25] disabled:opacity-60"
                  >
                    {lookupLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#C59B38]" />
                    ) : (
                      <Ticket className="h-4 w-4 text-[#C59B38]" />
                    )}
                    Check Live Trip Status
                  </button>
                </form>

                {lookupError && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{lookupError}</span>
                  </div>
                )}

                {ticketActionMessage && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-900">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    <span>{ticketActionMessage}</span>
                  </div>
                )}

                <div className="mt-6 border-t border-neutral-200 pt-5">
                  <p className="text-xs font-semibold text-[#111114]">
                    Want to book a new Dubai tour or transfer?
                  </p>
                  <p className="mt-1 text-xs text-neutral-600">
                    Browse live open dates on our interactive calendar and submit your visit request online.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSectionTab('book')}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-[#FAF9F6] px-4 py-2.5 text-xs font-semibold text-[#111114] hover:border-[#C59B38]"
                  >
                    <Calendar className="h-4 w-4 text-[#8B6816]" />
                    Open Booking Form &amp; Availability Calendar
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-5 lg:col-span-7">
              {lookupResult && (
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8B6816]">
                    Lookup Result
                  </p>
                  {renderTicketPassCard(lookupResult, false)}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-2xl font-semibold text-[#111114]">
                    Your Recent Tickets on This Device
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Live-synced with our admin desk whenever approvals or cancellations occur.
                  </p>
                </div>
                {savedTickets.length > 0 && (
                  <button
                    type="button"
                    onClick={refreshSavedTickets}
                    disabled={syncingTickets}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:border-[#C59B38] disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncingTickets ? 'animate-spin text-[#C59B38]' : ''}`} />
                    Refresh Status
                  </button>
                )}
              </div>

              {syncingTickets && savedTickets.length === 0 ? (
                <div className="flex items-center justify-center rounded-2xl border border-neutral-200 bg-white p-10 text-xs text-neutral-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#C59B38]" />
                  Checking live booking statuses...
                </div>
              ) : savedTickets.length === 0 ? (
                <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
                  <Ticket className="mx-auto h-8 w-8 text-neutral-400" />
                  <h4 className="mt-3 font-display text-xl font-semibold text-[#111114]">
                    No Saved Tickets on This Browser Yet
                  </h4>
                  <p className="mx-auto mt-1.5 max-w-md text-xs text-neutral-600">
                    Enter your Booking Reference Code (e.g. <span className="font-mono-num">TA-DXB-XXXXXX</span>) and email on the left to view your{' '}
                    <strong>Approved</strong>, <strong>Pending</strong>, or <strong>Cancelled</strong> ticket, or book a new visit.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSectionTab('book')}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0B0B0D] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#1F1F25]"
                  >
                    <Calendar className="h-4 w-4 text-[#C59B38]" />
                    Book Your Visit Now
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedTickets.map((ticket) => renderTicketPassCard(ticket, true))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
              <div className="border-b border-neutral-200 pb-5">
                <p className="text-xs font-semibold text-[#8B6816]">{t.sections.bookingEyebrow}</p>
                <h2 className="mt-1 font-display text-3xl font-semibold text-[#111114] sm:text-4xl">
                  {t.sections.bookingTitle}
                </h2>
                <p className="mt-2 text-sm text-neutral-600">
                  Submit your preferred tour, desert safari, or Dubai airport/hotel transfer below. Requests are reviewed personally by Program Organizer {settings.guideName} (with Tours led by {settings.guidesNames || 'Usama Khokhar & Abdul Qadir Khokhar'}) before confirmation.
                </p>
              </div>

              {receipt ? (
                <div className="mt-6 space-y-6">
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
                          Booking Request Received · Ref{' '}
                          <span className="font-mono-num">{receipt.referenceCode}</span>
                        </p>
                        <h3 className="mt-1.5 font-display text-2xl font-semibold text-[#111114]">
                          Thank you! Your booking request has been sent. Our team will confirm you on WhatsApp within 10 minutes.
                        </h3>
                        <p className="mt-2 text-sm text-emerald-950/80">
                          Choose an instant confirmation option below to send your booking details directly to our WhatsApp desk or Gmail.
                        </p>
                      </div>
                    </div>
                  </div>

                  <dl className="grid gap-4 rounded-xl border border-neutral-200 bg-[#FAF9F6] p-5 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-neutral-500">Name</dt>
                      <dd className="mt-0.5 font-semibold text-[#111114]">{receipt.fullName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-neutral-500">Customer WhatsApp Number</dt>
                      <dd className="mt-0.5 font-mono-num font-semibold text-[#111114]">
                        {receipt.whatsappNumber}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-neutral-500">Tour</dt>
                      <dd className="mt-0.5 font-semibold text-[#111114]">{receipt.tourTitle}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-neutral-500">Date</dt>
                      <dd className="mt-0.5 font-mono-num font-semibold text-[#111114]">
                        {receipt.travelDate}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-neutral-500">Guests</dt>
                      <dd className="mt-0.5 font-mono-num font-medium text-[#111114]">
                        Adults: {receipt.adults} · Children: {receipt.children}
                      </dd>
                    </div>
                    {receipt.pickupLocation && receipt.pickupLocation !== 'To be confirmed on WhatsApp' && (
                      <div>
                        <dt className="text-xs text-neutral-500">Pickup Location</dt>
                        <dd className="mt-0.5 font-medium text-[#111114]">{receipt.pickupLocation}</dd>
                      </div>
                    )}
                    {receipt.requirements && (
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-neutral-500">Additional Notes</dt>
                        <dd className="mt-0.5 text-neutral-700">{receipt.requirements}</dd>
                      </div>
                    )}
                  </dl>

                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href={buildWhatsAppUrl(settings.whatsappNumber || '+971542218616', {
                        referenceCode: receipt.referenceCode,
                        customerName: receipt.fullName,
                        customerWhatsapp: receipt.whatsappNumber,
                        tourTitle: receipt.tourTitle,
                        preferredDate: receipt.travelDate,
                        adults: receipt.adults,
                        children: receipt.children,
                        pickupLocation:
                          receipt.pickupLocation !== 'To be confirmed on WhatsApp'
                            ? receipt.pickupLocation
                            : undefined,
                        specialRequests: receipt.requirements,
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-[#15803D] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#166534]"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Confirm on WhatsApp
                    </a>
                    <a
                      href={buildBookingMailtoUrl(settings.email || 'tripadventure63@gmail.com', {
                        referenceCode: receipt.referenceCode,
                        customerName: receipt.fullName,
                        customerWhatsapp: receipt.whatsappNumber,
                        tourTitle: receipt.tourTitle,
                        preferredDate: receipt.travelDate,
                        adults: receipt.adults,
                        children: receipt.children,
                        pickupLocation:
                          receipt.pickupLocation !== 'To be confirmed on WhatsApp'
                            ? receipt.pickupLocation
                            : undefined,
                        specialRequests: receipt.requirements,
                      })}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#0B0B0D] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1F1F25]"
                    >
                      <Mail className="h-4 w-4 text-[#C59B38]" />
                      Send on Gmail
                    </a>
                    <button
                      type="button"
                      onClick={() => setReceipt(null)}
                      className="inline-flex items-center rounded-lg border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-[#111114] hover:bg-neutral-50"
                    >
                      Book Another Tour
                    </button>
                    {receipt.email && (
                      <button
                        type="button"
                        onClick={() => {
                          setSectionTab('status');
                          refreshSavedTickets();
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-3 text-xs font-semibold text-[#8B6816] hover:border-[#C59B38]"
                      >
                        <Ticket className="h-4 w-4" />
                        Check Trip Status
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                  {error && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="bk-fullname" className="block text-xs font-semibold text-neutral-700">
                        Full Name *
                      </label>
                      <input
                        id="bk-fullname"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                        className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-[#111114] focus:border-[#C59B38] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="bk-whatsapp" className="block text-xs font-semibold text-neutral-700">
                        WhatsApp Number *
                      </label>
                      <input
                        id="bk-whatsapp"
                        type="tel"
                        required
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        placeholder="+971 / country code + number"
                        className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-[#111114] focus:border-[#C59B38] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="bk-tour" className="block text-xs font-semibold text-neutral-700">
                      Selected Tour / Transfer *
                    </label>
                    <select
                      id="bk-tour"
                      required
                      value={tourId}
                      onChange={(e) => setTourId(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-[#111114] focus:border-[#C59B38] focus:outline-none"
                    >
                      {tours.map((tour) => {
                        const rateSummary = tour.priceNote
                          ? formatText(tour.priceNote)
                          : tour.startingPriceAed !== null
                            ? `From ${formatAmount(tour.startingPriceAed)}`
                            : '';
                        return (
                          <option key={tour.id} value={tour.id}>
                            {tour.title}
                            {rateSummary ? ` — ${rateSummary}` : ''}
                          </option>
                        );
                      })}
                    </select>
                    {selectedTour && (
                      <div className="mt-2.5 space-y-2.5 rounded-xl border border-neutral-200 bg-[#FAF9F6] p-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono-num text-xs font-semibold text-[#8B6816]">
                            {selectedTour.priceNote
                              ? formatText(selectedTour.priceNote)
                              : selectedTour.startingPriceAed !== null
                                ? `From ${formatAmount(selectedTour.startingPriceAed)}`
                                : ''}
                          </span>
                          <span className="text-[11px] font-medium text-neutral-600">
                            {selectedTour.duration}
                          </span>
                        </div>

                        {selectedTour.bookingOptions.length > 0 && (
                          <div>
                            <p className="text-[11px] font-semibold text-neutral-700">
                              Select Half-Day / Full-Day Tour Package &amp; Price *
                            </p>
                            <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                              {selectedTour.bookingOptions.map((opt) => {
                                const isActive = selectedOption === opt;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setSelectedOption(opt)}
                                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                                      isActive
                                        ? 'border-[#C59B38] bg-[#C59B38]/15 text-[#111114]'
                                        : 'border-neutral-200 bg-white text-neutral-700 hover:border-[#C59B38]/60'
                                    }`}
                                  >
                                    <span>{formatText(opt)}</span>
                                    {isActive && (
                                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#8B6816]" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <label htmlFor="bk-date" className="block text-xs font-semibold text-neutral-700">
                        Preferred Travel Date *
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id="bk-date"
                          type="date"
                          required
                          min={todayStr}
                          value={travelDate}
                          onChange={(e) => {
                            setTravelDate(e.target.value);
                            setError(null);
                          }}
                          className="font-mono-num rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-[#111114] focus:border-[#C59B38] focus:outline-none"
                        />
                        {travelDate && (
                          <span className="font-mono-num hidden sm:inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-900">
                            <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                            {formatDisplayDate(travelDate)}
                          </span>
                        )}
                      </div>
                    </div>
                    <AvailabilityCalendar
                      mode="select"
                      availability={availability}
                      selectedDate={travelDate}
                      onSelectDate={(dateStr) => {
                        setTravelDate(dateStr);
                        setError(null);
                      }}
                      minDate={todayStr}
                      loading={loadingAvailability}
                      onRefresh={fetchAvailability}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <span
                        id="bk-adults-label"
                        className="block text-xs font-semibold text-neutral-700"
                      >
                        Number of Adults *
                      </span>
                      <div
                        role="group"
                        aria-labelledby="bk-adults-label"
                        className="mt-1.5 flex items-center justify-between rounded-lg border border-neutral-300 bg-[#FAF9F6] p-1"
                      >
                        <button
                          type="button"
                          onClick={() => setAdults((prev) => Math.max(1, prev - 1))}
                          disabled={adults <= 1}
                          aria-label="Decrease number of adults"
                          className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-white text-[#111114] transition-colors hover:border-[#C59B38] hover:bg-[#FAF9F6] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span
                          aria-live="polite"
                          className="font-mono-num min-w-[3rem] text-center text-base font-semibold text-[#111114] select-none"
                        >
                          {adults}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAdults((prev) => Math.min(20, prev + 1))}
                          disabled={adults >= 20}
                          aria-label="Increase number of adults"
                          className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-white text-[#111114] transition-colors hover:border-[#C59B38] hover:bg-[#FAF9F6] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] text-neutral-500">1 – 20 adults</p>
                    </div>

                    <div>
                      <span
                        id="bk-children-label"
                        className="block text-xs font-semibold text-neutral-700"
                      >
                        Number of Children
                      </span>
                      <div
                        role="group"
                        aria-labelledby="bk-children-label"
                        className="mt-1.5 flex items-center justify-between rounded-lg border border-neutral-300 bg-[#FAF9F6] p-1"
                      >
                        <button
                          type="button"
                          onClick={() => setChildren((prev) => Math.max(0, prev - 1))}
                          disabled={children <= 0}
                          aria-label="Decrease number of children"
                          className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-white text-[#111114] transition-colors hover:border-[#C59B38] hover:bg-[#FAF9F6] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span
                          aria-live="polite"
                          className="font-mono-num min-w-[3rem] text-center text-base font-semibold text-[#111114] select-none"
                        >
                          {children}
                        </span>
                        <button
                          type="button"
                          onClick={() => setChildren((prev) => Math.min(20, prev + 1))}
                          disabled={children >= 20}
                          aria-label="Increase number of children"
                          className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-white text-[#111114] transition-colors hover:border-[#C59B38] hover:bg-[#FAF9F6] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] text-neutral-500">0 – 20 children</p>
                    </div>

                    <div>
                      <label htmlFor="bk-pickup" className="block text-xs font-semibold text-neutral-700">
                        Hotel or Pickup Location (Optional)
                      </label>
                      <input
                        id="bk-pickup"
                        type="text"
                        value={pickupLocation}
                        onChange={(e) => setPickupLocation(e.target.value)}
                        placeholder="Hotel name, area, or DXB terminal"
                        className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-[#111114] focus:border-[#C59B38] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="bk-email" className="block text-xs font-semibold text-neutral-700">
                        Email Address (Optional)
                      </label>
                      <input
                        id="bk-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-[#111114] focus:border-[#C59B38] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="bk-nationality" className="block text-xs font-semibold text-neutral-700">
                        Nationality (Optional)
                      </label>
                      <input
                        id="bk-nationality"
                        type="text"
                        value={nationality}
                        onChange={(e) => setNationality(e.target.value)}
                        placeholder="Country of passport / residence"
                        className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-[#111114] focus:border-[#C59B38] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="bk-req" className="block text-xs font-semibold text-neutral-700">
                      Additional Requirements (Optional)
                    </label>
                    <textarea
                      id="bk-req"
                      rows={2}
                      value={requirements}
                      onChange={(e) => setRequirements(e.target.value)}
                      placeholder="Preferred start time, child seat, photography stops, or custom landmarks..."
                      className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-[#111114] focus:border-[#C59B38] focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0B0B0D] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1F1F25] disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-[#C59B38]" />
                          Submitting Request...
                        </>
                      ) : (
                        <>
                          <Calendar className="h-4 w-4 text-[#C59B38]" />
                          Submit Booking Request
                        </>
                      )}
                    </button>
                    <a
                      href={draftWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-[#111114] transition-colors hover:border-[#C59B38] hover:bg-[#FAF9F6]"
                    >
                      <MessageCircle className="h-4 w-4 text-[#15803D]" />
                      Book via WhatsApp Instead
                    </a>
                  </div>
                </form>
              )}
            </div>
          </div>

          <aside className="space-y-6 lg:col-span-4">
            <div className="rounded-2xl border border-neutral-200 bg-[#0B0B0D] p-6 text-white">
              <p className="text-xs font-semibold text-[#C59B38]">How Booking Works</p>
              <ol className="mt-4 space-y-3 text-sm text-neutral-300">
                <li className="flex items-start gap-3">
                  <span className="font-mono-num text-xs font-semibold text-[#C59B38]">01</span>
                  <span>Pick an available date on the calendar and submit your visit request online.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-mono-num text-xs font-semibold text-[#C59B38]">02</span>
                  <span>Receive your unique booking ticket reference code immediately.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-mono-num text-xs font-semibold text-[#C59B38]">03</span>
                  <span>
                    Track live status (<strong>Pending</strong>, <strong>Approved</strong>, or{' '}
                    <strong>Cancelled</strong>) anytime in &ldquo;Check Trip Status&rdquo;.
                  </span>
                </li>
              </ol>
              <div className="mt-6 space-y-2 border-t border-white/10 pt-5">
                <div>
                  <p className="text-xs text-neutral-400">Direct WhatsApp Desk</p>
                  <a
                    href={buildWhatsAppUrl(settings.whatsappNumber || '+971542218616')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono-num mt-1 inline-block text-base font-semibold text-white hover:text-[#F5E4B8]"
                  >
                    {settings.whatsappNumber || '+971542218616'}
                  </a>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Official Gmail</p>
                  <a
                    href={`mailto:${settings.email || 'tripadventure63@gmail.com'}`}
                    className="mt-0.5 inline-block text-xs font-semibold text-[#F5E4B8] hover:underline"
                  >
                    {settings.email || 'tripadventure63@gmail.com'}
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-2xl font-semibold text-[#111114]">
                  Check Trip Status
                </h3>
                <Ticket className="h-5 w-5 text-[#C59B38]" />
              </div>
              <p className="mt-1 text-xs text-neutral-600">
                Enter your reference code and email to verify if your visit is{' '}
                <strong>Approved</strong>, <strong>Pending</strong>, or <strong>Cancelled</strong>.
              </p>

              <form onSubmit={handleLookup} className="mt-4 space-y-3">
                <input
                  type="text"
                  required
                  value={lookupRef}
                  onChange={(e) => setLookupRef(e.target.value)}
                  placeholder="Reference (e.g. TA-DXB-XXXXXX)"
                  className="font-mono-num w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs uppercase text-[#111114] focus:border-[#C59B38] focus:outline-none"
                />
                <input
                  type="email"
                  required
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  placeholder="Email used during booking"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-[#111114] focus:border-[#C59B38] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={lookupLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B0B0D] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1F1F25] disabled:opacity-60"
                >
                  {lookupLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                  Look Up Trip Status
                </button>
              </form>

              {lookupError && (
                <p className="mt-3 text-xs text-red-700">{lookupError}</p>
              )}

              {lookupResult && (
                <div className="mt-4 rounded-xl border border-neutral-200 bg-[#FAF9F6] p-4 text-xs">
                  {(() => {
                    const meta = statusMeta(lookupResult.status);
                    return (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono-num font-semibold text-[#111114]">
                            {lookupResult.referenceCode}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-semibold ${meta.badgeClass}`}
                          >
                            {lookupResult.status === 'confirmed' ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : lookupResult.status === 'rejected' ? (
                              <XCircle className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {meta.label}
                          </span>
                        </div>
                        <p className="mt-2 font-medium text-[#111114]">{lookupResult.tourTitle}</p>
                        <p className="mt-1 text-neutral-600">
                          Date: <span className="font-mono-num">{lookupResult.travelDate}</span> ·{' '}
                          {lookupResult.adults} Adult(s)
                          {lookupResult.children > 0 ? `, ${lookupResult.children} Child(ren)` : ''}
                        </p>
                        {lookupResult.adminNotes && (
                          <p className="mt-2 border-t border-neutral-200 pt-2 text-neutral-700">
                            Guide Note: {lookupResult.adminNotes}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => setSectionTab('status')}
                          className="mt-3 w-full rounded-lg border border-neutral-300 bg-white py-1.5 text-center text-[11px] font-semibold text-[#111114] hover:border-[#C59B38]"
                        >
                          Open Full Ticket Pass View
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}

              {savedTickets.length > 0 && !lookupResult && (
                <div className="mt-4 border-t border-neutral-200 pt-4">
                  <p className="text-[11px] font-semibold text-neutral-600">
                    Saved Tickets ({savedTickets.length})
                  </p>
                  <div className="mt-2 space-y-2">
                    {savedTickets.slice(0, 3).map((tItem) => {
                      const meta = statusMeta(tItem.status);
                      return (
                        <button
                          key={tItem.referenceCode}
                          type="button"
                          onClick={() => setSectionTab('status')}
                          className="flex w-full items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-[#FAF9F6] px-3 py-2 text-left text-xs hover:border-[#C59B38]"
                        >
                          <div className="min-w-0">
                            <p className="font-mono-num font-semibold text-[#111114]">
                              {tItem.referenceCode}
                            </p>
                            <p className="truncate text-[11px] text-neutral-500">
                              {tItem.tourTitle} · {tItem.travelDate}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-semibold ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
