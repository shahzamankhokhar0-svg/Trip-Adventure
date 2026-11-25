import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Bell,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Edit3,
  FolderOpen,
  Image as ImageIcon,
  Layout,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MessageCircle,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Star,
  Trash2,
  Unlock,
  X,
  XCircle,
} from 'lucide-react';
import type {
  AvailabilityPayload,
  BookingRequest,
  BookingStatus,
  CmsContent,
  ContactInquiry,
  CustomerReview,
  DashboardStats,
  GalleryItem,
  MediaAsset,
  NewsletterSubscriber,
  NotificationChannelLog,
  NotificationConfigStatus,
  SeoPagesMap,
  SiteSettings,
  TourPackage,
} from '../types.ts';
import { buildGuestStatusWhatsAppUrl } from '../lib/whatsapp.ts';
import { getTourPricingDisplay } from '../lib/currency.ts';
import { SafeImage } from './SafeImage.tsx';
import { AdminImagePicker } from './AdminImagePicker.tsx';
import { AdminCmsEditor } from './AdminCmsEditor.tsx';
import { AdminMediaManager } from './AdminMediaManager.tsx';
import { AdminAnalyticsTab } from './AdminAnalyticsTab.tsx';
import { AdminSeoEditor } from './AdminSeoEditor.tsx';
import { AdminNewsletterTab } from './AdminNewsletterTab.tsx';
import { AvailabilityCalendar, formatDisplayDate } from './AvailabilityCalendar.tsx';

interface AdminDashboardProps {
  onDataUpdated: () => void;
  onExitAdmin: () => void;
}

