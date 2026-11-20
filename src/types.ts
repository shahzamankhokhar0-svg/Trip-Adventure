export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'rejected';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type InquiryStatus = 'unread' | 'replied';

export interface TourPackage {
  id: string;
  slug: string;
  title: string;
  category: string;
  imageUrl: string;
  galleryImages?: string[];
  description: string;
  duration: string;
  startingPriceAed: number | null;
  priceNote: string;
  availabilityNote: string;
  itinerary: string[];
  pickupInfo: string;
  included: string[];
  excluded: string[];
  bookingOptions: string[];
  featured: boolean;
  sortOrder: number;
}

export interface Attraction {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  shortIntro: string;
  description: string;
  location: string;
  lat: number;
  lng: number;
  facts: string[];
  recommendedTours: string[];
}

export type NotificationDeliveryState = 'sent' | 'not_configured' | 'failed';

export interface NotificationChannelLog {
  status: NotificationDeliveryState;
  recipient: string;
  detail: string;
  messageId?: string;
  attemptedAt: string;
}

export interface BookingNotificationsLog {
  ownerEmail?: NotificationChannelLog;
  ownerWhatsapp?: NotificationChannelLog;
  customerWhatsapp?: NotificationChannelLog;
  customerEmail?: NotificationChannelLog;
}

export interface NotificationConfigStatus {
  ownerEmailTarget: string;
  ownerWhatsappTarget: string;
  smtpConfigured: boolean;
  smtpHost: string;
  whatsappApiConfigured: boolean;
}

export interface BookingRequest {
  id: string;
  referenceCode: string;
  fullName: string;
  email: string;
  whatsappNumber: string;
  nationality: string;
  tourId: string;
  tourTitle: string;
  travelDate: string;
  adults: number;
  children: number;
  pickupLocation: string;
  requirements: string;
  status: BookingStatus;
  adminNotes: string;
  notifications?: BookingNotificationsLog;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerReview {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  photoUrl?: string;
  tourTitle?: string;
  status: ReviewStatus;
  createdAt: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  caption: string;
  createdAt: string;
}

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
}

export interface SiteSettings {
  brandName: string;
  slogan: string;
  whatsappNumber: string;
  email: string;
  address: string;
  businessLat: number;
  businessLng: number;
  socialInstagram: string;
  socialFacebook: string;
  socialTiktok: string;
  socialYoutube: string;
  guideName: string;
  guideTitle: string;
  guidesNames: string;
  guideLanguages: string;
  guidePhotoUrl: string;
  guideBio: string;
  guideExperience: string;
  guideCredentials: string;
  guideServices: string[];
}

export type FaqCategory = 'Tours' | 'Transfers' | 'Booking';

export interface CmsFaqItem {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
}

export interface CmsWhyCard {
  num: string;
  title: string;
  description: string;
}

export type PublicPageKey =
  | 'home'
  | 'about'
  | 'tours'
  | 'attractions'
  | 'gallery'
  | 'reviews'
  | 'contact'
  | 'book';

export interface PageSeoMeta {
  title: string;
  description: string;
}

export type SeoPagesMap = Record<PublicPageKey, PageSeoMeta>;

export interface CmsContent {
  heroEyebrow: string;
  heroHeading: string;
  heroDescription: string;
  heroBannerUrl: string;
  heroExploreBtnText: string;
  heroBookBtnText: string;
  heroWhatsAppBtnText: string;
  welcomeEyebrow: string;
  welcomeHeading: string;
  welcomeDescription: string;
  featuredEyebrow: string;
  featuredHeading: string;
  featuredDescription: string;
  tariffEyebrow: string;
  tariffHeading: string;
  destinationsEyebrow: string;
  destinationsHeading: string;
  whyEyebrow: string;
  whyHeading: string;
  whyCards: CmsWhyCard[];
  reviewsEyebrow: string;
  reviewsHeading: string;
  galleryEyebrow: string;
  galleryHeading: string;
  faqEyebrow: string;
  faqHeading: string;
  faqSubtitle: string;
  faqs: CmsFaqItem[];
  ctaEyebrow: string;
  ctaHeading: string;
  ctaDescription: string;
  ctaBannerUrl: string;
  ctaPrimaryBtnText: string;
  ctaSecondaryBtnText: string;
  toursPageEyebrow: string;
  toursPageHeading: string;
  toursPageDescription: string;
  aboutServicesHeading: string;
  aboutServicesDescription: string;
  aboutCommitmentEyebrow: string;
  aboutCommitmentHeading: string;
  aboutCommitmentDescription: string;
  contactEyebrow: string;
  contactHeading: string;
  contactDescription: string;
  footerTagline: string;
  seoPages: SeoPagesMap;
}

export interface MediaAsset {
  id: string;
  filename: string;
  url: string;
  source: 'uploaded' | 'built-in';
  sizeBytes?: number;
  createdAt?: string;
}

export interface DashboardStats {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  rejectedBookings: number;
  unreadInquiries: number;
  pendingReviews: number;
  totalTours: number;
  totalGallery: number;
}

export interface PublicBootstrapData {
  tours: TourPackage[];
  attractions: Attraction[];
  reviews: CustomerReview[];
  gallery: GalleryItem[];
  settings: SiteSettings;
  cms: CmsContent;
  mapsApiKey: string;
}

export interface BookingTrendPoint {
  date: string;
  label: string;
  total: number;
  confirmed: number;
  completed: number;
  pending: number;
  rejected: number;
  guests: number;
}

export interface PopularTourStat {
  tourId: string;
  tourTitle: string;
  category: string;
  bookingsCount: number;
  confirmedCount: number;
  totalGuests: number;
  estimatedRevenueAed: number;
  startingPriceAed: number | null;
}

export interface CategoryBreakdownStat {
  category: string;
  toursCount: number;
  bookingsCount: number;
  guestsCount: number;
}

export interface CachePerformanceStats {
  cached: boolean;
  cacheHits: number;
  cacheMisses: number;
  hitRatioPercent: number;
  rawBytes: number;
  gzipBytes: number;
  savingsPercent: number;
  lastBuildMs: number;
  lastRebuiltAt: string | null;
  etag: string | null;
}

export interface AdminAnalyticsData {
  range: '14d' | '30d' | 'monthly';
  summary: {
    totalBookings: number;
    totalGuests: number;
    confirmedBookings: number;
    completedBookings: number;
    pendingBookings: number;
    rejectedBookings: number;
    approvalRatePercent: number;
    estimatedConfirmedRevenueAed: number;
  };
  bookingTrends: BookingTrendPoint[];
  popularTours: PopularTourStat[];
  categoryBreakdown: CategoryBreakdownStat[];
  cachePerformance: CachePerformanceStats;
}

export interface BlockedDateEntry {
  date: string;
  reason: string;
}

export interface DateBookingSummary {
  confirmed: number;
  pending: number;
}

export interface AvailabilityPayload {
  blockedDates: BlockedDateEntry[];
  bookedDates: Record<string, DateBookingSummary>;
  autoBlockConfirmedDates: boolean;
}
