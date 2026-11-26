export interface WhatsAppBookingPayload {
  customerName?: string;
  customerWhatsapp?: string;
  tourTitle?: string;
  preferredDate?: string;
  adults?: number;
  children?: number;
  guests?: string;
  pickupLocation?: string;
  specialRequests?: string;
  referenceCode?: string;
}

export function cleanWhatsAppDigits(rawNumber: string): string {
  return rawNumber.replace(/[^\d]/g, '');
}

export function formatBookingDetailsLines(payload: WhatsAppBookingPayload): string[] {
  const guestsSummary =
    typeof payload.adults === 'number'
      ? `Adults: ${payload.adults} | Children: ${payload.children ?? 0}`
      : payload.guests?.trim() || 'To be confirmed';

  const lines = [
    ...(payload.referenceCode ? [`Reference: ${payload.referenceCode}`] : []),
    `Name: ${payload.customerName?.trim() || 'Guest'}`,
    `Tour: ${payload.tourTitle?.trim() || 'Dubai Private Tour'}`,
    `Date: ${payload.preferredDate?.trim() || 'To be discussed'}`,
    ...(typeof payload.adults === 'number'
      ? [
          `Adults: ${payload.adults}`,
          `Children: ${payload.children ?? 0}`,
        ]
      : [`Guests: ${guestsSummary}`]),
    ...(payload.customerWhatsapp?.trim()
      ? [`Customer WhatsApp Number: ${payload.customerWhatsapp.trim()}`]
      : []),
    ...(payload.pickupLocation?.trim()
      ? [`Pickup Location: ${payload.pickupLocation.trim()}`]
      : []),
    ...(payload.specialRequests?.trim()
      ? [`Notes: ${payload.specialRequests.trim()}`]
      : []),
  ];
  return lines;
}

export function buildWhatsAppUrl(
  businessNumber: string,
  payload?: WhatsAppBookingPayload
): string {
  const digits = cleanWhatsAppDigits(businessNumber || '+971542218616');
  if (!digits) return '#';

  if (!payload) {
    const defaultMsg =
      'Hello TRIP ADVENTURE, I would like to inquire about a private Dubai tour.';
    return `https://wa.me/${digits}?text=${encodeURIComponent(defaultMsg)}`;
  }

  const lines = [
    'Hello TRIP ADVENTURE, please confirm my booking:',
    ...formatBookingDetailsLines(payload),
  ];

  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function buildBookingMailtoUrl(
  recipientEmail: string,
  payload: WhatsAppBookingPayload
): string {
  const to = recipientEmail?.trim() || 'tripadventure63@gmail.com';
  const subject = 'New Booking - TRIP ADVENTURE';
  const body = [
    'New Booking Request - TRIP ADVENTURE',
    '',
    ...formatBookingDetailsLines(payload),
  ].join('\n');
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

import type { BookingStatus } from '../types.ts';

export function buildGuestStatusWhatsAppUrl(params: {
  guestNumber: string;
  guestName: string;
  referenceCode: string;
  tourTitle: string;
  travelDate: string;
  status: BookingStatus;
  adminNotes?: string;
}): string {
  const digits = cleanWhatsAppDigits(params.guestNumber);
  if (!digits) return '#';

  const statusText =
    params.status === 'confirmed'
      ? 'CONFIRMED'
      : params.status === 'completed'
        ? 'COMPLETED (Thank You for Touring With Us)'
        : params.status === 'rejected'
          ? 'DECLINED / UNAVAILABLE'
          : 'PENDING REVIEW';

  const lines = [
    `Hello ${params.guestName},`,
    `Here is an update on your TRIP ADVENTURE Dubai booking (${params.referenceCode}):`,
    `• Status: ${statusText}`,
    `• Service: ${params.tourTitle}`,
    `• Date: ${params.travelDate}`,
    ...(params.adminNotes?.trim() ? [`• Guide Note: ${params.adminNotes.trim()}`] : []),
    '',
    'Best regards,',
    'Shahzaman Khokhar — TRIP ADVENTURE Dubai',
  ];

  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join('\n'))}`;
}

