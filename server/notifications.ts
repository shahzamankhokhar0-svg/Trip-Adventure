import nodemailer from 'nodemailer';
import type {
  BookingRequest,
  BookingStatus,
  NotificationChannelLog,
  NotificationConfigStatus,
  SiteSettings,
  TourPackage,
} from '../src/types.ts';

export const OWNER_NOTIFICATION_EMAIL =
  process.env.NOTIFICATION_OWNER_EMAIL?.trim() || 'tripadventure63@gmail.com';

function cleanDigits(raw: string): string {
  return raw.replace(/[^\d]/g, '').replace(/^00/, '');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createSmtpTransporter() {
  const smtpUrl = process.env.SMTP_URL?.trim();
  if (smtpUrl) {
    return nodemailer.createTransport(smtpUrl);
  }

  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT || 465);
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === 'true'
      : port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 7000,
  });
}

export function getNotificationConfigStatus(
  settings: SiteSettings
): NotificationConfigStatus {
  const smtpUrl = process.env.SMTP_URL?.trim();
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const smtpConfigured = Boolean(smtpUrl || (smtpHost && smtpUser && smtpPass));

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const whatsappApiConfigured = Boolean(phoneNumberId && accessToken);

  return {
    ownerEmailTarget: OWNER_NOTIFICATION_EMAIL,
    ownerWhatsappTarget: settings.whatsappNumber,
    smtpConfigured,
    smtpHost: smtpConfigured ? (smtpHost || 'custom-smtp') : '',
    whatsappApiConfigured,
  };
}

export async function sendWhatsAppCloudMessage(params: {
  recipientPhone: string;
  bodyText: string;
  templateName?: string;
  templateParams?: string[];
}): Promise<NotificationChannelLog> {
  const attemptedAt = new Date().toISOString();
  const toDigits = cleanDigits(params.recipientPhone || '');
  if (!toDigits || toDigits.length < 7) {
    return {
      status: 'failed',
      recipient: params.recipientPhone || 'none',
      detail: 'Invalid or missing WhatsApp recipient phone number.',
      attemptedAt,
    };
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() || 'v21.0';

  if (!phoneNumberId || !accessToken) {
    return {
      status: 'not_configured',
      recipient: `+${toDigits}`,
      detail:
        'Optional: WhatsApp Business Cloud API is not connected yet. Direct WhatsApp links remain active.',
      attemptedAt,
    };
  }

  const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  const payload = params.templateName
    ? {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toDigits,
        type: 'template',
        template: {
          name: params.templateName,
          language: {
            code: process.env.WHATSAPP_TEMPLATE_LANG?.trim() || 'en',
          },
          components:
            params.templateParams && params.templateParams.length > 0
              ? [
                  {
                    type: 'body',
                    parameters: params.templateParams.map((text) => ({
                      type: 'text',
                      text: String(text).slice(0, 1024),
                    })),
                  },
                ]
              : undefined,
        },
      }
    : {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toDigits,
        type: 'text',
        text: {
          preview_url: false,
          body: params.bodyText.slice(0, 4096),
        },
      };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000),
    });

    const data = (await response.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string; code?: number };
    };

    if (!response.ok) {
      return {
        status: 'failed',
        recipient: `+${toDigits}`,
        detail: data.error?.message || `WhatsApp Cloud API returned HTTP ${response.status}`,
        attemptedAt,
      };
    }

    const messageId = data.messages?.[0]?.id;
    return {
      status: 'sent',
      recipient: `+${toDigits}`,
      detail: 'Delivered via WhatsApp Business Cloud API.',
      messageId,
      attemptedAt,
    };
  } catch (err: unknown) {
    return {
      status: 'failed',
      recipient: `+${toDigits}`,
      detail: err instanceof Error ? err.message : 'WhatsApp Business Cloud API request failed.',
      attemptedAt,
    };
  }
}

