// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    SETUP_2FA: '/auth/2fa/setup',
    DISABLE_2FA: '/auth/2fa/disable',
  },
  WEBSITES: {
    BASE: '/websites',
    DETAIL: (id: string) => `/websites/${id}`,
    PAGES: (websiteId: string, pageId: string) => `/websites/${websiteId}/pages/${pageId}`,
  },
  PRODUCTS: {
    BASE: '/products',
    DETAIL: (id: string) => `/products/${id}`,
    VARIANTS: (id: string) => `/products/${id}/variants`,
  },
  COLLECTIONS: {
    BASE: '/collections',
    DETAIL: (id: string) => `/collections/${id}`,
  },
  SUBSCRIPTIONS: {
    BASE: '/subscriptions',
    DETAIL: (id: string) => `/subscriptions/${id}`,
    CANCEL: (id: string) => `/subscriptions/${id}/cancel`,
  },
  ANALYTICS: {
    BASE: '/analytics',
    EVENTS: '/analytics/events',
  },
};

// Subscription Plans
export const SUBSCRIPTION_PLANS = {
  BASIC: {
    id: 'basic',
    name: 'Basic',
    price: 9.99,
    features: [
      'Single website',
      'Basic templates',
      'Community support',
      '5GB storage',
    ],
  },
  PRO: {
    id: 'pro',
    name: 'Professional',
    price: 29.99,
    features: [
      '5 websites',
      'All templates',
      'Priority support',
      '25GB storage',
      'Custom domain',
      'E-commerce features',
    ],
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99.99,
    features: [
      'Unlimited websites',
      'Custom templates',
      'Dedicated support',
      'Unlimited storage',
      'Multiple domains',
      'Advanced analytics',
      'API access',
    ],
  },
};

// Theme Templates
export const THEME_TEMPLATES = {
  MINIMALIST: {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Clean and simple design focusing on content',
    thumbnail: '/themes/minimalist.jpg',
  },
  CREATIVE: {
    id: 'creative',
    name: 'Creative',
    description: 'Bold and artistic design for creatives',
    thumbnail: '/themes/creative.jpg',
  },
  CORPORATE: {
    id: 'corporate',
    name: 'Corporate',
    description: 'Professional design for businesses',
    thumbnail: '/themes/corporate.jpg',
  },
  PORTFOLIO: {
    id: 'portfolio',
    name: 'Portfolio',
    description: 'Showcase your work with style',
    thumbnail: '/themes/portfolio.jpg',
  },
  ECOMMERCE: {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Complete online store solution',
    thumbnail: '/themes/ecommerce.jpg',
  },
};

// Validation Constants
export const VALIDATION = {
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 50,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  },
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_-]+$/,
  },
  DOMAIN: {
    PATTERN: /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/,
  },
};

// Error Messages
export const ERROR_MESSAGES = {
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_EXISTS: 'Email already exists',
    INVALID_TOKEN: 'Invalid or expired token',
    UNAUTHORIZED: 'Unauthorized access',
  },
  WEBSITE: {
    NOT_FOUND: 'Website not found',
    DOMAIN_EXISTS: 'Domain already in use',
    INVALID_TEMPLATE: 'Invalid template selected',
  },
  SUBSCRIPTION: {
    PAYMENT_FAILED: 'Payment processing failed',
    PLAN_NOT_FOUND: 'Subscription plan not found',
    ALREADY_SUBSCRIBED: 'Already subscribed to this plan',
  },
};

// Cache Keys
export const CACHE_KEYS = {
  USER_PROFILE: (userId: string) => `user:${userId}:profile`,
  WEBSITE_DATA: (websiteId: string) => `website:${websiteId}:data`,
  PRODUCT_LIST: (tenantId: string) => `tenant:${tenantId}:products`,
  ANALYTICS_DASHBOARD: (tenantId: string) => `tenant:${tenantId}:analytics`,
};

// File Upload
export const UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif'],
};

// Analytics Events
export const ANALYTICS_EVENTS = {
  PAGE_VIEW: 'page_view',
  BUTTON_CLICK: 'button_click',
  FORM_SUBMIT: 'form_submit',
  PURCHASE: 'purchase',
  ERROR: 'error',
};
