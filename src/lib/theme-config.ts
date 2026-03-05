// Theme Configuration for LUMINVERA
// Admin can customize all visual aspects of the platform

export interface ThemeConfig {
  // Branding
  siteName: string
  tagline: string
  logoUrl: string
  faviconUrl: string
  
  // Colors
  primaryColor: string
  primaryHoverColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
  successColor: string
  warningColor: string
  errorColor: string
  
  // Typography
  fontFamily: string
  headingFont: string
  baseFontSize: string
  
  // Layout
  borderRadius: string
  cardShadow: string
  
  // Features
  darkModeEnabled: boolean
  rtlSupport: boolean
  
  // Footer
  footerText: string
  socialLinks: {
    facebook: string
    instagram: string
    twitter: string
    youtube: string
  }
  
  // Contact
  supportEmail: string
  supportPhone: string
  supportWhatsapp: string
}

export const DEFAULT_THEME: ThemeConfig = {
  siteName: 'Luminvera',
  tagline: "Pakistan's #1 Marketplace",
  logoUrl: '',
  faviconUrl: '',
  
  primaryColor: '#10b981', // emerald-500
  primaryHoverColor: '#059669', // emerald-600
  secondaryColor: '#14b8a6', // teal-500
  accentColor: '#0d9488', // teal-600
  backgroundColor: '#ffffff',
  textColor: '#1e293b', // slate-800
  successColor: '#22c55e', // green-500
  warningColor: '#f59e0b', // amber-500
  errorColor: '#ef4444', // red-500
  
  fontFamily: 'Inter, system-ui, sans-serif',
  headingFont: 'Inter, system-ui, sans-serif',
  baseFontSize: '16px',
  
  borderRadius: '0.75rem',
  cardShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  
  darkModeEnabled: true,
  rtlSupport: false,
  
  footerText: '© 2025 Luminvera. All rights reserved.',
  socialLinks: {
    facebook: 'https://facebook.com/luminvera',
    instagram: 'https://instagram.com/luminvera',
    twitter: 'https://twitter.com/luminvera',
    youtube: 'https://youtube.com/luminvera'
  },
  
  supportEmail: 'support@luminvera.pk',
  supportPhone: '+92-300-1234567',
  supportWhatsapp: '+92-300-1234567'
}

export interface PlatformSettings {
  // General
  defaultCurrency: string
  defaultLanguage: string
  timezone: string
  dateFormat: string
  
  // Commission
  defaultCommissionRate: number
  minimumPayoutAmount: number
  payoutSchedule: 'weekly' | 'biweekly' | 'monthly'
  
  // Orders
  orderPrefix: string
  estimatedDeliveryDays: number
  freeShippingThreshold: number
  defaultShippingFee: number
  
  // Security
  maxLoginAttempts: number
  lockoutDuration: number
  sessionTimeout: number
  twoFactorRequired: boolean
  
  // Features
  enableReviews: boolean
  enableWishlist: boolean
  enableFlashSale: boolean
  enableCoupons: boolean
  enableLiveChat: boolean
  
  // Maintenance
  maintenanceMode: boolean
  maintenanceMessage: string
}

export const DEFAULT_SETTINGS: PlatformSettings = {
  defaultCurrency: 'PKR',
  defaultLanguage: 'en',
  timezone: 'Asia/Karachi',
  dateFormat: 'DD/MM/YYYY',
  
  defaultCommissionRate: 10,
  minimumPayoutAmount: 1000,
  payoutSchedule: 'weekly',
  
  orderPrefix: 'ORD',
  estimatedDeliveryDays: 5,
  freeShippingThreshold: 5000,
  defaultShippingFee: 200,
  
  maxLoginAttempts: 5,
  lockoutDuration: 30,
  sessionTimeout: 24,
  twoFactorRequired: false,
  
  enableReviews: true,
  enableWishlist: true,
  enableFlashSale: true,
  enableCoupons: true,
  enableLiveChat: false,
  
  maintenanceMode: false,
  maintenanceMessage: 'We are currently performing maintenance. Please check back soon.'
}

export interface Banner {
  id: string
  title: string
  subtitle?: string
  imageUrl: string
  linkUrl?: string
  buttonText?: string
  position: 'hero' | 'top' | 'middle' | 'bottom' | 'sidebar'
  isActive: boolean
  sortOrder: number
  startDate?: string
  endDate?: string
  createdAt: string
}

export interface EmailTemplate {
  id: string
  type: 'welcome' | 'order_confirmation' | 'order_shipped' | 'order_delivered' | 'password_reset' | 'seller_approved' | 'payout_processed'
  subject: string
  body: string
  variables: string[]
  isActive: boolean
}

export interface PaymentGateway {
  id: string
  name: string
  code: string
  isActive: boolean
  isTestMode: boolean
  credentials: Record<string, string>
  fees: {
    percentage: number
    fixed: number
  }
}

// Helper to convert hex to CSS variable
export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { h: 0, s: 0, l: 0 }
  
  let r = parseInt(result[1], 16) / 255
  let g = parseInt(result[2], 16) / 255
  let b = parseInt(result[3], 16) / 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

// Generate CSS variables from theme config
export function generateCSSVariables(theme: ThemeConfig): string {
  const primary = hexToHSL(theme.primaryColor)
  const secondary = hexToHSL(theme.secondaryColor)
  const accent = hexToHSL(theme.accentColor)
  
  return `
    --primary: ${primary.h} ${primary.s}% ${primary.l}%;
    --primary-foreground: 0 0% 100%;
    --secondary: ${secondary.h} ${secondary.s}% ${secondary.l}%;
    --secondary-foreground: 0 0% 100%;
    --accent: ${accent.h} ${accent.s}% ${accent.l}%;
    --accent-foreground: 0 0% 100%;
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: ${primary.h} ${primary.s}% ${primary.l}%;
    --radius: ${theme.borderRadius};
  `
}
