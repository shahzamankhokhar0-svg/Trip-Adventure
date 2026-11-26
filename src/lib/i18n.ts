export type LanguageCode = 'en' | 'ar' | 'ur';

export interface TranslationStrings {
  nav: {
    home: string;
    about: string;
    tours: string;
    attractions: string;
    gallery: string;
    reviews: string;
    contact: string;
    bookTour: string;
    onlineBooking: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    exploreTours: string;
    bookAdventure: string;
    contactWhatsApp: string;
    organizerLabel: string;
    guidesLabel: string;
    ratesLabelAed: string;
    ratesLabelUsd: string;
  };
  sections: {
    welcomeEyebrow: string;
    meetTeamBtn: string;
    askCustomBtn: string;
    featuredEyebrow: string;
    featuredTitle: string;
    viewAllTours: string;
    tariffEyebrow: string;
    tariffTitle: string;
    browseTransfersBtn: string;
    destinationsEyebrow: string;
    destinationsTitle: string;
    exploreAttractionsBtn: string;
    whyEyebrow: string;
    whyTitle: string;
    reviewsEyebrow: string;
    reviewsTitle: string;
    galleryEyebrow: string;
    galleryTitle: string;
    openGalleryBtn: string;
    faqEyebrow: string;
    faqTitle: string;
    faqSubtitle: string;
    ctaTitle: string;
    requestBookingBtn: string;
    chatWhatsAppBtn: string;
    bookOnlineBtn: string;
    whatsAppShort: string;
    itineraryBtn: string;
    bookShort: string;
    toursPageEyebrow: string;
    toursPageTitle: string;
    customTourInquiry: string;
    bookingEyebrow: string;
    bookingTitle: string;
    contactEyebrow: string;
    contactTitle: string;
  };
}