export async function sendOwnerBookingEmail(
  booking: BookingRequest,
  tour: TourPackage | undefined,
  settings: SiteSettings
): Promise<NotificationChannelLog> {
  const attemptedAt = new Date().toISOString();
  const recipient = OWNER_NOTIFICATION_EMAIL;
  const transporter = createSmtpTransporter();

  if (!transporter) {
    return {
      status: 'not_configured',
      recipient,
      detail:
        'Optional: SMTP email is not connected yet. Booking is saved and visible in the Admin Dashboard.',
      attemptedAt,
    };
  }

  const fromAddress =
    process.env.SMTP_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    OWNER_NOTIFICATION_EMAIL;
  const ccAddress =
    settings.email &&
    settings.email.trim().toLowerCase() !== recipient.toLowerCase()
      ? settings.email.trim()
      : undefined;

  const priceDisplay =
    tour && tour.startingPriceAed !== null ? `${tour.startingPriceAed} AED` : 'Custom Quote (AED)';
  const appUrl = process.env.APP_URL?.trim() || 'Admin Dashboard (/admin)';

  const textBody = [
    `NEW DUBAI BOOKING REQUEST — ${booking.referenceCode}`,
    `Status: PENDING ADMIN APPROVAL (Not shown as confirmed to customer yet)`,
    ``,
    `--- CUSTOMER DETAILS ---`,
    `Full Name: ${booking.fullName}`,
    `Email: ${booking.email}`,
    `WhatsApp / Phone: ${booking.whatsappNumber}`,
    `Nationality: ${booking.nationality}`,
    ``,
    `--- TOUR & SCHEDULE DETAILS ---`,
    `Tour / Transfer: ${booking.tourTitle}`,
    `Duration: ${tour?.duration || 'N/A'}`,
    `Starting Rate: ${priceDisplay}`,
    `Travel Date: ${booking.travelDate}`,
    `Guests: ${booking.adults} Adult(s), ${booking.children} Child(ren)`,
    `Pickup Location: ${booking.pickupLocation}`,
    `Special Requirements: ${booking.requirements || 'None specified'}`,
    `Submitted At: ${booking.createdAt}`,
    ``,
    `Review & Confirm/Reject/Complete in Admin Dashboard: ${appUrl}`,
  ].join('\n');

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; color: #111114; border: 1px solid #e5e5e5; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #0B0B0D; padding: 20px 24px; color: #ffffff;">
        <p style="margin: 0; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #C59B38; font-weight: 700;">TRIP ADVENTURE · NEW BOOKING ALERT</p>
        <h2 style="margin: 6px 0 0; font-size: 20px; font-weight: 600;">Reference: ${escapeHtml(booking.referenceCode)}</h2>
        <p style="margin: 4px 0 0; font-size: 12px; color: #d4d4d8;">Status: Pending Admin Approval</p>
      </div>
      <div style="padding: 24px; background-color: #ffffff;">
        <h3 style="margin: 0 0 10px; font-size: 14px; color: #8B6816;">Customer Information</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 18px;">
          <tr><td style="padding: 6px 0; color: #52525b; width: 150px;">Full Name</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(booking.fullName)}</td></tr>
          <tr><td style="padding: 6px 0; color: #52525b;">Email</td><td style="padding: 6px 0;">${escapeHtml(booking.email)}</td></tr>
          <tr><td style="padding: 6px 0; color: #52525b;">WhatsApp</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(booking.whatsappNumber)}</td></tr>
          <tr><td style="padding: 6px 0; color: #52525b;">Nationality</td><td style="padding: 6px 0;">${escapeHtml(booking.nationality)}</td></tr>
        </table>
        <h3 style="margin: 0 0 10px; font-size: 14px; color: #8B6816;">Tour &amp; Itinerary Details</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr><td style="padding: 6px 0; color: #52525b; width: 150px;">Selected Tour</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(booking.tourTitle)}</td></tr>
          <tr><td style="padding: 6px 0; color: #52525b;">Travel Date</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(booking.travelDate)}</td></tr>
          <tr><td style="padding: 6px 0; color: #52525b;">Party Size</td><td style="padding: 6px 0;">${booking.adults} Adult(s), ${booking.children} Child(ren)</td></tr>
          <tr><td style="padding: 6px 0; color: #52525b;">Pickup Location</td><td style="padding: 6px 0;">${escapeHtml(booking.pickupLocation)}</td></tr>
          <tr><td style="padding: 6px 0; color: #52525b;">Starting Rate</td><td style="padding: 6px 0;">${escapeHtml(priceDisplay)} (${escapeHtml(tour?.duration || 'Custom')})</td></tr>
          <tr><td style="padding: 6px 0; color: #52525b;">Requirements</td><td style="padding: 6px 0;">${escapeHtml(booking.requirements || 'None')}</td></tr>
        </table>
        <div style="margin-top: 20px; padding: 12px 14px; background-color: #FAF9F6; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 12px; color: #3f3f46;">
          This reservation remains <strong>Pending</strong> until confirmed in the Admin Dashboard.
        </div>
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"TRIP ADVENTURE Bookings" <${fromAddress}>`,
      to: recipient,
      cc: ccAddress,
      replyTo: booking.email,
      subject: `New Dubai Booking Request [${booking.referenceCode}] – ${booking.tourTitle}`,
      text: textBody,
      html: htmlBody,
    });

    return {
      status: 'sent',
      recipient: ccAddress ? `${recipient} (CC: ${ccAddress})` : recipient,
      detail: 'Email notification dispatched successfully via SMTP.',
      messageId: info.messageId,
      attemptedAt,
    };
  } catch (err: unknown) {
    return {
      status: 'failed',
      recipient,
      detail: err instanceof Error ? err.message : 'SMTP email delivery failed.',
      attemptedAt,
    };
  }
}

function statusHeadingForCustomer(status: BookingStatus): string {
  if (status === 'confirmed') return 'CONFIRMED / APPROVED';
  if (status === 'completed') return 'COMPLETED — Thank You for Touring With Us';
  if (status === 'rejected') return 'CANCELLED / DECLINED';
  return 'PENDING REVIEW';
}

export async function sendCustomerStatusEmail(
  booking: BookingRequest,
  settings: SiteSettings
): Promise<NotificationChannelLog> {
  const attemptedAt = new Date().toISOString();
  const transporter = createSmtpTransporter();
  if (!transporter) {
    return {
      status: 'not_configured',
      recipient: booking.email,
      detail:
        'Optional: SMTP email is not connected yet. Status is updated immediately on the customer ticket.',
      attemptedAt,
    };
  }

  const fromAddress =
    process.env.SMTP_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    OWNER_NOTIFICATION_EMAIL;
  const statusLabel = statusHeadingForCustomer(booking.status);

  const textBody = [
    `Hello ${booking.fullName},`,
    ``,
    `Your TRIP ADVENTURE booking ticket (${booking.referenceCode}) status has been updated:`,
    `Status: ${statusLabel}`,
    `Service: ${booking.tourTitle}`,
    `Travel Date: ${booking.travelDate}`,
    `Guests: ${booking.adults} Adult(s), ${booking.children} Child(ren)`,
    `Pickup Location: ${booking.pickupLocation}`,
    ...(booking.adminNotes ? [`Guide Note: ${booking.adminNotes}`] : []),
    ``,
    `WhatsApp Desk: ${settings.whatsappNumber}`,
    `Best regards,`,
    `${settings.guideName} — ${settings.brandName}`,
  ].join('\n');

  try {
    const info = await transporter.sendMail({
      from: `"TRIP ADVENTURE Dubai" <${fromAddress}>`,
      to: booking.email,
      replyTo: OWNER_NOTIFICATION_EMAIL,
      subject: `Booking Update [${booking.referenceCode}]: ${statusLabel}`,
      text: textBody,
    });

    return {
      status: 'sent',
      recipient: booking.email,
      detail: `Customer status email (${booking.status}) delivered via SMTP.`,
      messageId: info.messageId,
      attemptedAt,
    };
  } catch (err: unknown) {
    return {
      status: 'failed',
      recipient: booking.email,
      detail: err instanceof Error ? err.message : 'Customer SMTP email delivery failed.',
      attemptedAt,
    };
  }
}

export async function notifyOwnerOnNewBooking(
  booking: BookingRequest,
  tour: TourPackage | undefined,
  settings: SiteSettings
): Promise<{
  ownerEmail: NotificationChannelLog;
  ownerWhatsapp: NotificationChannelLog;
}> {
  const whatsappText = [
    `*NEW DUBAI BOOKING — ${booking.referenceCode}*`,
    `Status: Pending Admin Approval`,
    `• Customer: ${booking.fullName}`,
    `• Email: ${booking.email}`,
    `• Guest WhatsApp: ${booking.whatsappNumber}`,
    `• Nationality: ${booking.nationality}`,
    `• Tour: ${booking.tourTitle}`,
    `• Date: ${booking.travelDate}`,
    `• Party: ${booking.adults} Adult(s), ${booking.children} Child(ren)`,
    `• Pickup: ${booking.pickupLocation}`,
    ...(booking.requirements ? [`• Notes: ${booking.requirements}`] : []),
    `Please review in the TRIP ADVENTURE Admin Dashboard to confirm, reject, or mark completed.`,
  ].join('\n');

  const ownerTemplate = process.env.WHATSAPP_OWNER_TEMPLATE_NAME?.trim() || undefined;
  const [ownerEmail, ownerWhatsapp] = await Promise.all([
    sendOwnerBookingEmail(booking, tour, settings),
    sendWhatsAppCloudMessage({
      recipientPhone: settings.whatsappNumber,
      bodyText: whatsappText,
      templateName: ownerTemplate,
      templateParams: ownerTemplate
        ? [
            booking.referenceCode,
            booking.fullName,
            booking.tourTitle,
            booking.travelDate,
            booking.whatsappNumber,
          ]
        : undefined,
    }),
  ]);

  return { ownerEmail, ownerWhatsapp };
}

export async function notifyCustomerOnStatusChange(
  booking: BookingRequest,
  settings: SiteSettings
): Promise<{
  customerWhatsapp: NotificationChannelLog;
  customerEmail: NotificationChannelLog;
}> {
  const statusLabel = statusHeadingForCustomer(booking.status);
  const whatsappText = [
    `Hello ${booking.fullName},`,
    `Your TRIP ADVENTURE Dubai booking (${booking.referenceCode}) status is now: *${statusLabel}*`,
    `• Service: ${booking.tourTitle}`,
    `• Date: ${booking.travelDate}`,
    `• Pickup: ${booking.pickupLocation}`,
    ...(booking.adminNotes ? [`• Note: ${booking.adminNotes}`] : []),
    `Questions? Reply here or message ${settings.whatsappNumber}.`,
  ].join('\n');

  const statusTemplate = process.env.WHATSAPP_STATUS_TEMPLATE_NAME?.trim() || undefined;
  const [customerWhatsapp, customerEmail] = await Promise.all([
    sendWhatsAppCloudMessage({
      recipientPhone: booking.whatsappNumber,
      bodyText: whatsappText,
      templateName: statusTemplate,
      templateParams: statusTemplate
        ? [
            booking.fullName,
            booking.referenceCode,
            statusLabel,
            booking.tourTitle,
            booking.travelDate,
          ]
        : undefined,
    }),
    sendCustomerStatusEmail(booking, settings),
  ]);

  return { customerWhatsapp, customerEmail };
}
