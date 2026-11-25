import compression from 'compression';
import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  buildAdminAnalytics,
  getFastBootstrapSnapshot,
  getFastCacheStats,
  getFastToursSnapshot,
  invalidateFastCache,
} from './server/fastCache.ts';
import {
  BUILT_IN_IMAGES,
  createDefaultCmsContent,
  createDefaultSeoPages,
  hashPassword,
  loadStore,
  saveStore,
  verifyPassword,
} from './server/store.ts';
import {
  getNotificationConfigStatus,
  notifyCustomerOnStatusChange,
  notifyOwnerOnNewBooking,
} from './server/notifications.ts';
import type {
  AvailabilityPayload,
  BookingRequest,
  CmsContent,
  CmsFaqItem,
  CmsWhyCard,
  ContactInquiry,
  CustomerReview,
  DashboardStats,
  DateBookingSummary,
  FaqCategory,
  GalleryItem,
  MediaAsset,
  NewsletterSubscriber,
  PublicPageKey,
  SeoPagesMap,
  TourPackage,
} from './src/types.ts';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';
const SESSION_COOKIE = 'ta_admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

// Ephemeral fallback secret per server lifecycle if SESSION_SECRET is unset
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = decodeURIComponent(part.slice(0, idx).trim());
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    result[key] = val;
  }
  return result;
}

function signSessionToken(username: string): string {
  const payload = Buffer.from(
    JSON.stringify({ username, exp: Date.now() + SESSION_TTL_MS }),
    'utf8'
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string): { username: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expected = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payload)
      .digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!decoded.username || typeof decoded.exp !== 'number' || decoded.exp < Date.now()) {
      return null;
    }
    return { username: String(decoded.username) };
  } catch {
    return null;
  }
}

interface AdminRequest extends Request {
  adminUser?: string;
}

function requireAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const session = verifySessionToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  req.adminUser = session.username;
  next();
}

