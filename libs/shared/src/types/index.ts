// User Types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  tenantId: string;
  twoFactorAuth: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

// Tenant Types
export interface Tenant {
  id: string;
  name: string;
  domain?: string;
  schemaName: string;
  createdAt: Date;
  updatedAt: Date;
}

// Subscription Types
export interface Subscription {
  id: string;
  tenantId: string;
  stripeCustomerId: string;
  stripePriceId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  UNPAID = 'UNPAID',
}

// Website Types
export interface Website {
  id: string;
  name: string;
  domain?: string;
  template: string;
  published: boolean;
  tenantId: string;
  pages: Page[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Page {
  id: string;
  name: string;
  slug: string;
  content: Record<string, any>;
  meta?: Record<string, any>;
  websiteId: string;
  createdAt: Date;
  updatedAt: Date;
}

// E-commerce Types
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  images: string[];
  variants: ProductVariant[];
  collections: Collection[];
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  price: number;
  inventory: number;
  productId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  products: Product[];
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Analytics Types
export interface Analytics {
  id: string;
  event: string;
  data: Record<string, any>;
  tenantId: string;
  createdAt: Date;
}

// API Response Types
export interface ApiResponse<T> {
  status: 'success' | 'fail' | 'error';
  data?: T;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Theme Types
export interface Theme {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: ThemeCategory;
  components: ThemeComponent[];
}

export enum ThemeCategory {
  MINIMALIST = 'minimalist',
  CREATIVE = 'creative',
  CORPORATE = 'corporate',
  PORTFOLIO = 'portfolio',
  ECOMMERCE = 'ecommerce',
}

export interface ThemeComponent {
  id: string;
  name: string;
  type: string;
  props: Record<string, any>;
  children?: ThemeComponent[];
}

// Form Types
export interface FormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: Record<string, any>;
}

// Error Types
export interface AppErrorResponse {
  status: 'error';
  message: string;
  code: string;
  details?: Record<string, any>;
}
