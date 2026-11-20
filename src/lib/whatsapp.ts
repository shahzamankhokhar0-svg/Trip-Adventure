export interface WhatsAppBookingPayload {
  customerName?: string;
  tourTitle?: string;
  preferredDate?: string;
  guests?: string;
  pickupLocation?: string;
  specialRequests?: string;
  referenceCode?: string;
}

export function cleanWhatsAppDigits(rawNumber: string): string {
  return rawNumber.replace(/[^\d]/g, '');
}

export function buildWhatsAppUrl(
  businessNumber: string,
  payload?: WhatsAppBookingPayload
): string {
  const digits = cleanWhatsAppDigits(businessNumber);
  if (!digits) return '#';

  if (!payload) {
    const defaultMsg =
      'Hello TRIP ADVENTURE, I would like to inquire about a private Dubai tour.';
    return `https://wa.me/${digits}?text=${encodeURIComponent(defaultMsg)}`;
  }

  const lines = [
    'Hello TRIP ADVENTURE (Program Organizer: Shahzaman Khokhar),',
    payload.referenceCode
      ? `I am following up on my booking request (${payload.referenceCode}):`
      : 'I would like to book / inquire about a Dubai tour or transfer:',
    `• Name: ${payload.customerName?.trim() || 'Guest'}`,
    `• Tour: ${payload.tourTitle?.trim() || 'Dubai Private Tour'}`,
    `• Preferred Date: ${payload.preferredDate?.trim() || 'To be discussed'}`,
    `• Number of Guests: ${payload.guests?.trim() || 'To be confirmed'}`,
    `• Pickup Location: ${payload.pickupLocation?.trim() || 'Dubai Hotel / Residence'}`,
    `• Special Requests: ${payload.specialRequests?.trim() || 'None'}`,
  ];

  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join('\n'))}`;
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