type AdminTab =
  | 'bookings'
  | 'analytics'
  | 'cms'
  | 'seo'
  | 'tours'
  | 'gallery'
  | 'media'
  | 'reviews'
  | 'inquiries'
  | 'newsletter'
  | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onDataUpdated,
  onExitAdmin,
}) => {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');

  // Auth forms
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Dashboard data
  const [activeTab, setActiveTab] = useState<AdminTab>('bookings');
  const [loadingData, setLoadingData] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [availability, setAvailability] = useState<AvailabilityPayload | null>(null);
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfigStatus | null>(
    null
  );
  const [sseConnected, setSseConnected] = useState(false);
  const [resendingNotifyKey, setResendingNotifyKey] = useState<string | null>(null);
  const [selectedAdminDate, setSelectedAdminDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [blockReasonDraft, setBlockReasonDraft] = useState('Fully Booked');
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [showAvailabilityPanel, setShowAvailabilityPanel] = useState(true);
  const [tours, setTours] = useState<TourPackage[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [settingsForm, setSettingsForm] = useState<SiteSettings | null>(null);
  const [cmsForm, setCmsForm] = useState<CmsContent | null>(null);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);

  const [bookingFilter, setBookingFilter] = useState<
    'all' | 'pending' | 'confirmed' | 'completed' | 'rejected'
  >('all');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
  const [bookingNotesDraft, setBookingNotesDraft] = useState<Record<string, string>>({});
  const [savingCms, setSavingCms] = useState(false);
  const [savingSeo, setSavingSeo] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Tour editor modal
  const [editingTour, setEditingTour] = useState<Partial<TourPackage> | null>(null);
  const [isCreatingTour, setIsCreatingTour] = useState(false);

  // Gallery creation & editing
  const [newGalTitle, setNewGalTitle] = useState('');
  const [newGalCategory, setNewGalCategory] = useState('Dubai Skyline');
  const [newGalImage, setNewGalImage] = useState('');
  const [newGalCaption, setNewGalCaption] = useState('');
  const [editingGallery, setEditingGallery] = useState<GalleryItem | null>(null);

  // Password change
  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/media');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.media)) {
        setMediaAssets(data.media);
      }
    } catch {
      // Non-fatal
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    setLoadingData(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/admin/dashboard');
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load dashboard');
      setStats(data.stats);
      setBookings(data.bookings);
      if (data.availability) setAvailability(data.availability);
      if (data.notificationConfig) setNotificationConfig(data.notificationConfig);
      setTours(data.tours);
      setGallery(data.gallery);
      setReviews(data.reviews);
      setInquiries(data.inquiries);
      setNewsletterSubscribers(
        Array.isArray(data.newsletterSubscribers) ? data.newsletterSubscribers : []
      );
      setSettingsForm(data.settings);
      if (data.cms) setCmsForm(data.cms);
      await fetchMedia();
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to load dashboard data.');
    } finally {
      setLoadingData(false);
    }
  }, [fetchMedia]);

  const checkAuthStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/auth-status');
      const data = await res.json();
      setAuthenticated(Boolean(data.authenticated));
      setSetupRequired(Boolean(data.setupRequired));
      if (data.username) setAdminUsername(data.username);
      if (data.authenticated) {
        await fetchDashboard();
      }
    } catch {
      setAuthError('Unable to verify session.');
    } finally {
      setAuthChecked(true);
    }
  }, [fetchDashboard]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Real-time instant booking stream via Server-Sent Events (SSE)
  useEffect(() => {
    if (!authenticated) {
      setSseConnected(false);
      return;
    }

    const source = new EventSource('/api/admin/events');

    source.addEventListener('connected', () => {
      setSseConnected(true);
    });

    source.addEventListener('booking_created', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as {
          booking: BookingRequest;
          stats?: DashboardStats;
          availability?: AvailabilityPayload;
        };
        if (payload.booking) {
          setBookings((prev) => [
            payload.booking,
            ...prev.filter((item) => item.id !== payload.booking.id),
          ]);
          setToast(
            `New booking received: ${payload.booking.fullName} (${payload.booking.referenceCode}) — ${payload.booking.tourTitle}`
          );
          setTimeout(() => setToast(null), 6000);
        }
        if (payload.stats) setStats(payload.stats);
        if (payload.availability) setAvailability(payload.availability);
      } catch {
        // Ignore malformed SSE frame
      }
    });

    source.addEventListener('booking_updated', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as {
          booking: BookingRequest;
          stats?: DashboardStats;
          availability?: AvailabilityPayload;
        };
        if (payload.booking) {
          setBookings((prev) =>
            prev.map((item) => (item.id === payload.booking.id ? payload.booking : item))
          );
        }
        if (payload.stats) setStats(payload.stats);
        if (payload.availability) setAvailability(payload.availability);
      } catch {
        // Ignore malformed SSE frame
      }
    });

    source.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      setSseConnected(false);
      source.close();
    };
  }, [authenticated]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const endpoint = setupRequired ? '/api/admin/setup' : '/api/admin/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser, password: loginPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed.');
      } else {
        setAuthenticated(true);
        setSetupRequired(false);
        setAdminUsername(data.username);
        setLoginPass('');
        await fetchDashboard();
      }
    } catch {
      setAuthError('Network error during authentication.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthenticated(false);
    setStats(null);
  };

  const uploadImageFile = async (file: File): Promise<string | null> => {
    if (file.size > 3 * 1024 * 1024) {
      setErrorBanner('Image file must be under 3MB.');
      return null;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsDataURL(file);
    });
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorBanner(data.error || 'Upload failed.');
      return null;
    }
    return data.url;
  };

  const handleBookingDecision = async (
    id: string,
    status: BookingStatus,
    adminNotes?: string
  ) => {
    setUpdatingBookingId(id);
    setErrorBanner(null);
    try {
      const payload: { status: BookingStatus; adminNotes?: string } = { status };
      if (adminNotes !== undefined) {
        payload.adminNotes = adminNotes;
      }
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || 'Could not update booking status.');
        return;
      }
      if (data.availability) setAvailability(data.availability);
      const label =
        status === 'confirmed'
          ? 'Confirmed'
          : status === 'completed'
            ? 'Completed'
            : status === 'rejected'
              ? 'Rejected'
              : 'Pending';
      showToast(`Booking status updated to ${label}.`);
      await fetchDashboard();
    } catch {
      setErrorBanner('Network error updating booking status.');
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const handleResendNotification = async (id: string, target: 'owner' | 'customer') => {
    const key = `${id}:${target}`;
    setResendingNotifyKey(key);
    setErrorBanner(null);
    try {
      const res = await fetch(`/api/admin/bookings/${id}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || 'Could not dispatch notification.');
        return;
      }
      if (data.booking) {
        setBookings((prev) => prev.map((b) => (b.id === id ? data.booking : b)));
      }
      showToast(
        target === 'owner'
          ? 'Owner email (tripadventure63@gmail.com) & WhatsApp alert attempted.'
          : 'Customer WhatsApp & email status alert attempted.'
      );
    } catch {
      setErrorBanner('Network error dispatching notification.');
    } finally {
      setResendingNotifyKey(null);
    }
  };

  const handleSaveBookingNote = async (booking: BookingRequest) => {
    const draftNote = bookingNotesDraft[booking.id] ?? booking.adminNotes ?? '';
    setUpdatingBookingId(booking.id);
    setErrorBanner(null);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: booking.status, adminNotes: draftNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || 'Could not save guide note.');
        return;
      }
      showToast('Guide note saved for guest status lookup.');
      await fetchDashboard();
    } catch {
      setErrorBanner('Network error saving guide note.');
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const handleDeleteBooking = async (id: string) => {
    const res = await fetch(`/api/admin/bookings/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      if (data.availability) setAvailability(data.availability);
      showToast('Booking deleted.');
      await fetchDashboard();
    }
  };

  const handleToggleBlockDate = async (date: string, blocked: boolean, reason?: string) => {
    setSavingAvailability(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/admin/availability/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, blocked, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || 'Could not update date availability.');
        return;
      }
      if (data.availability) setAvailability(data.availability);
      showToast(
        blocked
          ? `Date ${date} blocked on public booking calendar.`
          : `Date ${date} unblocked and opened for bookings.`
      );
    } catch {
      setErrorBanner('Network error updating blocked date.');
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleToggleAutoBlockConfirmed = async (autoBlockConfirmedDates: boolean) => {
    setSavingAvailability(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/admin/availability/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoBlockConfirmedDates }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || 'Could not save availability setting.');
        return;
      }
      if (data.availability) setAvailability(data.availability);
      showToast(
        autoBlockConfirmedDates
          ? 'Confirmed bookings now automatically block those dates on the public calendar.'
          : 'Auto-blocking on confirmed bookings turned off (multiple bookings allowed per date).'
      );
    } catch {
      setErrorBanner('Network error updating availability setting.');
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleSaveTour = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTour) return;
    const url = isCreatingTour ? '/api/admin/tours' : `/api/admin/tours/${editingTour.id}`;
    const method = isCreatingTour ? 'POST' : 'PUT';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingTour),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorBanner(data.error || 'Failed to save tour.');
      return;
    }
    setEditingTour(null);
    setIsCreatingTour(false);
    showToast(isCreatingTour ? 'Tour package created.' : 'Tour package updated.');
    await fetchDashboard();
    onDataUpdated();
  };

  const handleDeleteTour = async (id: string) => {
    const res = await fetch(`/api/admin/tours/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Tour deleted.');
      await fetchDashboard();
      onDataUpdated();
    }
  };

  const handleAddGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newGalTitle,
        category: newGalCategory,
        imageUrl: newGalImage,
        caption: newGalCaption,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorBanner(data.error || 'Could not add gallery item.');
      return;
    }
    setNewGalTitle('');
    setNewGalImage('');
    setNewGalCaption('');
    showToast('Photo added to gallery.');
    await fetchDashboard();
    onDataUpdated();
  };

  const handleUpdateGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGallery) return;
    const res = await fetch(`/api/admin/gallery/${editingGallery.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingGallery),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorBanner(data.error || 'Could not update gallery item.');
      return;
    }
    setEditingGallery(null);
    showToast('Gallery photo updated.');
    await fetchDashboard();
    onDataUpdated();
  };

  const handleDeleteGallery = async (id: string) => {
    const res = await fetch(`/api/admin/gallery/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Gallery photo removed.');
      await fetchDashboard();
      onDataUpdated();
    }
  };

  const handleDeleteMedia = async (filename: string) => {
    const res = await fetch(`/api/admin/media/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorBanner(data.error || 'Could not delete uploaded image.');
      return;
    }
    showToast(`Deleted image "${filename}".`);
    await fetchMedia();
  };

  const handleSaveCms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmsForm) return;
    setSavingCms(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/admin/cms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cmsForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorBanner(data.error || 'Could not save website content.');
        return;
      }
      setCmsForm(data.cms);
      showToast('Homepage headings, banners & website content saved live.');
      onDataUpdated();
    } catch {
      setErrorBanner('Network error saving website content.');
    } finally {
      setSavingCms(false);
    }
  };

  const handleReviewStatus = async (id: string, status: 'approved' | 'rejected') => {
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      showToast(`Review ${status}.`);
      await fetchDashboard();
      onDataUpdated();
    }
  };

  const handleDeleteReview = async (id: string) => {
    const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Review deleted.');
      await fetchDashboard();
      onDataUpdated();
    }
  };

  const handleInquiryStatus = async (id: string, status: 'replied' | 'unread') => {
    const res = await fetch(`/api/admin/inquiries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      showToast('Inquiry status updated.');
      await fetchDashboard();
    }
  };

  const handleDeleteInquiry = async (id: string) => {
    const res = await fetch(`/api/admin/inquiries/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Inquiry deleted.');
      await fetchDashboard();
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm) return;
    setSavingSettings(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm),
      });
      if (res.ok) {
        showToast('Contact details & About Us updated live.');
        await fetchDashboard();
        onDataUpdated();
      } else {
        setErrorBanner('Failed to save settings.');
      }
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveSeo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmsForm?.seoPages) return;
    setSavingSeo(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/admin/seo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seoPages: cmsForm.seoPages }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.seoPages) {
          setCmsForm((prev) => (prev ? { ...prev, seoPages: data.seoPages as SeoPagesMap } : prev));
        }
        showToast('SEO meta titles & descriptions updated for all public pages.');
        onDataUpdated();
      } else {
        setErrorBanner(data.error || 'Failed to save SEO meta tags.');
      }
    } finally {
      setSavingSeo(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: currPass, newPassword: newPass }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorBanner(data.error || 'Could not update password.');
    } else {
      setCurrPass('');
      setNewPass('');
      showToast('Admin password updated securely.');
    }
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#C59B38]" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
        <div className="w-full rounded-2xl border border-neutral-200 bg-white p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0B0B0D] text-[#C59B38]">
            <Lock className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-display text-3xl font-semibold text-[#111114]">
            {setupRequired ? 'Initialize Admin Account' : 'Admin Dashboard Sign In'}
          </h2>
          <p className="mt-1.5 text-sm text-neutral-600">
            {setupRequired
              ? 'Create your secure administrator credentials to manage bookings, tours, pricing, and reviews.'
              : 'Sign in with your administrator credentials to manage TRIP ADVENTURE.'}
          </p>

          <form onSubmit={handleAuthSubmit} className="mt-6 space-y-4">
            {authError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div>
              <label htmlFor="adm-user" className="block text-xs font-semibold text-neutral-700">
                Username
              </label>
              <input
                id="adm-user"
                type="text"
                required
                placeholder="Enter administrator username"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-[#111114] focus:border-[#C59B38] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="adm-pass" className="block text-xs font-semibold text-neutral-700">
                Password {setupRequired && '(min 8 characters)'}
              </label>
              <input
                id="adm-pass"
                type="password"
                required
                minLength={setupRequired ? 8 : 1}
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-[#111114] focus:border-[#C59B38] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B0B0D] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1F1F25] disabled:opacity-60"
            >
              {authLoading && <Loader2 className="h-4 w-4 animate-spin text-[#C59B38]" />}
              {setupRequired ? 'Create Admin Account' : 'Sign In'}
            </button>
          </form>

          <button
            type="button"
            onClick={onExitAdmin}
            className="mt-5 w-full text-center text-xs font-medium text-neutral-500 hover:text-[#111114]"
          >
            Return to Public Website
          </button>
        </div>
      </div>
    );
  }

  const filteredBookings = bookings.filter((b) =>
    bookingFilter === 'all' ? true : b.status === bookingFilter
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <p className="text-xs font-semibold text-[#8B6816]">
            Signed in as {adminUsername}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-[#111114]">
            TRIP ADVENTURE Admin Console
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchDashboard}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#111114] hover:border-[#C59B38]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingData ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={onExitAdmin}
            className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#111114] hover:border-[#C59B38]"
          >
            View Live Site
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B0B0D] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1F1F25]"
          >
            <LogOut className="h-3.5 w-3.5 text-[#C59B38]" />
            Log Out
          </button>
        </div>
      </div>

      {toast && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <span>{toast}</span>
        </div>
      )}
      {errorBanner && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-900">
          <span>{errorBanner}</span>
          <button type="button" onClick={() => setErrorBanner(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-500">Total Requests</p>
            <p className="font-mono-num mt-1 text-2xl font-semibold text-[#111114]">
              {stats.totalBookings}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-amber-800">Pending Review</p>
            <p className="font-mono-num mt-1 text-2xl font-semibold text-amber-800">
              {stats.pendingBookings}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-emerald-800">Confirmed</p>
            <p className="font-mono-num mt-1 text-2xl font-semibold text-emerald-800">
              {stats.confirmedBookings}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-blue-800">Completed</p>
            <p className="font-mono-num mt-1 text-2xl font-semibold text-blue-800">
              {stats.completedBookings}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-red-700">Rejected</p>
            <p className="font-mono-num mt-1 text-2xl font-semibold text-red-700">
              {stats.rejectedBookings}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-500">Inquiries &amp; Reviews</p>
            <p className="font-mono-num mt-1 text-2xl font-semibold text-[#111114]">
              {stats.unreadInquiries} / {stats.pendingReviews}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 rounded-xl bg-neutral-100 p-1.5">
        {(
          [
            { id: 'bookings', label: 'Bookings', icon: CalendarCheck, badge: stats?.pendingBookings },
            { id: 'analytics', label: 'Analytics & Charts', icon: BarChart3 },
            { id: 'cms', label: 'Website Content & Banners', icon: Layout },
            { id: 'seo', label: 'SEO & Meta Tags', icon: Search },
            { id: 'tours', label: 'Tours & AED Pricing', icon: Compass },
            { id: 'gallery', label: 'Gallery Photos', icon: ImageIcon },
            { id: 'media', label: 'Media Library', icon: FolderOpen },
            { id: 'reviews', label: 'Reviews', icon: Star, badge: stats?.pendingReviews },
            { id: 'inquiries', label: 'Inquiries', icon: MessageSquare, badge: stats?.unreadInquiries },
            { id: 'newsletter', label: 'Newsletter', icon: Mail, badge: stats?.newsletterSubscribers },
            { id: 'settings', label: 'Contact & About Us', icon: Settings },
          ] as Array<{
            id: AdminTab;
            label: string;
            icon: React.ComponentType<{ className?: string }>;
            badge?: number;
          }>
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                active ? 'bg-[#0B0B0D] text-white' : 'text-neutral-600 hover:text-[#111114]'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${active ? 'text-[#C59B38]' : 'text-neutral-500'}`} />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className="font-mono-num rounded-full bg-[#C59B38] px-1.5 py-0.5 text-[10px] font-bold text-[#0B0B0D]">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SEO & META TAGS TAB */}
      {activeTab === 'seo' && cmsForm && (
        <AdminSeoEditor
          seoPages={
            cmsForm.seoPages || {
              home: { title: '', description: '' },
              about: { title: '', description: '' },
              tours: { title: '', description: '' },
              attractions: { title: '', description: '' },
              gallery: { title: '', description: '' },
              reviews: { title: '', description: '' },
              contact: { title: '', description: '' },
              book: { title: '', description: '' },
            }
          }
          onChange={(nextSeo) => setCmsForm({ ...cmsForm, seoPages: nextSeo })}
          onSave={handleSaveSeo}
          saving={savingSeo}
        />
      )}

      {/* NEWSLETTER SUBSCRIBERS TAB */}
      {activeTab === 'newsletter' && (
        <AdminNewsletterTab
          subscribers={newsletterSubscribers}
          onRefresh={fetchDashboard}
          onToast={showToast}
          onError={(msg) => setErrorBanner(msg)}
        />
      )}

      {/* ANALYTICS & DATA VISUALIZATION TAB */}
      {activeTab === 'analytics' && <AdminAnalyticsTab onShowToast={showToast} />}

      {/* BOOKINGS TAB */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          {/* Interactive Availability & Blocked Dates Manager */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0B0B0D] text-[#C59B38]">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold text-[#111114]">
                    Availability &amp; Blocked Dates Calendar
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Manage blocked dates synced live with the public booking calendar (
                    <span className="font-mono-num font-semibold text-[#111114]">
                      {availability?.blockedDates.length || 0}
                    </span>{' '}
                    manually blocked).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-[#FAF9F6] px-3 py-1.5 text-xs font-medium text-neutral-700">
                  <input
                    type="checkbox"
                    checked={availability?.autoBlockConfirmedDates !== false}
                    disabled={savingAvailability}
                    onChange={(e) => handleToggleAutoBlockConfirmed(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[#C59B38]"
                  />
                  Auto-block confirmed dates
                </label>

                <button
                  type="button"
                  onClick={() => setShowAvailabilityPanel((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:border-[#C59B38]"
                >
                  {showAvailabilityPanel ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      Hide Calendar
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      Show Calendar
                    </>
                  )}
                </button>
              </div>
            </div>

            {showAvailabilityPanel && (
              <div className="mt-5 grid gap-5 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <AvailabilityCalendar
                    mode="admin"
                    availability={availability}
                    selectedDate={selectedAdminDate}
                    onSelectDate={(dateStr) => {
                      setSelectedAdminDate(dateStr);
                      const existing = availability?.blockedDates.find((b) => b.date === dateStr);
                      if (existing) {
                        setBlockReasonDraft(existing.reason);
                      }
                    }}
                    loading={loadingData || savingAvailability}
                    onRefresh={fetchDashboard}
                  />
                </div>

                <div className="flex flex-col justify-between gap-4 rounded-xl border border-neutral-200 bg-[#FAF9F6] p-4 lg:col-span-5">
                  {(() => {
                    const existingManualBlock = availability?.blockedDates.find(
                      (b) => b.date === selectedAdminDate
                    );
                    const dateBookings = bookings.filter(
                      (b) => b.travelDate === selectedAdminDate && b.status !== 'rejected'
                    );
                    const confirmedOnDate = dateBookings.filter(
                      (b) => b.status === 'confirmed'
                    ).length;
                    const pendingOnDate = dateBookings.filter(
                      (b) => b.status === 'pending'
                    ).length;

                    return (
                      <div className="space-y-4">
                        <div className="border-b border-neutral-200 pb-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8B6816]">
                            Selected Date Controls
                          </p>
                          <p className="font-mono-num mt-1 text-base font-bold text-[#111114]">
                            {selectedAdminDate}
                          </p>
                          <p className="text-xs text-neutral-600">
                            {formatDisplayDate(selectedAdminDate)}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg border border-neutral-200 bg-white p-2.5">
                            <p className="text-[11px] text-neutral-500">Confirmed</p>
                            <p className="font-mono-num mt-0.5 text-lg font-bold text-emerald-700">
                              {confirmedOnDate}
                            </p>
                          </div>
                          <div className="rounded-lg border border-neutral-200 bg-white p-2.5">
                            <p className="text-[11px] text-neutral-500">Pending</p>
                            <p className="font-mono-num mt-0.5 text-lg font-bold text-amber-700">
                              {pendingOnDate}
                            </p>
                          </div>
                        </div>

                        {dateBookings.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[11px] font-semibold text-neutral-600">
                              Requests on this date:
                            </p>
                            <div className="max-h-28 space-y-1 overflow-y-auto">
                              {dateBookings.map((db) => (
                                <div
                                  key={db.id}
                                  className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px]"
                                >
                                  <span className="truncate font-medium text-[#111114]">
                                    {db.fullName} — {db.tourTitle}
                                  </span>
                                  <span
                                    className={`ml-2 shrink-0 rounded px-1.5 py-0.5 font-semibold uppercase text-[10px] ${
                                      db.status === 'confirmed'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {db.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2.5 border-t border-neutral-200 pt-3">
                          <label
                            htmlFor="adm-block-reason"
                            className="block text-xs font-semibold text-neutral-700"
                          >
                            Block Reason (shown if blocked)
                          </label>
                          <input
                            id="adm-block-reason"
                            type="text"
                            value={blockReasonDraft}
                            onChange={(e) => setBlockReasonDraft(e.target.value)}
                            placeholder="e.g. Fully Booked, Private VIP Charter, Holiday"
                            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-[#111114] focus:border-[#C59B38] focus:outline-none"
                          />
                          <div className="flex flex-wrap gap-2">
                            {existingManualBlock ? (
                              <>
                                <button
                                  type="button"
                                  disabled={savingAvailability}
                                  onClick={() =>
                                    handleToggleBlockDate(selectedAdminDate, false)
                                  }
                                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                                >
                                  <Unlock className="h-3.5 w-3.5" />
                                  Unblock Date
                                </button>
                                <button
                                  type="button"
                                  disabled={savingAvailability}
                                  onClick={() =>
                                    handleToggleBlockDate(
                                      selectedAdminDate,
                                      true,
                                      blockReasonDraft
                                    )
                                  }
                                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:border-[#C59B38] disabled:opacity-60"
                                >
                                  Update Reason
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                disabled={savingAvailability}
                                onClick={() =>
                                  handleToggleBlockDate(
                                    selectedAdminDate,
                                    true,
                                    blockReasonDraft
                                  )
                                }
                                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                              >
                                <Lock className="h-3.5 w-3.5" />
                                Block Selected Date
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {availability && availability.blockedDates.length > 0 && (
                    <div className="border-t border-neutral-200 pt-3">
                      <p className="mb-2 text-[11px] font-semibold text-neutral-600">
                        Manually Blocked Dates ({availability.blockedDates.length})
                      </p>
                      <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                        {availability.blockedDates.map((item) => (
                          <span
                            key={item.date}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-900"
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedAdminDate(item.date)}
                              className="font-mono-num hover:underline"
                            >
                              {item.date}
                            </button>
                            <span className="text-red-700/80">· {item.reason}</span>
                            <button
                              type="button"
                              disabled={savingAvailability}
                              onClick={() => handleToggleBlockDate(item.date, false)}
                              title={`Unblock ${item.date}`}
                              className="ml-0.5 rounded p-0.5 text-red-700 hover:bg-red-200/60"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Live Notification & Channel Configuration Status */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0B0B0D] text-[#C59B38]">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-[#111114]">
                    Booking Notification System
                  </h3>
                  <p className="text-xs text-neutral-500">
                    New bookings save immediately and appear live here via SSE. Optional email &amp; WhatsApp Cloud API alerts can be connected later.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-[#FAF9F6] px-3 py-1.5 text-xs font-semibold text-[#111114]">
                <RefreshCw className={`h-3.5 w-3.5 ${sseConnected ? 'text-emerald-700' : 'text-neutral-400'}`} />
                {sseConnected ? 'Live Admin Stream Active' : 'Connecting Live Stream'}
              </span>
            </div>

            {notificationConfig && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-[#FAF9F6] px-3.5 py-2.5 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#111114]">
                      Owner Email Alerts ({notificationConfig.ownerEmailTarget})
                    </p>
                    <p className="truncate text-[11px] text-neutral-500">
                      {notificationConfig.smtpConfigured
                        ? `SMTP connected (${notificationConfig.smtpHost})`
                        : 'Optional — connect later; bookings still save & appear live here.'}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                      notificationConfig.smtpConfigured
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                        : 'border-neutral-200 bg-white text-neutral-600'
                    }`}
                  >
                    {notificationConfig.smtpConfigured ? 'Connected' : 'Optional · Later'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-[#FAF9F6] px-3.5 py-2.5 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#111114]">
                      WhatsApp Business Cloud API ({notificationConfig.ownerWhatsappTarget})
                    </p>
                    <p className="truncate text-[11px] text-neutral-500">
                      {notificationConfig.whatsappApiConfigured
                        ? 'Meta Cloud API configured for owner & customer alerts'
                        : 'Optional — connect later; direct WhatsApp links work anytime.'}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                      notificationConfig.whatsappApiConfigured
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                        : 'border-neutral-200 bg-white text-neutral-600'
                    }`}
                  >
                    {notificationConfig.whatsappApiConfigured ? 'Connected' : 'Optional · Later'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'all', label: 'All', count: bookings.length },
                  {
                    id: 'pending',
                    label: 'Pending',
                    count: bookings.filter((b) => b.status === 'pending').length,
                  },
                  {
                    id: 'confirmed',
                    label: 'Confirmed',
                    count: bookings.filter((b) => b.status === 'confirmed').length,
                  },
                  {
                    id: 'completed',
                    label: 'Completed',
                    count: bookings.filter((b) => b.status === 'completed').length,
                  },
                  {
                    id: 'rejected',
                    label: 'Rejected',
                    count: bookings.filter((b) => b.status === 'rejected').length,
                  },
                ] as const
              ).map((filterItem) => (
                <button
                  key={filterItem.id}
                  type="button"
                  onClick={() => setBookingFilter(filterItem.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    bookingFilter === filterItem.id
                      ? 'border-[#0B0B0D] bg-[#0B0B0D] text-white'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:border-[#C59B38]'
                  }`}
                >
                  <span>{filterItem.label}</span>
                  <span className="font-mono-num text-[11px] opacity-75">
                    ({filterItem.count})
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-500">
              All bookings enter as <strong>Pending</strong> until confirmed or completed by admin.
            </p>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500">
              No booking requests in this filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map((b) => {
                const isUpdating = updatingBookingId === b.id;
                const currentDraft = bookingNotesDraft[b.id] ?? b.adminNotes ?? '';
                const noteChanged = currentDraft !== (b.adminNotes ?? '');

                const statusLabel =
                  b.status === 'confirmed'
                    ? 'Confirmed'
                    : b.status === 'completed'
                      ? 'Completed'
                      : b.status === 'rejected'
                        ? 'Rejected'
                        : 'Pending';

                const statusSubtext =
                  b.status === 'confirmed'
                    ? 'Confirmed reservation · visible to guest'
                    : b.status === 'completed'
                      ? 'Tour completed · archived on ticket'
                      : b.status === 'rejected'
                        ? 'Declined / cancelled · visible to guest'
                        : 'Awaiting guide approval';

                const statusBadgeStyle =
                  b.status === 'confirmed'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                    : b.status === 'completed'
                      ? 'border-blue-300 bg-blue-50 text-blue-900'
                      : b.status === 'rejected'
                        ? 'border-red-300 bg-red-50 text-red-900'
                        : 'border-amber-300 bg-amber-50 text-amber-900';

                const guestWhatsAppHref = buildGuestStatusWhatsAppUrl({
                  guestNumber: b.whatsappNumber,
                  guestName: b.fullName,
                  referenceCode: b.referenceCode,
                  tourTitle: b.tourTitle,
                  travelDate: b.travelDate,
                  status: b.status,
                  adminNotes: currentDraft,
                });

                const renderChannelPill = (
                  label: string,
                  log?: NotificationChannelLog
                ) => {
                  if (!log) {
                    return (
                      <span className="inline-flex items-center gap-1 rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-500">
                        {label}: Not sent yet
                      </span>
                    );
                  }
                  const style =
                    log.status === 'sent'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : log.status === 'failed'
                        ? 'border-red-200 bg-red-50 text-red-900'
                        : 'border-neutral-200 bg-white text-neutral-600';
                  const stateText =
                    log.status === 'sent'
                      ? 'Sent'
                      : log.status === 'failed'
                        ? 'Failed'
                        : 'Optional (Later)';
                  return (
                    <span
                      title={log.detail}
                      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium ${style}`}
                    >
                      {label}: <strong>{stateText}</strong>
                    </span>
                  );
                };

                return (
                  <div
                    key={b.id}
                    className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono-num font-semibold text-[#8B6816]">
                            {b.referenceCode}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 font-semibold ${statusBadgeStyle}`}
                          >
                            {b.status === 'confirmed' ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                            ) : b.status === 'completed' ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-blue-700" />
                            ) : b.status === 'rejected' ? (
                              <XCircle className="h-3.5 w-3.5 text-red-700" />
                            ) : (
                              <Clock className="h-3.5 w-3.5 text-amber-700" />
                            )}
                            <span>Status: {statusLabel}</span>
                          </span>
                          <span className="text-[11px] text-neutral-500">{statusSubtext}</span>
                        </div>

                        <h3 className="mt-2 text-base font-semibold text-[#111114]">
                          {b.fullName} — {b.tourTitle}
                        </h3>
                        <p className="mt-1 text-xs text-neutral-600">
                          Email: {b.email} · WhatsApp:{' '}
                          <span className="font-mono-num">{b.whatsappNumber}</span> · Nationality:{' '}
                          {b.nationality}
                        </p>
                        <p className="mt-1 text-xs text-neutral-700">
                          Travel Date: <strong className="font-mono-num">{b.travelDate}</strong> ·
                          Guests:{' '}
                          <span className="font-mono-num">
                            {b.adults} Adults, {b.children} Children
                          </span>{' '}
                          · Pickup: {b.pickupLocation}
                        </p>
                        <p className="mt-1 font-mono-num text-[11px] text-neutral-400">
                          Requested {new Date(b.createdAt).toLocaleString()}
                          {b.updatedAt && b.updatedAt !== b.createdAt
                            ? ` · Last updated ${new Date(b.updatedAt).toLocaleString()}`
                            : ''}
                        </p>
                        {b.requirements && (
                          <p className="mt-2 rounded-lg bg-[#FAF9F6] p-2.5 text-xs text-neutral-700">
                            Guest Requirements: {b.requirements}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                          Booking Workflow Status
                        </span>
                        <div
                          className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-neutral-200 bg-[#FAF9F6] p-1"
                          role="group"
                          aria-label={`Set status for booking ${b.referenceCode}`}
                        >
                          <button
                            type="button"
                            disabled={isUpdating}
                            aria-pressed={b.status === 'pending'}
                            onClick={() => handleBookingDecision(b.id, 'pending', currentDraft)}
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                              b.status === 'pending'
                                ? 'bg-amber-600 text-white'
                                : 'bg-white text-neutral-700 hover:bg-amber-50 hover:text-amber-900'
                            }`}
                          >
                            <Clock className="h-3.5 w-3.5" />
                            Pending
                          </button>
                          <button
                            type="button"
                            disabled={isUpdating}
                            aria-pressed={b.status === 'confirmed'}
                            onClick={() => handleBookingDecision(b.id, 'confirmed', currentDraft)}
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                              b.status === 'confirmed'
                                ? 'bg-emerald-700 text-white'
                                : 'bg-white text-neutral-700 hover:bg-emerald-50 hover:text-emerald-800'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Confirm
                          </button>
                          <button
                            type="button"
                            disabled={isUpdating}
                            aria-pressed={b.status === 'completed'}
                            onClick={() => handleBookingDecision(b.id, 'completed', currentDraft)}
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                              b.status === 'completed'
                                ? 'bg-blue-800 text-white'
                                : 'bg-white text-neutral-700 hover:bg-blue-50 hover:text-blue-900'
                            }`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Completed
                          </button>
                          <button
                            type="button"
                            disabled={isUpdating}
                            aria-pressed={b.status === 'rejected'}
                            onClick={() => handleBookingDecision(b.id, 'rejected', currentDraft)}
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                              b.status === 'rejected'
                                ? 'bg-red-700 text-white'
                                : 'bg-white text-neutral-700 hover:bg-red-50 hover:text-red-800'
                            }`}
                          >
                            <X className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={guestWhatsAppHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                          >
                            <MessageCircle className="h-3.5 w-3.5 text-emerald-700" />
                            Message Guest (WhatsApp)
                          </a>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleDeleteBooking(b.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-500 hover:border-red-200 hover:text-red-700 disabled:opacity-60"
                            aria-label={`Delete booking ${b.referenceCode}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Notification Delivery Log & Manual Re-Trigger */}
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-[#FAF9F6] px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {renderChannelPill('Owner Email', b.notifications?.ownerEmail)}
                        {renderChannelPill('Owner WhatsApp API', b.notifications?.ownerWhatsapp)}
                        {renderChannelPill('Guest WhatsApp API', b.notifications?.customerWhatsapp)}
                      </div>
                      {notificationConfig?.smtpConfigured ||
                      notificationConfig?.whatsappApiConfigured ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            disabled={resendingNotifyKey === `${b.id}:owner`}
                            onClick={() => handleResendNotification(b.id, 'owner')}
                            className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-700 hover:border-[#C59B38] disabled:opacity-50"
                          >
                            <Send className="h-3 w-3" />
                            {resendingNotifyKey === `${b.id}:owner`
                              ? 'Sending...'
                              : 'Resend Owner Alert'}
                          </button>
                          <button
                            type="button"
                            disabled={resendingNotifyKey === `${b.id}:customer`}
                            onClick={() => handleResendNotification(b.id, 'customer')}
                            className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-700 hover:border-[#C59B38] disabled:opacity-50"
                          >
                            <Send className="h-3 w-3 text-emerald-700" />
                            {resendingNotifyKey === `${b.id}:customer`
                              ? 'Sending...'
                              : 'Send Guest Status API'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-neutral-500">
                          Auto email &amp; WhatsApp API optional (connect later) · Direct WhatsApp messaging ready above.
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 border-t border-neutral-100 pt-3 sm:flex-row sm:items-center">
                      <label
                        htmlFor={`note-${b.id}`}
                        className="shrink-0 text-xs font-semibold text-neutral-600"
                      >
                        Guide Note (visible to guest):
                      </label>
                      <input
                        id={`note-${b.id}`}
                        type="text"
                        value={currentDraft}
                        onChange={(e) =>
                          setBookingNotesDraft((prev) => ({
                            ...prev,
                            [b.id]: e.target.value,
                          }))
                        }
                        placeholder="e.g., Confirmed with Guide Usama for 09:00 AM pickup..."
                        className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-[#111114] focus:border-[#C59B38] focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={isUpdating || !noteChanged}
                        onClick={() => handleSaveBookingNote(b)}
                        className="inline-flex shrink-0 items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#111114] hover:border-[#C59B38] disabled:opacity-50"
                      >
                        {isUpdating ? 'Saving...' : 'Save Note'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* WEBSITE CONTENT & BANNERS (CMS) TAB */}
      {activeTab === 'cms' && cmsForm && (
        <AdminCmsEditor
          cmsForm={cmsForm}
          onChange={setCmsForm}
          onSave={handleSaveCms}
          saving={savingCms}
          onUploadFile={uploadImageFile}
          mediaAssets={mediaAssets}
          onRefreshMedia={fetchMedia}
        />
      )}

      {/* MEDIA & IMAGES LIBRARY TAB */}
      {activeTab === 'media' && (
        <AdminMediaManager
          mediaAssets={mediaAssets}
          tours={tours}
          gallery={gallery}
          settings={settingsForm}
          cms={cmsForm}
          onUploadFile={uploadImageFile}
          onDeleteMedia={handleDeleteMedia}
          onRefreshMedia={fetchMedia}
        />
      )}

      {/* TOURS & AED PRICING TAB */}
      {activeTab === 'tours' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#111114]">
                Manage Tour Packages &amp; AED Prices ({tours.length})
              </h2>
              <p className="text-xs text-neutral-500">
                Add new tours or transfers, adjust base AED rates and half-day/full-day options, or swap cover photos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsCreatingTour(true);
                setEditingTour({
                  title: '',
                  category: 'Dubai City Tour',
                  duration: 'Half-Day (4 Hours) / Full-Day (8 Hours)',
                  startingPriceAed: null,
                  priceNote: 'Half-Day: 350 AED · Full-Day: 600 AED',
                  availabilityNote: 'Confirmed after schedule check with Shahzaman Khokhar',
                  description: '',
                  pickupInfo: 'Complimentary pickup & drop-off in Dubai.',
                  imageUrl: '/src/assets/images/hero_dubai_skyline_1794985266623.jpg',
                  galleryImages: [],
                  itinerary: ['Hotel pickup', 'Guided sightseeing', 'Return transfer'],
                  included: [
                    'Tour Guide (Usama or Abdul Qadir)',
                    'Program coordinated by Shahzaman Khokhar',
                  ],
                  excluded: ['Attraction entrance tickets unless quoted'],
                  bookingOptions: ['Half-Day Tour – 350 AED', 'Full-Day Tour – 600 AED'],
                  featured: false,
                  sortOrder: tours.length + 1,
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B0B0D] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1F1F25]"
            >
              <Plus className="h-4 w-4 text-[#C59B38]" />
              Add New Tour / Service
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {tours.map((t) => {
              const pricing = getTourPricingDisplay(t, 'AED');
              return (
                <div
                  key={t.id}
                  className="flex gap-4 rounded-xl border border-neutral-200 bg-white p-4"
                >
                  <SafeImage
                    src={t.imageUrl}
                    alt={t.title}
                    className="h-24 w-28 shrink-0 rounded-lg object-cover"
                  />
                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#8B6816]">
                        <span>{t.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-neutral-500">{t.duration}</span>
                        {t.featured && (
                          <span className="rounded bg-[#C59B38]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#8B6816]">
                            Featured
                          </span>
                        )}
                      </div>
                      <h3 className="truncate font-display text-xl font-semibold text-[#111114]">
                        {t.title}
                      </h3>
                      <p className="font-mono-num mt-0.5 text-xs font-semibold text-neutral-700">
                        {pricing.priceRange ? `${pricing.fromLabel} (${pricing.priceRange})` : pricing.fromLabel}
                      </p>
                      {t.priceNote && (
                        <p className="truncate font-mono-num text-[11px] text-neutral-500">
                          {t.priceNote}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingTour(false);
                          setEditingTour({ ...t });
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-[#111114] hover:border-[#C59B38]"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit &amp; AED Price
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTour(t.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {editingTour && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
              <form
                onSubmit={handleSaveTour}
                className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 space-y-5 shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                  <h3 className="font-display text-2xl font-semibold">
                    {isCreatingTour ? 'Create Tour / Transfer Package' : `Edit: ${editingTour.title}`}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditingTour(null)}
                    className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-neutral-700">Title *</label>
                    <input
                      type="text"
                      required
                      value={editingTour.title || ''}
                      onChange={(e) => setEditingTour({ ...editingTour, title: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700">Category *</label>
                    <input
                      type="text"
                      required
                      list="tour-category-presets"
                      value={editingTour.category || ''}
                      onChange={(e) => setEditingTour({ ...editingTour, category: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                    <datalist id="tour-category-presets">
                      <option value="Dubai City Tour" />
                      <option value="Desert Safari Adventure" />
                      <option value="Abu Dhabi City Tour" />
                      <option value="Airport Transfers" />
                      <option value="Inter-Hotel Transfers" />
                      <option value="Private Dubai Sightseeing" />
                      <option value="Customized Private Tours" />
                    </datalist>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-neutral-700">Duration *</label>
                    <input
                      type="text"
                      required
                      value={editingTour.duration || ''}
                      onChange={(e) => setEditingTour({ ...editingTour, duration: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700">
                      Starting Price (AED)
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="Blank = quote"
                      value={editingTour.startingPriceAed ?? ''}
                      onChange={(e) =>
                        setEditingTour({
                          ...editingTour,
                          startingPriceAed: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      className="font-mono-num mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700">
                      Display Order
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={editingTour.sortOrder ?? 1}
                      onChange={(e) =>
                        setEditingTour({
                          ...editingTour,
                          sortOrder: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="font-mono-num mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700">
                      Price Breakdown / Tiers (AED)
                    </label>
                    <input
                      type="text"
                      value={editingTour.priceNote || ''}
                      onChange={(e) => setEditingTour({ ...editingTour, priceNote: e.target.value })}
                      placeholder="e.g., Half-Day: 350 AED · Full-Day: 600 AED"
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700">
                      Availability Note
                    </label>
                    <input
                      type="text"
                      value={editingTour.availabilityNote || ''}
                      onChange={(e) =>
                        setEditingTour({ ...editingTour, availabilityNote: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <AdminImagePicker
                  label="Tour Cover Image"
                  helperText="Upload a new photo or pick one from your Media Library."
                  value={editingTour.imageUrl || ''}
                  onChange={(url) => setEditingTour({ ...editingTour, imageUrl: url })}
                  onUploadFile={uploadImageFile}
                  mediaAssets={mediaAssets}
                  onRefreshMedia={fetchMedia}
                />

                <div className="rounded-xl border border-neutral-200 bg-[#FAF9F6] p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-[#111114]">
                        Additional Full HD Tour Photos ({(editingTour.galleryImages || []).length})
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        Add extra Full HD photos shown in the interactive tour gallery switcher and lightbox.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value=""
                        onChange={(e) => {
                          const picked = e.target.value;
                          if (!picked) return;
                          const prev = editingTour.galleryImages || [];
                          if (!prev.includes(picked)) {
                            setEditingTour({
                              ...editingTour,
                              galleryImages: [...prev, picked],
                            });
                          }
                        }}
                        aria-label="Add photo from Media Library"
                        className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-[#111114]"
                      >
                        <option value="">+ Add from Media Library...</option>
                        {mediaAssets.map((asset) => (
                          <option key={asset.id} value={asset.url}>
                            {asset.filename}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {(editingTour.galleryImages || []).length > 0 && (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {(editingTour.galleryImages || []).map((imgUrl, idx) => (
                        <div
                          key={`${imgUrl}-${idx}`}
                          className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-neutral-200 bg-[#141417]"
                        >
                          <SafeImage
                            src={imgUrl}
                            alt={`Tour HD photo ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setEditingTour({
                                ...editingTour,
                                galleryImages: (editingTour.galleryImages || []).filter(
                                  (_, i) => i !== idx
                                ),
                              })
                            }
                            aria-label="Remove tour gallery photo"
                            className="absolute right-1 top-1 rounded-full bg-black/75 p-1 text-white hover:bg-red-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700">Description *</label>
                  <textarea
                    rows={3}
                    required
                    value={editingTour.description || ''}
                    onChange={(e) => setEditingTour({ ...editingTour, description: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700">
                    Pickup Information
                  </label>
                  <input
                    type="text"
                    value={editingTour.pickupInfo || ''}
                    onChange={(e) => setEditingTour({ ...editingTour, pickupInfo: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700">
                      Itinerary (1 per line)
                    </label>
                    <textarea
                      rows={4}
                      value={(editingTour.itinerary || []).join('\n')}
                      onChange={(e) =>
                        setEditingTour({
                          ...editingTour,
                          itinerary: e.target.value.split('\n'),
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700">
                      Included (1 per line)
                    </label>
                    <textarea
                      rows={4}
                      value={(editingTour.included || []).join('\n')}
                      onChange={(e) =>
                        setEditingTour({
                          ...editingTour,
                          included: e.target.value.split('\n'),
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700">
                      Excluded (1 per line)
                    </label>
                    <textarea
                      rows={4}
                      value={(editingTour.excluded || []).join('\n')}
                      onChange={(e) =>
                        setEditingTour({
                          ...editingTour,
                          excluded: e.target.value.split('\n'),
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700">
                      Booking Options (1 per line)
                    </label>
                    <textarea
                      rows={4}
                      value={(editingTour.bookingOptions || []).join('\n')}
                      onChange={(e) =>
                        setEditingTour({
                          ...editingTour,
                          bookingOptions: e.target.value.split('\n'),
                        })
                      }
                      placeholder="Half-Day Tour – 350 AED"
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
                  <input
                    type="checkbox"
                    checked={Boolean(editingTour.featured)}
                    onChange={(e) => setEditingTour({ ...editingTour, featured: e.target.checked })}
                  />
                  Feature this tour on the homepage
                </label>

                <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingTour(null)}
                    className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#0B0B0D] px-5 py-2 text-xs font-semibold text-white"
                  >
                    Save Tour Package
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* GALLERY TAB */}
      {activeTab === 'gallery' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleAddGallery}
            className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4 lg:col-span-5 h-fit"
          >
            <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
              <ImageIcon className="h-5 w-5 text-[#C59B38]" />
              Add Gallery Photo
            </h2>
            <div>
              <label className="block text-xs font-semibold text-neutral-700">Photo Title *</label>
              <input
                type="text"
                required
                value={newGalTitle}
                onChange={(e) => setNewGalTitle(e.target.value)}
                placeholder="e.g., Sunset over Dubai Marina"
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700">Category *</label>
              <select
                value={newGalCategory}
                onChange={(e) => setNewGalCategory(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
              >
                {[
                  'Dubai Skyline',
                  'Burj Khalifa',
                  'Desert Safari',
                  'Dubai Marina',
                  'Palm Jumeirah',
                  'Abu Dhabi',
                  'Traditional Dubai',
                  'Tourist Experiences',
                ].map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <AdminImagePicker
              label="Photo *"
              value={newGalImage}
              onChange={setNewGalImage}
              onUploadFile={uploadImageFile}
              mediaAssets={mediaAssets}
              onRefreshMedia={fetchMedia}
              aspectClass="h-20 w-28"
            />

            <div>
              <label className="block text-xs font-semibold text-neutral-700">Caption</label>
              <input
                type="text"
                value={newGalCaption}
                onChange={(e) => setNewGalCaption(e.target.value)}
                placeholder="Brief caption displayed below the photo"
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={!newGalImage}
              className="w-full rounded-lg bg-[#0B0B0D] py-2.5 text-xs font-semibold text-white hover:bg-[#1F1F25] disabled:opacity-50"
            >
              Add to Gallery
            </button>
          </form>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7 h-fit">
            {gallery.map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3"
              >
                <SafeImage
                  src={g.imageUrl}
                  alt={g.title}
                  className="h-20 w-24 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-[#8B6816]">{g.category}</p>
                  <p className="truncate text-sm font-semibold text-[#111114]">{g.title}</p>
                  <p className="truncate text-xs text-neutral-500">{g.caption}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingGallery({ ...g })}
                      className="inline-flex items-center gap-1 rounded border border-neutral-300 px-2 py-1 text-[11px] font-semibold text-[#111114] hover:border-[#C59B38]"
                    >
                      <Edit3 className="h-3 w-3" />
                      Edit / Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGallery(g.id)}
                      className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50"
                      aria-label="Delete gallery item"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {editingGallery && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
              <form
                onSubmit={handleUpdateGallery}
                className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 space-y-4 shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                  <h3 className="font-display text-2xl font-semibold">Edit Gallery Photo</h3>
                  <button
                    type="button"
                    onClick={() => setEditingGallery(null)}
                    className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700">Title *</label>
                  <input
                    type="text"
                    required
                    value={editingGallery.title}
                    onChange={(e) =>
                      setEditingGallery({ ...editingGallery, title: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700">Category *</label>
                  <select
                    value={editingGallery.category}
                    onChange={(e) =>
                      setEditingGallery({ ...editingGallery, category: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
                  >
                    {[
                      'Dubai Skyline',
                      'Burj Khalifa',
                      'Desert Safari',
                      'Dubai Marina',
                      'Palm Jumeirah',
                      'Abu Dhabi',
                      'Traditional Dubai',
                      'Tourist Experiences',
                    ].map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <AdminImagePicker
                  label="Replace Image"
                  value={editingGallery.imageUrl}
                  onChange={(url) => setEditingGallery({ ...editingGallery, imageUrl: url })}
                  onUploadFile={uploadImageFile}
                  mediaAssets={mediaAssets}
                  onRefreshMedia={fetchMedia}
                />

                <div>
                  <label className="block text-xs font-semibold text-neutral-700">Caption</label>
                  <input
                    type="text"
                    value={editingGallery.caption}
                    onChange={(e) =>
                      setEditingGallery({ ...editingGallery, caption: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-neutral-200 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingGallery(null)}
                    className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#0B0B0D] px-5 py-2 text-xs font-semibold text-white"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* REVIEWS TAB */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'all', label: 'All', count: reviews.length },
                  {
                    id: 'pending',
                    label: 'Pending',
                    count: reviews.filter((r) => r.status === 'pending').length,
                  },
                  {
                    id: 'approved',
                    label: 'Approved',
                    count: reviews.filter((r) => r.status === 'approved').length,
                  },
                  {
                    id: 'rejected',
                    label: 'Rejected',
                    count: reviews.filter((r) => r.status === 'rejected').length,
                  },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setReviewFilter(f.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    reviewFilter === f.id
                      ? 'border-[#0B0B0D] bg-[#0B0B0D] text-white'
                      : 'border-neutral-200 bg-white text-neutral-600'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className="font-mono-num text-[11px] opacity-75">({f.count})</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-500">
              Only approved customer reviews appear on the public website.
            </p>
          </div>

          {reviews.filter((r) => (reviewFilter === 'all' ? true : r.status === reviewFilter))
            .length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500">
              No customer reviews in this filter.
            </div>
          ) : (
            <div className="space-y-3">
              {reviews
                .filter((r) => (reviewFilter === 'all' ? true : r.status === reviewFilter))
                .map((rev) => (
                  <div
                    key={rev.id}
                    className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-5"
                  >
                    <div className="flex flex-1 items-start gap-4 min-w-[240px]">
                      {rev.photoUrl && (
                        <SafeImage
                          src={rev.photoUrl}
                          alt={rev.customerName}
                          className="h-16 w-16 shrink-0 rounded-lg object-cover border border-neutral-200"
                        />
                      )}
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-[#111114]">{rev.customerName}</span>
                          {rev.tourTitle && (
                            <span className="text-neutral-500">· {rev.tourTitle}</span>
                          )}
                          <span>·</span>
                          <span className="inline-flex items-center gap-0.5 text-[#C59B38]">
                            <Star className="h-3.5 w-3.5 fill-[#C59B38]" />
                            {rev.rating}/5
                          </span>
                          <span>·</span>
                          <span
                            className={`rounded border px-2 py-0.5 font-semibold capitalize ${
                              rev.status === 'approved'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : rev.status === 'rejected'
                                  ? 'border-red-200 bg-red-50 text-red-800'
                                  : 'border-amber-200 bg-amber-50 text-amber-900'
                            }`}
                          >
                            {rev.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-neutral-700">{rev.comment}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleReviewStatus(rev.id, 'approved')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          rev.status === 'approved'
                            ? 'bg-emerald-700 text-white'
                            : 'border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        }`}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewStatus(rev.id, 'rejected')}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          rev.status === 'rejected'
                            ? 'bg-red-700 text-white'
                            : 'border border-neutral-300 bg-white text-neutral-700 hover:bg-red-50 hover:text-red-800'
                        }`}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReview(rev.id)}
                        className="rounded-lg p-1.5 text-red-700 hover:bg-red-50"
                        aria-label="Delete review"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* INQUIRIES TAB */}
      {activeTab === 'inquiries' && (
        <div className="space-y-3">
          {inquiries.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500">
              No contact inquiries yet.
            </div>
          ) : (
            inquiries.map((inq) => (
              <div
                key={inq.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-5"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <MessageSquare className="h-3.5 w-3.5 text-[#C59B38]" />
                    <span className="font-semibold text-[#111114]">{inq.subject}</span>
                    <span>·</span>
                    <span className="capitalize font-semibold text-[#8B6816]">{inq.status}</span>
                  </div>
                  <p className="text-xs text-neutral-600">
                    {inq.name} ({inq.email}) {inq.phone && `· ${inq.phone}`}
                  </p>
                  <p className="pt-1 text-sm text-neutral-800">{inq.message}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleInquiryStatus(inq.id, inq.status === 'unread' ? 'replied' : 'unread')
                    }
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold"
                  >
                    {inq.status === 'unread' ? 'Mark Replied' : 'Mark Unread'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteInquiry(inq.id)}
                    className="rounded-lg p-1.5 text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CONTACT, BRAND & ABOUT US TAB */}
      {activeTab === 'settings' && settingsForm && (
        <div className="grid gap-8 lg:grid-cols-12">
          <form
            onSubmit={handleSaveSettings}
            className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-5 lg:col-span-8"
          >
            <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
              <Settings className="h-5 w-5 text-[#C59B38]" />
              Business Contact, Social Links &amp; About Us
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-700">Brand Name</label>
                <input
                  type="text"
                  value={settingsForm.brandName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, brandName: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700">
                  Brand Slogan
                </label>
                <input
                  type="text"
                  value={settingsForm.slogan}
                  onChange={(e) => setSettingsForm({ ...settingsForm, slogan: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700">
                  WhatsApp Business Number
                </label>
                <input
                  type="text"
                  value={settingsForm.whatsappNumber}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })
                  }
                  className="font-mono-num mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700">Email Contact</label>
                <input
                  type="email"
                  value={settingsForm.email}
                  onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700">
                  Dubai Business Address
                </label>
                <input
                  type="text"
                  value={settingsForm.address}
                  onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700">Map Lat</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={settingsForm.businessLat}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, businessLat: Number(e.target.value) })
                    }
                    className="font-mono-num mt-1 w-full rounded-lg border border-neutral-300 px-2 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700">Map Lng</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={settingsForm.businessLng}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, businessLng: Number(e.target.value) })
                    }
                    className="font-mono-num mt-1 w-full rounded-lg border border-neutral-300 px-2 py-2 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700">Instagram URL</label>
                <input
                  type="url"
                  value={settingsForm.socialInstagram}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, socialInstagram: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700">Facebook URL</label>
                <input
                  type="url"
                  value={settingsForm.socialFacebook}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, socialFacebook: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700">TikTok URL</label>
                <input
                  type="url"
                  value={settingsForm.socialTiktok}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, socialTiktok: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700">YouTube URL</label>
                <input
                  type="url"
                  value={settingsForm.socialYoutube}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, socialYoutube: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="border-t border-neutral-200 pt-4 space-y-4">
              <h3 className="font-display text-xl font-semibold">
                About Us, Program Organizer &amp; Guides
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700">
                    Program Organizer Name
                  </label>
                  <input
                    type="text"
                    value={settingsForm.guideName}
                    onChange={(e) => setSettingsForm({ ...settingsForm, guideName: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700">
                    Organizer Role / Title
                  </label>
                  <input
                    type="text"
                    value={settingsForm.guideTitle}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, guideTitle: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700">
                    Tour Guides (separated by &amp; or comma)
                  </label>
                  <input
                    type="text"
                    value={settingsForm.guidesNames || ''}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, guidesNames: e.target.value })
                    }
                    placeholder="Usama Khokhar & Abdul Qadir Khokhar"
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700">Languages</label>
                  <input
                    type="text"
                    value={settingsForm.guideLanguages}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, guideLanguages: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <AdminImagePicker
                label="Guide / Organizer Portrait Photo"
                helperText="Shown on the Homepage Welcome section and About Us page."
                value={settingsForm.guidePhotoUrl}
                onChange={(url) => setSettingsForm({ ...settingsForm, guidePhotoUrl: url })}
                onUploadFile={uploadImageFile}
                mediaAssets={mediaAssets}
                onRefreshMedia={fetchMedia}
                aspectClass="h-24 w-24"
              />

              <div>
                <label className="block text-xs font-semibold text-neutral-700">
                  About Us Introduction Bio
                </label>
                <textarea
                  rows={3}
                  value={settingsForm.guideBio}
                  onChange={(e) => setSettingsForm({ ...settingsForm, guideBio: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700">
                  About Us Services Highlights (1 per line)
                </label>
                <textarea
                  rows={4}
                  value={(settingsForm.guideServices || []).join('\n')}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      guideServices: e.target.value.split('\n'),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700">
                    Experience Details (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={settingsForm.guideExperience}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, guideExperience: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700">
                    Qualifications / Licensing (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={settingsForm.guideCredentials}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, guideCredentials: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0B0B0D] px-6 py-3 text-xs font-semibold text-white hover:bg-[#1F1F25] disabled:opacity-60"
            >
              {savingSettings && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#C59B38]" />}
              {savingSettings ? 'Saving Settings...' : 'Save Contact & About Settings'}
            </button>
          </form>

          <form
            onSubmit={handleChangePassword}
            className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4 lg:col-span-4 h-fit"
          >
            <h3 className="font-display text-2xl font-semibold">Admin Security</h3>
            <p className="text-xs text-neutral-600">
              Update your administrator password (stored using salted scrypt hashing).
            </p>
            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currPass}
                onChange={(e) => setCurrPass(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700">
                New Password (min 8 chars)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg border border-[#0B0B0D] bg-white py-2.5 text-xs font-semibold text-[#111114] hover:bg-[#FAF9F6]"
            >
              Update Password
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