export const TRANSLATIONS: Record<LanguageCode, TranslationStrings> = {
  en: {
    nav: {
      home: 'Home',
      about: 'About Us',
      tours: 'Dubai Tours',
      attractions: 'Attractions',
      gallery: 'Gallery',
      reviews: 'Reviews',
      contact: 'Contact',
      bookTour: 'Book Now',
      onlineBooking: 'Online Booking',
    },
    hero: {
      eyebrow: 'DUBAI, UNITED ARAB EMIRATES · PERSONAL TOUR GUIDE',
      title: 'DISCOVER DUBAI WITH TRIP ADVENTURE',
      subtitle:
        "Explore Dubai's iconic attractions, hidden gems, luxury experiences, and unforgettable adventures with your personal tour guide.",
      exploreTours: 'Explore Our Tours',
      bookAdventure: 'Book Your Adventure',
      contactWhatsApp: 'Contact on WhatsApp',
      organizerLabel: 'Program Organizer',
      guidesLabel: 'Tour Guides',
      ratesLabelAed: 'Transparent Rates in UAE Dirham (AED)',
      ratesLabelUsd: 'Approx. USD Rates (1 USD = 3.6725 AED)',
    },
    sections: {
      welcomeEyebrow: 'Welcome to TRIP ADVENTURE',
      meetTeamBtn: 'Meet Our Organizer & Guides',
      askCustomBtn: 'Ask About Custom Itineraries',
      featuredEyebrow: 'Curated Private Experiences',
      featuredTitle: 'Featured Dubai Tour Packages',
      viewAllTours: 'View All',
      tariffEyebrow: 'Fixed Tariff Schedule',
      tariffTitle: 'Desert Safari, Dubai Airport & Inter-Hotel Transfers',
      browseTransfersBtn: 'Browse Transfer Details',
      destinationsEyebrow: 'Iconic Landmarks',
      destinationsTitle: 'Popular Dubai Destinations',
      exploreAttractionsBtn: 'Explore All Attractions & Map',
      whyEyebrow: 'Personal Service Standard',
      whyTitle: 'Why Choose TRIP ADVENTURE?',
      reviewsEyebrow: 'Verified Feedback',
      reviewsTitle: 'Guest Reviews',
      galleryEyebrow: 'Around the Emirates',
      galleryTitle: 'Photo Gallery',
      openGalleryBtn: 'Open Full Gallery',
      faqEyebrow: 'Travel Planning',
      faqTitle: 'Frequently Asked Questions',
      faqSubtitle:
        'Browse answers grouped by Tours, Transfers, and Booking to plan your Dubai itinerary clearly.',
      ctaTitle: 'Ready to Plan Your Personal Dubai Experience?',
      requestBookingBtn: 'Book Now',
      chatWhatsAppBtn: 'Chat on WhatsApp',
      bookOnlineBtn: 'Book Now',
      whatsAppShort: 'WhatsApp',
      itineraryBtn: 'Itinerary',
      bookShort: 'Book Now',
      toursPageEyebrow: 'Half-Day, Full-Day, Safari & Transfer Services',
      toursPageTitle: 'Dubai Tours, Safaris & Transfers',
      customTourInquiry: 'Custom Tour Inquiry',
      bookingEyebrow: 'Online Reservation Request',
      bookingTitle: 'Book Your Dubai Adventure',
      contactEyebrow: 'Direct Assistance',
      contactTitle: 'Contact TRIP ADVENTURE',
    },
  },
  ar: {
    nav: {
      home: 'الرئيسية',
      about: 'من نحن',
      tours: 'جولات دبي',
      attractions: 'المعالم',
      gallery: 'المعرض',
      reviews: 'التقييمات',
      contact: 'اتصل بنا',
      bookTour: 'احجز الآن',
      onlineBooking: 'الحجز الإلكتروني',
    },
    hero: {
      eyebrow: 'دبي، الإمارات العربية المتحدة · مرشد سياحي خاص',
      title: 'اكتشف دبي مع TRIP ADVENTURE',
      subtitle:
        'استكشف أشهر معالم دبي، رحلات السفاري الصحراوية، والتنقلات الخاصة من المطار والفنادق مع فريقنا.',
      exploreTours: 'استكشف الجولات',
      bookAdventure: 'احجز مغامرتك',
      contactWhatsApp: 'تواصل عبر واتساب',
      organizerLabel: 'منظم البرامج',
      guidesLabel: 'المرشدون السياحيون',
      ratesLabelAed: 'أسعار واضحة بالدرهم الإماراتي (AED)',
      ratesLabelUsd: 'أسعار تقريبية بالدولار الأمريكي (1 USD = 3.6725 AED)',
    },
    sections: {
      welcomeEyebrow: 'مرحباً بكم في TRIP ADVENTURE',
      meetTeamBtn: 'تعرف على فريقنا',
      askCustomBtn: 'استفسر عن البرامج الخاصة',
      featuredEyebrow: 'تجارب خاصة مختارة',
      featuredTitle: 'باقات جولات دبي المميزة',
      viewAllTours: 'عرض الكل',
      tariffEyebrow: 'جدول الأسعار الثابتة',
      tariffTitle: 'رحلات السفاري الصحراوية وتوصيل المطار والفنادق',
      browseTransfersBtn: 'تصفح تفاصيل التوصيل',
      destinationsEyebrow: 'معالم بارزة',
      destinationsTitle: 'أشهر وجهات دبي',
      exploreAttractionsBtn: 'استكشف المعالم والخريطة',
      whyEyebrow: 'معايير الخدمة الشخصية',
      whyTitle: 'لماذا تختار TRIP ADVENTURE؟',
      reviewsEyebrow: 'آراء الضيوف الموثقة',
      reviewsTitle: 'تقييمات المسافرين',
      galleryEyebrow: 'من أنحاء الإمارات',
      galleryTitle: 'معرض الصور',
      openGalleryBtn: 'افتح المعرض الكامل',
      faqEyebrow: 'تخطيط الرحلة',
      faqTitle: 'الأسئلة الشائعة',
      faqSubtitle: 'تصفح الإجابات مصنفة حسب الجولات والتوصيل والحجز لتسهيل التخطيط لرحلتك.',
      ctaTitle: 'هل أنت مستعد لتخطيط تجربتك الخاصة في دبي؟',
      requestBookingBtn: 'طلب حجز إلكتروني',
      chatWhatsAppBtn: 'تحدث عبر واتساب',
      bookOnlineBtn: 'احجز أونلاين',
      whatsAppShort: 'واتساب',
      itineraryBtn: 'البرنامج',
      bookShort: 'احجز',
      toursPageEyebrow: 'نصف يوم، يوم كامل، سفاري وتنقلات',
      toursPageTitle: 'جولات دبي والسفاري والتوصيل',
      customTourInquiry: 'طلب برنامج خاص',
      bookingEyebrow: 'طلب حجز إلكتروني',
      bookingTitle: 'احجز مغامرتك في دبي',
      contactEyebrow: 'مساعدة مباشرة',
      contactTitle: 'تواصل مع TRIP ADVENTURE',
    },
  },
  ur: {
    nav: {
      home: 'ہوم',
      about: 'ہمارے بارے میں',
      tours: 'دبئی ٹورز',
      attractions: 'مقامات',
      gallery: 'گیلری',
      reviews: 'ریویوز',
      contact: 'رابطہ',
      bookTour: 'بکنگ کریں',
      onlineBooking: 'آن لائن بکنگ',
    },
    hero: {
      eyebrow: 'دبئی، متحدہ عرب امارات · پرسنل ٹور گائیڈ',
      title: 'TRIP ADVENTURE کے ساتھ دبئی دریافت کریں',
      subtitle:
        'ہمارے ذاتی ٹور گائیڈز کے ساتھ دبئی کے مشہور مقامات، ڈیزرٹ سفاری، اور ایئرپورٹ و ہوٹل ٹرانسفرز کا لطف اٹھائیں۔',
      exploreTours: 'ٹورز دیکھیں',
      bookAdventure: 'ایڈونچر بک کریں',
      contactWhatsApp: 'واٹس ایپ پر رابطہ کریں',
      organizerLabel: 'پروگرام آرگنائزر',
      guidesLabel: 'ٹور گائیڈز',
      ratesLabelAed: 'واضح ریٹس متحدہ عرب امارات درہم (AED) میں',
      ratesLabelUsd: 'تخمینی امریکی ڈالر ریٹس (1 USD = 3.6725 AED)',
    },
    sections: {
      welcomeEyebrow: 'TRIP ADVENTURE میں خوش آمدید',
      meetTeamBtn: 'ہماری ٹیم سے ملیں',
      askCustomBtn: 'کسٹم ٹور کے بارے میں پوچھیں',
      featuredEyebrow: 'منتخب پرائیویٹ تجربات',
      featuredTitle: 'نمایاں دبئی ٹور پیکجز',
      viewAllTours: 'تمام دیکھیں',
      tariffEyebrow: 'فکسڈ ریٹ شیڈول',
      tariffTitle: 'ڈیزرٹ سفاری، دبئی ایئرپورٹ اور انٹر ہوٹل ٹرانسفرز',
      browseTransfersBtn: 'ٹرانسفر کی تفصیلات دیکھیں',
      destinationsEyebrow: 'مشہور مقامات',
      destinationsTitle: 'مقبول دبئی مقامات',
      exploreAttractionsBtn: 'تمام مقامات اور نقشہ دیکھیں',
      whyEyebrow: 'ذاتی سروس کا معیار',
      whyTitle: 'TRIP ADVENTURE کیوں منتخب کریں؟',
      reviewsEyebrow: 'تصدیق شدہ مہمانوں کی آراء',
      reviewsTitle: 'کسٹمر ریویوز',
      galleryEyebrow: 'امارات کے مناظر',
      galleryTitle: 'فوٹو گیلری',
      openGalleryBtn: 'مکمل گیلری کھولیں',
      faqEyebrow: 'سفر کی منصوبہ بندی',
      faqTitle: 'اکثر پوچھے گئے سوالات',
      faqSubtitle: 'آسانی کے لیے سوالات کو ٹورز، ٹرانسفرز اور بکنگ کے زمروں میں تقسیم کیا گیا ہے۔',
      ctaTitle: 'کیا آپ اپنے دبئی ٹور کا پلان بنانے کے لیے تیار ہیں؟',
      requestBookingBtn: 'آن لائن بکنگ کی درخواست دیں',
      chatWhatsAppBtn: 'واٹس ایپ پر چیٹ کریں',
      bookOnlineBtn: 'آن لائن بک کریں',
      whatsAppShort: 'واٹس ایپ',
      itineraryBtn: 'تفصیلات',
      bookShort: 'بک کریں',
      toursPageEyebrow: 'ہاف ڈے، فل ڈے، سفاری اور ٹرانسفر سروسز',
      toursPageTitle: 'دبئی ٹورز، سفاری اور ٹرانسفرز',
      customTourInquiry: 'کسٹم ٹور کی معلومات',
      bookingEyebrow: 'آن لائن بکنگ فارم',
      bookingTitle: 'اپنا دبئی ایڈونچر بک کریں',
      contactEyebrow: 'براہ راست رہنمائی',
      contactTitle: 'TRIP ADVENTURE سے رابطہ کریں',
    },
  },
};
