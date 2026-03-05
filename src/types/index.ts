// LUMINVERA - Type Definitions

// ============================================
// User & Auth Types
// ============================================

export type UserRole = 'USER' | 'SELLER' | 'ADMIN' | 'SUPER_ADMIN'
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED' | 'PENDING_VERIFICATION'
export type SellerStatus = 'PENDING' | 'VERIFIED' | 'SUSPENDED' | 'BANNED' | 'REJECTED'
export type ProductStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'LIVE' | 'DISABLED' | 'ARCHIVED' | 'REJECTED'
export type OrderStatus = 'PLACED' | 'CONFIRMED' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'RETURNED' | 'REFUNDED' | 'DISPUTED'
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
export type PaymentMethod = 'COD' | 'WALLET' | 'CARD' | 'BANK_TRANSFER' | 'JAZZ_CASH' | 'EASY_PAISA'

export interface User {
  id: string
  email: string
  emailVerified: boolean
  firstName: string | null
  lastName: string | null
  phone: string | null
  phoneVerified: boolean
  avatarUrl: string | null
  role: UserRole
  accountStatus: AccountStatus
  createdAt: string
  sellerProfile?: Seller
}

export interface Seller {
  id: string
  userId: string
  storeName: string
  storeSlug: string
  storeDescription: string | null
  storeLogoUrl: string | null
  storeBannerUrl: string | null
  status: SellerStatus
  totalSales: number
  totalOrders: number
  totalProducts: number
  averageRating: number
  totalReviews: number
  commissionRate: number
  totalEarnings: number
  availableBalance: number
  isFeatured: boolean
  isTopSeller: boolean
  createdAt: string
}

export interface Session {
  id: string
  userId: string
  deviceInfo: string | null
  ipAddress: string | null
  expiresAt: string
  isActive: boolean
}

// ============================================
// Product Types
// ============================================

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  parentId: string | null
  parent?: Category
  children?: Category[]
  productCount?: number
}

export interface Product {
  id: string
  sellerId: string
  sku: string
  name: string
  slug: string
  description: string | null
  shortDescription: string | null
  categoryId: string | null
  category?: Category
  status: ProductStatus
  primaryImageUrl: string | null
  images: string[] | null
  basePrice: number
  costPrice: number | null
  compareAtPrice: number | null
  currency: string
  discountPercentage: number
  discountAmount: number
  stockQuantity: number
  stockReserved: number
  lowStockThreshold: number
  trackInventory: boolean
  weight: number | null
  freeShipping: boolean
  shippingFee: number
  hasVariants: boolean
  viewCount: number
  purchaseCount: number
  wishlistCount: number
  averageRating: number
  totalReviews: number
  isFeatured: boolean
  isNewArrival: boolean
  isBestSeller: boolean
  warrantyPeriod: string | null
  seller?: Seller
  variants?: ProductVariant[]
  createdAt: string
  updatedAt: string
}

export interface ProductVariant {
  id: string
  productId: string
  sku: string
  attributes: Record<string, string>
  priceAdjustment: number
  compareAtPrice: number | null
  stockQuantity: number
  imageUrl: string | null
  isActive: boolean
}

export interface ProductAttribute {
  id: string
  name: string
  slug: string
  type: 'text' | 'number' | 'select' | 'multiselect' | 'color'
  values: AttributeValue[]
}

export interface AttributeValue {
  id: string
  value: string
  slug: string
  colorCode: string | null
}

// ============================================
// Cart Types
// ============================================

export interface Cart {
  id: string
  userId: string
  subtotal: number
  discount: number
  deliveryFee: number
  tax: number
  total: number
  items: CartItem[]
}

export interface CartItem {
  id: string
  cartId: string
  productId: string
  variantId: string | null
  quantity: number
  unitPrice: number
  totalPrice: number
  sellerId: string
  product?: Product
  variant?: ProductVariant
}

// ============================================
// Order Types
// ============================================

export interface Order {
  id: string
  orderNumber: string
  userId: string
  sellerId: string | null
  status: OrderStatus
  subtotal: number
  discount: number
  deliveryFee: number
  tax: number
  total: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  shippingRecipientName: string
  shippingPhone: string
  shippingCity: string
  shippingStreetAddress: string
  estimatedDeliveryDate: string | null
  actualDeliveryDate: string | null
  courierName: string | null
  courierTrackingNumber: string | null
  placedAt: string
  confirmedAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
  items: OrderItem[]
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  variantId: string | null
  sellerId: string
  productName: string
  productSku: string
  productImageUrl: string | null
  unitPrice: number
  quantity: number
  totalPrice: number
  commissionRate: number
  commissionAmount: number
  sellerEarnings: number
  itemStatus: OrderStatus
}

// ============================================
// Address Types
// ============================================

export interface Address {
  id: string
  userId: string
  label: string | null
  recipientName: string
  recipientPhone: string
  country: string
  province: string
  city: string
  area: string | null
  streetAddress: string
  postalCode: string | null
  isDefault: boolean
}

// ============================================
// Review Types
// ============================================

export interface Review {
  id: string
  productId: string
  userId: string
  rating: number
  title: string | null
  comment: string | null
  images: string[] | null
  isVerifiedPurchase: boolean
  helpfulCount: number
  sellerResponse: string | null
  createdAt: string
  user?: {
    firstName: string | null
    lastName: string | null
  }
}

// ============================================
// Notification Types
// ============================================

export type NotificationType = 'ORDER' | 'PAYMENT' | 'APPROVAL' | 'SUSPENSION' | 'PROMOTION' | 'SYSTEM' | 'DISPUTE' | 'REFUND'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  data: Record<string, unknown> | null
  read: boolean
  readAt: string | null
  createdAt: string
}

// ============================================
// Dashboard Stats Types
// ============================================

export interface AdminDashboardStats {
  totalUsers: number
  totalSellers: number
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  pendingApprovals: number
  activeDisputes: number
  recentOrders: Order[]
  topSellers: Seller[]
  topProducts: Product[]
}

export interface SellerDashboardStats {
  totalProducts: number
  totalOrders: number
  totalSales: number
  totalEarnings: number
  availableBalance: number
  pendingBalance: number
  averageRating: number
  pendingOrders: number
  recentOrders: Order[]
  topProducts: Product[]
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