function sanitizeText(input: unknown, maxLen = 1000): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLen);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateReferenceCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[crypto.randomInt(0, chars.length)];
  }
  return `TA-DXB-${suffix}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function buildAvailabilityPayload(store: ReturnType<typeof loadStore>): AvailabilityPayload {
  const bookedDates: Record<string, DateBookingSummary> = {};
  for (const booking of store.bookings) {
    if (!booking.travelDate || booking.status === 'rejected') continue;
    if (!bookedDates[booking.travelDate]) {
      bookedDates[booking.travelDate] = { confirmed: 0, pending: 0 };
    }
    if (booking.status === 'confirmed') {
      bookedDates[booking.travelDate].confirmed += 1;
    } else if (booking.status === 'pending') {
      bookedDates[booking.travelDate].pending += 1;
    }
  }

  const blockedDates = [...(store.blockedDates || [])]
    .filter((entry) => entry && /^\d{4}-\d{2}-\d{2}$/.test(entry.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    blockedDates,
    bookedDates,
    autoBlockConfirmedDates: store.autoBlockConfirmedDates !== false,
  };
}

function getBlockedReasonForDate(
  store: ReturnType<typeof loadStore>,
  travelDate: string
): string | null {
  const manualBlock = (store.blockedDates || []).find((b) => b.date === travelDate);
  if (manualBlock) {
    return manualBlock.reason
      ? `The selected date (${travelDate}) is unavailable: ${manualBlock.reason}. Please choose another available date on the calendar.`
      : `The selected date (${travelDate}) is blocked and unavailable. Please choose another date on the calendar.`;
  }

  if (store.autoBlockConfirmedDates !== false) {
    const hasConfirmed = store.bookings.some(
      (b) => b.travelDate === travelDate && b.status === 'confirmed'
    );
    if (hasConfirmed) {
      return `The selected date (${travelDate}) is already fully booked with a confirmed reservation. Please pick another available date on the calendar.`;
    }
  }

  return null;
}

function saveBase64Image(dataUrl: string): string | null {
  const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1];
  const base64 = match[2];
  const buf = Buffer.from(base64, 'base64');
  if (buf.length > 3 * 1024 * 1024) {
    throw new Error('Image exceeds 3MB size limit');
  }
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(filePath, buf);
  return `/uploads/${filename}`;
}

const adminSseClients = new Set<Response>();

function computeDashboardStats(store: ReturnType<typeof loadStore>): DashboardStats {
  return {
    totalBookings: store.bookings.length,
    pendingBookings: store.bookings.filter((b) => b.status === 'pending').length,
    confirmedBookings: store.bookings.filter((b) => b.status === 'confirmed').length,
    completedBookings: store.bookings.filter((b) => b.status === 'completed').length,
    rejectedBookings: store.bookings.filter((b) => b.status === 'rejected').length,
    unreadInquiries: store.inquiries.filter((i) => i.status === 'unread').length,
    pendingReviews: store.reviews.filter((r) => r.status === 'pending').length,
    totalTours: store.tours.length,
    totalGallery: store.gallery.length,
    newsletterSubscribers: (store.newsletterSubscribers || []).filter(
      (s) => s.status === 'subscribed'
    ).length,
  };
}

function broadcastAdminBookingEvent(
  eventType: 'booking_created' | 'booking_updated',
  store: ReturnType<typeof loadStore>,
  booking: BookingRequest
) {
  if (adminSseClients.size === 0) return;
  const payload = JSON.stringify({
    eventType,
    booking,
    stats: computeDashboardStats(store),
    availability: buildAvailabilityPayload(store),
  });
  for (const client of adminSseClients) {
    try {
      client.write(`event: ${eventType}\ndata: ${payload}\n\n`);
    } catch {
      adminSseClients.delete(client);
    }
  }
}

async function startServer() {
  const app = express();
  app.use(compression({ threshold: 1024 }));
  app.use(express.json({ limit: '5mb' }));
  app.use(
    '/uploads',
    express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true, etag: true })
  );
  app.use(
    '/src/assets',
    express.static(path.resolve(process.cwd(), 'src', 'assets'), {
      maxAge: '30d',
      immutable: true,
      etag: true,
    })
  );

  // Ensure store is initialized & pre-warm Fast API RAM cache on startup
  const initialStore = loadStore();
  const mapsKeyOnBoot =
    process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
  getFastBootstrapSnapshot(initialStore, mapsKeyOnBoot);

  // Dynamic SEO Sitemap & Robots.txt
  app.get('/robots.txt', (_req, res) => {
    const baseUrl = process.env.APP_URL || '';
    res.type('text/plain').send(
      `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/admin\n${
        baseUrl ? `Sitemap: ${baseUrl.replace(/\/$/, '')}/sitemap.xml\n` : ''
      }`
    );
  });

  app.get('/sitemap.xml', (req, res) => {
    const store = loadStore();
    const baseUrl = (
      process.env.APP_URL || `${req.protocol}://${req.get('host') || 'localhost:3000'}`
    ).replace(/\/$/, '');
    const staticPaths = ['', '/about', '/tours', '/attractions', '/gallery', '/reviews', '/contact', '/book'];
    const tourPaths = store.tours.map((t) => `/tours/${t.slug}`);
    const urls = [...staticPaths, ...tourPaths]
      .map(
        (p) =>
          `  <url>\n    <loc>${baseUrl}${p || '/'}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${
            p === '' ? '1.0' : '0.8'
          }</priority>\n  </url>`
      )
      .join('\n');

    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
    );
  });

  // High-Speed In-Memory Cached Bootstrap Handler (shared by /api/public/bootstrap and /api/fast/bootstrap)
  const serveFastBootstrap = (req: Request, res: Response) => {
    const t0 = performance.now();
    const store = loadStore();
    const mapsApiKey =
      process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
    const { snapshot, cacheStatus } = getFastBootstrapSnapshot(store, mapsApiKey);

    res.setHeader('ETag', snapshot.etag);
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=300');
    res.setHeader('Vary', 'Accept-Encoding');
    res.setHeader('X-Cache', cacheStatus);

    if (req.headers['if-none-match'] === snapshot.etag) {
      res.setHeader('X-Response-Time', `${(performance.now() - t0).toFixed(2)}ms`);
      return res.status(304).end();
    }

    const acceptsGzip = (req.headers['accept-encoding'] || '').includes('gzip');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Response-Time', `${(performance.now() - t0).toFixed(2)}ms`);
    if (acceptsGzip) {
      res.setHeader('Content-Encoding', 'gzip');
      return res.send(snapshot.gzipBuffer);
    }
    return res.send(snapshot.rawBuffer);
  };

  app.get('/api/public/bootstrap', serveFastBootstrap);
  app.get('/api/fast/bootstrap', serveFastBootstrap);

  app.get('/api/fast/tours', (req, res) => {
    const t0 = performance.now();
    const store = loadStore();
    const category = sanitizeText(req.query.category, 80);
    const featured = req.query.featured === 'true';

    if (!category && !featured) {
      const { snapshot, cacheStatus } = getFastToursSnapshot(store);
      res.setHeader('ETag', snapshot.etag);
      res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=300');
      res.setHeader('Vary', 'Accept-Encoding');
      res.setHeader('X-Cache', cacheStatus);
      if (req.headers['if-none-match'] === snapshot.etag) {
        res.setHeader('X-Response-Time', `${(performance.now() - t0).toFixed(2)}ms`);
        return res.status(304).end();
      }
      const acceptsGzip = (req.headers['accept-encoding'] || '').includes('gzip');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('X-Response-Time', `${(performance.now() - t0).toFixed(2)}ms`);
      if (acceptsGzip) {
        res.setHeader('Content-Encoding', 'gzip');
        return res.send(snapshot.gzipBuffer);
      }
      return res.send(snapshot.rawBuffer);
    }

    let list = [...store.tours].sort((a, b) => a.sortOrder - b.sortOrder);
    if (category) {
      list = list.filter((t) => t.category.toLowerCase() === category.toLowerCase());
    }
    if (featured) {
      list = list.filter((t) => t.featured);
    }
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=300');
    res.setHeader('X-Response-Time', `${(performance.now() - t0).toFixed(2)}ms`);
    return res.json({ count: list.length, tours: list });
  });

  app.get('/api/fast/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: true,
      cache: getFastCacheStats(),
    });
  });

  // Public live availability feed synced directly with Admin bookings & blocked dates
  app.get('/api/availability', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const store = loadStore();
    res.json(buildAvailabilityPayload(store));
  });

  // Submit booking request (always saved as 'pending', never auto-confirmed)
  app.post('/api/bookings', async (req, res) => {
    const store = loadStore();
    const fullName = sanitizeText(req.body?.fullName, 120);
    const email = sanitizeText(req.body?.email, 160).toLowerCase();
    const whatsappNumber = sanitizeText(req.body?.whatsappNumber, 40);
    const nationality = sanitizeText(req.body?.nationality, 80);
    const tourId = sanitizeText(req.body?.tourId, 80);
    const travelDate = sanitizeText(req.body?.travelDate, 20);
    const adults = Number(req.body?.adults);
    const children = Number(req.body?.children ?? 0);
    const pickupLocation = sanitizeText(req.body?.pickupLocation, 220);
    const requirements = sanitizeText(req.body?.requirements, 1200);

    if (!fullName || fullName.length < 2) {
      return res.status(400).json({ error: 'Please enter your full name.' });
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!whatsappNumber || whatsappNumber.length < 6) {
      return res.status(400).json({ error: 'Please enter a valid WhatsApp or phone number.' });
    }
    if (!nationality) {
      return res.status(400).json({ error: 'Please enter your nationality.' });
    }
    if (!travelDate || !/^\d{4}-\d{2}-\d{2}$/.test(travelDate)) {
      return res.status(400).json({ error: 'Please select a valid travel date.' });
    }
    if (travelDate < getTodayDateString()) {
      return res.status(400).json({ error: 'Travel date cannot be in the past.' });
    }
    const blockedReason = getBlockedReasonForDate(store, travelDate);
    if (blockedReason) {
      return res.status(409).json({ error: blockedReason });
    }
    if (!Number.isInteger(adults) || adults < 1 || adults > 50) {
      return res.status(400).json({ error: 'Adults must be between 1 and 50.' });
    }
    if (!Number.isInteger(children) || children < 0 || children > 50) {
      return res.status(400).json({ error: 'Children must be between 0 and 50.' });
    }
    if (!pickupLocation || pickupLocation.length < 2) {
      return res.status(400).json({ error: 'Please enter your hotel or pickup location.' });
    }

    const tour = store.tours.find((t) => t.id === tourId || t.slug === tourId);
    if (!tour) {
      return res.status(400).json({ error: 'Please select a valid tour package.' });
    }

    let referenceCode = generateReferenceCode();
    while (store.bookings.some((b) => b.referenceCode === referenceCode)) {
      referenceCode = generateReferenceCode();
    }

    const now = new Date().toISOString();
    const booking: BookingRequest = {
      id: `bk-${crypto.randomUUID()}`,
      referenceCode,
      fullName,
      email,
      whatsappNumber,
      nationality,
      tourId: tour.id,
      tourTitle: tour.title,
      travelDate,
      adults,
      children,
      pickupLocation,
      requirements,
      status: 'pending',
      adminNotes: '',
      createdAt: now,
      updatedAt: now,
    };

    // 1. Save permanently in database as pending
    store.bookings.unshift(booking);
    saveStore(store);

    // 2. Display immediately in any open Admin Dashboard via SSE
    broadcastAdminBookingEvent('booking_created', store, booking);

    // 3. Send Owner Email (tripadventure63@gmail.com) & Owner WhatsApp Business API notifications
    try {
      const ownerNotifyResult = await notifyOwnerOnNewBooking(booking, tour, store.settings);
      booking.notifications = {
        ...(booking.notifications || {}),
        ownerEmail: ownerNotifyResult.ownerEmail,
        ownerWhatsapp: ownerNotifyResult.ownerWhatsapp,
      };
      saveStore(store);
      broadcastAdminBookingEvent('booking_updated', store, booking);
    } catch (err) {
      console.error('Owner booking notification dispatch error:', err);
    }

    res.status(201).json({
      booking: {
        referenceCode: booking.referenceCode,
        fullName: booking.fullName,
        email: booking.email,
        tourTitle: booking.tourTitle,
        travelDate: booking.travelDate,
        adults: booking.adults,
        children: booking.children,
        pickupLocation: booking.pickupLocation,
        requirements: booking.requirements,
        status: booking.status,
        createdAt: booking.createdAt,
      },
    });
  });

  // Scoped booking status lookup (requires exact referenceCode + matching email)
  app.get('/api/bookings/lookup', (req, res) => {
    const ref = sanitizeText(req.query.ref, 40).toUpperCase();
    const email = sanitizeText(req.query.email, 160).toLowerCase();
    if (!ref || !email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Reference code and matching email are required.' });
    }
    const store = loadStore();
    const found = store.bookings.find(
      (b) => b.referenceCode.toUpperCase() === ref && b.email.toLowerCase() === email
    );
    if (!found) {
      return res.status(404).json({ error: 'No booking request found matching that reference and email.' });
    }
    res.json({
      booking: {
        referenceCode: found.referenceCode,
        fullName: found.fullName,
        tourTitle: found.tourTitle,
        travelDate: found.travelDate,
        adults: found.adults,
        children: found.children,
        pickupLocation: found.pickupLocation,
        status: found.status,
        adminNotes: found.adminNotes,
        createdAt: found.createdAt,
        updatedAt: found.updatedAt,
      },
    });
  });

  // Scoped guest cancellation for pending requests (requires exact referenceCode + matching email)
  app.post('/api/bookings/cancel', (req, res) => {
    const ref = sanitizeText(req.body?.ref, 40).toUpperCase();
    const email = sanitizeText(req.body?.email, 160).toLowerCase();
    if (!ref || !email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Reference code and matching email are required.' });
    }
    const store = loadStore();
    const found = store.bookings.find(
      (b) => b.referenceCode.toUpperCase() === ref && b.email.toLowerCase() === email
    );
    if (!found) {
      return res.status(404).json({ error: 'No matching booking ticket found.' });
    }
    if (found.status === 'confirmed') {
      return res.status(409).json({
        error: 'Approved reservations cannot be cancelled automatically online. Please contact our WhatsApp desk for itinerary changes.',
      });
    }
    if (found.status !== 'rejected') {
      found.status = 'rejected';
      found.adminNotes = found.adminNotes
        ? `${found.adminNotes} · Cancelled by guest`
        : 'Cancelled by guest';
      found.updatedAt = new Date().toISOString();
      saveStore(store);
      broadcastAdminBookingEvent('booking_updated', store, found);
    }

    res.json({
      booking: {
        referenceCode: found.referenceCode,
        fullName: found.fullName,
        tourTitle: found.tourTitle,
        travelDate: found.travelDate,
        adults: found.adults,
        children: found.children,
        pickupLocation: found.pickupLocation,
        status: found.status,
        adminNotes: found.adminNotes,
        createdAt: found.createdAt,
        updatedAt: found.updatedAt,
      },
    });
  });

  // Submit customer review (saved as 'pending' until admin approves)
  app.post('/api/reviews', (req, res) => {
    const store = loadStore();
    const customerName = sanitizeText(req.body?.customerName, 80);
    const rating = Number(req.body?.rating);
    const comment = sanitizeText(req.body?.comment, 1000);
    const tourTitle = sanitizeText(req.body?.tourTitle, 120);
    let photoUrl: string | undefined;

    if (!customerName || customerName.length < 2) {
      return res.status(400).json({ error: 'Please enter your name.' });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5 stars.' });
    }
    if (!comment || comment.length < 10) {
      return res.status(400).json({ error: 'Please share at least a brief sentence about your experience.' });
    }

    if (typeof req.body?.photoDataUrl === 'string' && req.body.photoDataUrl.startsWith('data:image/')) {
      try {
        const saved = saveBase64Image(req.body.photoDataUrl);
        if (saved) photoUrl = saved;
      } catch (err: unknown) {
        return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid photo upload.' });
      }
    }

    const review: CustomerReview = {
      id: `rev-${crypto.randomUUID()}`,
      customerName,
      rating,
      comment,
      photoUrl,
      tourTitle: tourTitle || undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    store.reviews.unshift(review);
    saveStore(store);

    res.status(201).json({
      message: 'Thank you! Your review has been submitted and awaits guide verification before publishing.',
    });
  });

  // Submit contact inquiry
  app.post('/api/inquiries', (req, res) => {
    const store = loadStore();
    const name = sanitizeText(req.body?.name, 100);
    const email = sanitizeText(req.body?.email, 160).toLowerCase();
    const phone = sanitizeText(req.body?.phone, 40);
    const subject = sanitizeText(req.body?.subject, 160);
    const message = sanitizeText(req.body?.message, 2000);

    if (!name || name.length < 2) {
      return res.status(400).json({ error: 'Please enter your name.' });
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!message || message.length < 5) {
      return res.status(400).json({ error: 'Please enter your message.' });
    }

    const inquiry: ContactInquiry = {
      id: `inq-${crypto.randomUUID()}`,
      name,
      email,
      phone,
      subject: subject || 'Dubai Tour Inquiry',
      message,
      status: 'unread',
      createdAt: new Date().toISOString(),
    };

    store.inquiries.unshift(inquiry);
    saveStore(store);

    res.status(201).json({
      message: 'Your inquiry has been received. Program Organizer Shahzaman Khokhar will respond shortly.',
    });
  });

  // Subscribe email to special Dubai tour offers newsletter (persisted to data/newsletter.json + data/store.json)
  app.post('/api/newsletter', (req, res) => {
    const store = loadStore();
    const email = sanitizeText(req.body?.email, 160).toLowerCase();
    const name = sanitizeText(req.body?.name, 80);
    const source = sanitizeText(req.body?.source, 40) || 'footer';

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (!Array.isArray(store.newsletterSubscribers)) {
      store.newsletterSubscribers = [];
    }

    const existing = store.newsletterSubscribers.find(
      (s) => s.email.toLowerCase() === email
    );

    if (existing) {
      if (existing.status === 'subscribed') {
        return res.json({
          ok: true,
          alreadySubscribed: true,
          subscriber: existing,
          message: 'This email is already subscribed to Dubai tour offers.',
        });
      }
      existing.status = 'subscribed';
      existing.source = source || existing.source;
      if (name) existing.name = name;
      existing.createdAt = new Date().toISOString();
      saveStore(store);
      return res.json({
        ok: true,
        alreadySubscribed: false,
        subscriber: existing,
        message: 'Welcome back! Your email has been reactivated for special Dubai tour offers.',
      });
    }

    const subscriber: NewsletterSubscriber = {
      id: `nl-${crypto.randomUUID()}`,
      email,
      ...(name ? { name } : {}),
      status: 'subscribed',
      source,
      createdAt: new Date().toISOString(),
    };

    store.newsletterSubscribers.unshift(subscriber);
    saveStore(store);

    return res.status(201).json({
      ok: true,
      alreadySubscribed: false,
      subscriber,
      message: 'Subscribed! You will receive special Dubai tour offers in AED.',
    });
  });

  // --- ADMIN AUTHENTICATION ROUTES ---
  app.get('/api/admin/auth-status', (req, res) => {
    const store = loadStore();
    const cookies = parseCookies(req);
    const token = cookies[SESSION_COOKIE];
    const session = token ? verifySessionToken(token) : null;
    res.json({
      authenticated: Boolean(session),
      setupRequired: !store.admin,
      username: session?.username,
    });
  });

  app.post('/api/admin/setup', (req, res) => {
    const store = loadStore();
    if (store.admin) {
      return res.status(403).json({ error: 'Admin account is already initialized.' });
    }
    const username = sanitizeText(req.body?.username, 60) || 'admin';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const { hash, salt } = hashPassword(password);
    store.admin = {
      username,
      passwordHash: hash,
      salt,
      updatedAt: new Date().toISOString(),
    };
    saveStore(store);

    const token = signSessionToken(username);
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: IS_PROD && req.secure,
      maxAge: SESSION_TTL_MS,
      path: '/',
    });
    res.status(201).json({ authenticated: true, username });
  });

  app.post('/api/admin/login', (req, res) => {
    const store = loadStore();
    if (!store.admin) {
      return res.status(400).json({ error: 'Admin account setup required first.' });
    }
    const username = sanitizeText(req.body?.username, 60);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (
      username !== store.admin.username ||
      !verifyPassword(password, store.admin.passwordHash, store.admin.salt)
    ) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = signSessionToken(store.admin.username);
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: IS_PROD && req.secure,
      maxAge: SESSION_TTL_MS,
      path: '/',
    });
    res.json({ authenticated: true, username: store.admin.username });
  });

  app.post('/api/admin/logout', (_req, res) => {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.json({ authenticated: false });
  });

  // Real-time Server-Sent Events stream for instant Admin booking notifications
  app.get('/api/admin/events', requireAdmin, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    adminSseClients.add(res);
    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);

    const keepAlive = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(keepAlive);
        adminSseClients.delete(res);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      adminSseClients.delete(res);
    });
  });

  // --- PROTECTED ADMIN ROUTES ---
  app.get('/api/admin/dashboard', requireAdmin, (_req, res) => {
    const store = loadStore();
    const stats = computeDashboardStats(store);

    res.json({
      stats,
      bookings: store.bookings,
      availability: buildAvailabilityPayload(store),
      notificationConfig: getNotificationConfigStatus(store.settings),
      inquiries: store.inquiries,
      reviews: store.reviews,
      tours: [...store.tours].sort((a, b) => a.sortOrder - b.sortOrder),
      gallery: store.gallery,
      settings: store.settings,
      cms: store.cms,
      newsletterSubscribers: store.newsletterSubscribers || [],
    });
  });

  // Admin Analytics & Fast API Performance Endpoint
  app.get('/api/admin/analytics', requireAdmin, (req, res) => {
    const store = loadStore();
    const rawRange = String(req.query.range || '14d');
    const range: '14d' | '30d' | 'monthly' =
      rawRange === '30d' || rawRange === 'monthly' ? rawRange : '14d';
    res.json(buildAdminAnalytics(store, range));
  });

  // Rebuild & Warm Fast API Cache manually
  app.post('/api/admin/cache/refresh', requireAdmin, (_req, res) => {
    const store = loadStore();
    const mapsApiKey =
      process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
    invalidateFastCache();
    getFastBootstrapSnapshot(store, mapsApiKey);
    getFastToursSnapshot(store);
    res.json({ ok: true, cache: getFastCacheStats() });
  });

  // Media Library: List uploaded + built-in images
  app.get('/api/admin/media', requireAdmin, (_req, res) => {
    const uploaded: MediaAsset[] = [];
    if (fs.existsSync(UPLOAD_DIR)) {
      const files = fs.readdirSync(UPLOAD_DIR);
      for (const file of files) {
        if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
        const fullPath = path.join(UPLOAD_DIR, file);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isFile()) {
            uploaded.push({
              id: `upload-${file}`,
              filename: file,
              url: `/uploads/${file}`,
              source: 'uploaded',
              sizeBytes: stat.size,
              createdAt: stat.mtime.toISOString(),
            });
          }
        } catch {
          // Skip unreadable files
        }
      }
      uploaded.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }

    res.json({
      media: [...uploaded, ...BUILT_IN_IMAGES],
    });
  });

  app.post('/api/admin/upload', requireAdmin, (req, res) => {
    const dataUrl = typeof req.body?.dataUrl === 'string' ? req.body.dataUrl : '';
    try {
      const saved = saveBase64Image(dataUrl);
      if (!saved) {
        return res.status(400).json({ error: 'Invalid image format. Use PNG, JPG, or WEBP.' });
      }
      res.status(201).json({ url: saved });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Upload failed.' });
    }
  });

  app.delete('/api/admin/media/:filename', requireAdmin, (req, res) => {
    const rawName = String(req.params.filename || '');
    const safeName = path.basename(rawName);
    if (!safeName || safeName !== rawName || !/^[a-zA-Z0-9._-]+$/.test(safeName)) {
      return res.status(400).json({ error: 'Invalid filename.' });
    }
    const targetPath = path.join(UPLOAD_DIR, safeName);
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: 'Uploaded file not found.' });
    }
    fs.unlinkSync(targetPath);
    res.json({ ok: true });
  });

  // Admin Bookings CRUD
  app.patch('/api/admin/bookings/:id', requireAdmin, async (req, res) => {
    const store = loadStore();
    const booking = store.bookings.find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    const previousStatus = booking.status;
    const status = req.body?.status;
    if (status && ['pending', 'confirmed', 'completed', 'rejected'].includes(status)) {
      booking.status = status;
    }
    if (typeof req.body?.adminNotes === 'string') {
      booking.adminNotes = sanitizeText(req.body.adminNotes, 1000);
    }
    booking.updatedAt = new Date().toISOString();
    saveStore(store);

    const statusChanged = booking.status !== previousStatus;
    const shouldNotifyCustomer =
      req.body?.notifyCustomer === true ||
      (statusChanged && ['confirmed', 'completed', 'rejected'].includes(booking.status));

    if (shouldNotifyCustomer) {
      try {
        const customerResults = await notifyCustomerOnStatusChange(booking, store.settings);
        booking.notifications = {
          ...(booking.notifications || {}),
          customerWhatsapp: customerResults.customerWhatsapp,
          customerEmail: customerResults.customerEmail,
        };
        saveStore(store);
      } catch (err) {
        console.error('Customer status notification error:', err);
      }
    }

    broadcastAdminBookingEvent('booking_updated', store, booking);
    res.json({ booking, availability: buildAvailabilityPayload(store) });
  });

  app.post('/api/admin/bookings/:id/notify', requireAdmin, async (req, res) => {
    const store = loadStore();
    const booking = store.bookings.find((b) => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    const target = req.body?.target === 'owner' ? 'owner' : 'customer';
    if (target === 'owner') {
      const tour = store.tours.find((t) => t.id === booking.tourId || t.slug === booking.tourId);
      const result = await notifyOwnerOnNewBooking(booking, tour, store.settings);
      booking.notifications = {
        ...(booking.notifications || {}),
        ownerEmail: result.ownerEmail,
        ownerWhatsapp: result.ownerWhatsapp,
      };
    } else {
      const result = await notifyCustomerOnStatusChange(booking, store.settings);
      booking.notifications = {
        ...(booking.notifications || {}),
        customerWhatsapp: result.customerWhatsapp,
        customerEmail: result.customerEmail,
      };
    }

    saveStore(store);
    broadcastAdminBookingEvent('booking_updated', store, booking);
    res.json({ booking });
  });

  app.delete('/api/admin/bookings/:id', requireAdmin, (req, res) => {
    const store = loadStore();
    const before = store.bookings.length;
    store.bookings = store.bookings.filter((b) => b.id !== req.params.id);
    if (store.bookings.length === before) return res.status(404).json({ error: 'Booking not found.' });
    saveStore(store);
    res.json({ ok: true, availability: buildAvailabilityPayload(store) });
  });

  // Admin Availability & Blocked Dates Management
  app.post('/api/admin/availability/toggle', requireAdmin, (req, res) => {
    const store = loadStore();
    const date = sanitizeText(req.body?.date, 20);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Valid YYYY-MM-DD date is required.' });
    }

    const existingIdx = (store.blockedDates || []).findIndex((entry) => entry.date === date);
    const shouldBlock =
      typeof req.body?.blocked === 'boolean' ? req.body.blocked : existingIdx === -1;

    if (shouldBlock) {
      const reason =
        sanitizeText(req.body?.reason, 160) || 'Unavailable / Fully Booked';
      if (existingIdx >= 0) {
        store.blockedDates[existingIdx] = { date, reason };
      } else {
        store.blockedDates.push({ date, reason });
      }
    } else {
      store.blockedDates = (store.blockedDates || []).filter((entry) => entry.date !== date);
    }

    saveStore(store);
    res.json({ ok: true, availability: buildAvailabilityPayload(store) });
  });

  app.put('/api/admin/availability/settings', requireAdmin, (req, res) => {
    const store = loadStore();
    store.autoBlockConfirmedDates = Boolean(req.body?.autoBlockConfirmedDates);
    saveStore(store);
    res.json({ ok: true, availability: buildAvailabilityPayload(store) });
  });

  // Admin Tours CRUD
  app.post('/api/admin/tours', requireAdmin, (req, res) => {
    const store = loadStore();
    const title = sanitizeText(req.body?.title, 120);
    const category = sanitizeText(req.body?.category, 80) || title;
    const description = sanitizeText(req.body?.description, 2000);
    const duration = sanitizeText(req.body?.duration, 80);
    const imageUrl = sanitizeText(req.body?.imageUrl, 500) || '/src/assets/images/hero_dubai_skyline_1794985266623.jpg';
    const rawPrice = req.body?.startingPriceAed;
    const startingPriceAed =
      rawPrice === null || rawPrice === '' || rawPrice === undefined
        ? null
        : Math.max(0, Number(rawPrice));

    if (!title || !description || !duration) {
      return res.status(400).json({ error: 'Title, description, and duration are required.' });
    }

    const baseSlug = slugify(title) || `tour-${Date.now()}`;
    let slug = baseSlug;
    let idx = 2;
    while (store.tours.some((t) => t.slug === slug)) {
      slug = `${baseSlug}-${idx++}`;
    }

    const newTour: TourPackage = {
      id: `tour-${crypto.randomUUID()}`,
      slug,
      title,
      category,
      imageUrl,
      galleryImages: Array.isArray(req.body?.galleryImages)
        ? req.body.galleryImages
            .map((x: unknown) => sanitizeText(x, 500))
            .filter(Boolean)
            .slice(0, 12)
        : [],
      description,
      duration,
      startingPriceAed: Number.isFinite(startingPriceAed) ? startingPriceAed : null,
      priceNote: sanitizeText(req.body?.priceNote, 200) || 'Custom quote in AED upon inquiry',
      availabilityNote: sanitizeText(req.body?.availabilityNote, 160) || 'Confirmed after guide schedule check',
      itinerary: Array.isArray(req.body?.itinerary)
        ? req.body.itinerary.map((x: unknown) => sanitizeText(x, 240)).filter(Boolean)
        : [],
      pickupInfo: sanitizeText(req.body?.pickupInfo, 300) || 'Dubai hotel or residence pickup available.',
      included: Array.isArray(req.body?.included)
        ? req.body.included.map((x: unknown) => sanitizeText(x, 200)).filter(Boolean)
        : [],
      excluded: Array.isArray(req.body?.excluded)
        ? req.body.excluded.map((x: unknown) => sanitizeText(x, 200)).filter(Boolean)
        : [],
      bookingOptions: Array.isArray(req.body?.bookingOptions)
        ? req.body.bookingOptions.map((x: unknown) => sanitizeText(x, 120)).filter(Boolean)
        : ['Private Tour', 'WhatsApp Custom Quote'],
      featured: Boolean(req.body?.featured),
      sortOrder: Number.isFinite(Number(req.body?.sortOrder))
        ? Math.max(1, Number(req.body.sortOrder))
        : store.tours.length + 1,
    };

    store.tours.push(newTour);
    saveStore(store);
    res.status(201).json({ tour: newTour });
  });

  app.put('/api/admin/tours/:id', requireAdmin, (req, res) => {
    const store = loadStore();
    const idx = store.tours.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Tour not found.' });

    const existing = store.tours[idx];
    const rawPrice = req.body?.startingPriceAed;
    const startingPriceAed =
      rawPrice === null || rawPrice === '' || rawPrice === undefined
        ? null
        : Number.isFinite(Number(rawPrice))
          ? Math.max(0, Number(rawPrice))
          : existing.startingPriceAed;

    const updated: TourPackage = {
      ...existing,
      title: sanitizeText(req.body?.title, 120) || existing.title,
      category: sanitizeText(req.body?.category, 80) || existing.category,
      imageUrl: sanitizeText(req.body?.imageUrl, 500) || existing.imageUrl,
      galleryImages: Array.isArray(req.body?.galleryImages)
        ? req.body.galleryImages
            .map((x: unknown) => sanitizeText(x, 500))
            .filter(Boolean)
            .slice(0, 12)
        : existing.galleryImages || [],
      description: sanitizeText(req.body?.description, 2000) || existing.description,
      duration: sanitizeText(req.body?.duration, 80) || existing.duration,
      startingPriceAed,
      priceNote: sanitizeText(req.body?.priceNote, 200) ?? existing.priceNote,
      availabilityNote: sanitizeText(req.body?.availabilityNote, 160) ?? existing.availabilityNote,
      pickupInfo: sanitizeText(req.body?.pickupInfo, 300) || existing.pickupInfo,
      itinerary: Array.isArray(req.body?.itinerary)
        ? req.body.itinerary.map((x: unknown) => sanitizeText(x, 240)).filter(Boolean)
        : existing.itinerary,
      included: Array.isArray(req.body?.included)
        ? req.body.included.map((x: unknown) => sanitizeText(x, 200)).filter(Boolean)
        : existing.included,
      excluded: Array.isArray(req.body?.excluded)
        ? req.body.excluded.map((x: unknown) => sanitizeText(x, 200)).filter(Boolean)
        : existing.excluded,
      bookingOptions: Array.isArray(req.body?.bookingOptions)
        ? req.body.bookingOptions.map((x: unknown) => sanitizeText(x, 120)).filter(Boolean)
        : existing.bookingOptions,
      featured: typeof req.body?.featured === 'boolean' ? req.body.featured : existing.featured,
      sortOrder: Number.isFinite(Number(req.body?.sortOrder))
        ? Math.max(1, Number(req.body.sortOrder))
        : existing.sortOrder,
    };

    store.tours[idx] = updated;
    saveStore(store);
    res.json({ tour: updated });
  });

  app.delete('/api/admin/tours/:id', requireAdmin, (req, res) => {
    const store = loadStore();
    const before = store.tours.length;
    store.tours = store.tours.filter((t) => t.id !== req.params.id);
    if (store.tours.length === before) return res.status(404).json({ error: 'Tour not found.' });
    saveStore(store);
    res.json({ ok: true });
  });

  // Admin Gallery CRUD
  app.post('/api/admin/gallery', requireAdmin, (req, res) => {
    const store = loadStore();
    const title = sanitizeText(req.body?.title, 120);
    const category = sanitizeText(req.body?.category, 80) || 'Dubai Skyline';
    const imageUrl = sanitizeText(req.body?.imageUrl, 500);
    const caption = sanitizeText(req.body?.caption, 300);

    if (!title || !imageUrl) {
      return res.status(400).json({ error: 'Title and image URL are required.' });
    }

    const item: GalleryItem = {
      id: `gal-${crypto.randomUUID()}`,
      title,
      category,
      imageUrl,
      caption,
      createdAt: new Date().toISOString(),
    };
    store.gallery.unshift(item);
    saveStore(store);
    res.status(201).json({ item });
  });

  app.put('/api/admin/gallery/:id', requireAdmin, (req, res) => {
    const store = loadStore();
    const idx = store.gallery.findIndex((g) => g.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Gallery item not found.' });

    const existing = store.gallery[idx];
    const title = sanitizeText(req.body?.title, 120) || existing.title;
    const category = sanitizeText(req.body?.category, 80) || existing.category;
    const imageUrl = sanitizeText(req.body?.imageUrl, 500) || existing.imageUrl;
    const caption =
      typeof req.body?.caption === 'string'
        ? sanitizeText(req.body.caption, 300)
        : existing.caption;

    const updated: GalleryItem = {
      ...existing,
      title,
      category,
      imageUrl,
      caption,
    };
    store.gallery[idx] = updated;
    saveStore(store);
    res.json({ item: updated });
  });

  app.delete('/api/admin/gallery/:id', requireAdmin, (req, res) => {
    const store = loadStore();
    const before = store.gallery.length;
    store.gallery = store.gallery.filter((g) => g.id !== req.params.id);
    if (store.gallery.length === before) return res.status(404).json({ error: 'Gallery item not found.' });
    saveStore(store);
    res.json({ ok: true });
  });

  // Admin Reviews Moderation
  app.patch('/api/admin/reviews/:id', requireAdmin, (req, res) => {
    const store = loadStore();
    const review = store.reviews.find((r) => r.id === req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found.' });
    const status = req.body?.status;
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      review.status = status;
    }
    saveStore(store);
    res.json({ review });
  });

  app.delete('/api/admin/reviews/:id', requireAdmin, (req, res) => {
    const store = loadStore();
    const before = store.reviews.length;
    store.reviews = store.reviews.filter((r) => r.id !== req.params.id);
    if (store.reviews.length === before) return res.status(404).json({ error: 'Review not found.' });
    saveStore(store);
    res.json({ ok: true });
  });

  // Admin Inquiries
  app.patch('/api/admin/inquiries/:id', requireAdmin, (req, res) => {
    const store = loadStore();
    const inquiry = store.inquiries.find((i) => i.id === req.params.id);
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found.' });
    const status = req.body?.status;
    if (status && ['unread', 'replied'].includes(status)) {
      inquiry.status = status;
    }
    saveStore(store);
    res.json({ inquiry });
  });

  app.delete('/api/admin/inquiries/:id', requireAdmin, (req, res) => {
    const store = loadStore();
    const before = store.inquiries.length;
    store.inquiries = store.inquiries.filter((i) => i.id !== req.params.id);
    if (store.inquiries.length === before) return res.status(404).json({ error: 'Inquiry not found.' });
    saveStore(store);
    res.json({ ok: true });
  });

  // Admin Newsletter Subscribers Management
  app.get('/api/admin/newsletter', requireAdmin, (_req, res) => {
    const store = loadStore();
    res.json({ subscribers: store.newsletterSubscribers || [] });
  });

  app.patch('/api/admin/newsletter/:id', requireAdmin, (req, res) => {
    const store = loadStore();
    const list = store.newsletterSubscribers || [];
    const sub = list.find((s) => s.id === req.params.id);
    if (!sub) return res.status(404).json({ error: 'Subscriber not found.' });
    const status = req.body?.status;
    if (status === 'subscribed' || status === 'unsubscribed') {
      sub.status = status;
    }
    saveStore(store);
    res.json({ subscriber: sub });
  });

  app.delete('/api/admin/newsletter/:id', requireAdmin, (req, res) => {
    const store = loadStore();
    const list = store.newsletterSubscribers || [];
    const next = list.filter((s) => s.id !== req.params.id);
    if (next.length === list.length) {
      return res.status(404).json({ error: 'Subscriber not found.' });
    }
    store.newsletterSubscribers = next;
    saveStore(store);
    res.json({ ok: true });
  });

  // Admin Site Settings & About Us
  app.put('/api/admin/settings', requireAdmin, (req, res) => {
    const store = loadStore();
    const s = req.body || {};
    store.settings = {
      ...store.settings,
      brandName: sanitizeText(s.brandName, 80) || store.settings.brandName,
      slogan: sanitizeText(s.slogan, 200) || store.settings.slogan,
      whatsappNumber: sanitizeText(s.whatsappNumber, 30) || store.settings.whatsappNumber,
      email: sanitizeText(s.email, 160) || store.settings.email,
      address: sanitizeText(s.address, 240) || store.settings.address,
      businessLat: Number.isFinite(Number(s.businessLat)) ? Number(s.businessLat) : store.settings.businessLat,
      businessLng: Number.isFinite(Number(s.businessLng)) ? Number(s.businessLng) : store.settings.businessLng,
      socialInstagram: sanitizeText(s.socialInstagram, 300),
      socialFacebook: sanitizeText(s.socialFacebook, 300),
      socialTiktok: sanitizeText(s.socialTiktok, 300),
      socialYoutube: sanitizeText(s.socialYoutube, 300),
      guideName: sanitizeText(s.guideName, 80) || store.settings.guideName,
      guideTitle: sanitizeText(s.guideTitle, 120) || store.settings.guideTitle,
      guidesNames: sanitizeText(s.guidesNames, 160) || store.settings.guidesNames,
      guideLanguages: sanitizeText(s.guideLanguages, 120) || store.settings.guideLanguages,
      guidePhotoUrl: sanitizeText(s.guidePhotoUrl, 500) || store.settings.guidePhotoUrl,
      guideBio: sanitizeText(s.guideBio, 2000),
      guideExperience: sanitizeText(s.guideExperience, 1000),
      guideCredentials: sanitizeText(s.guideCredentials, 1000),
      guideServices: Array.isArray(s.guideServices)
        ? s.guideServices.map((x: unknown) => sanitizeText(x, 240)).filter(Boolean)
        : store.settings.guideServices,
    };
    saveStore(store);
    res.json({ settings: store.settings });
  });

  // Admin Website Content Management (CMS: homepage headings, banners, copy, FAQs)
  app.put('/api/admin/cms', requireAdmin, (req, res) => {
    const store = loadStore();
    const defaults = createDefaultCmsContent();
    const current = store.cms || defaults;
    const c = (req.body || {}) as Partial<CmsContent>;

    const str = (val: unknown, max: number, fallback: string) =>
      typeof val === 'string' ? sanitizeText(val, max) : fallback;

    const strRequired = (val: unknown, max: number, fallback: string) => {
      if (typeof val !== 'string') return fallback;
      const cleaned = sanitizeText(val, max);
      return cleaned || fallback;
    };

    const validCategories = new Set<FaqCategory>(['Tours', 'Transfers', 'Booking']);
    const whyCards: CmsWhyCard[] = Array.isArray(c.whyCards)
      ? c.whyCards
          .slice(0, 6)
          .map((item, idx) => ({
            num: sanitizeText(item?.num, 12) || `${String(idx + 1).padStart(2, '0')}.`,
            title: sanitizeText(item?.title, 120),
            description: sanitizeText(item?.description, 400),
          }))
          .filter((item) => item.title || item.description)
      : current.whyCards;

    const faqs: CmsFaqItem[] = Array.isArray(c.faqs)
      ? c.faqs
          .slice(0, 30)
          .map((item) => {
            const cat: FaqCategory = validCategories.has(item?.category)
              ? item.category
              : 'Tours';
            return {
              id: sanitizeText(item?.id, 60) || `faq-${crypto.randomUUID().slice(0, 8)}`,
              category: cat,
              question: sanitizeText(item?.question, 240),
              answer: sanitizeText(item?.answer, 1200),
            };
          })
          .filter((item) => item.question && item.answer)
      : current.faqs;

    store.cms = {
      heroEyebrow: str(c.heroEyebrow, 160, current.heroEyebrow),
      heroHeading: strRequired(c.heroHeading, 200, current.heroHeading),
      heroDescription: str(c.heroDescription, 600, current.heroDescription),
      heroBannerUrl: strRequired(c.heroBannerUrl, 500, current.heroBannerUrl),
      heroExploreBtnText: strRequired(c.heroExploreBtnText, 60, current.heroExploreBtnText),
      heroBookBtnText: strRequired(c.heroBookBtnText, 60, current.heroBookBtnText),
      heroWhatsAppBtnText: strRequired(c.heroWhatsAppBtnText, 60, current.heroWhatsAppBtnText),
      welcomeEyebrow: str(c.welcomeEyebrow, 120, current.welcomeEyebrow),
      welcomeHeading: strRequired(c.welcomeHeading, 240, current.welcomeHeading),
      welcomeDescription: str(c.welcomeDescription, 2000, current.welcomeDescription),
      featuredEyebrow: str(c.featuredEyebrow, 120, current.featuredEyebrow),
      featuredHeading: strRequired(c.featuredHeading, 180, current.featuredHeading),
      featuredDescription: str(c.featuredDescription, 500, current.featuredDescription),
      tariffEyebrow: str(c.tariffEyebrow, 120, current.tariffEyebrow),
      tariffHeading: strRequired(c.tariffHeading, 180, current.tariffHeading),
      destinationsEyebrow: str(c.destinationsEyebrow, 120, current.destinationsEyebrow),
      destinationsHeading: strRequired(c.destinationsHeading, 180, current.destinationsHeading),
      whyEyebrow: str(c.whyEyebrow, 120, current.whyEyebrow),
      whyHeading: strRequired(c.whyHeading, 180, current.whyHeading),
      whyCards: whyCards.length > 0 ? whyCards : current.whyCards,
      reviewsEyebrow: str(c.reviewsEyebrow, 120, current.reviewsEyebrow),
      reviewsHeading: strRequired(c.reviewsHeading, 180, current.reviewsHeading),
      galleryEyebrow: str(c.galleryEyebrow, 120, current.galleryEyebrow),
      galleryHeading: strRequired(c.galleryHeading, 180, current.galleryHeading),
      faqEyebrow: str(c.faqEyebrow, 120, current.faqEyebrow),
      faqHeading: strRequired(c.faqHeading, 180, current.faqHeading),
      faqSubtitle: str(c.faqSubtitle, 400, current.faqSubtitle),
      faqs: faqs.length > 0 ? faqs : current.faqs,
      ctaEyebrow: str(c.ctaEyebrow, 120, current.ctaEyebrow),
      ctaHeading: strRequired(c.ctaHeading, 200, current.ctaHeading),
      ctaDescription: str(c.ctaDescription, 500, current.ctaDescription),
      ctaBannerUrl: str(c.ctaBannerUrl, 500, current.ctaBannerUrl),
      ctaPrimaryBtnText: strRequired(c.ctaPrimaryBtnText, 60, current.ctaPrimaryBtnText),
      ctaSecondaryBtnText: strRequired(c.ctaSecondaryBtnText, 60, current.ctaSecondaryBtnText),
      toursPageEyebrow: str(c.toursPageEyebrow, 140, current.toursPageEyebrow),
      toursPageHeading: strRequired(c.toursPageHeading, 180, current.toursPageHeading),
      toursPageDescription: str(c.toursPageDescription, 600, current.toursPageDescription),
      aboutServicesHeading: strRequired(c.aboutServicesHeading, 180, current.aboutServicesHeading),
      aboutServicesDescription: str(c.aboutServicesDescription, 600, current.aboutServicesDescription),
      aboutCommitmentEyebrow: str(c.aboutCommitmentEyebrow, 120, current.aboutCommitmentEyebrow),
      aboutCommitmentHeading: strRequired(c.aboutCommitmentHeading, 180, current.aboutCommitmentHeading),
      aboutCommitmentDescription: str(
        c.aboutCommitmentDescription,
        1000,
        current.aboutCommitmentDescription
      ),
      contactEyebrow: str(c.contactEyebrow, 120, current.contactEyebrow),
      contactHeading: strRequired(c.contactHeading, 180, current.contactHeading),
      contactDescription: str(c.contactDescription, 600, current.contactDescription),
      footerTagline: str(c.footerTagline, 240, current.footerTagline),
      seoPages: (() => {
        const defaultSeo = createDefaultSeoPages();
        const existingSeo = current.seoPages || defaultSeo;
        const incomingSeo = (c.seoPages || {}) as Partial<SeoPagesMap>;
        const keys: PublicPageKey[] = [
          'home',
          'about',
          'tours',
          'attractions',
          'gallery',
          'reviews',
          'contact',
          'book',
        ];
        const nextSeo = { ...existingSeo };
        for (const key of keys) {
          const entry = incomingSeo[key];
          const prev = existingSeo[key] || defaultSeo[key];
          nextSeo[key] = {
            title: sanitizeText(entry?.title, 120) || prev.title,
            description: sanitizeText(entry?.description, 320) || prev.description,
          };
        }
        return nextSeo;
      })(),
    };

    saveStore(store);
    res.json({ cms: store.cms });
  });

  // Admin SEO Meta Title & Description Editor per Public Page
  app.put('/api/admin/seo', requireAdmin, (req, res) => {
    const store = loadStore();
    const defaultSeo = createDefaultSeoPages();
    const existingSeo = store.cms?.seoPages || defaultSeo;
    const incoming = (req.body?.seoPages || req.body || {}) as Partial<SeoPagesMap>;
    const keys: PublicPageKey[] = [
      'home',
      'about',
      'tours',
      'attractions',
      'gallery',
      'reviews',
      'contact',
      'book',
    ];

    const nextSeo = { ...existingSeo };
    for (const key of keys) {
      const item = incoming[key];
      const fallback = existingSeo[key] || defaultSeo[key];
      const title = sanitizeText(item?.title, 120) || fallback.title;
      const description = sanitizeText(item?.description, 320) || fallback.description;
      nextSeo[key] = { title, description };
    }

    store.cms = {
      ...(store.cms || createDefaultCmsContent()),
      seoPages: nextSeo,
    };
    saveStore(store);
    res.json({ seoPages: store.cms.seoPages });
  });

  // Admin Password Change
  app.post('/api/admin/change-password', requireAdmin, (req: AdminRequest, res) => {
    const store = loadStore();
    if (!store.admin) return res.status(400).json({ error: 'Admin not configured.' });
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!verifyPassword(currentPassword, store.admin.passwordHash, store.admin.salt)) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }
    const { hash, salt } = hashPassword(newPassword);
    store.admin = {
      ...store.admin,
      passwordHash: hash,
      salt,
      updatedAt: new Date().toISOString(),
    };
    saveStore(store);
    res.json({ ok: true });
  });

  const httpServer = http.createServer(app);

  // Vite or Production Static Assets
  if (!IS_PROD) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`TRIP ADVENTURE server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start TRIP ADVENTURE server:', err);
  process.exit(1);
});
