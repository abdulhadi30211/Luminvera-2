'use client'

// ============================================
// LUMINVERA - Complete Multi-Vendor E-Commerce
// Pakistan-First, Enterprise-Grade Platform
// ============================================

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore, useCartStore, useUIStore, useDataStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  Search, ShoppingCart, User, Menu, X, Heart, Star, Truck, Shield, 
  Package, Store, LayoutDashboard, Settings, Bell, ChevronRight, 
  Plus, Minus, Trash2, Check, AlertCircle, TrendingUp, Users,
  DollarSign, ShoppingBag, Eye, Edit, MoreVertical, LogOut, Home,
  Layers, FileText, BarChart3, Activity, Clock, MapPin, Phone,
  Mail, Calendar, CreditCard, Wallet, Gift, Tag, Percent, ArrowUp,
  ArrowDown, Filter, Grid, List, Image, Upload, Save, RefreshCw,
  MessageSquare, ThumbsUp, ThumbsDown, Send, XCircle, CheckCircle,
  AlertTriangle, Info, ExternalLink, Copy, Printer, Download,
  ChevronDown, ChevronLeft, RotateCcw, Ban, CheckCheck, Clock4,
  Palette, GripVertical, HelpCircle, HeadphonesIcon, Flag, Share2, Lock, Zap, Database
} from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'

// ============================================
// Types
// ============================================

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  avatarUrl: string | null
  role: 'USER' | 'SELLER' | 'ADMIN' | 'SUPER_ADMIN'
  accountStatus: string
  emailVerified: boolean
  emailNotifications?: boolean
  smsNotifications?: boolean
  promotionalEmails?: boolean
  createdAt: string
  sellerProfile?: SellerProfile
}

interface SellerProfile {
  id: string
  storeName: string
  storeSlug: string
  storeDescription?: string
  storeLogoUrl?: string
  status: string
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
}

interface Product {
  id: string
  sellerId: string
  sku: string
  name: string
  slug: string
  description?: string
  categoryId?: string
  status: string
  primaryImageUrl?: string
  basePrice: number
  compareAtPrice?: number
  discountPercentage: number
  stockQuantity: number
  freeShipping: boolean
  shippingFee: number
  averageRating: number
  totalReviews: number
  isFeatured: boolean
  isNewArrival: boolean
  isBestSeller: boolean
  warrantyPeriod?: string
  createdAt: string
  seller?: SellerProfile
  category?: Category
}

interface Category {
  id: string
  name: string
  slug: string
  imageUrl?: string
  parentId?: string
  productCount?: number
}

interface CartItem {
  id: string
  productId: string
  variantId?: string
  quantity: number
  unitPrice: number
  totalPrice: number
  sellerId: string
  product?: Product
}

interface Order {
  id: string
  orderNumber: string
  userId: string
  status: string
  subtotal: number
  discount: number
  deliveryFee: number
  tax: number
  total: number
  paymentMethod: string
  paymentStatus: string
  shippingRecipientName: string
  shippingPhone: string
  shippingCity: string
  shippingStreetAddress: string
  placedAt: string
  deliveredAt?: string
  items: OrderItem[]
}

interface OrderItem {
  id: string
  productId: string
  productName: string
  productSku: string
  productImageUrl?: string
  unitPrice: number
  quantity: number
  totalPrice: number
}

interface Review {
  id: string
  productId: string
  userId: string
  rating: number
  title?: string
  comment?: string
  isVerifiedPurchase: boolean
  helpfulCount: number
  createdAt: string
  user?: { firstName?: string; lastName?: string }
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

// ============================================
// Pakistan Location Data
// ============================================

const PAKISTAN_PROVINCES = [
  'Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 
  'Islamabad Capital Territory', 'Gilgit-Baltistan', 'Azad Kashmir'
]

const PAKISTAN_CITIES: Record<string, string[]> = {
  'Punjab': ['Lahore', 'Faisalabad', 'Rawalpindi', 'Multan', 'Gujranwala', 'Sialkot', 'Sargodha', 'Bahawalpur'],
  'Sindh': ['Karachi', 'Hyderabad', 'Sukkur', 'Larkana', 'Nawabshah'],
  'Khyber Pakhtunkhwa': ['Peshawar', 'Mardan', 'Mingora', 'Kohat', 'Abbottabad'],
  'Balochistan': ['Quetta', 'Gwadar', 'Turbat', 'Khuzdar'],
  'Islamabad Capital Territory': ['Islamabad'],
  'Gilgit-Baltistan': ['Gilgit', 'Skardu'],
  'Azad Kashmir': ['Muzaffarabad', 'Mirpur', 'Rawalakot'],
}

// ============================================
// Utility Functions
// ============================================

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

const formatDate = (dateString: string): string => {
  try {
    return format(new Date(dateString), 'MMM d, yyyy')
  } catch {
    return dateString
  }
}

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'PLACED': 'bg-blue-100 text-blue-800',
    'CONFIRMED': 'bg-indigo-100 text-indigo-800',
    'PACKED': 'bg-purple-100 text-purple-800',
    'SHIPPED': 'bg-yellow-100 text-yellow-800',
    'DELIVERED': 'bg-green-100 text-green-800',
    'COMPLETED': 'bg-green-100 text-green-800',
    'CANCELLED': 'bg-red-100 text-red-800',
    'RETURNED': 'bg-orange-100 text-orange-800',
    'PENDING': 'bg-gray-100 text-gray-800',
    'LIVE': 'bg-green-100 text-green-800',
    'DRAFT': 'bg-gray-100 text-gray-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

// ============================================
// Main Component
// ============================================

export default function LuminveraApp() {
  // Stores
  const { user, isAuthenticated, setUser, logout } = useAuthStore()
  const { items: cartItems, addItem, removeItem, updateQuantity, clearCart } = useCartStore()
  const { 
    currentView, setCurrentView, setSelectedProduct, searchQuery, setSearchQuery,
    showAuthModal, setShowAuthModal, authModalTab, setAuthModalTab,
    mobileMenuOpen, setMobileMenuOpen 
  } = useUIStore()
  const { 
    products, setProducts, featuredProducts, setFeaturedProducts,
    categories, setCategories 
  } = useDataStore()
  
  // Local State
  const [selectedProductData, setSelectedProductData] = useState<Product | null>(null)
  const [wishlist, setWishlist] = useState<string[]>([])
  const [wishlistItems, setWishlistItems] = useState<any[]>([])
  const [dataInitialized, setDataInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [userAddresses, setUserAddresses] = useState<any[]>([])
  const [userReviews, setUserReviews] = useState<Review[]>([])
  const [userWallet, setUserWallet] = useState<{ balance: number; pendingBalance: number } | null>(null)
  const [sellerProducts, setSellerProducts] = useState<Product[]>([])
  const [sellerOrders, setSellerOrders] = useState<Order[]>([])
  const [platformStats, setPlatformStats] = useState({
    totalUsers: 0, totalSellers: 0, totalProducts: 0, totalOrders: 0,
    totalRevenue: 0, newUsersToday: 0, newOrdersToday: 0, revenueToday: 0
  })
  const [productReviews, setProductReviews] = useState<Review[]>([])
  const [adminUsers, setAdminUsers] = useState<any[]>([])
  const [adminSellers, setAdminSellers] = useState<any[]>([])
  const [adminProducts, setAdminProducts] = useState<any[]>([])
  const [supportTickets, setSupportTickets] = useState<any[]>([])
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [platformSettings, setPlatformSettings] = useState<Record<string, string>>({})
  const [disputes, setDisputes] = useState<any[]>([])
  const [selectedDispute, setSelectedDispute] = useState<any>(null)
  
  const { toast } = useToast()

  // Fetch all real data from database
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true)
      try {
        // Fetch products
        const productsRes = await fetch('/api/products?status=LIVE&limit=50')
        if (productsRes.ok) {
          const productsData = await productsRes.json()
          setProducts(productsData.products || [])
          setFeaturedProducts((productsData.products || []).filter((p: Product) => p.isFeatured))
        }

        // Fetch categories
        const categoriesRes = await fetch('/api/categories')
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json()
          setCategories(categoriesData.categories || [])
        }

        setDataInitialized(true)
      } catch (error) {
        console.error('Failed to fetch data:', error)
        toast({ title: 'Error loading data', description: 'Please refresh the page', variant: 'destructive' })
      }
      setIsLoading(false)
    }

    fetchAllData()
  }, [setProducts, setFeaturedProducts, setCategories, toast])

  // Fetch user-specific data when authenticated
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return
      
      try {
        // Fetch user orders
        const ordersRes = await fetch(`/api/orders?userId=${user.id}`)
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json()
          setOrders(ordersData.orders || [])
        }

        // Fetch user addresses
        const addressesRes = await fetch(`/api/addresses?userId=${user.id}`)
        if (addressesRes.ok) {
          const addressesData = await addressesRes.json()
          setUserAddresses(addressesData.addresses || [])
        }

        // Fetch wishlist
        const wishlistRes = await fetch(`/api/wishlist?userId=${user.id}`)
        if (wishlistRes.ok) {
          const wishlistData = await wishlistRes.json()
          setWishlistItems(wishlistData.items || [])
          setWishlist((wishlistData.items || []).map((item: any) => item.products?.id || item.product_id))
        }

        // Fetch user reviews
        const reviewsRes = await fetch(`/api/reviews?userId=${user.id}`)
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json()
          setUserReviews(reviewsData.reviews || [])
        }

        // Fetch notifications
        const notifRes = await fetch(`/api/notifications?userId=${user.id}`)
        if (notifRes.ok) {
          const notifData = await notifRes.json()
          setNotifications(notifData.notifications || [])
        }

        // Fetch user wallet (placeholder - would need wallet API)
        // For now, set a placeholder value
        setUserWallet({ balance: 0, pendingBalance: 0 })

        // If seller, fetch seller data
        if (user.role === 'SELLER' && user.sellerProfile) {
          const sellerProductsRes = await fetch(`/api/products?sellerId=${user.sellerProfile?.id}`)
          if (sellerProductsRes.ok) {
            const spData = await sellerProductsRes.json()
            setSellerProducts(spData.products || [])
          }
        }

        // If admin, fetch platform stats and data
        if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
          const statsRes = await fetch('/api/analytics?type=platform')
          if (statsRes.ok) {
            const statsData = await statsRes.json()
            setPlatformStats(prev => ({ ...prev, ...statsData.overview, ...statsData.period }))
          }

          // Fetch admin users
          const usersRes = await fetch('/api/admin?action=users&pageSize=10')
          if (usersRes.ok) {
            const usersData = await usersRes.json()
            setAdminUsers(usersData.data || [])
          }

          // Fetch admin sellers
          const sellersRes = await fetch('/api/admin?action=sellers&pageSize=10')
          if (sellersRes.ok) {
            const sellersData = await sellersRes.json()
            setAdminSellers(sellersData.data || [])
          }

          // Fetch admin products
          const productsRes = await fetch('/api/admin?action=products&pageSize=10')
          if (productsRes.ok) {
            const productsData = await productsRes.json()
            setAdminProducts(productsData.data || [])
          }

          // Fetch platform settings
          const settingsRes = await fetch('/api/settings')
          if (settingsRes.ok) {
            const settingsData = await settingsRes.json()
            setPlatformSettings(settingsData.settings || {})
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error)
      }
    }

    fetchUserData()
  }, [user])

  // Auth check on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth')
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.user) {
            setUser(data.user)
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error)
      }
      useAuthStore.getState().setLoading(false)
    }
    checkAuth()
  }, [setUser])

  // Handlers
  const handleLogin = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      })
      const data = await res.json()
      if (data.success) {
        setUser(data.user)
        setShowAuthModal(false)
        toast({ title: 'Welcome back!', description: `Logged in as ${data.user.email}` })
      } else {
        toast({ title: 'Login Failed', description: data.error, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Login failed. Please try again.', variant: 'destructive' })
    }
  }

  const handleRegister = async (userData: { email: string; password: string; firstName: string; lastName: string; role: string }) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', ...userData }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Account Created!', description: 'You can now log in with your credentials.' })
        setAuthModalTab('login')
      } else {
        toast({ title: 'Registration Failed', description: data.error, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Registration failed. Please try again.', variant: 'destructive' })
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    })
    logout()
    setCurrentView('home')
    toast({ title: 'Logged out', description: 'See you soon!' })
  }

  const addToCart = (product: Product) => {
    addItem({
      id: `cart-${Date.now()}`,
      cartId: 'guest-cart',
      productId: product.id,
      variantId: null,
      quantity: 1,
      unitPrice: product.basePrice,
      totalPrice: product.basePrice,
      sellerId: product.sellerId,
      product,
    })
    toast({ title: 'Added to cart', description: product.name })
  }

  const toggleWishlist = async (productId: string) => {
    if (!user?.id) {
      toast({ title: 'Please login', description: 'Login to add items to wishlist', variant: 'destructive' })
      return
    }

    try {
      if (wishlist.includes(productId)) {
        // Remove from wishlist
        const res = await fetch(`/api/wishlist?userId=${user.id}&productId=${productId}`, {
          method: 'DELETE'
        })
        if (res.ok) {
          setWishlist(wishlist.filter(id => id !== productId))
          setWishlistItems(wishlistItems.filter((item: any) => (item.products?.id || item.product_id) !== productId))
          toast({ title: 'Removed from wishlist' })
        } else {
          toast({ title: 'Error', description: 'Failed to remove from wishlist', variant: 'destructive' })
        }
      } else {
        // Add to wishlist
        const res = await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, productId })
        })
        if (res.ok) {
          setWishlist([...wishlist, productId])
          toast({ title: 'Added to wishlist' })
          // Refetch wishlist to get updated data
          const wishlistRes = await fetch(`/api/wishlist?userId=${user.id}`)
          if (wishlistRes.ok) {
            const wishlistData = await wishlistRes.json()
            setWishlistItems(wishlistData.items || [])
          }
        } else {
          toast({ title: 'Error', description: 'Failed to add to wishlist', variant: 'destructive' })
        }
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
    }
  }

  const cartTotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0)
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const unreadNotifications = notifications.filter(n => !n.read).length

  // Filter products by search
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Render view based on current state
  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HomePage />
      case 'products':
        return <ProductsPage />
      case 'product-detail':
        return selectedProductData ? <ProductDetailPage /> : <ProductsPage />
      case 'cart':
        return <CartPage />
      case 'checkout':
        return <CheckoutPage />
      case 'user-dashboard':
        return <UserDashboard />
      case 'user-orders':
        return <UserOrders />
      case 'user-wishlist':
        return <UserWishlist />
      case 'user-addresses':
        return <UserAddresses />
      case 'user-settings':
        return <UserSettings />
      case 'seller-dashboard':
        return <SellerDashboard />
      case 'seller-products':
        return <SellerProducts />
      case 'seller-orders':
        return <SellerOrders />
      case 'seller-analytics':
        return <SellerAnalytics />
      case 'seller-settings':
        return <SellerSettings />
      case 'admin-dashboard':
        return <AdminDashboard />
      case 'admin-users':
        return <AdminUsers />
      case 'admin-sellers':
        return <AdminSellers />
      case 'admin-products':
        return <AdminProducts />
      case 'admin-orders':
        return <AdminOrders />
      case 'admin-settings':
        return <AdminSettings />
      case 'admin-financials':
        return <AdminFinancials />
      case 'admin-shipping':
        return <AdminShipping />
      case 'admin-marketing':
        return <AdminMarketing />
      case 'admin-offers':
        return <AdminOffers />
      case 'admin-reports':
        return <AdminReports />
      case 'admin-theme':
        return <AdminTheme />
      case 'admin-seo':
        return <AdminSEO />
      case 'admin-site-settings':
        return <AdminSiteSettings />
      case 'admin-database':
        return <AdminDatabase />
      case 'admin-activities':
        return <AdminActivities />
      case 'admin-reviews':
        return <AdminReviews />
      case 'admin-disputes':
        return <AdminDisputes />
      case 'admin-payouts':
        return <AdminPayouts />
      case 'admin-notifications':
        return <AdminNotifications />
      case 'admin-banners':
        return <AdminBanners />
      case 'admin-categories':
        return <AdminCategories />
      case 'admin-coupons':
        return <AdminCoupons />
      case 'admin-inventory':
        return <AdminInventory />
      case 'admin-support':
        return <AdminSupport />
      case 'admin-analytics':
        return <AdminAnalytics />
      case 'admin-platform-services':
        return <AdminPlatformServices />
      case 'admin-platform-features':
        return <AdminPlatformFeatures />
      case 'admin-platform-tools':
        return <AdminPlatformTools />
      case 'admin-color-palette':
        return <AdminColorPalette />
      case 'user-support':
        return <UserSupport />
      default:
        return <HomePage />
    }
  }

  // ============================================
  // Sub-Components
  // ============================================

  function HomePage() {
    const [flashSales, setFlashSales] = useState<any[]>([])
    const [banners, setBanners] = useState<any[]>([])
    const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 })

    // Fetch flash sales and banners
    useEffect(() => {
      const fetchHomeData = async () => {
        try {
          // Fetch active flash sales
          const flashRes = await fetch('/api/flash-sale?active=true')
          if (flashRes.ok) {
            const flashData = await flashRes.json()
            setFlashSales(flashData.flashSales || [])
          }

          // Fetch banners
          const bannersRes = await fetch('/api/banners?position=hero&active=true')
          if (bannersRes.ok) {
            const bannersData = await bannersRes.json()
            setBanners(bannersData.banners || [])
          }
        } catch (error) {
          console.error('Failed to fetch home data:', error)
        }
      }
      fetchHomeData()
    }, [])

    // Countdown timer for flash sale
    useEffect(() => {
      const updateCountdown = () => {
        const now = new Date()
        const activeSale = flashSales[0]
        if (activeSale?.end_time) {
          const endTime = new Date(activeSale.end_time)
          const diff = Math.max(0, endTime.getTime() - now.getTime())
          setCountdown({
            hours: Math.floor(diff / (1000 * 60 * 60)),
            minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((diff % (1000 * 60)) / 1000)
          })
        } else {
          // Default countdown if no flash sale
          const endOfDay = new Date()
          endOfDay.setHours(23, 59, 59, 999)
          const diff = endOfDay.getTime() - now.getTime()
          setCountdown({
            hours: Math.floor(diff / (1000 * 60 * 60)),
            minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((diff % (1000 * 60)) / 1000)
          })
        }
      }
      updateCountdown()
      const interval = setInterval(updateCountdown, 1000)
      return () => clearInterval(interval)
    }, [flashSales])

    const heroBanner = banners[0]
    const activeFlashSale = flashSales[0]

    return (
      <div className="container mx-auto px-4 py-6">
        {/* Hero Banner */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 md:p-12 mb-8">
          {heroBanner?.image_url && (
            <img 
              src={heroBanner.image_url} 
              alt={heroBanner.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/90 via-teal-600/80 to-transparent" />
          <div className="relative z-10 max-w-2xl">
            <Badge className="mb-4 bg-white/20 text-white border-0 hover:bg-white/30">
              {heroBanner?.subtitle || "Pakistan's #1 Marketplace"}
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
              {heroBanner?.title || 'Shop Smart, Shop Luminvera'}
            </h1>
            <p className="text-white/90 text-lg mb-6">
              Millions of products from trusted sellers. Fast delivery across Pakistan. 
              Quality guaranteed with easy returns.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button 
                size="lg" 
                variant="secondary" 
                onClick={() => heroBanner?.link_url ? window.open(heroBanner.link_url, '_self') : setCurrentView('products')} 
                className="gap-2"
              >
                Start Shopping <ChevronRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white/50 hover:bg-white/10">
                Sell on Luminvera
              </Button>
            </div>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-black/10 to-transparent hidden lg:block" />
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Truck, title: 'Fast Delivery', desc: 'Nationwide 2-5 days' },
            { icon: Shield, title: 'Secure Payments', desc: '100% protected transactions' },
            { icon: RotateCcw, title: 'Easy Returns', desc: '7-day return policy' },
            { icon: CheckCircle, title: 'Verified Sellers', desc: 'Trusted merchants only' },
          ].map((item, i) => (
            <Card key={i} className="text-center py-6 hover:shadow-md transition-shadow">
              <CardContent className="pt-2">
                <item.icon className="h-10 w-10 mx-auto mb-3 text-emerald-600" />
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Categories */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Shop by Category</h2>
            <Button variant="ghost" onClick={() => setCurrentView('products')} className="text-emerald-600">
              View All <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {categories.map((category) => (
              <Card 
                key={category.id}
                className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-1 group"
                onClick={() => {
                  setSearchQuery('')
                  setCurrentView('products')
                }}
              >
                <CardContent className="p-4 text-center">
                  <div className="w-14 h-14 mx-auto mb-2 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center group-hover:from-emerald-200 group-hover:to-teal-200 transition-colors">
                    <Layers className="h-7 w-7 text-emerald-600" />
                  </div>
                  <p className="font-medium text-sm line-clamp-1">{category.name}</p>
                  <p className="text-xs text-muted-foreground">{category.productCount}+</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Flash Sale Banner */}
        {activeFlashSale && (
          <div className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 p-6 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <Badge className="bg-white/20 text-white border-0 mb-2">⚡ Limited Time</Badge>
                <h3 className="text-2xl font-bold text-white">{activeFlashSale.title}</h3>
                <p className="text-white/80">{activeFlashSale.description || `Up to ${activeFlashSale.discount_percentage}% off!`}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center text-white bg-white/10 px-4 py-2 rounded-lg">
                  <p className="text-xs opacity-80">Ends in</p>
                  <p className="text-2xl font-bold font-mono">
                    {String(countdown.hours).padStart(2, '0')}:
                    {String(countdown.minutes).padStart(2, '0')}:
                    {String(countdown.seconds).padStart(2, '0')}
                  </p>
                </div>
                <Button variant="secondary" onClick={() => setCurrentView('products')} className="bg-white text-orange-600 hover:bg-white/90">
                  Shop Now
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Featured Products */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Featured Products</h2>
            <Button variant="ghost" onClick={() => setCurrentView('products')} className="text-emerald-600">
              View All <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {featuredProducts.slice(0, 5).map((product) => (
              <ProductCard 
                key={product.id}
                product={product}
                onClick={() => {
                  setSelectedProduct(product.id)
                  setSelectedProductData(product)
                  setCurrentView('product-detail')
                }}
                onAddToCart={() => addToCart(product)}
                onToggleWishlist={() => toggleWishlist(product.id)}
                isInWishlist={wishlist.includes(product.id)}
              />
            ))}
          </div>
        </section>

        {/* Best Sellers */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Best Sellers</h2>
            <Button variant="ghost" onClick={() => setCurrentView('products')} className="text-emerald-600">
              View All <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.filter(p => p.isBestSeller).slice(0, 5).map((product) => (
              <ProductCard 
                key={product.id}
                product={product}
                onClick={() => {
                  setSelectedProduct(product.id)
                  setSelectedProductData(product)
                  setCurrentView('product-detail')
                }}
                onAddToCart={() => addToCart(product)}
                onToggleWishlist={() => toggleWishlist(product.id)}
                isInWishlist={wishlist.includes(product.id)}
              />
            ))}
          </div>
        </section>

        {/* New Arrivals */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">New Arrivals</h2>
            <Button variant="ghost" onClick={() => setCurrentView('products')} className="text-emerald-600">
              View All <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.filter(p => p.isNewArrival).slice(0, 5).map((product) => (
              <ProductCard 
                key={product.id}
                product={product}
                onClick={() => {
                  setSelectedProduct(product.id)
                  setSelectedProductData(product)
                  setCurrentView('product-detail')
                }}
                onAddToCart={() => addToCart(product)}
                onToggleWishlist={() => toggleWishlist(product.id)}
                isInWishlist={wishlist.includes(product.id)}
              />
            ))}
          </div>
        </section>

        {/* Newsletter */}
        <Card className="bg-gradient-to-r from-slate-800 to-slate-900 border-0 mb-8">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-2">Subscribe for Exclusive Deals</h3>
            <p className="text-slate-300 mb-4">Get notified about flash sales, new arrivals, and special discounts</p>
            <div className="flex max-w-md mx-auto gap-2">
              <Input placeholder="Enter your email" className="bg-white/10 border-slate-600 text-white placeholder:text-slate-400" />
              <Button className="bg-emerald-500 hover:bg-emerald-600">Subscribe</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  function ProductCard({ product, onClick, onAddToCart, onToggleWishlist, isInWishlist }: {
    product: Product
    onClick: () => void
    onAddToCart: () => void
    onToggleWishlist: () => void
    isInWishlist: boolean
  }) {
    return (
      <Card className="group cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden">
        <div className="relative aspect-square bg-gradient-to-br from-slate-100 to-slate-50 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="h-20 w-20 text-slate-200" />
          </div>
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.discountPercentage > 0 && (
              <Badge className="bg-red-500 text-white text-xs border-0">-{product.discountPercentage}%</Badge>
            )}
            {product.isNewArrival && (
              <Badge className="bg-emerald-500 text-white text-xs border-0">New</Badge>
            )}
            {product.isBestSeller && (
              <Badge className="bg-orange-500 text-white text-xs border-0">Best Seller</Badge>
            )}
          </div>

          {/* Wishlist Button */}
          <Button
            variant="ghost"
            size="icon"
            className={`absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-sm transition-colors ${isInWishlist ? 'text-red-500' : 'text-slate-400'}`}
            onClick={(e) => {
              e.stopPropagation()
              onToggleWishlist()
            }}
          >
            <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-current' : ''}`} />
          </Button>

          {/* Quick Add */}
          <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/50 to-transparent">
            <Button 
              size="sm" 
              className="w-full bg-white text-slate-900 hover:bg-slate-100"
              onClick={(e) => {
                e.stopPropagation()
                onAddToCart()
              }}
            >
              <ShoppingCart className="h-4 w-4 mr-1" /> Add to Cart
            </Button>
          </div>
        </div>

        <CardContent className="p-3" onClick={onClick}>
          <h3 className="font-medium text-sm line-clamp-2 mb-1.5 min-h-[2.5rem]">{product.name}</h3>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`h-3 w-3 ${i < Math.floor(product.averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} 
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">({product.totalReviews})</span>
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-bold text-lg text-emerald-600">{formatPrice(product.basePrice)}</span>
            {product.compareAtPrice && product.compareAtPrice > product.basePrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>
          {product.stockQuantity < 10 && product.stockQuantity > 0 && (
            <p className="text-xs text-orange-600 mt-1">Only {product.stockQuantity} left!</p>
          )}
        </CardContent>
      </Card>
    )
  }

  function ProductsPage() {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [sortBy, setSortBy] = useState('relevance')
    const [priceRange, setPriceRange] = useState([0, 100000])
    const [selectedRating, setSelectedRating] = useState<number | null>(null)
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [selectedBrands, setSelectedBrands] = useState<string[]>([])
    const [inStockOnly, setInStockOnly] = useState(false)
    const [freeShippingOnly, setFreeShippingOnly] = useState(false)
    const [onSaleOnly, setOnSaleOnly] = useState(false)
    
    // API state
    const [searchResults, setSearchResults] = useState<Product[]>([])
    const [facets, setFacets] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [pagination, setPagination] = useState({
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
      hasMore: false
    })
    
    // Search history and popular searches
    const [searchHistory, setSearchHistory] = useState<{id: string; query: string}[]>([])
    const [popularSearches, setPopularSearches] = useState<{query: string; count: number}[]>([])
    const [showSearchDropdown, setShowSearchDropdown] = useState(false)

    // Build API query and fetch products
    const fetchProducts = useCallback(async (page: number = 1) => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('status', 'LIVE')
        params.set('page', page.toString())
        params.set('pageSize', '20')
        params.set('includeFacets', 'true')
        
        if (searchQuery) {
          params.set('search', searchQuery)
        }
        
        if (sortBy) {
          params.set('sortBy', sortBy)
        }
        
        if (selectedCategories.length > 0) {
          params.set('categories', selectedCategories.join(','))
        }
        
        if (selectedBrands.length > 0) {
          params.set('brands', selectedBrands.join(','))
        }
        
        if (priceRange[0] > 0) {
          params.set('minPrice', priceRange[0].toString())
        }
        
        if (priceRange[1] < 100000) {
          params.set('maxPrice', priceRange[1].toString())
        }
        
        if (selectedRating) {
          params.set('minRating', selectedRating.toString())
        }
        
        if (inStockOnly) {
          params.set('inStock', 'true')
        }
        
        if (freeShippingOnly) {
          params.set('freeShipping', 'true')
        }
        
        if (onSaleOnly) {
          params.set('onSale', 'true')
        }

        const res = await fetch(`/api/products?${params.toString()}`)
        const data = await res.json()
        
        if (data.success) {
          setSearchResults(data.products || [])
          setFacets(data.facets || [])
          setPagination({
            total: data.pagination?.total || 0,
            page: data.pagination?.page || 1,
            pageSize: data.pagination?.pageSize || 20,
            totalPages: data.pagination?.totalPages || 0,
            hasMore: data.pagination?.hasMore || false
          })
          
          // Save search to history
          if (searchQuery && data.products?.length > 0) {
            fetch('/api/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: searchQuery, resultsCount: data.pagination?.total || 0 })
            }).catch(() => {})
          }
        }
      } catch (error) {
        console.error('Failed to fetch products:', error)
        toast({ title: 'Error', description: 'Failed to load products', variant: 'destructive' })
      }
      setLoading(false)
    }, [searchQuery, sortBy, selectedCategories, selectedBrands, priceRange, selectedRating, inStockOnly, freeShippingOnly, onSaleOnly, toast])

    // Fetch popular searches
    useEffect(() => {
      fetch('/api/search?action=popular')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setPopularSearches(data.popularSearches || [])
          }
        })
        .catch(() => {})
    }, [])

    // Fetch search history
    useEffect(() => {
      if (user?.id) {
        fetch('/api/search?action=history&limit=10')
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setSearchHistory(data.history || [])
            }
          })
          .catch(() => {})
      }
    }, [user?.id])

    // Fetch products when filters change
    useEffect(() => {
      fetchProducts(1)
    }, [fetchProducts])

    // Clear all filters
    const clearAllFilters = () => {
      setSearchQuery('')
      setSelectedCategories([])
      setSelectedBrands([])
      setPriceRange([0, 100000])
      setSelectedRating(null)
      setInStockOnly(false)
      setFreeShippingOnly(false)
      setOnSaleOnly(false)
    }

    // Count active filters
    const activeFilterCount = [
      searchQuery,
      selectedCategories.length > 0,
      selectedBrands.length > 0,
      priceRange[0] > 0 || priceRange[1] < 100000,
      selectedRating,
      inStockOnly,
      freeShippingOnly,
      onSaleOnly
    ].filter(Boolean).length

    // Get facet by name
    const getFacet = (name: string) => facets.find(f => f.name === name)

    // Handle page change
    const handlePageChange = (newPage: number) => {
      fetchProducts(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    return (
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <button onClick={() => setCurrentView('home')} className="hover:text-foreground">Home</button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">Products</span>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Filters - Desktop */}
          <aside className="hidden lg:block w-72 shrink-0">
            <Card className="sticky top-20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Filters</CardTitle>
                  {activeFilterCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs text-emerald-600 hover:text-emerald-700"
                      onClick={clearAllFilters}
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Categories */}
                <div>
                  <h4 className="font-medium mb-3 text-sm">Categories</h4>
                  <ScrollArea className="h-48">
                    <div className="space-y-2 pr-4">
                      {(getFacet('categories')?.options || categories).map((cat: {value?: string; label?: string; name?: string; id?: string; count?: number; productCount?: number}) => (
                        <label key={cat.value || cat.id} className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            checked={selectedCategories.includes(cat.value || cat.id || '')}
                            onChange={(e) => {
                              const id = cat.value || cat.id || ''
                              if (e.target.checked) {
                                setSelectedCategories([...selectedCategories, id])
                              } else {
                                setSelectedCategories(selectedCategories.filter(c => c !== id))
                              }
                            }}
                          />
                          <span className="text-sm group-hover:text-emerald-600 transition-colors">{cat.label || cat.name}</span>
                          <Badge variant="secondary" className="text-xs ml-auto">{cat.count || cat.productCount || 0}</Badge>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <Separator />

                {/* Brands/Sellers */}
                {getFacet('brands')?.options?.length > 0 && (
                  <>
                    <div>
                      <h4 className="font-medium mb-3 text-sm">Brands</h4>
                      <ScrollArea className="h-32">
                        <div className="space-y-2 pr-4">
                          {getFacet('brands').options.slice(0, 10).map((brand: {value: string; label: string; count: number}) => (
                            <label key={brand.value} className="flex items-center gap-2 cursor-pointer group">
                              <input 
                                type="checkbox" 
                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                checked={selectedBrands.includes(brand.value)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedBrands([...selectedBrands, brand.value])
                                  } else {
                                    setSelectedBrands(selectedBrands.filter(b => b !== brand.value))
                                  }
                                }}
                              />
                              <span className="text-sm group-hover:text-emerald-600 transition-colors">{brand.label}</span>
                              <Badge variant="secondary" className="text-xs ml-auto">{brand.count}</Badge>
                            </label>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Price Range */}
                <div>
                  <h4 className="font-medium mb-3 text-sm">Price Range</h4>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={100000}
                    step={500}
                    className="mb-3"
                  />
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      value={priceRange[0]} 
                      onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                      className="h-8 text-sm"
                      placeholder="Min"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input 
                      type="number" 
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 100000])}
                      className="h-8 text-sm"
                      placeholder="Max"
                    />
                  </div>
                </div>

                <Separator />

                {/* Rating */}
                <div>
                  <h4 className="font-medium mb-3 text-sm">Customer Rating</h4>
                  <div className="space-y-2">
                    {(getFacet('rating')?.options || [
                      { value: '4', label: '4 Stars & Up', count: 0 },
                      { value: '3', label: '3 Stars & Up', count: 0 },
                      { value: '2', label: '2 Stars & Up', count: 0 },
                      { value: '1', label: '1 Star & Up', count: 0 },
                    ]).map((rating: {value: string; label: string; count: number}) => (
                      <label key={rating.value} className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="rating"
                          className="text-emerald-600 focus:ring-emerald-500"
                          checked={selectedRating === parseInt(rating.value)}
                          onChange={() => setSelectedRating(parseInt(rating.value))}
                        />
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < parseInt(rating.value) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">& up</span>
                        {rating.count > 0 && (
                          <Badge variant="secondary" className="text-xs ml-auto">{rating.count}</Badge>
                        )}
                      </label>
                    ))}
                    {selectedRating && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs text-muted-foreground"
                        onClick={() => setSelectedRating(null)}
                      >
                        Clear rating filter
                      </Button>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Availability */}
                <div>
                  <h4 className="font-medium mb-3 text-sm">Availability</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded text-emerald-600"
                        checked={inStockOnly}
                        onChange={(e) => setInStockOnly(e.target.checked)}
                      />
                      <span className="text-sm">In Stock Only</span>
                    </label>
                  </div>
                </div>

                <Separator />

                {/* Special Offers */}
                <div>
                  <h4 className="font-medium mb-3 text-sm">Special Offers</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded text-emerald-600"
                        checked={onSaleOnly}
                        onChange={(e) => setOnSaleOnly(e.target.checked)}
                      />
                      <span className="text-sm">On Sale</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded text-emerald-600"
                        checked={freeShippingOnly}
                        onChange={(e) => setFreeShippingOnly(e.target.checked)}
                      />
                      <span className="text-sm">Free Shipping</span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Active Filters Display */}
            {activeFilterCount > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1">
                    Search: {searchQuery}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery('')} />
                  </Badge>
                )}
                {selectedCategories.map(catId => {
                  const cat = categories.find(c => c.id === catId)
                  return cat ? (
                    <Badge key={catId} variant="secondary" className="gap-1">
                      {cat.name}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedCategories(selectedCategories.filter(id => id !== catId))} />
                    </Badge>
                  ) : null
                })}
                {selectedRating && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedRating}+ Stars
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedRating(null)} />
                  </Badge>
                )}
                {inStockOnly && (
                  <Badge variant="secondary" className="gap-1">
                    In Stock
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setInStockOnly(false)} />
                  </Badge>
                )}
                {freeShippingOnly && (
                  <Badge variant="secondary" className="gap-1">
                    Free Shipping
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setFreeShippingOnly(false)} />
                  </Badge>
                )}
                {onSaleOnly && (
                  <Badge variant="secondary" className="gap-1">
                    On Sale
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setOnSaleOnly(false)} />
                  </Badge>
                )}
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={clearAllFilters}>
                  Clear all
                </Button>
              </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-muted-foreground">
                  {loading ? (
                    'Loading...'
                  ) : (
                    <>
                      <span className="font-medium text-foreground">{pagination.total}</span> products found
                      {searchQuery && <span> for "<span className="text-foreground">{searchQuery}</span>"</span>}
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="flex border rounded-lg overflow-hidden">
                  <Button 
                    variant={viewMode === 'grid' ? 'default' : 'ghost'} 
                    size="icon" 
                    className="h-9 w-9 rounded-none"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant={viewMode === 'list' ? 'default' : 'ghost'} 
                    size="icon" 
                    className="h-9 w-9 rounded-none"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="rating">Customer Rating</SelectItem>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="bestseller">Best Selling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Popular Searches */}
            {!searchQuery && popularSearches.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2 text-muted-foreground">Popular Searches</h3>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.slice(0, 8).map((item, i) => (
                    <Button 
                      key={i}
                      variant="outline" 
                      size="sm"
                      className="text-xs"
                      onClick={() => setSearchQuery(item.query)}
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {item.query}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Search History (when logged in) */}
            {user && searchHistory.length > 0 && !searchQuery && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2 text-muted-foreground">Recent Searches</h3>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.slice(0, 5).map((item, i) => (
                    <Button 
                      key={i}
                      variant="ghost" 
                      size="sm"
                      className="text-xs"
                      onClick={() => setSearchQuery(item.query)}
                    >
                      <Clock4 className="h-3 w-3 mr-1" />
                      {item.query}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile Filter Button */}
            <div className="lg:hidden mb-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Filter className="h-4 w-4 mr-2" /> 
                    Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <SheetHeader>
                    <SheetTitle className="flex items-center justify-between">
                      Filters
                      {activeFilterCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearAllFilters}>Clear All</Button>
                      )}
                    </SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-100px)] mt-4">
                    <div className="space-y-5 pr-4">
                      {/* Categories */}
                      <div>
                        <h4 className="font-medium mb-3">Categories</h4>
                        <div className="space-y-2">
                          {(getFacet('categories')?.options || categories).map((cat: {value?: string; label?: string; name?: string; id?: string; count?: number; productCount?: number}) => (
                            <label key={cat.value || cat.id} className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="rounded text-emerald-600"
                                checked={selectedCategories.includes(cat.value || cat.id || '')}
                                onChange={(e) => {
                                  const id = cat.value || cat.id || ''
                                  if (e.target.checked) {
                                    setSelectedCategories([...selectedCategories, id])
                                  } else {
                                    setSelectedCategories(selectedCategories.filter(c => c !== id))
                                  }
                                }}
                              />
                              <span className="text-sm">{cat.label || cat.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      <Separator />
                      
                      {/* Price Range */}
                      <div>
                        <h4 className="font-medium mb-3">Price Range</h4>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            value={priceRange[0]} 
                            onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                            className="h-8 text-sm"
                            placeholder="Min"
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input 
                            type="number" 
                            value={priceRange[1]}
                            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 100000])}
                            className="h-8 text-sm"
                            placeholder="Max"
                          />
                        </div>
                      </div>
                      
                      <Separator />
                      
                      {/* Rating */}
                      <div>
                        <h4 className="font-medium mb-3">Customer Rating</h4>
                        <div className="space-y-2">
                          {[4, 3, 2, 1].map((rating) => (
                            <label key={rating} className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="radio" 
                                name="mobile-rating"
                                className="text-emerald-600"
                                checked={selectedRating === rating}
                                onChange={() => setSelectedRating(rating)}
                              />
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
                                ))}
                              </div>
                              <span className="text-sm text-muted-foreground">& up</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      <Separator />
                      
                      {/* Availability & Offers */}
                      <div>
                        <h4 className="font-medium mb-3">Other Filters</h4>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="rounded text-emerald-600"
                              checked={inStockOnly}
                              onChange={(e) => setInStockOnly(e.target.checked)}
                            />
                            <span className="text-sm">In Stock Only</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="rounded text-emerald-600"
                              checked={onSaleOnly}
                              onChange={(e) => setOnSaleOnly(e.target.checked)}
                            />
                            <span className="text-sm">On Sale</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="rounded text-emerald-600"
                              checked={freeShippingOnly}
                              onChange={(e) => setFreeShippingOnly(e.target.checked)}
                            />
                            <span className="text-sm">Free Shipping</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="aspect-square bg-slate-100 animate-pulse" />
                    <CardContent className="p-3">
                      <div className="h-4 bg-slate-100 rounded animate-pulse mb-2" />
                      <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4" 
                : "space-y-4"
              }>
                {searchResults.map((product) => (
                  viewMode === 'grid' ? (
                    <ProductCard 
                      key={product.id}
                      product={product}
                      onClick={() => {
                        setSelectedProduct(product.id)
                        setSelectedProductData(product)
                        setCurrentView('product-detail')
                      }}
                      onAddToCart={() => addToCart(product)}
                      onToggleWishlist={() => toggleWishlist(product.id)}
                      isInWishlist={wishlist.includes(product.id)}
                    />
                  ) : (
                    <Card key={product.id} className="overflow-hidden">
                      <div className="flex">
                        <div className="w-32 h-32 bg-slate-100 shrink-0 flex items-center justify-center">
                          <Package className="h-12 w-12 text-slate-200" />
                        </div>
                        <CardContent className="flex-1 p-4">
                          <div className="flex justify-between">
                            <div>
                              <h3 className="font-medium mb-1 cursor-pointer hover:text-emerald-600" onClick={() => {
                                setSelectedProduct(product.id)
                                setSelectedProductData(product)
                                setCurrentView('product-detail')
                              }}>{product.name}</h3>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex items-center">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span className="text-sm ml-1">{product.averageRating}</span>
                                </div>
                                <span className="text-sm text-muted-foreground">({product.totalReviews} reviews)</span>
                                <span className="text-sm text-muted-foreground">|</span>
                                <span className="text-sm text-muted-foreground">{product.purchaseCount || product.stockQuantity} sold</span>
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="font-bold text-xl text-emerald-600">{formatPrice(product.basePrice)}</span>
                                {product.compareAtPrice && (
                                  <span className="text-muted-foreground line-through">{formatPrice(product.compareAtPrice)}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <Button size="sm" onClick={() => addToCart(product)}>Add to Cart</Button>
                              <Button size="sm" variant="outline" onClick={() => toggleWishlist(product.id)}>
                                <Heart className={`h-4 w-4 mr-1 ${wishlist.includes(product.id) ? 'fill-current text-red-500' : ''}`} />
                                Wishlist
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  )
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Package className="h-24 w-24 mx-auto text-slate-200 mb-4" />
                <h3 className="text-xl font-medium mb-2">No products found</h3>
                <p className="text-muted-foreground mb-4">Try adjusting your search or filters</p>
                <Button variant="outline" onClick={clearAllFilters}>Clear All Filters</Button>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center mt-8 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                
                <div className="flex gap-1">
                  {pagination.page > 2 && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePageChange(1)}
                      >
                        1
                      </Button>
                      {pagination.page > 3 && (
                        <span className="px-2 py-1">...</span>
                      )}
                    </>
                  )}
                  
                  {pagination.page > 1 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                    >
                      {pagination.page - 1}
                    </Button>
                  )}
                  
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="bg-emerald-600"
                  >
                    {pagination.page}
                  </Button>
                  
                  {pagination.page < pagination.totalPages && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                    >
                      {pagination.page + 1}
                    </Button>
                  )}
                  
                  {pagination.page < pagination.totalPages - 1 && (
                    <>
                      {pagination.page < pagination.totalPages - 2 && (
                        <span className="px-2 py-1">...</span>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePageChange(pagination.totalPages)}
                      >
                        {pagination.totalPages}
                      </Button>
                    </>
                  )}
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={!pagination.hasMore}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {/* Page Info */}
            {pagination.total > 0 && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                Showing {((pagination.page - 1) * pagination.pageSize) + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} products
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  function ProductDetailPage() {
    const [quantity, setQuantity] = useState(1)
    const [selectedTab, setSelectedTab] = useState('description')
    const [localReviews, setLocalReviews] = useState<Review[]>([])
    const [reviewsLoading, setReviewsLoading] = useState(false)
    const [reviewRatingFilter, setReviewRatingFilter] = useState<number | null>(null)
    const [ratingDistribution, setRatingDistribution] = useState<Record<number, number>>({1: 0, 2: 0, 3: 0, 4: 0, 5: 0})
    
    // Review form state
    const [showReviewForm, setShowReviewForm] = useState(false)
    const [reviewForm, setReviewForm] = useState({
      rating: 5,
      title: '',
      comment: ''
    })
    const [submittingReview, setSubmittingReview] = useState(false)
    const [helpfulMarked, setHelpfulMarked] = useState<string[]>([])
    const product = selectedProductData

    // Fetch reviews for this product
    const fetchReviews = useCallback(() => {
      if (product?.id) {
        setReviewsLoading(true)
        const url = reviewRatingFilter 
          ? `/api/reviews?productId=${product.id}&limit=20&rating=${reviewRatingFilter}`
          : `/api/reviews?productId=${product.id}&limit=20`
        fetch(url)
          .then(res => res.json())
          .then(data => {
            setLocalReviews(data.reviews || [])
            if (data.ratingDistribution) {
              setRatingDistribution(data.ratingDistribution)
            }
          })
          .catch(console.error)
          .finally(() => setReviewsLoading(false))
      }
    }, [product?.id, reviewRatingFilter])

    useEffect(() => {
      fetchReviews()
    }, [fetchReviews])

    if (!product) return null

    const discount = product.compareAtPrice ? product.compareAtPrice - product.basePrice : 0

    return (
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <button onClick={() => setCurrentView('home')} className="hover:text-foreground">Home</button>
          <ChevronRight className="h-4 w-4" />
          <button onClick={() => setCurrentView('products')} className="hover:text-foreground">Products</button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground line-clamp-1">{product.name}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-10">
          {/* Images */}
          <div>
            <div className="aspect-square bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl flex items-center justify-center mb-4 border">
              <Package className="h-40 w-40 text-slate-200" />
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center cursor-pointer hover:ring-2 ring-emerald-500 transition-all">
                  <Package className="h-8 w-8 text-slate-200" />
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {product.isNewArrival && <Badge className="bg-emerald-500">New Arrival</Badge>}
              {product.isBestSeller && <Badge className="bg-orange-500">Best Seller</Badge>}
              {product.discountPercentage > 0 && (
                <Badge className="bg-red-500">{product.discountPercentage}% OFF</Badge>
              )}
              {product.stockQuantity < 10 && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">Low Stock</Badge>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold mb-3">{product.name}</h1>

            <div className="flex items-center gap-4 mb-4 text-sm">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-5 w-5 ${i < Math.floor(product.averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} 
                />
                ))}
                <span className="font-medium ml-1">{product.averageRating}</span>
              </div>
              <span className="text-muted-foreground">{product.totalReviews} reviews</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">{product.stockQuantity} sold</span>
            </div>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-4xl font-bold text-emerald-600">{formatPrice(product.basePrice)}</span>
              {product.compareAtPrice && product.compareAtPrice > product.basePrice && (
                <>
                  <span className="text-2xl text-muted-foreground line-through">
                    {formatPrice(product.compareAtPrice)}
                  </span>
                  <Badge variant="destructive" className="text-base">
                    Save {formatPrice(discount)}
                  </Badge>
                </>
              )}
            </div>

            <p className="text-muted-foreground mb-6 leading-relaxed">{product.description}</p>

            {/* Quantity Selector */}
            <div className="flex items-center gap-4 mb-6">
              <span className="font-medium">Quantity:</span>
              <div className="flex items-center border rounded-xl overflow-hidden">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-10 w-10 rounded-none"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="w-14 h-10 flex items-center justify-center font-medium border-x">{quantity}</div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-10 w-10 rounded-none"
                  onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-sm text-muted-foreground">
                {product.stockQuantity} available
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mb-6">
              <Button size="lg" className="flex-1 h-12 text-base" onClick={() => {
                for (let i = 0; i < quantity; i++) {
                  addToCart(product)
                }
              }}>
                <ShoppingCart className="h-5 w-5 mr-2" /> Add to Cart
              </Button>
              <Button 
                size="lg" 
                variant={wishlist.includes(product.id) ? "default" : "outline"}
                className="h-12"
                onClick={() => toggleWishlist(product.id)}
              >
                <Heart className={`h-5 w-5 ${wishlist.includes(product.id) ? 'fill-current' : ''}`} />
              </Button>
              <Button size="lg" variant="outline" className="h-12">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            {/* Delivery Info */}
            <Card className="mb-6">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Truck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium">Delivery</p>
                    <p className="text-sm text-muted-foreground">
                      {product.freeShipping ? 'Free shipping' : `Shipping: ${formatPrice(product.shippingFee)}`} • 2-5 business days
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Warranty</p>
                    <p className="text-sm text-muted-foreground">
                      {product.warrantyPeriod || 'No warranty available'}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <RotateCcw className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">Return Policy</p>
                    <p className="text-sm text-muted-foreground">7-day easy returns</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seller Info */}
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-lg">
                      TZ
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-lg">TechZone Pakistan</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                        <span>4.8</span>
                      </div>
                      <span>•</span>
                      <span>98% Positive</span>
                      <span>•</span>
                      <Badge variant="secondary" className="text-xs">Top Seller</Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Visit Store</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-10">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger value="description" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent">Description</TabsTrigger>
            <TabsTrigger value="specifications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent">Specifications</TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent">Reviews ({product.totalReviews})</TabsTrigger>
            <TabsTrigger value="qa" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent">Q&A</TabsTrigger>
          </TabsList>
          
          <TabsContent value="description" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Product Description</h3>
                <div className="prose prose-slate max-w-none">
                  <p className="text-muted-foreground leading-relaxed">{product.description}</p>
                  <p className="text-muted-foreground leading-relaxed mt-4">
                    This premium product from TechZone Pakistan comes with full warranty and guaranteed quality. 
                    Perfect for everyday use with professional-grade features at an affordable price point.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="specifications" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Technical Specifications</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    ['Brand', 'TechZone'],
                    ['Model', product.sku],
                    ['Color', 'Multiple'],
                    ['Material', 'Premium Quality'],
                    ['Warranty', product.warrantyPeriod || 'N/A'],
                    ['SKU', product.sku],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left Column - Rating Summary */}
              <div className="lg:col-span-1">
                <Card className="sticky top-20">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Customer Reviews</h3>
                    
                    {/* Overall Rating */}
                    <div className="text-center mb-6">
                      <div className="text-5xl font-bold text-emerald-600 mb-2">{product.averageRating}</div>
                      <div className="flex justify-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-6 w-6 ${i < Math.floor(product.averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">{product.totalReviews} reviews</p>
                    </div>

                    {/* Rating Distribution */}
                    <div className="space-y-2 mb-6">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = ratingDistribution[star as keyof typeof ratingDistribution] || 0
                        const percentage = product.totalReviews > 0 ? (count / product.totalReviews) * 100 : 0
                        return (
                          <button
                            key={star}
                            onClick={() => setReviewRatingFilter(reviewRatingFilter === star ? null : star)}
                            className={`w-full flex items-center gap-2 text-sm p-1.5 rounded-lg transition-colors ${reviewRatingFilter === star ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50'}`}
                          >
                            <span className="w-3 text-right">{star}</span>
                            <Star className={`h-4 w-4 ${reviewRatingFilter === star ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} />
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${percentage}%` }} />
                            </div>
                            <span className="w-8 text-right text-muted-foreground text-xs">{count}</span>
                          </button>
                        )
                      })}
                    </div>

                    {reviewRatingFilter && (
                      <Button variant="outline" size="sm" className="w-full mb-4" onClick={() => setReviewRatingFilter(null)}>
                        Clear Filter
                      </Button>
                    )}

                    {/* Write Review Button */}
                    {isAuthenticated ? (
                      <Button className="w-full" onClick={() => setShowReviewForm(!showReviewForm)}>
                        {showReviewForm ? 'Cancel Review' : 'Write a Review'}
                      </Button>
                    ) : (
                      <Button className="w-full" onClick={() => {
                        setShowAuthModal(true)
                        setAuthModalTab('login')
                      }}>
                        Login to Review
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Review List */}
              <div className="lg:col-span-2">
                {/* Review Form */}
                {showReviewForm && isAuthenticated && (
                  <Card className="mb-6">
                    <CardContent className="p-6">
                      <h4 className="font-semibold mb-4">Write Your Review</h4>
                      
                      {/* Star Rating */}
                      <div className="mb-4">
                        <Label className="mb-2 block">Rating</Label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewForm({...reviewForm, rating: star})}
                              className="p-1"
                            >
                              <Star className={`h-8 w-8 transition-colors ${star <= reviewForm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300 hover:text-yellow-300'}`} />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Title */}
                      <div className="mb-4">
                        <Label className="mb-2 block">Review Title</Label>
                        <Input
                          value={reviewForm.title}
                          onChange={(e) => setReviewForm({...reviewForm, title: e.target.value})}
                          placeholder="Summarize your experience"
                          maxLength={100}
                        />
                      </div>

                      {/* Comment */}
                      <div className="mb-4">
                        <Label className="mb-2 block">Your Review</Label>
                        <Textarea
                          value={reviewForm.comment}
                          onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
                          placeholder="What did you like or dislike about this product?"
                          rows={4}
                          maxLength={1000}
                        />
                        <p className="text-xs text-muted-foreground mt-1">{reviewForm.comment.length}/1000 characters</p>
                      </div>

                      <div className="flex gap-3">
                        <Button 
                          onClick={async () => {
                            if (!reviewForm.comment.trim()) {
                              toast({ title: 'Please write your review', variant: 'destructive' })
                              return
                            }
                            
                            setSubmittingReview(true)
                            try {
                              const res = await fetch('/api/reviews', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  userId: user?.id,
                                  productId: product.id,
                                  rating: reviewForm.rating,
                                  title: reviewForm.title,
                                  comment: reviewForm.comment
                                })
                              })
                              
                              const data = await res.json()
                              if (data.success) {
                                toast({ 
                                  title: 'Review Submitted', 
                                  description: data.message || 'Thank you for your review!' 
                                })
                                setReviewForm({ rating: 5, title: '', comment: '' })
                                setShowReviewForm(false)
                                fetchReviews()
                              } else {
                                toast({ title: data.error || 'Failed to submit review', variant: 'destructive' })
                              }
                            } catch (error) {
                              toast({ title: 'Failed to submit review', variant: 'destructive' })
                            } finally {
                              setSubmittingReview(false)
                            }
                          }}
                          disabled={submittingReview}
                        >
                          {submittingReview ? 'Submitting...' : 'Submit Review'}
                        </Button>
                        <Button variant="outline" onClick={() => setShowReviewForm(false)}>
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Review List */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold">
                        {reviewRatingFilter ? `${reviewRatingFilter}-Star Reviews` : 'All Reviews'}
                        <span className="text-muted-foreground font-normal ml-2">({localReviews.length})</span>
                      </h4>
                    </div>

                    {reviewsLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
                        <p className="text-muted-foreground">Loading reviews...</p>
                      </div>
                    ) : localReviews.length > 0 ? (
                      <div className="space-y-6">
                        {localReviews.map((review) => (
                          <div key={review.id} className="pb-6 border-b last:border-0">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback>{(review as any).user?.name?.[0]?.toUpperCase() || (review as any).user?.firstName?.[0]?.toUpperCase() || 'A'}</AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">{(review as any).user?.name || (review as any).user?.firstName || 'Anonymous'}</span>
                                  {review.isVerifiedPurchase && (
                                    <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                                      <Check className="h-3 w-3 mr-1" /> Verified Purchase
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                      <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
                                    ))}
                                  </div>
                                  <span className="text-sm text-muted-foreground">{formatDate(review.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                            {review.title && <h4 className="font-medium mb-1">{review.title}</h4>}
                            <p className="text-muted-foreground text-sm">{review.comment}</p>
                            
                            {/* Seller Response */}
                            {(review as any).seller_response && (
                              <div className="mt-4 ml-4 p-4 bg-slate-50 rounded-lg border-l-4 border-emerald-500">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="text-emerald-600 border-emerald-200">Seller Response</Badge>
                                  {(review as any).seller_responded_at && (
                                    <span className="text-xs text-muted-foreground">{formatDate((review as any).seller_responded_at)}</span>
                                  )}
                                </div>
                                <p className="text-sm">{(review as any).seller_response}</p>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-4 mt-3">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className={`text-xs ${helpfulMarked.includes(review.id) ? 'text-emerald-600' : ''}`}
                                onClick={async () => {
                                  if (!isAuthenticated) {
                                    toast({ title: 'Please login to mark reviews as helpful' })
                                    return
                                  }
                                  if (helpfulMarked.includes(review.id)) {
                                    toast({ title: 'You already marked this review as helpful' })
                                    return
                                  }
                                  
                                  try {
                                    const res = await fetch('/api/reviews', {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        reviewId: review.id,
                                        action: 'helpful',
                                        userId: user?.id
                                      })
                                    })
                                    
                                    if (res.ok) {
                                      setHelpfulMarked([...helpfulMarked, review.id])
                                      // Update local review count
                                      setLocalReviews(localReviews.map(r => 
                                        r.id === review.id 
                                          ? { ...r, helpfulCount: (r.helpfulCount || 0) + 1 }
                                          : r
                                      ))
                                      toast({ title: 'Thanks for your feedback!' })
                                    }
                                  } catch (error) {
                                    console.error('Error marking helpful:', error)
                                  }
                                }}
                              >
                                <ThumbsUp className="h-3 w-3 mr-1" /> Helpful ({review.helpfulCount || 0})
                              </Button>
                              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                                <Flag className="h-3 w-3 mr-1" /> Report
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>{reviewRatingFilter ? `No ${reviewRatingFilter}-star reviews yet.` : 'No reviews yet. Be the first to review this product!'}</p>
                        {reviewRatingFilter && (
                          <Button variant="link" onClick={() => setReviewRatingFilter(null)} className="mt-2">
                            View all reviews
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="qa" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Questions & Answers</h3>
                  <Button>Ask a Question</Button>
                </div>
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No questions yet. Be the first to ask!</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Related Products */}
        <section>
          <h2 className="text-2xl font-bold mb-4">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.filter(p => p.id !== product.id).slice(0, 5).map((p) => (
              <ProductCard 
                key={p.id}
                product={p}
                onClick={() => {
                  setSelectedProduct(p.id)
                  setSelectedProductData(p)
                  window.scrollTo(0, 0)
                }}
                onAddToCart={() => addToCart(p)}
                onToggleWishlist={() => toggleWishlist(p.id)}
                isInWishlist={wishlist.includes(p.id)}
              />
            ))}
          </div>
        </section>
      </div>
    )
  }

  function CartPage() {
    if (cartItems.length === 0) {
      return (
        <div className="container mx-auto px-4 py-16 text-center">
          <ShoppingCart className="h-32 w-32 mx-auto text-slate-200 mb-6" />
          <h2 className="text-3xl font-bold mb-3">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6 text-lg">Start shopping to add items to your cart</p>
          <Button size="lg" onClick={() => setCurrentView('products')} className="px-8">
            Browse Products
          </Button>
        </div>
      )
    }

    const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0)
    const shipping = subtotal > 5000 ? 0 : 200
    const total = subtotal + shipping

    return (
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Shopping Cart ({cartItems.length} items)</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="w-24 h-24 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                      <Package className="h-12 w-12 text-slate-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium line-clamp-2 mb-1">{item.product?.name || 'Product'}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Seller: {item.product?.seller?.storeName || 'Store'}
                      </p>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center border rounded-xl overflow-hidden">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-9 w-9 rounded-none"
                            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-12 text-center text-sm">{item.quantity}</span>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-9 w-9 rounded-none"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatPrice(item.totalPrice)}</p>
                          <p className="text-sm text-muted-foreground">{formatPrice(item.unitPrice)} each</p>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-muted-foreground hover:text-red-500 shrink-0"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" onClick={clearCart} className="text-red-600 hover:text-red-700">
              <Trash2 className="h-4 w-4 mr-2" /> Clear Cart
            </Button>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{shipping === 0 ? <span className="text-emerald-600">Free</span> : formatPrice(shipping)}</span>
                </div>
                {subtotal < 5000 && (
                  <div className="bg-emerald-50 p-3 rounded-lg">
                    <p className="text-sm text-emerald-700">
                      Add {formatPrice(5000 - subtotal)} more for free shipping!
                    </p>
                    <Progress value={(subtotal / 5000) * 100} className="h-2 mt-2" />
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-emerald-600">{formatPrice(total)}</span>
                </div>
                <Button 
                  className="w-full h-12 text-base" 
                  size="lg"
                  onClick={() => setCurrentView('checkout')}
                >
                  Proceed to Checkout
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentView('products')}
                >
                  Continue Shopping
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  function CheckoutPage() {
    // Payment and order state
    const [paymentMethod, setPaymentMethod] = useState<string>('COD')
    const [isProcessing, setIsProcessing] = useState(false)
    const [orderPlaced, setOrderPlaced] = useState(false)
    const [placedOrder, setPlacedOrder] = useState<{orderNumber: string; total: number; estimatedDelivery: string} | null>(null)
    
    // Address selection state
    const [checkoutAddresses, setCheckoutAddresses] = useState<any[]>([])
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
    const [showNewAddressForm, setShowNewAddressForm] = useState(false)
    const [isLoadingAddresses, setIsLoadingAddresses] = useState(false)
    
    // Payment method specific state
    const [walletPhone, setWalletPhone] = useState('')
    
    // Coupon state
    const [couponCode, setCouponCode] = useState('')
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null)
    const [couponDiscount, setCouponDiscount] = useState(0)
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false)
    const [couponError, setCouponError] = useState('')
    
    // Form state for new address
    const [newAddressData, setNewAddressData] = useState({
      label: 'Home',
      recipientName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : '',
      phone: user?.phone || '',
      province: 'Punjab',
      city: '',
      area: '',
      postalCode: '',
      streetAddress: '',
    })
    
    // Customer notes
    const [customerNotes, setCustomerNotes] = useState('')
    
    // Fetch addresses on mount
    useEffect(() => {
      const fetchAddresses = async () => {
        if (!user?.id) return
        setIsLoadingAddresses(true)
        try {
          const res = await fetch(`/api/addresses?userId=${user.id}`)
          if (res.ok) {
            const data = await res.json()
            setCheckoutAddresses(data.addresses || [])
            // Select default address or first address
            const defaultAddr = (data.addresses || []).find((a: any) => a.is_default)
            if (defaultAddr) {
              setSelectedAddressId(defaultAddr.id)
            } else if (data.addresses?.length > 0) {
              setSelectedAddressId(data.addresses[0].id)
            }
          }
        } catch (error) {
          console.error('Failed to fetch addresses:', error)
        }
        setIsLoadingAddresses(false)
      }
      fetchAddresses()
    }, [user?.id])
    
    // Get selected address
    const selectedAddress = checkoutAddresses.find(a => a.id === selectedAddressId)
    
    // Calculate pricing
    const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0)
    
    // Delivery fee based on location
    const getDeliveryFee = () => {
      if (subtotal > 5000) return 0 // Free shipping for orders over PKR 5000
      
      const city = selectedAddress?.city?.toLowerCase() || newAddressData.city.toLowerCase()
      const province = selectedAddress?.province || newAddressData.province
      
      // Major cities - lower delivery fee
      const majorCities = ['karachi', 'lahore', 'islamabad', 'rawalpindi', 'faisalabad']
      if (majorCities.includes(city)) return 150
      
      // Remote areas - higher delivery fee
      const remoteAreas = ['gilgit', 'skardu', 'gwadar', 'hunza']
      if (remoteAreas.some(area => city.includes(area))) return 400
      
      // Standard delivery fee
      if (province === 'Punjab' || province === 'Sindh' || province === 'Islamabad Capital Territory') {
        return 200
      }
      
      return 250 // Default for other provinces
    }
    
    const deliveryFee = getDeliveryFee()
    const discount = couponDiscount
    const total = subtotal + deliveryFee - discount
    
    // Wallet balance check
    const walletBalance = userWallet?.balance || 0
    const isWalletSufficient = paymentMethod === 'WALLET' && walletBalance >= total
    
    // Validate coupon
    const handleApplyCoupon = async () => {
      if (!couponCode.trim()) {
        setCouponError('Please enter a coupon code')
        return
      }
      
      setIsValidatingCoupon(true)
      setCouponError('')
      
      try {
        const productIds = cartItems.map(item => item.productId)
        const categoryIds = cartItems.map(item => item.product?.categoryId).filter(Boolean)
        
        const res = await fetch('/api/coupons/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: couponCode,
            orderValue: subtotal,
            productIds,
            categoryIds,
          }),
        })
        
        const data = await res.json()
        
        if (data.valid) {
          setAppliedCoupon(data.coupon)
          setCouponDiscount(data.discountAmount || 0)
          toast({ 
            title: 'Coupon Applied!', 
            description: data.message 
          })
        } else {
          setCouponError(data.error || 'Invalid coupon code')
          setAppliedCoupon(null)
          setCouponDiscount(0)
        }
      } catch (error) {
        setCouponError('Failed to validate coupon')
        setAppliedCoupon(null)
        setCouponDiscount(0)
      }
      
      setIsValidatingCoupon(false)
    }
    
    // Remove coupon
    const handleRemoveCoupon = () => {
      setCouponCode('')
      setAppliedCoupon(null)
      setCouponDiscount(0)
      setCouponError('')
    }
    
    // Save new address
    const handleSaveNewAddress = async () => {
      if (!user?.id) return
      
      // Validate required fields
      if (!newAddressData.recipientName || !newAddressData.phone || !newAddressData.city || !newAddressData.streetAddress) {
        toast({ 
          title: 'Missing Information', 
          description: 'Please fill in all required fields',
          variant: 'destructive'
        })
        return
      }
      
      try {
        const res = await fetch('/api/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            label: newAddressData.label,
            recipientName: newAddressData.recipientName,
            recipientPhone: newAddressData.phone,
            province: newAddressData.province,
            city: newAddressData.city,
            area: newAddressData.area,
            streetAddress: newAddressData.streetAddress,
            postalCode: newAddressData.postalCode,
            isDefault: checkoutAddresses.length === 0,
          }),
        })
        
        if (res.ok) {
          const data = await res.json()
          setCheckoutAddresses([...checkoutAddresses, data.address])
          setSelectedAddressId(data.address.id)
          setShowNewAddressForm(false)
          toast({ title: 'Address saved successfully' })
        } else {
          toast({ title: 'Failed to save address', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Failed to save address', variant: 'destructive' })
      }
    }
    
    // Redirect if cart is empty
    if (cartItems.length === 0 && !orderPlaced) {
      return (
        <div className="container mx-auto px-4 py-16 text-center">
          <ShoppingCart className="h-32 w-32 mx-auto text-slate-200 mb-6" />
          <h2 className="text-3xl font-bold mb-3">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6 text-lg">Add items to your cart to checkout</p>
          <Button size="lg" onClick={() => setCurrentView('products')} className="px-8">
            Browse Products
          </Button>
        </div>
      )
    }

    // Order confirmation view
    if (orderPlaced && placedOrder) {
      return (
        <div className="container mx-auto px-4 py-16 text-center max-w-2xl">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold mb-3">Order Placed Successfully!</h2>
          <p className="text-muted-foreground mb-6">
            Thank you for your order. You will receive a confirmation email shortly.
          </p>
          
          <Card className="text-left mb-6">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Number</span>
                  <span className="font-bold text-lg">{placedOrder.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-bold text-lg text-emerald-600">{formatPrice(placedOrder.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method</span>
                  <span className="font-medium">
                    {paymentMethod === 'COD' ? 'Cash on Delivery' : 
                     paymentMethod === 'JAZZ_CASH' ? 'JazzCash' :
                     paymentMethod === 'EASY_PAISA' ? 'EasyPaisa' :
                     paymentMethod === 'WALLET' ? 'Wallet' :
                     paymentMethod === 'CARD' ? 'Card' : paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Delivery</span>
                  <span className="font-medium">{placedOrder.estimatedDelivery}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-center">
            <Button size="lg" onClick={() => setCurrentView('user-orders')} className="px-8">
              <Package className="h-5 w-5 mr-2" /> View Orders
            </Button>
            <Button size="lg" variant="outline" onClick={() => setCurrentView('home')} className="px-8">
              Continue Shopping
            </Button>
          </div>
        </div>
      )
    }

    const handlePlaceOrder = async () => {
      // Validate address
      if (!selectedAddressId && !showNewAddressForm) {
        toast({ 
          title: 'Select Address', 
          description: 'Please select a delivery address or add a new one',
          variant: 'destructive'
        })
        return
      }
      
      // If showing new address form, validate it
      if (showNewAddressForm) {
        if (!newAddressData.recipientName || !newAddressData.phone || !newAddressData.city || !newAddressData.streetAddress) {
          toast({ 
            title: 'Missing Information', 
            description: 'Please fill in all required address fields',
            variant: 'destructive'
          })
          return
        }
        
        // Validate phone number
        const phoneRegex = /^0[0-9]{3}-?[0-9]{7}$/
        if (!phoneRegex.test(newAddressData.phone.replace(/\s/g, ''))) {
          toast({ 
            title: 'Invalid Phone Number', 
            description: 'Please enter a valid Pakistani phone number (e.g., 0300-1234567)',
            variant: 'destructive'
          })
          return
        }
      }
      
      // Validate wallet payment
      if (paymentMethod === 'WALLET' && !isWalletSufficient) {
        toast({ 
          title: 'Insufficient Wallet Balance', 
          description: `Your wallet balance is ${formatPrice(walletBalance)}. Please choose another payment method.`,
          variant: 'destructive'
        })
        return
      }
      
      // Validate wallet phone for JazzCash/EasyPaisa
      if ((paymentMethod === 'JAZZ_CASH' || paymentMethod === 'EASY_PAISA') && !walletPhone) {
        toast({ 
          title: 'Phone Number Required', 
          description: 'Please enter your JazzCash/EasyPaisa account phone number',
          variant: 'destructive'
        })
        return
      }

      setIsProcessing(true)

      try {
        // Prepare shipping address
        const shippingAddress = selectedAddress ? {
          recipientName: selectedAddress.recipient_name,
          phone: selectedAddress.recipient_phone,
          country: selectedAddress.country || 'Pakistan',
          province: selectedAddress.province,
          city: selectedAddress.city,
          area: selectedAddress.area,
          streetAddress: selectedAddress.street_address,
          postalCode: selectedAddress.postal_code,
        } : {
          recipientName: newAddressData.recipientName,
          phone: newAddressData.phone,
          country: 'Pakistan',
          province: newAddressData.province,
          city: newAddressData.city,
          area: newAddressData.area,
          streetAddress: newAddressData.streetAddress,
          postalCode: newAddressData.postalCode,
        }
        
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            items: cartItems.map(item => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
            shippingAddress,
            paymentMethod,
            couponCode: appliedCoupon?.code || null,
            subtotal,
            discount,
            couponDiscount: appliedCoupon ? couponDiscount : 0,
            deliveryFee,
            tax: 0,
            total,
            customerNotes,
            walletPhone: paymentMethod === 'JAZZ_CASH' || paymentMethod === 'EASY_PAISA' ? walletPhone : null,
          }),
        })

        const data = await response.json()

        if (data.success) {
          // Clear cart
          clearCart()
          
          // Set order confirmation data
          setPlacedOrder({
            orderNumber: data.order.orderNumber,
            total: data.order.total,
            estimatedDelivery: data.order.estimatedDeliveryDate 
              ? formatDate(data.order.estimatedDeliveryDate)
              : '5-7 business days',
          })
          setOrderPlaced(true)
          
          // Refresh orders list
          if (user?.id) {
            const ordersRes = await fetch(`/api/orders?userId=${user.id}`)
            if (ordersRes.ok) {
              const ordersData = await ordersRes.json()
              setOrders(ordersData.orders || [])
            }
          }

          toast({ 
            title: 'Order Placed!', 
            description: `Your order ${data.order.orderNumber} has been confirmed` 
          })
        } else {
          toast({ 
            title: 'Order Failed', 
            description: data.error || 'Failed to place order. Please try again.',
            variant: 'destructive'
          })
        }
      } catch (error) {
        console.error('Order error:', error)
        toast({ 
          title: 'Order Failed', 
          description: 'An error occurred. Please try again.',
          variant: 'destructive'
        })
      } finally {
        setIsProcessing(false)
      }
    }

    return (
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <button onClick={() => setCurrentView('home')} className="hover:text-foreground">Home</button>
          <ChevronRight className="h-4 w-4" />
          <button onClick={() => setCurrentView('cart')} className="hover:text-foreground">Cart</button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">Checkout</span>
        </div>

        <h1 className="text-2xl font-bold mb-6">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Shipping Address</CardTitle>
                  {checkoutAddresses.length > 0 && !showNewAddressForm && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowNewAddressForm(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add New
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingAddresses ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : checkoutAddresses.length > 0 && !showNewAddressForm ? (
                  <div className="space-y-3">
                    {checkoutAddresses.map((address) => (
                      <div 
                        key={address.id}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          selectedAddressId === address.id 
                            ? 'border-emerald-500 bg-emerald-50' 
                            : 'hover:border-slate-300'
                        }`}
                        onClick={() => setSelectedAddressId(address.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center ${
                            selectedAddressId === address.id 
                              ? 'border-emerald-500 bg-emerald-500' 
                              : 'border-slate-300'
                          }`}>
                            {selectedAddressId === address.id && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{address.recipient_name}</span>
                              <Badge variant="outline" className="text-xs">{address.label}</Badge>
                              {address.is_default && (
                                <Badge className="text-xs bg-emerald-100 text-emerald-700">Default</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{address.recipient_phone}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {address.street_address}
                              {address.area && `, ${address.area}`}
                              {`, ${address.city}, ${address.province}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button 
                      variant="outline" 
                      className="w-full mt-2"
                      onClick={() => setShowNewAddressForm(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add New Address
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {checkoutAddresses.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowNewAddressForm(false)}
                        className="mb-2"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Back to saved addresses
                      </Button>
                    )}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Address Label</Label>
                        <Select 
                          value={newAddressData.label} 
                          onValueChange={(value) => setNewAddressData({...newAddressData, label: value})}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Home">Home</SelectItem>
                            <SelectItem value="Office">Office</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Full Name *</Label>
                        <Input 
                          value={newAddressData.recipientName}
                          onChange={(e) => setNewAddressData({...newAddressData, recipientName: e.target.value})}
                          className="mt-1.5" 
                          placeholder="Enter recipient name"
                        />
                      </div>
                      <div>
                        <Label>Phone Number *</Label>
                        <Input 
                          value={newAddressData.phone}
                          onChange={(e) => setNewAddressData({...newAddressData, phone: e.target.value})}
                          className="mt-1.5" 
                          placeholder="03XX-XXXXXXX" 
                        />
                      </div>
                      <div>
                        <Label>Province *</Label>
                        <Select 
                          value={newAddressData.province} 
                          onValueChange={(value) => setNewAddressData({...newAddressData, province: value, city: ''})}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder="Select province" />
                          </SelectTrigger>
                          <SelectContent>
                            {PAKISTAN_PROVINCES.map(p => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>City *</Label>
                        <Select 
                          value={newAddressData.city} 
                          onValueChange={(value) => setNewAddressData({...newAddressData, city: value})}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder="Select city" />
                          </SelectTrigger>
                          <SelectContent>
                            {(PAKISTAN_CITIES[newAddressData.province] || []).map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Area / Town</Label>
                        <Input 
                          value={newAddressData.area}
                          onChange={(e) => setNewAddressData({...newAddressData, area: e.target.value})}
                          className="mt-1.5" 
                          placeholder="e.g., Gulberg III" 
                        />
                      </div>
                      <div>
                        <Label>Postal Code</Label>
                        <Input 
                          value={newAddressData.postalCode}
                          onChange={(e) => setNewAddressData({...newAddressData, postalCode: e.target.value})}
                          className="mt-1.5" 
                          placeholder="e.g., 54000" 
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Complete Address *</Label>
                        <Textarea 
                          value={newAddressData.streetAddress}
                          onChange={(e) => setNewAddressData({...newAddressData, streetAddress: e.target.value})}
                          className="mt-1.5" 
                          placeholder="House/Flat no., Street name, Area" 
                        />
                      </div>
                    </div>
                    <Button 
                      className="w-full"
                      onClick={handleSaveNewAddress}
                    >
                      <Save className="h-4 w-4 mr-2" /> Save Address
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    { id: 'COD', name: 'Cash on Delivery', icon: Package, desc: 'Pay when you receive', color: 'emerald' },
                    { id: 'JAZZ_CASH', name: 'JazzCash', icon: Wallet, desc: 'Mobile wallet payment', color: 'red' },
                    { id: 'EASY_PAISA', name: 'EasyPaisa', icon: Wallet, desc: 'Mobile wallet payment', color: 'green' },
                    { id: 'WALLET', name: 'Wallet', icon: Wallet, desc: `Balance: ${formatPrice(walletBalance)}`, color: 'blue' },
                    { id: 'CARD', name: 'Credit/Debit Card', icon: CreditCard, desc: 'Visa, Mastercard', color: 'purple' },
                  ].map((method) => (
                    <div 
                      key={method.id}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        paymentMethod === method.id ? 'border-emerald-500 bg-emerald-50' : 'hover:border-slate-300'
                      } ${method.id === 'WALLET' && walletBalance < total ? 'opacity-60' : ''}`}
                      onClick={() => {
                        if (method.id === 'WALLET' && walletBalance < total) {
                          toast({ 
                            title: 'Insufficient Balance', 
                            description: 'Your wallet balance is not sufficient for this order',
                            variant: 'destructive'
                          })
                          return
                        }
                        setPaymentMethod(method.id)
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          paymentMethod === method.id ? 'bg-emerald-100' : 'bg-slate-100'
                        }`}>
                          <method.icon className={`h-5 w-5 ${
                            paymentMethod === method.id ? 'text-emerald-600' : 'text-slate-500'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{method.name}</p>
                          <p className="text-xs text-muted-foreground">{method.desc}</p>
                        </div>
                        {paymentMethod === method.id && (
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Wallet Phone Input for JazzCash/EasyPaisa */}
                {(paymentMethod === 'JAZZ_CASH' || paymentMethod === 'EASY_PAISA') && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                    <Label className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {paymentMethod === 'JAZZ_CASH' ? 'JazzCash' : 'EasyPaisa'} Account Number
                    </Label>
                    <Input 
                      value={walletPhone}
                      onChange={(e) => setWalletPhone(e.target.value)}
                      className="mt-1.5" 
                      placeholder="03XX-XXXXXXX" 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter the phone number linked to your {paymentMethod === 'JAZZ_CASH' ? 'JazzCash' : 'EasyPaisa'} account
                    </p>
                  </div>
                )}
                
                {/* Wallet Balance Warning */}
                {paymentMethod === 'WALLET' && walletBalance < total && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">Insufficient Wallet Balance</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      Your wallet balance is {formatPrice(walletBalance)} but order total is {formatPrice(total)}. 
                      Please choose another payment method or add funds to your wallet.
                    </p>
                  </div>
                )}
                
                {/* Card Payment Placeholder */}
                {paymentMethod === 'CARD' && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-muted-foreground text-center">
                      Card payment integration coming soon. Please choose another payment method.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Notes (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea 
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Any special instructions for delivery..." 
                />
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48 mb-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-2">
                      <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Package className="h-6 w-6 text-slate-200" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{item.product?.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <span className="text-sm font-medium">{formatPrice(item.totalPrice)}</span>
                    </div>
                  ))}
                </ScrollArea>
                
                {/* Coupon Section */}
                <div className="mb-4">
                  {appliedCoupon ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-emerald-600" />
                          <span className="font-medium text-emerald-700">{appliedCoupon.code}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={handleRemoveCoupon}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-emerald-600 mt-1">{appliedCoupon.name}</p>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input 
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase())
                          setCouponError('')
                        }}
                        placeholder="Enter coupon code" 
                        className="flex-1"
                      />
                      <Button 
                        variant="outline" 
                        onClick={handleApplyCoupon}
                        disabled={isValidatingCoupon}
                      >
                        {isValidatingCoupon ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          'Apply'
                        )}
                      </Button>
                    </div>
                  )}
                  {couponError && (
                    <p className="text-xs text-red-500 mt-1">{couponError}</p>
                  )}
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount</span>
                      <span>-{formatPrice(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span className={deliveryFee === 0 ? 'text-emerald-600' : ''}>
                      {deliveryFee === 0 ? 'Free' : formatPrice(deliveryFee)}
                    </span>
                  </div>
                  {deliveryFee === 0 && subtotal <= 5000 && appliedCoupon?.type === 'FREE_SHIPPING' && (
                    <p className="text-xs text-emerald-600">Free shipping coupon applied!</p>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg pt-2">
                    <span>Total</span>
                    <span className="text-emerald-600">{formatPrice(total)}</span>
                  </div>
                </div>
                
                {/* Delivery Estimate */}
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Estimated Delivery:</span>
                    <span className="font-medium">5-7 business days</span>
                  </div>
                </div>

                <Button 
                  className="w-full mt-4 h-12 text-base" 
                  size="lg"
                  onClick={handlePlaceOrder}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Processing...
                    </>
                  ) : (
                    'Place Order'
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground mt-3">
                  By placing this order, you agree to our Terms & Conditions
                </p>
                
                {/* Security Badges */}
                <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Shield className="h-4 w-4" /> Secure
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <RotateCcw className="h-4 w-4" /> Easy Returns
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckCircle className="h-4 w-4" /> Verified
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // User Dashboard Pages
  // ============================================

  function UserDashboard() {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user?.avatarUrl || undefined} />
            <AvatarFallback className="text-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
              {user?.firstName?.[0] || user?.email?.[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Welcome!'}
            </h1>
            <p className="text-muted-foreground">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={user?.role === 'SELLER' ? 'default' : 'secondary'}>
                {user?.role === 'SELLER' ? 'Seller Account' : user?.role === 'ADMIN' ? 'Admin Account' : 'Buyer Account'}
              </Badge>
              {user?.phone && (
                <Badge variant="outline" className="text-muted-foreground">
                  <Phone className="h-3 w-3 mr-1" /> {user.phone}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: Package, label: 'Orders', value: orders.length, color: 'text-blue-600', bg: 'bg-blue-100' },
            { icon: Heart, label: 'Wishlist', value: wishlistItems.length, color: 'text-red-600', bg: 'bg-red-100' },
            { icon: Wallet, label: 'Wallet', value: formatPrice(userWallet?.balance || 0), color: 'text-emerald-600', bg: 'bg-emerald-100' },
            { icon: Star, label: 'Reviews', value: userReviews.length, color: 'text-yellow-600', bg: 'bg-yellow-100' },
          ].map((stat, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {[
                { icon: Package, label: 'My Orders', view: 'user-orders' },
                { icon: Heart, label: 'Wishlist', view: 'user-wishlist' },
                { icon: MapPin, label: 'Addresses', view: 'user-addresses' },
                { icon: AlertTriangle, label: 'My Disputes', view: 'user-disputes' },
                { icon: Settings, label: 'Settings', view: 'user-settings' },
                { icon: HeadphonesIcon, label: 'Help & Support', view: 'user-support' },
              ].map((action, i) => (
                <Button 
                  key={i} 
                  variant="outline" 
                  className="justify-start h-14"
                  onClick={() => setCurrentView(action.view as any)}
                >
                  <action.icon className="h-5 w-5 mr-3" /> {action.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent Orders</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setCurrentView('user-orders')}>
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.slice(0, 3).map((order) => (
                    <div key={order.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                      <Package className="h-10 w-10 text-slate-400" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.items.length} items • {formatDate(order.placedAt)}
                        </p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p>No orders yet</p>
                  <Button variant="link" onClick={() => setCurrentView('products')} className="mt-2">
                    Start Shopping
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  function UserOrders() {
    const [activeTab, setActiveTab] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
    const [loading, setLoading] = useState(false)

    // Filter orders by tab and search
    const filteredOrders = orders.filter(order => {
      const matchesTab = activeTab === 'all' || 
        (activeTab === 'processing' && ['PLACED', 'CONFIRMED', 'PACKED'].includes(order.status)) ||
        (activeTab === 'shipped' && order.status === 'SHIPPED') ||
        (activeTab === 'delivered' && ['DELIVERED', 'COMPLETED'].includes(order.status)) ||
        (activeTab === 'cancelled' && order.status === 'CANCELLED')
      
      const matchesSearch = !searchTerm || 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesTab && matchesSearch
    })

    // Get order status steps
    const getOrderSteps = (status: string) => {
      const steps = ['PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED']
      const currentIndex = steps.indexOf(status)
      return steps.map((step, index) => ({
        name: step,
        completed: index <= currentIndex,
        current: index === currentIndex
      }))
    }

    // Handle reorder
    const handleReorder = async (order: Order) => {
      setLoading(true)
      try {
        // Add all items from the order to cart
        for (const item of order.items) {
          const product = products.find(p => p.id === item.productId)
          if (product) {
            addItem({
              id: `cart-${Date.now()}-${item.productId}`,
              cartId: 'guest-cart',
              productId: item.productId,
              variantId: null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.unitPrice * item.quantity,
              sellerId: product.sellerId,
              product,
            })
          }
        }
        toast({ title: 'Items added to cart', description: 'You can proceed to checkout' })
        setCurrentView('cart')
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to add items to cart', variant: 'destructive' })
      }
      setLoading(false)
    }

    // Handle cancel order
    const handleCancelOrder = async (orderId: string) => {
      if (!confirm('Are you sure you want to cancel this order?')) return
      
      setLoading(true)
      try {
        const res = await fetch(`/api/orders?id=${orderId}`, {
          method: 'DELETE'
        })
        const data = await res.json()
        if (res.ok) {
          toast({ title: 'Order cancelled', description: 'Your order has been cancelled' })
          // Refresh orders
          const ordersRes = await fetch(`/api/orders?userId=${user?.id}`)
          if (ordersRes.ok) {
            const ordersData = await ordersRes.json()
            setOrders(ordersData.orders || [])
          }
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to cancel order', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to cancel order', variant: 'destructive' })
      }
      setLoading(false)
    }

    // Order Detail View
    if (selectedOrder) {
      const steps = getOrderSteps(selectedOrder.status)
      return (
        <div className="container mx-auto px-4 py-6">
          <Button variant="ghost" className="mb-4" onClick={() => setSelectedOrder(null)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Orders
          </Button>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Order Info */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{selectedOrder.orderNumber}</CardTitle>
                      <CardDescription>Placed on {formatDate(selectedOrder.placedAt)}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(selectedOrder.status)}>{selectedOrder.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Order Status Timeline */}
                  <div className="mb-6">
                    <h4 className="font-medium mb-4">Order Status</h4>
                    <div className="flex items-center justify-between relative">
                      {steps.map((step, index) => (
                        <div key={step.name} className="flex flex-col items-center relative z-10">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            step.completed ? 'bg-emerald-500 text-white' : 
                            step.current ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                          }`}>
                            {step.completed ? <Check className="h-4 w-4" /> : index + 1}
                          </div>
                          <p className={`text-xs mt-2 ${step.current ? 'font-medium' : 'text-muted-foreground'}`}>
                            {step.name}
                          </p>
                        </div>
                      ))}
                      <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-200 -z-0" />
                      <div 
                        className="absolute top-4 left-0 h-0.5 bg-emerald-500 -z-0 transition-all"
                        style={{ width: `${(steps.filter(s => s.completed).length - 1) / (steps.length - 1) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Items</h4>
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                        <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center">
                          {item.productImageUrl ? (
                            <img src={item.productImageUrl} alt={item.productName} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Package className="h-8 w-8 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-muted-foreground">SKU: {item.productSku}</p>
                          <p className="text-sm">Qty: {item.quantity} × {formatPrice(item.unitPrice)}</p>
                        </div>
                        <p className="font-bold">{formatPrice(item.totalPrice)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Shipping Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{selectedOrder.shippingRecipientName}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.shippingPhone}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.shippingStreetAddress}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.shippingCity}</p>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div>
              <Card className="sticky top-20">
                <CardHeader>
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span>{formatPrice(selectedOrder.deliveryFee)}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>Discount</span>
                      <span>-{formatPrice(selectedOrder.discount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatPrice(selectedOrder.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment</span>
                    <span>{selectedOrder.paymentMethod}</span>
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                  {['PLACED', 'CONFIRMED', 'PACKED'].includes(selectedOrder.status) && (
                    <Button 
                      variant="outline" 
                      className="w-full text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleCancelOrder(selectedOrder.id)}
                      disabled={loading}
                    >
                      Cancel Order
                    </Button>
                  )}
                  {selectedOrder.status === 'SHIPPED' && (
                    <Button variant="outline" className="w-full">
                      <Truck className="h-4 w-4 mr-2" /> Track Shipment
                    </Button>
                  )}
                  {['DELIVERED', 'COMPLETED'].includes(selectedOrder.status) && (
                    <>
                      <Button className="w-full" onClick={() => handleReorder(selectedOrder)} disabled={loading}>
                        <RefreshCw className="h-4 w-4 mr-2" /> Reorder
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full text-orange-600 border-orange-200"
                        onClick={() => {
                          setSelectedOrder(null)
                          setCurrentView('user-disputes')
                        }}
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" /> Report Issue
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" className="mb-4" onClick={() => setCurrentView('user-dashboard')}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Orders</h1>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search orders..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">All ({orders.length})</TabsTrigger>
            <TabsTrigger value="processing">Processing ({orders.filter(o => ['PLACED', 'CONFIRMED', 'PACKED'].includes(o.status)).length})</TabsTrigger>
            <TabsTrigger value="shipped">Shipped ({orders.filter(o => o.status === 'SHIPPED').length})</TabsTrigger>
            <TabsTrigger value="delivered">Delivered ({orders.filter(o => ['DELIVERED', 'COMPLETED'].includes(o.status)).length})</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled ({orders.filter(o => o.status === 'CANCELLED').length})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {filteredOrders.length > 0 ? (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">{order.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">{formatDate(order.placedAt)}</p>
                        </div>
                        <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex -space-x-2">
                          {order.items.slice(0, 3).map((item, i) => (
                            <div key={i} className="w-12 h-12 bg-slate-100 rounded-lg border-2 border-background flex items-center justify-center overflow-hidden">
                              {item.productImageUrl ? (
                                <img src={item.productImageUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Package className="h-6 w-6 text-slate-300" />
                              )}
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className="w-12 h-12 bg-slate-200 rounded-lg border-2 border-background flex items-center justify-center text-sm font-medium">
                              +{order.items.length - 3}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">{order.items.length} items</p>
                          <p className="font-bold text-emerald-600">{formatPrice(order.total)}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                            Details
                          </Button>
                          {order.status === 'SHIPPED' && (
                            <Button variant="outline" size="sm">
                              <Truck className="h-3 w-3 mr-1" /> Track
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Package className="h-24 w-24 mx-auto text-slate-200 mb-4" />
                <h3 className="text-xl font-medium mb-2">No orders found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'Try a different search term' : 'Place your first order to get started'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setCurrentView('products')}>Start Shopping</Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  function UserWishlist() {
    const [loading, setLoading] = useState(false)

    // Remove item from wishlist
    const handleRemoveFromWishlist = async (productId: string) => {
      if (!user?.id) return
      
      setLoading(true)
      try {
        const res = await fetch(`/api/wishlist?userId=${user.id}&productId=${productId}`, {
          method: 'DELETE'
        })
        if (res.ok) {
          setWishlist(wishlist.filter(id => id !== productId))
          setWishlistItems(wishlistItems.filter((item: any) => (item.products?.id || item.product_id) !== productId))
          toast({ title: 'Removed from wishlist' })
        } else {
          toast({ title: 'Error', description: 'Failed to remove item', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
      }
      setLoading(false)
    }

    // Add to cart from wishlist
    const handleAddToCart = (item: any) => {
      const product = item.products
      if (product) {
        addItem({
          id: `cart-${Date.now()}`,
          cartId: 'guest-cart',
          productId: product.id,
          variantId: null,
          quantity: 1,
          unitPrice: product.base_price,
          totalPrice: product.base_price,
          sellerId: product.seller_id,
          product: {
            id: product.id,
            sellerId: product.seller_id,
            sku: product.sku || '',
            name: product.name,
            slug: product.slug || '',
            basePrice: product.base_price,
            discountPercentage: product.discount_percentage || 0,
            stockQuantity: product.stock_quantity || 0,
            freeShipping: product.free_shipping || false,
            shippingFee: product.shipping_fee || 0,
            averageRating: product.average_rating || 0,
            totalReviews: product.total_reviews || 0,
            isFeatured: false,
            isNewArrival: false,
            isBestSeller: false,
            primaryImageUrl: product.primary_image_url,
            createdAt: product.created_at || new Date().toISOString(),
          },
        })
        toast({ title: 'Added to cart', description: product.name })
      }
    }

    // Clear all wishlist
    const handleClearWishlist = async () => {
      if (!user?.id) return
      if (!confirm('Are you sure you want to clear your wishlist?')) return
      
      setLoading(true)
      try {
        for (const productId of wishlist) {
          await fetch(`/api/wishlist?userId=${user.id}&productId=${productId}`, {
            method: 'DELETE'
          })
        }
        setWishlist([])
        setWishlistItems([])
        toast({ title: 'Wishlist cleared' })
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to clear wishlist', variant: 'destructive' })
      }
      setLoading(false)
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" className="mb-4" onClick={() => setCurrentView('user-dashboard')}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Wishlist ({wishlistItems.length} items)</h1>
          {wishlistItems.length > 0 && (
            <Button variant="outline" onClick={handleClearWishlist} disabled={loading}>
              <Trash2 className="h-4 w-4 mr-2" /> Clear All
            </Button>
          )}
        </div>

        {wishlistItems.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {wishlistItems.map((item: any) => {
              const product = item.products
              if (!product) return null
              
              return (
                <Card key={item.id} className="group hover:shadow-lg transition-all overflow-hidden">
                  <div className="relative aspect-square bg-gradient-to-br from-slate-100 to-slate-50">
                    <div className="absolute inset-0 flex items-center justify-center">
                      {product.primary_image_url ? (
                        <img src={product.primary_image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="h-20 w-20 text-slate-200" />
                      )}
                    </div>
                    
                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 hover:bg-red-50 shadow-sm text-red-500"
                      onClick={() => handleRemoveFromWishlist(product.id)}
                      disabled={loading}
                    >
                      <X className="h-4 w-4" />
                    </Button>

                    {/* Badges */}
                    {product.discount_percentage > 0 && (
                      <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs border-0">
                        -{product.discount_percentage}%
                      </Badge>
                    )}

                    {/* Quick Add */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/50 to-transparent">
                      <Button 
                        size="sm" 
                        className="w-full bg-white text-slate-900 hover:bg-slate-100"
                        onClick={() => handleAddToCart(item)}
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" /> Add to Cart
                      </Button>
                    </div>
                  </div>

                  <CardContent 
                    className="p-3 cursor-pointer"
                    onClick={() => {
                      setSelectedProduct(product.id)
                      setSelectedProductData({
                        id: product.id,
                        sellerId: product.seller_id,
                        sku: product.sku || '',
                        name: product.name,
                        slug: product.slug || '',
                        basePrice: product.base_price,
                        discountPercentage: product.discount_percentage || 0,
                        stockQuantity: product.stock_quantity || 0,
                        freeShipping: product.free_shipping || false,
                        shippingFee: product.shipping_fee || 0,
                        averageRating: product.average_rating || 0,
                        totalReviews: product.total_reviews || 0,
                        isFeatured: false,
                        isNewArrival: false,
                        isBestSeller: false,
                        primaryImageUrl: product.primary_image_url,
                        createdAt: product.created_at || new Date().toISOString(),
                      })
                      setCurrentView('product-detail')
                    }}
                  >
                    <h3 className="font-medium text-sm line-clamp-2 mb-1.5 min-h-[2.5rem]">{product.name}</h3>
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-3 w-3 ${i < Math.floor(product.average_rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} 
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">({product.total_reviews || 0})</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-lg text-emerald-600">{formatPrice(product.base_price)}</span>
                      {product.compare_at_price && product.compare_at_price > product.base_price && (
                        <span className="text-sm text-muted-foreground line-through">
                          {formatPrice(product.compare_at_price)}
                        </span>
                      )}
                    </div>
                    {product.sellers && (
                      <p className="text-xs text-muted-foreground mt-1">
                        by {product.sellers.store_name}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <Heart className="h-24 w-24 mx-auto text-slate-200 mb-4" />
            <h3 className="text-xl font-medium mb-2">Your wishlist is empty</h3>
            <p className="text-muted-foreground mb-4">Save items you love to your wishlist</p>
            <Button onClick={() => setCurrentView('products')}>Browse Products</Button>
          </div>
        )}
      </div>
    )
  }

  function UserAddresses() {
    const [showAddressModal, setShowAddressModal] = useState(false)
    const [editingAddress, setEditingAddress] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [addressForm, setAddressForm] = useState({
      label: 'Home',
      recipientName: '',
      recipientPhone: '',
      province: '',
      city: '',
      area: '',
      streetAddress: '',
      postalCode: '',
      isDefault: false
    })

    const provinces = Object.keys(PAKISTAN_CITIES)

    const resetForm = () => {
      setAddressForm({
        label: 'Home',
        recipientName: '',
        recipientPhone: '',
        province: '',
        city: '',
        area: '',
        streetAddress: '',
        postalCode: '',
        isDefault: false
      })
      setEditingAddress(null)
    }

    const openAddAddress = () => {
      resetForm()
      setShowAddressModal(true)
    }

    const openEditAddress = (address: any) => {
      setEditingAddress(address)
      setAddressForm({
        label: address.label || 'Home',
        recipientName: address.recipient_name || address.recipientName || '',
        recipientPhone: address.recipient_phone || address.recipientPhone || '',
        province: address.province || '',
        city: address.city || '',
        area: address.area || '',
        streetAddress: address.street_address || address.streetAddress || '',
        postalCode: address.postal_code || address.postalCode || '',
        isDefault: address.is_default ?? address.isDefault ?? false
      })
      setShowAddressModal(true)
    }

    const fetchAddresses = async () => {
      if (!user?.id) return
      try {
        const res = await fetch(`/api/addresses?userId=${user.id}`)
        if (res.ok) {
          const data = await res.json()
          setUserAddresses(data.addresses || [])
        }
      } catch (error) {
        console.error('Failed to fetch addresses:', error)
      }
    }

    const handleSaveAddress = async () => {
      if (!user?.id) return
      if (!addressForm.recipientName || !addressForm.recipientPhone || !addressForm.province || !addressForm.city || !addressForm.streetAddress) {
        toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' })
        return
      }

      setLoading(true)
      try {
        if (editingAddress) {
          // Update existing address
          const res = await fetch('/api/addresses', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              addressId: editingAddress.id,
              userId: user.id,
              label: addressForm.label,
              recipientName: addressForm.recipientName,
              recipientPhone: addressForm.recipientPhone,
              province: addressForm.province,
              city: addressForm.city,
              area: addressForm.area,
              streetAddress: addressForm.streetAddress,
              postalCode: addressForm.postalCode,
              isDefault: addressForm.isDefault
            })
          })
          const data = await res.json()
          if (res.ok) {
            toast({ title: 'Success', description: 'Address updated successfully' })
            fetchAddresses()
            setShowAddressModal(false)
            resetForm()
          } else {
            toast({ title: 'Error', description: data.error || 'Failed to update address', variant: 'destructive' })
          }
        } else {
          // Create new address
          const res = await fetch('/api/addresses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              label: addressForm.label,
              recipientName: addressForm.recipientName,
              recipientPhone: addressForm.recipientPhone,
              province: addressForm.province,
              city: addressForm.city,
              area: addressForm.area,
              streetAddress: addressForm.streetAddress,
              postalCode: addressForm.postalCode,
              isDefault: addressForm.isDefault
            })
          })
          const data = await res.json()
          if (res.ok) {
            toast({ title: 'Success', description: 'Address added successfully' })
            fetchAddresses()
            setShowAddressModal(false)
            resetForm()
          } else {
            toast({ title: 'Error', description: data.error || 'Failed to add address', variant: 'destructive' })
          }
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
      }
      setLoading(false)
    }

    const handleDeleteAddress = async (addressId: string) => {
      if (!user?.id) return
      if (!confirm('Are you sure you want to delete this address?')) return

      try {
        const res = await fetch(`/api/addresses?addressId=${addressId}&userId=${user.id}`, {
          method: 'DELETE'
        })
        const data = await res.json()
        if (res.ok) {
          toast({ title: 'Success', description: 'Address deleted successfully' })
          fetchAddresses()
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to delete address', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete address', variant: 'destructive' })
      }
    }

    const handleSetDefault = async (addressId: string) => {
      if (!user?.id) return

      try {
        const res = await fetch('/api/addresses', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            addressId,
            userId: user.id,
            isDefault: true
          })
        })
        const data = await res.json()
        if (res.ok) {
          toast({ title: 'Success', description: 'Default address updated' })
          fetchAddresses()
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to set default address', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to set default address', variant: 'destructive' })
      }
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" className="mb-4" onClick={() => setCurrentView('user-dashboard')}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Addresses</h1>
          <Button onClick={openAddAddress}>
            <Plus className="h-4 w-4 mr-2" /> Add New Address
          </Button>
        </div>

        {userAddresses.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {userAddresses.map((address) => (
              <Card key={address.id} className={(address.is_default ?? address.isDefault) ? 'border-emerald-500 border-2' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={(address.is_default ?? address.isDefault) ? 'default' : 'secondary'}>
                        {address.label || 'Home'}
                      </Badge>
                      {(address.is_default ?? address.isDefault) && (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-600">Default</Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => openEditAddress(address)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500"
                        onClick={() => handleDeleteAddress(address.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="font-medium">{address.recipient_name || address.recipientName}</p>
                  <p className="text-sm text-muted-foreground">{address.recipient_phone || address.recipientPhone}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {address.street_address || address.streetAddress}
                    {(address.area) && `, ${address.area}`}
                    , {address.city}
                  </p>
                  <p className="text-sm text-muted-foreground">{address.province}, Pakistan</p>
                  
                  {!(address.is_default ?? address.isDefault) && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3 text-emerald-600 border-emerald-600 hover:bg-emerald-50"
                      onClick={() => handleSetDefault(address.id)}
                    >
                      <Check className="h-4 w-4 mr-1" /> Set as Default
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <MapPin className="h-24 w-24 mx-auto text-slate-200 mb-4" />
            <h3 className="text-xl font-medium mb-2">No addresses saved</h3>
            <p className="text-muted-foreground mb-4">Add an address for faster checkout</p>
            <Button onClick={openAddAddress}>
              <Plus className="h-4 w-4 mr-2" /> Add Address
            </Button>
          </div>
        )}

        {/* Address Form Modal */}
        <Dialog open={showAddressModal} onOpenChange={(open) => { setShowAddressModal(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
              <DialogDescription>Enter your delivery address details</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Label</Label>
                  <Select value={addressForm.label} onValueChange={(v) => setAddressForm({...addressForm, label: v})}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Home">Home</SelectItem>
                      <SelectItem value="Office">Office</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      checked={addressForm.isDefault}
                      onChange={(e) => setAddressForm({...addressForm, isDefault: e.target.checked})}
                    />
                    <span className="text-sm">Set as default</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Recipient Name *</Label>
                  <Input 
                    value={addressForm.recipientName}
                    onChange={(e) => setAddressForm({...addressForm, recipientName: e.target.value})}
                    className="mt-1.5"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <Label>Phone Number *</Label>
                  <Input 
                    value={addressForm.recipientPhone}
                    onChange={(e) => setAddressForm({...addressForm, recipientPhone: e.target.value})}
                    className="mt-1.5"
                    placeholder="03XX-XXXXXXX"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Province *</Label>
                  <Select 
                    value={addressForm.province} 
                    onValueChange={(v) => setAddressForm({...addressForm, province: v, city: ''})}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>City *</Label>
                  <Select 
                    value={addressForm.city} 
                    onValueChange={(v) => setAddressForm({...addressForm, city: v})}
                    disabled={!addressForm.province}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {(PAKISTAN_CITIES[addressForm.province] || []).map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Area / Neighborhood</Label>
                <Input 
                  value={addressForm.area}
                  onChange={(e) => setAddressForm({...addressForm, area: e.target.value})}
                  className="mt-1.5"
                  placeholder="e.g., Gulberg, DHA, etc."
                />
              </div>

              <div>
                <Label>Street Address *</Label>
                <Textarea 
                  value={addressForm.streetAddress}
                  onChange={(e) => setAddressForm({...addressForm, streetAddress: e.target.value})}
                  className="mt-1.5"
                  placeholder="House/Flat number, Street name, Building name"
                  rows={2}
                />
              </div>

              <div>
                <Label>Postal Code</Label>
                <Input 
                  value={addressForm.postalCode}
                  onChange={(e) => setAddressForm({...addressForm, postalCode: e.target.value})}
                  className="mt-1.5"
                  placeholder="Optional"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowAddressModal(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleSaveAddress} disabled={loading}>
                {loading ? 'Saving...' : editingAddress ? 'Update Address' : 'Add Address'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  function UserSettings() {
    const [loading, setLoading] = useState(false)
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [profileForm, setProfileForm] = useState({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
    })
    const [passwordForm, setPasswordForm] = useState({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
    const [notifications, setNotifications] = useState({
      emailNotifications: user?.emailNotifications ?? true,
      smsNotifications: user?.smsNotifications ?? false,
      promotionalEmails: user?.promotionalEmails ?? true,
    })

    // Handle profile update
    const handleSaveProfile = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/auth', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileForm)
        })
        const data = await res.json()
        if (res.ok) {
          setUser(data.user)
          toast({ title: 'Success', description: 'Profile updated successfully' })
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to update profile', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
      }
      setLoading(false)
    }

    // Handle password change
    const handleChangePassword = async () => {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' })
        return
      }
      if (passwordForm.newPassword.length < 8) {
        toast({ title: 'Error', description: 'Password must be at least 8 characters', variant: 'destructive' })
        return
      }

      setLoading(true)
      try {
        const res = await fetch('/api/auth', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword
          })
        })
        const data = await res.json()
        if (res.ok) {
          toast({ title: 'Success', description: 'Password changed successfully' })
          setShowPasswordModal(false)
          setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to change password', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
      }
      setLoading(false)
    }

    // Handle notification preferences update
    const handleNotificationChange = async (key: keyof typeof notifications, value: boolean) => {
      setNotifications(prev => ({ ...prev, [key]: value }))
      
      try {
        await fetch('/api/auth', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [key]: value })
        })
        toast({ title: 'Preferences updated' })
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to update preferences', variant: 'destructive' })
      }
    }

    // Handle account deletion
    const handleDeleteAccount = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/auth', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deleteAccount: true })
        })
        const data = await res.json()
        if (res.ok) {
          logout()
          setCurrentView('home')
          toast({ title: 'Account deleted', description: 'Your account has been permanently deleted' })
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to delete account', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
      }
      setLoading(false)
      setShowDeleteModal(false)
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" className="mb-4" onClick={() => setCurrentView('user-dashboard')}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Button>

        <h1 className="text-2xl font-bold mb-6">Account Settings</h1>

        <div className="max-w-2xl space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user?.avatarUrl || undefined} />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                    {user?.firstName?.[0] || user?.email?.[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" /> Change Photo
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG max 2MB</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({...profileForm, firstName: e.target.value})}
                    className="mt-1.5" 
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({...profileForm, lastName: e.target.value})}
                    className="mt-1.5" 
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email || ''} className="mt-1.5" disabled />
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                  placeholder="03XX-XXXXXXX" 
                  className="mt-1.5" 
                />
              </div>
              <Button onClick={handleSaveProfile} disabled={loading}>
                <Save className="h-4 w-4 mr-2" /> Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Lock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Password</p>
                    <p className="text-sm text-muted-foreground">Last changed: Unknown</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setShowPasswordModal(true)}>
                  Change
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Shield className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Add extra security to your account</p>
                  </div>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to receive updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Mail className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive order updates via email</p>
                  </div>
                </div>
                <Switch 
                  checked={notifications.emailNotifications}
                  onCheckedChange={(v) => handleNotificationChange('emailNotifications', v)}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive order updates via SMS</p>
                  </div>
                </div>
                <Switch 
                  checked={notifications.smsNotifications}
                  onCheckedChange={(v) => handleNotificationChange('smsNotifications', v)}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Gift className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">Promotional Emails</p>
                    <p className="text-sm text-muted-foreground">Receive deals, offers and new arrivals</p>
                  </div>
                </div>
                <Switch 
                  checked={notifications.promotionalEmails}
                  onCheckedChange={(v) => handleNotificationChange('promotionalEmails', v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions for your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-red-600">Delete Account</p>
                  <p className="text-sm text-muted-foreground">
                    Once deleted, your account cannot be recovered. All your data will be permanently removed.
                  </p>
                </div>
                <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>
                  <Ban className="h-4 w-4 mr-2" /> Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Password Change Modal */}
        <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>Enter your current password and choose a new one</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Current Password</Label>
                <Input 
                  type="password" 
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  className="mt-1.5" 
                />
              </div>
              <div>
                <Label>New Password</Label>
                <Input 
                  type="password" 
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  className="mt-1.5" 
                />
              </div>
              <div>
                <Label>Confirm New Password</Label>
                <Input 
                  type="password" 
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  className="mt-1.5" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
              <Button onClick={handleChangePassword} disabled={loading}>
                {loading ? 'Changing...' : 'Change Password'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Account Modal */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-600">Delete Account</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete your account and remove all your data.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete your account? All your orders, addresses, wishlist, and other data will be permanently removed.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteAccount} disabled={loading}>
                {loading ? 'Deleting...' : 'Yes, Delete My Account'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ============================================
  // Support Ticket System
  // ============================================

  function UserSupport() {
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [viewingTicket, setViewingTicket] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [ticketForm, setTicketForm] = useState({
      subject: '',
      category: 'other',
      priority: 'normal',
      message: ''
    })
    const [replyMessage, setReplyMessage] = useState('')

    const categories = [
      { value: 'order_issue', label: 'Order Issue' },
      { value: 'payment_issue', label: 'Payment Issue' },
      { value: 'product_question', label: 'Product Question' },
      { value: 'shipping_inquiry', label: 'Shipping Inquiry' },
      { value: 'return_refund', label: 'Return/Refund' },
      { value: 'account_issue', label: 'Account Issue' },
      { value: 'seller_dispute', label: 'Seller Dispute' },
      { value: 'technical_support', label: 'Technical Support' },
      { value: 'feedback', label: 'Feedback' },
      { value: 'other', label: 'Other' },
    ]

    const priorities = [
      { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
      { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
      { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
      { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' },
    ]

    const statusColors: Record<string, string> = {
      'open': 'bg-blue-100 text-blue-800',
      'in_progress': 'bg-yellow-100 text-yellow-800',
      'waiting_response': 'bg-purple-100 text-purple-800',
      'resolved': 'bg-green-100 text-green-800',
      'closed': 'bg-gray-100 text-gray-800',
    }

    const fetchTickets = async () => {
      if (!user?.id) return
      setLoading(true)
      try {
        const res = await fetch(`/api/support-tickets?userId=${user.id}&userRole=${user.role}`)
        if (res.ok) {
          const data = await res.json()
          setSupportTickets(data.tickets || [])
        }
      } catch (error) {
        console.error('Failed to fetch tickets:', error)
      }
      setLoading(false)
    }

    useEffect(() => {
      fetchTickets()
    }, [user?.id])

    const handleCreateTicket = async () => {
      if (!user?.id) return
      if (!ticketForm.subject || !ticketForm.message) {
        toast({ title: 'Error', description: 'Please fill in subject and message', variant: 'destructive' })
        return
      }

      setLoading(true)
      try {
        const res = await fetch('/api/support-tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            subject: ticketForm.subject,
            category: ticketForm.category,
            priority: ticketForm.priority,
            message: ticketForm.message
          })
        })
        const data = await res.json()
        if (res.ok) {
          toast({ title: 'Success', description: 'Ticket created successfully' })
          setShowCreateForm(false)
          setTicketForm({ subject: '', category: 'other', priority: 'normal', message: '' })
          fetchTickets()
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to create ticket', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
      }
      setLoading(false)
    }

    const handleViewTicket = async (ticketId: string) => {
      if (!user?.id) return
      setLoading(true)
      try {
        const res = await fetch(`/api/support-tickets?ticketId=${ticketId}&userId=${user.id}&userRole=${user.role}`)
        if (res.ok) {
          const data = await res.json()
          setViewingTicket(data.ticket)
        }
      } catch (error) {
        console.error('Failed to fetch ticket:', error)
      }
      setLoading(false)
    }

    const handleAddReply = async () => {
      if (!user?.id || !viewingTicket || !replyMessage.trim()) return

      setLoading(true)
      try {
        const res = await fetch('/api/support-tickets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketId: viewingTicket.id,
            userId: user.id,
            userRole: user.role,
            message: replyMessage
          })
        })
        const data = await res.json()
        if (res.ok) {
          toast({ title: 'Success', description: 'Reply added successfully' })
          setReplyMessage('')
          handleViewTicket(viewingTicket.id)
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to add reply', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
      }
      setLoading(false)
    }

    // Ticket Detail View
    if (viewingTicket) {
      return (
        <div className="container mx-auto px-4 py-6">
          <Button variant="ghost" className="mb-4" onClick={() => setViewingTicket(null)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Tickets
          </Button>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Ticket Info */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ticket Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Ticket Number</p>
                    <p className="font-mono font-medium">{viewingTicket.ticket_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Subject</p>
                    <p className="font-medium">{viewingTicket.subject}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <Badge variant="outline">{categories.find(c => c.value === viewingTicket.category)?.label || viewingTicket.category}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Priority</p>
                    <Badge className={priorities.find(p => p.value === viewingTicket.priority)?.color || 'bg-gray-100'}>
                      {priorities.find(p => p.value === viewingTicket.priority)?.label || viewingTicket.priority}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={statusColors[viewingTicket.status] || 'bg-gray-100'}>
                      {viewingTicket.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-sm">{formatDate(viewingTicket.created_at)}</p>
                  </div>
                  {viewingTicket.resolved_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Resolved</p>
                      <p className="text-sm">{formatDate(viewingTicket.resolved_at)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Messages */}
            <div className="lg:col-span-2">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">Conversation</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto max-h-96 space-y-4">
                  {viewingTicket.messages?.map((msg: any) => (
                    <div 
                      key={msg.id} 
                      className={`flex ${msg.sender_role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[80%] p-4 rounded-xl ${
                          msg.sender_role === 'user' 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-slate-100 text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium opacity-75">
                            {msg.sender_role === 'user' ? 'You' : 'Support Team'}
                          </span>
                          <span className="text-xs opacity-50">
                            {formatDate(msg.created_at)}
                          </span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
                
                {/* Reply Input */}
                {viewingTicket.status !== 'closed' && viewingTicket.status !== 'resolved' && (
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type your reply..."
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        className="flex-1 min-h-[80px]"
                      />
                      <Button 
                        className="bg-emerald-600 hover:bg-emerald-700 self-end"
                        onClick={handleAddReply}
                        disabled={loading || !replyMessage.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )
    }

    // Create Ticket Form
    if (showCreateForm) {
      return (
        <div className="container mx-auto px-4 py-6">
          <Button variant="ghost" className="mb-4" onClick={() => setShowCreateForm(false)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Tickets
          </Button>

          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Create New Support Ticket</CardTitle>
              <CardDescription>Describe your issue and we'll get back to you as soon as possible.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Subject *</Label>
                <Input
                  placeholder="Brief description of your issue"
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({...ticketForm, subject: e.target.value})}
                  className="mt-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select
                    value={ticketForm.category}
                    onValueChange={(v) => setTicketForm({...ticketForm, category: v})}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select
                    value={ticketForm.priority}
                    onValueChange={(v) => setTicketForm({...ticketForm, priority: v})}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((pri) => (
                        <SelectItem key={pri.value} value={pri.value}>
                          {pri.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Message *</Label>
                <Textarea
                  placeholder="Describe your issue in detail..."
                  value={ticketForm.message}
                  onChange={(e) => setTicketForm({...ticketForm, message: e.target.value})}
                  className="mt-1.5 min-h-[150px]"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleCreateTicket}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Ticket'}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    // Ticket List View
    return (
      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" className="mb-4" onClick={() => setCurrentView('user-dashboard')}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Help & Support</h1>
            <p className="text-muted-foreground">Get help with your orders, account, and more</p>
          </div>
          <Button onClick={() => setShowCreateForm(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" /> New Ticket
          </Button>
        </div>

        {/* Quick Help */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: Package, title: 'Track Order', desc: 'Check your order status', action: () => setCurrentView('user-orders') },
            { icon: RotateCcw, title: 'Returns', desc: 'Initiate a return request', action: () => {} },
            { icon: MessageSquare, title: 'Live Chat', desc: 'Chat with support', action: () => {} },
            { icon: HelpCircle, title: 'FAQs', desc: 'Common questions', action: () => {} },
          ].map((item, i) => (
            <Card key={i} className="cursor-pointer hover:shadow-md transition-shadow" onClick={item.action}>
              <CardContent className="p-4 text-center">
                <item.icon className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* My Tickets */}
        <Card>
          <CardHeader>
            <CardTitle>My Support Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            {supportTickets.length > 0 ? (
              <div className="space-y-3">
                {supportTickets.map((ticket: any) => (
                  <div 
                    key={ticket.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
                    onClick={() => handleViewTicket(ticket.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <HeadphonesIcon className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium">{ticket.subject}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-mono text-xs">{ticket.ticketNumber}</span>
                          <span>•</span>
                          <span>{formatDate(ticket.createdAt || ticket.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={statusColors[ticket.status] || 'bg-gray-100'}>
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <HeadphonesIcon className="h-16 w-16 mx-auto text-slate-200 mb-4" />
                <h3 className="text-lg font-medium mb-2">No support tickets yet</h3>
                <p className="text-muted-foreground mb-4">Need help? Create a new support ticket.</p>
                <Button onClick={() => setShowCreateForm(true)} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" /> Create Ticket
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================
  // Seller Dashboard Pages
  // ============================================

  function SellerDashboard() {
    const [sellerStats, setSellerStats] = useState({
      totalSales: 0,
      totalOrders: 0,
      totalProducts: 0,
      averageRating: 0,
      totalEarnings: 0,
      availableBalance: 0,
    })
    const [periodStats, setPeriodStats] = useState({
      revenue: 0,
      orders: 0,
    })
    const [revenueData, setRevenueData] = useState<{date: string, amount: number}[]>([])
    const [topProducts, setTopProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Fetch seller analytics
    useEffect(() => {
      const fetchSellerAnalytics = async () => {
        if (!user?.sellerProfile?.id) return
        
        setLoading(true)
        try {
          const res = await fetch(`/api/analytics?type=seller&sellerId=${user.sellerProfile?.id}&period=7d`)
          if (res.ok) {
            const data = await res.json()
            setSellerStats(data.seller || {})
            setPeriodStats(data.period || {})
            
            // Convert daily orders to revenue chart format
            const dailyOrders = data.dailyOrders || {}
            const chartData = Object.entries(dailyOrders).map(([date, count]) => ({
              date,
              amount: (count as number) * (data.seller?.total_sales / Math.max(data.period?.orders || 1, 1) || 1000)
            })).slice(-7)
            setRevenueData(chartData)
            setTopProducts(data.topProducts || [])
          }
        } catch (error) {
          console.error('Failed to fetch seller analytics:', error)
        }
        setLoading(false)
      }

      fetchSellerAnalytics()
    }, [user?.sellerProfile?.id])

    const pendingOrdersCount = sellerOrders.filter(o => o.status === 'PLACED' || o.status === 'CONFIRMED').length
    const maxRevenue = Math.max(...revenueData.map(d => d.amount), 1)

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Seller Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.sellerProfile?.storeName || 'Seller'}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setCurrentView('seller-products')} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: DollarSign, label: 'Total Earnings', value: formatPrice(sellerStats.totalEarnings || sellerStats.totalSales), change: '+12%', color: 'text-emerald-600', bg: 'bg-emerald-100' },
            { icon: Package, label: 'Total Orders', value: sellerStats.totalOrders, change: '+8%', color: 'text-blue-600', bg: 'bg-blue-100' },
            { icon: ShoppingBag, label: 'Products', value: sellerStats.totalProducts, change: '+3', color: 'text-purple-600', bg: 'bg-purple-100' },
            { icon: Star, label: 'Rating', value: sellerStats.averageRating?.toFixed(1) || '0.0', change: '+0.2', color: 'text-yellow-600', bg: 'bg-yellow-100' },
          ].map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <Badge variant="secondary" className="text-emerald-600 bg-emerald-100">
                    {stat.change}
                  </Badge>
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Revenue Chart - Last 7 Days */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Revenue (Last 7 Days)</CardTitle>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-600">{formatPrice(periodStats.revenue)}</p>
                  <p className="text-sm text-muted-foreground">{periodStats.orders} orders</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-48 flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : revenueData.length > 0 ? (
                <div className="h-48 flex items-end justify-between gap-2">
                  {revenueData.map((data, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg transition-all hover:from-emerald-600 hover:to-emerald-500 cursor-pointer"
                        style={{ height: `${(data.amount / maxRevenue) * 140}px` }}
                        title={`${formatPrice(data.amount)}`}
                      />
                      <span className="text-xs text-muted-foreground">
                        {new Date(data.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  No revenue data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Orders Alert & Quick Actions */}
          <div className="space-y-4">
            {pendingOrdersCount > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                      <Clock4 className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-600">{pendingOrdersCount}</p>
                      <p className="text-sm text-orange-700">Pending Orders</p>
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-3" 
                    variant="outline"
                    onClick={() => setCurrentView('seller-orders')}
                  >
                    View Orders
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => setCurrentView('seller-products')}>
                  <Package className="h-4 w-4 mr-2" /> Manage Products
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setCurrentView('seller-orders')}>
                  <ShoppingBag className="h-4 w-4 mr-2" /> View Orders
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setCurrentView('seller-disputes')}>
                  <AlertTriangle className="h-4 w-4 mr-2" /> View Disputes
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setCurrentView('seller-analytics')}>
                  <BarChart3 className="h-4 w-4 mr-2" /> View Analytics
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent Orders</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setCurrentView('seller-orders')}>
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {sellerOrders.length > 0 ? (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {sellerOrders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.items.length} items • {formatDate(order.placedAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatPrice(order.total)}</p>
                        <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p>No orders yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Selling Products */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Top Selling Products</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setCurrentView('seller-products')}>
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {topProducts.length > 0 ? (
                <div className="space-y-3">
                  {topProducts.map((product, i) => (
                    <div key={product.id} className="flex items-center gap-4">
                      <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Package className="h-6 w-6 text-slate-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium line-clamp-1">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.purchase_count || 0} sold</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">{formatPrice(product.base_price)}</p>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs">{product.average_rating?.toFixed(1) || '0.0'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : sellerProducts.length > 0 ? (
                <div className="space-y-3">
                  {sellerProducts.slice(0, 5).map((product, i) => (
                    <div key={product.id} className="flex items-center gap-4">
                      <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Package className="h-6 w-6 text-slate-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium line-clamp-1">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.stockQuantity} in stock</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">{formatPrice(product.basePrice)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p>No products yet</p>
                  <Button size="sm" className="mt-3" onClick={() => setCurrentView('seller-products')}>
                    Add Products
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ============================================
  // Enhanced Seller Products Management
  // With inventory, variants, bulk edit, import/export
  // ============================================

  function SellerProducts() {
    // State for product management
    const [showProductModal, setShowProductModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [productForm, setProductForm] = useState({
      name: '', sku: '', description: '', basePrice: '', compareAtPrice: '',
      stockQuantity: '', categoryId: '', status: 'DRAFT', freeShipping: false, shippingFee: '0',
      primaryImageUrl: '', hasVariants: false, lowStockThreshold: '10'
    })
    const [statusFilter, setStatusFilter] = useState('all')
    const [stockFilter, setStockFilter] = useState('all')
    const [sortBy, setSortBy] = useState('newest')
    const [saving, setSaving] = useState(false)

    // State for variants
    const [showVariantModal, setShowVariantModal] = useState(false)
    const [selectedProductForVariants, setSelectedProductForVariants] = useState<Product | null>(null)
    const [productVariants, setProductVariants] = useState<any[]>([])
    const [variantForm, setVariantForm] = useState({
      sku: '', attributes: '{}', priceAdjustment: '0', stockQuantity: '0', imageUrl: ''
    })
    const [editingVariant, setEditingVariant] = useState<any>(null)

    // State for bulk edit
    const [selectedProducts, setSelectedProducts] = useState<string[]>([])
    const [showBulkEditModal, setShowBulkEditModal] = useState(false)
    const [bulkEditForm, setBulkEditForm] = useState({
      status: '', categoryId: '', priceAdjustment: '0', stockAdjustment: '0', freeShipping: ''
    })

    // State for import/export
    const [showImportModal, setShowImportModal] = useState(false)
    const [importData, setImportData] = useState('')
    const [importing, setImporting] = useState(false)

    // State for image upload
    const [uploadingImage, setUploadingImage] = useState(false)
    const fileInputRef = useState<HTMLInputElement | null>(null)[0]

    // Inventory summary
    const [inventorySummary, setInventorySummary] = useState({
      total: 0, inStock: 0, lowStock: 0, outOfStock: 0
    })

    // Fetch inventory summary
    const fetchInventorySummary = async () => {
      if (!user?.sellerProfile?.id) return
      try {
        const res = await fetch(`/api/inventory?sellerId=${user.sellerProfile?.id}`)
        if (res.ok) {
          const data = await res.json()
          setInventorySummary(data.summary || { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 })
        }
      } catch (error) {
        console.error('Failed to fetch inventory summary:', error)
      }
    }

    const openAddProduct = () => {
      setEditingProduct(null)
      setProductForm({ 
        name: '', sku: '', description: '', basePrice: '', compareAtPrice: '',
        stockQuantity: '', categoryId: '', status: 'DRAFT', freeShipping: false, shippingFee: '0',
        primaryImageUrl: '', hasVariants: false, lowStockThreshold: '10'
      })
      setShowProductModal(true)
    }

    const openEditProduct = (product: Product) => {
      setEditingProduct(product)
      setProductForm({
        name: product.name, sku: product.sku, description: product.description || '',
        basePrice: String(product.basePrice), compareAtPrice: String(product.compareAtPrice || ''),
        stockQuantity: String(product.stockQuantity), categoryId: product.categoryId || '',
        status: product.status, freeShipping: product.freeShipping, shippingFee: String(product.shippingFee),
        primaryImageUrl: product.primaryImageUrl || '', hasVariants: false, lowStockThreshold: '10'
      })
      setShowProductModal(true)
    }

    const fetchSellerProducts = async () => {
      if (!user?.sellerProfile?.id) return
      try {
        const res = await fetch(`/api/products?sellerId=${user.sellerProfile?.id}&status=all&includeVariants=true`)
        if (res.ok) {
          const data = await res.json()
          setSellerProducts(data.products || [])
        }
      } catch (error) {
        console.error('Failed to fetch seller products:', error)
      }
      fetchInventorySummary()
    }

    // Handle image upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setUploadingImage(true)
      try {
        // Convert to base64 for demo (in production, use proper file storage)
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64 = reader.result as string
          setProductForm({ ...productForm, primaryImageUrl: base64 })
        }
        reader.readAsDataURL(file)
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to upload image', variant: 'destructive' })
      }
      setUploadingImage(false)
    }

    const handleSaveProduct = async () => {
      if (!productForm.name || !productForm.basePrice) {
        toast({ title: 'Error', description: 'Please fill required fields', variant: 'destructive' })
        return
      }

      setSaving(true)
      try {
        if (editingProduct) {
          const res = await fetch('/api/products', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: editingProduct.id,
              name: productForm.name,
              sku: productForm.sku,
              description: productForm.description,
              basePrice: productForm.basePrice,
              compareAtPrice: productForm.compareAtPrice,
              stockQuantity: productForm.stockQuantity,
              categoryId: productForm.categoryId,
              status: productForm.status,
              freeShipping: productForm.freeShipping,
              shippingFee: productForm.shippingFee,
              primaryImageUrl: productForm.primaryImageUrl,
            }),
          })
          const data = await res.json()
          if (res.ok) {
            toast({ title: 'Product Updated', description: 'Product has been updated successfully' })
            fetchSellerProducts()
            setShowProductModal(false)
          } else {
            toast({ title: 'Error', description: data.error || 'Failed to update product', variant: 'destructive' })
          }
        } else {
          const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: productForm.name,
              sku: productForm.sku,
              description: productForm.description,
              basePrice: productForm.basePrice,
              compareAtPrice: productForm.compareAtPrice,
              stockQuantity: productForm.stockQuantity,
              categoryId: productForm.categoryId,
              status: productForm.status,
              freeShipping: productForm.freeShipping,
              shippingFee: productForm.shippingFee,
              primaryImageUrl: productForm.primaryImageUrl,
              hasVariants: productForm.hasVariants,
            }),
          })
          const data = await res.json()
          if (res.ok) {
            toast({ title: 'Product Added', description: 'New product has been added successfully' })
            fetchSellerProducts()
            setShowProductModal(false)
          } else {
            toast({ title: 'Error', description: data.error || 'Failed to add product', variant: 'destructive' })
          }
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
      }
      setSaving(false)
    }

    const handleDeleteProduct = async (productId: string) => {
      if (!confirm('Are you sure you want to delete this product?')) return
      
      try {
        const res = await fetch(`/api/products?id=${productId}`, { method: 'DELETE' })
        const data = await res.json()
        if (res.ok) {
          toast({ title: 'Product Deleted', description: 'Product has been removed' })
          fetchSellerProducts()
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to delete product', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete product', variant: 'destructive' })
      }
    }

    const handleToggleStatus = async (product: Product) => {
      const newStatus = product.status === 'LIVE' ? 'DRAFT' : 'LIVE'
      
      try {
        const res = await fetch('/api/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product.id, status: newStatus }),
        })
        const data = await res.json()
        if (res.ok) {
          toast({ title: 'Status Updated', description: `Product is now ${newStatus === 'LIVE' ? 'live' : 'in draft'}` })
          fetchSellerProducts()
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to update status', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' })
      }
    }

    // Variant management
    const openVariantModal = async (product: Product) => {
      setSelectedProductForVariants(product)
      setEditingVariant(null)
      setVariantForm({ sku: '', attributes: '{}', priceAdjustment: '0', stockQuantity: '0', imageUrl: '' })
      
      // Fetch variants for this product
      try {
        const res = await fetch(`/api/products?productId=${product.id}&includeVariants=true`)
        if (res.ok) {
          const data = await res.json()
          setProductVariants(data.product?.variants || [])
        }
      } catch (error) {
        console.error('Failed to fetch variants:', error)
      }
      setShowVariantModal(true)
    }

    const handleSaveVariant = async () => {
      if (!selectedProductForVariants) return

      setSaving(true)
      try {
        if (editingVariant) {
          // Update variant
          const res = await fetch('/api/products', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update-variant',
              variantId: editingVariant.id,
              sku: variantForm.sku,
              attributes: JSON.parse(variantForm.attributes),
              priceAdjustment: variantForm.priceAdjustment,
              stockQuantity: variantForm.stockQuantity,
              imageUrl: variantForm.imageUrl,
            }),
          })
          const data = await res.json()
          if (res.ok) {
            toast({ title: 'Variant Updated', description: 'Variant has been updated' })
            openVariantModal(selectedProductForVariants)
          } else {
            toast({ title: 'Error', description: data.error, variant: 'destructive' })
          }
        } else {
          // Create variant
          const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create-variant',
              productId: selectedProductForVariants.id,
              sku: variantForm.sku,
              attributes: JSON.parse(variantForm.attributes),
              priceAdjustment: variantForm.priceAdjustment,
              stockQuantity: variantForm.stockQuantity,
              imageUrl: variantForm.imageUrl,
            }),
          })
          const data = await res.json()
          if (res.ok) {
            toast({ title: 'Variant Added', description: 'New variant has been created' })
            openVariantModal(selectedProductForVariants)
          } else {
            toast({ title: 'Error', description: data.error, variant: 'destructive' })
          }
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
      }
      setSaving(false)
    }

    const handleDeleteVariant = async (variantId: string) => {
      if (!confirm('Are you sure you want to delete this variant?')) return
      
      try {
        const res = await fetch(`/api/products?variantId=${variantId}`, { method: 'DELETE' })
        const data = await res.json()
        if (res.ok) {
          toast({ title: 'Variant Deleted', description: 'Variant has been removed' })
          if (selectedProductForVariants) openVariantModal(selectedProductForVariants)
        } else {
          toast({ title: 'Error', description: data.error, variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete variant', variant: 'destructive' })
      }
    }

    // Bulk edit
    const handleBulkEdit = async () => {
      if (selectedProducts.length === 0) {
        toast({ title: 'Error', description: 'Please select products to edit', variant: 'destructive' })
        return
      }

      setSaving(true)
      try {
        // Update each selected product
        for (const productId of selectedProducts) {
          const updateData: Record<string, unknown> = { productId }
          if (bulkEditForm.status) updateData.status = bulkEditForm.status
          if (bulkEditForm.categoryId) updateData.categoryId = bulkEditForm.categoryId
          if (bulkEditForm.freeShipping !== '') updateData.freeShipping = bulkEditForm.freeShipping === 'true'
          
          await fetch('/api/products', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
          })
        }
        
        toast({ title: 'Bulk Update Complete', description: `${selectedProducts.length} products updated` })
        setSelectedProducts([])
        setShowBulkEditModal(false)
        fetchSellerProducts()
      } catch (error) {
        toast({ title: 'Error', description: 'Bulk update failed', variant: 'destructive' })
      }
      setSaving(false)
    }

    // Export to CSV
    const handleExportCSV = () => {
      const headers = ['SKU', 'Name', 'Status', 'Price', 'Compare Price', 'Stock', 'Category', 'Free Shipping']
      const rows = sellerProducts.map(p => [
        p.sku,
        `"${p.name.replace(/"/g, '""')}"`,
        p.status,
        p.basePrice,
        p.compareAtPrice || '',
        p.stockQuantity,
        p.category?.name || '',
        p.freeShipping ? 'Yes' : 'No'
      ])

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `products-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      
      toast({ title: 'Export Complete', description: `${sellerProducts.length} products exported to CSV` })
    }

    // Import from CSV
    const handleImportCSV = async () => {
      if (!importData.trim()) {
        toast({ title: 'Error', description: 'Please paste CSV data', variant: 'destructive' })
        return
      }

      setImporting(true)
      try {
        const lines = importData.trim().split('\n')
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
        
        let imported = 0
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',')
          const product: Record<string, string> = {}
          headers.forEach((h, idx) => product[h] = values[idx]?.trim() || '')

          if (product.name && product.price) {
            await fetch('/api/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: product.name.replace(/"/g, ''),
                sku: product.sku || `SKU-${Date.now()}-${i}`,
                basePrice: parseFloat(product.price) || 0,
                compareAtPrice: product['compare price'] ? parseFloat(product['compare price']) : null,
                stockQuantity: parseInt(product.stock) || 0,
                status: product.status || 'DRAFT',
                freeShipping: product['free shipping']?.toLowerCase() === 'yes',
              }),
            })
            imported++
          }
        }

        toast({ title: 'Import Complete', description: `${imported} products imported` })
        setShowImportModal(false)
        setImportData('')
        fetchSellerProducts()
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to import products', variant: 'destructive' })
      }
      setImporting(false)
    }

    // Toggle product selection for bulk edit
    const toggleProductSelection = (productId: string) => {
      setSelectedProducts(prev => 
        prev.includes(productId) 
          ? prev.filter(id => id !== productId) 
          : [...prev, productId]
      )
    }

    const toggleSelectAll = () => {
      if (selectedProducts.length === filteredProducts.length) {
        setSelectedProducts([])
      } else {
        setSelectedProducts(filteredProducts.map(p => p.id))
      }
    }

    // Filter and sort products
    const filteredProducts = sellerProducts
      .filter(p => statusFilter === 'all' || p.status === statusFilter)
      .filter(p => {
        if (stockFilter === 'all') return true
        if (stockFilter === 'low') return p.stockQuantity > 0 && p.stockQuantity < 10
        if (stockFilter === 'out') return p.stockQuantity <= 0
        if (stockFilter === 'in') return p.stockQuantity > 0
        return true
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'price-high': return b.basePrice - a.basePrice
          case 'price-low': return a.basePrice - b.basePrice
          case 'stock-low': return a.stockQuantity - b.stockQuantity
          case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
      })

    // Fetch data on mount
    useEffect(() => {
      fetchSellerProducts()
    }, [user?.sellerProfile?.id])

    return (
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">My Products</h1>
            <p className="text-muted-foreground">{sellerProducts.length} products</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="h-4 w-4 mr-2" /> Import
            </Button>
            {selectedProducts.length > 0 && (
              <Button variant="outline" onClick={() => setShowBulkEditModal(true)}>
                <Edit className="h-4 w-4 mr-2" /> Edit {selectedProducts.length} Selected
              </Button>
            )}
            <Button onClick={openAddProduct} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>
          </div>
        </div>

        {/* Inventory Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <Package className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold text-blue-600">{inventorySummary.total}</p>
              <p className="text-sm text-muted-foreground">Total Products</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
              <p className="text-2xl font-bold text-emerald-600">{inventorySummary.inStock}</p>
              <p className="text-sm text-muted-foreground">In Stock</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <p className="text-2xl font-bold text-orange-600">{inventorySummary.lowStock}</p>
              <p className="text-sm text-muted-foreground">Low Stock</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 text-center">
              <XCircle className="h-8 w-8 mx-auto mb-2 text-red-600" />
              <p className="text-2xl font-bold text-red-600">{inventorySummary.outOfStock}</p>
              <p className="text-sm text-muted-foreground">Out of Stock</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="LIVE">Live</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PENDING">Pending Review</SelectItem>
            </SelectContent>
          </Select>
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Stock" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="in">In Stock</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="stock-low">Stock: Low to High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredProducts.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              {/* Select All Header */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 border-b">
                <input
                  type="checkbox"
                  checked={selectedProducts.length === filteredProducts.length}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-muted-foreground">
                  {selectedProducts.length > 0 ? `${selectedProducts.length} selected` : 'Select all'}
                </span>
              </div>
              <div className="divide-y">
                {filteredProducts.map((product) => (
                  <div key={product.id} className={`flex items-center gap-4 p-4 hover:bg-slate-50 ${selectedProducts.includes(product.id) ? 'bg-emerald-50' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => toggleProductSelection(product.id)}
                      className="rounded border-slate-300"
                    />
                    <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                      {product.primaryImageUrl ? (
                        <img src={product.primaryImageUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="h-10 w-10 text-slate-200" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium line-clamp-1">{product.name}</h3>
                        {product.stockQuantity <= 0 && (
                          <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                        )}
                        {product.stockQuantity > 0 && product.stockQuantity < 10 && (
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">Low Stock</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm">
                          Stock: <span className={product.stockQuantity < 10 ? 'text-orange-600 font-medium' : ''}>{product.stockQuantity}</span>
                        </span>
                        <span className="font-bold text-emerald-600">{formatPrice(product.basePrice)}</span>
                        {product.compareAtPrice && <span className="text-sm text-muted-foreground line-through">{formatPrice(product.compareAtPrice)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant={product.status === 'LIVE' ? 'default' : 'outline'}
                        size="sm"
                        className={product.status === 'LIVE' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                        onClick={() => handleToggleStatus(product)}
                      >
                        {product.status === 'LIVE' ? 'LIVE' : 'DRAFT'}
                      </Button>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditProduct(product)} title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openVariantModal(product)} title="Variants">
                          <Layers className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteProduct(product.id)} title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-16">
            <Package className="h-24 w-24 mx-auto text-slate-200 mb-4" />
            <h3 className="text-xl font-medium mb-2">No products found</h3>
            <p className="text-muted-foreground mb-4">
              {statusFilter !== 'all' || stockFilter !== 'all' ? 'Try changing the filters' : 'Add your first product to get started'}
            </p>
            <Button onClick={openAddProduct}>
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>
          </div>
        )}

        {/* Product Modal */}
        <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
              <DialogDescription>Fill in the product details below</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Image Upload */}
              <div>
                <Label>Product Image</Label>
                <div className="mt-1.5 flex items-center gap-4">
                  <div className="w-24 h-24 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden">
                    {productForm.primaryImageUrl ? (
                      <img src={productForm.primaryImageUrl} alt="Product" className="w-full h-full object-cover" />
                    ) : (
                      <Image className="h-10 w-10 text-slate-300" aria-hidden="true" alt="" />
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="product-image-upload"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => document.getElementById('product-image-upload')?.click()}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? 'Uploading...' : 'Upload Image'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Product Name *</Label><Input value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="mt-1.5" placeholder="Enter product name" /></div>
                <div><Label>SKU</Label><Input value={productForm.sku} onChange={e => setProductForm({...productForm, sku: e.target.value})} className="mt-1.5" placeholder="Auto-generated if empty" /></div>
              </div>
              <div><Label>Description</Label><Textarea value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} className="mt-1.5" rows={3} placeholder="Product description" /></div>
              <div className="grid md:grid-cols-4 gap-4">
                <div><Label>Price (PKR) *</Label><Input type="number" value={productForm.basePrice} onChange={e => setProductForm({...productForm, basePrice: e.target.value})} className="mt-1.5" placeholder="0" /></div>
                <div><Label>Compare at Price</Label><Input type="number" value={productForm.compareAtPrice} onChange={e => setProductForm({...productForm, compareAtPrice: e.target.value})} className="mt-1.5" placeholder="0" /></div>
                <div><Label>Stock Quantity</Label><Input type="number" value={productForm.stockQuantity} onChange={e => setProductForm({...productForm, stockQuantity: e.target.value})} className="mt-1.5" placeholder="0" /></div>
                <div><Label>Low Stock Alert</Label><Input type="number" value={productForm.lowStockThreshold} onChange={e => setProductForm({...productForm, lowStockThreshold: e.target.value})} className="mt-1.5" placeholder="10" /></div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Category</Label>
                  <Select value={productForm.categoryId} onValueChange={v => setProductForm({...productForm, categoryId: v})}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Status</Label>
                  <Select value={productForm.status} onValueChange={v => setProductForm({...productForm, status: v})}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="PENDING">Submit for Review</SelectItem>
                      <SelectItem value="LIVE">Live</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch checked={productForm.freeShipping} onCheckedChange={v => setProductForm({...productForm, freeShipping: v, shippingFee: v ? '0' : productForm.shippingFee})} />
                  <Label>Free Shipping</Label>
                </div>
                {!productForm.freeShipping && (
                  <div className="flex items-center gap-2">
                    <Label>Shipping Fee:</Label>
                    <Input type="number" value={productForm.shippingFee} onChange={e => setProductForm({...productForm, shippingFee: e.target.value})} className="w-24" />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowProductModal(false)}>Cancel</Button>
              <Button onClick={handleSaveProduct} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Variant Modal */}
        <Dialog open={showVariantModal} onOpenChange={setShowVariantModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Variants - {selectedProductForVariants?.name}</DialogTitle>
              <DialogDescription>Add product variations like size, color, etc.</DialogDescription>
            </DialogHeader>
            
            {/* Existing Variants */}
            <div className="py-4">
              {productVariants.length > 0 ? (
                <div className="space-y-2 mb-4">
                  <Label>Existing Variants</Label>
                  {productVariants.map((variant: any) => (
                    <div key={variant.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium">{variant.sku}</p>
                        <p className="text-sm text-muted-foreground">
                          {Object.entries(variant.attributes || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}
                        </p>
                        <p className="text-sm">Stock: {variant.stockQuantity} | Price Adj: {formatPrice(variant.priceAdjustment || 0)}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setEditingVariant(variant)
                          setVariantForm({
                            sku: variant.sku,
                            attributes: JSON.stringify(variant.attributes || {}),
                            priceAdjustment: String(variant.priceAdjustment || 0),
                            stockQuantity: String(variant.stockQuantity || 0),
                            imageUrl: variant.imageUrl || ''
                          })
                        }}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteVariant(variant.id)}>Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No variants yet. Add your first variant below.</p>
              )}

              {/* Add/Edit Variant Form */}
              <Separator className="my-4" />
              <div className="space-y-4">
                <h4 className="font-medium">{editingVariant ? 'Edit Variant' : 'Add New Variant'}</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div><Label>Variant SKU</Label><Input value={variantForm.sku} onChange={e => setVariantForm({...variantForm, sku: e.target.value})} className="mt-1.5" placeholder="e.g., PROD-RED-L" /></div>
                  <div><Label>Attributes (JSON)</Label><Input value={variantForm.attributes} onChange={e => setVariantForm({...variantForm, attributes: e.target.value})} className="mt-1.5" placeholder='{"color": "red", "size": "L"}' /></div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div><Label>Price Adjustment</Label><Input type="number" value={variantForm.priceAdjustment} onChange={e => setVariantForm({...variantForm, priceAdjustment: e.target.value})} className="mt-1.5" placeholder="0" /></div>
                  <div><Label>Stock Quantity</Label><Input type="number" value={variantForm.stockQuantity} onChange={e => setVariantForm({...variantForm, stockQuantity: e.target.value})} className="mt-1.5" placeholder="0" /></div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveVariant} disabled={saving}>
                    {saving ? 'Saving...' : editingVariant ? 'Update Variant' : 'Add Variant'}
                  </Button>
                  {editingVariant && (
                    <Button variant="outline" onClick={() => {
                      setEditingVariant(null)
                      setVariantForm({ sku: '', attributes: '{}', priceAdjustment: '0', stockQuantity: '0', imageUrl: '' })
                    }}>Cancel Edit</Button>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Edit Modal */}
        <Dialog open={showBulkEditModal} onOpenChange={setShowBulkEditModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Edit {selectedProducts.length} Products</DialogTitle>
              <DialogDescription>Apply changes to all selected products</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Change Status</Label>
                <Select value={bulkEditForm.status} onValueChange={v => setBulkEditForm({...bulkEditForm, status: v})}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Keep current" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Keep current</SelectItem>
                    <SelectItem value="LIVE">Live</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Change Category</Label>
                <Select value={bulkEditForm.categoryId} onValueChange={v => setBulkEditForm({...bulkEditForm, categoryId: v})}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Keep current" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Keep current</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Free Shipping</Label>
                <Select value={bulkEditForm.freeShipping} onValueChange={v => setBulkEditForm({...bulkEditForm, freeShipping: v})}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Keep current" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Keep current</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkEditModal(false)}>Cancel</Button>
              <Button onClick={handleBulkEdit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? 'Updating...' : 'Apply Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Modal */}
        <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import Products from CSV</DialogTitle>
              <DialogDescription>Paste your CSV data below. Format: SKU, Name, Status, Price, Compare Price, Stock, Category, Free Shipping</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                value={importData}
                onChange={e => setImportData(e.target.value)}
                rows={10}
                placeholder="sku,name,status,price,compare price,stock,category,free shipping&#10;SKU-001,Product Name,DRAFT,1000,1500,50,Electronics,Yes"
                className="font-mono text-sm"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowImportModal(false); setImportData('') }}>Cancel</Button>
              <Button onClick={handleImportCSV} disabled={importing} className="bg-emerald-600 hover:bg-emerald-700">
                {importing ? 'Importing...' : 'Import Products'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  function SellerOrders() {
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
    const [showOrderModal, setShowOrderModal] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [trackingNumber, setTrackingNumber] = useState('')
    const [courierName, setCourierName] = useState('')
    const [updating, setUpdating] = useState(false)

    const fetchSellerOrders = async () => {
      if (!user?.sellerProfile?.id) return
      try {
        const res = await fetch(`/api/orders?sellerId=${user.sellerProfile?.id}`)
        if (res.ok) {
          const data = await res.json()
          setSellerOrders(data.orders || [])
        }
      } catch (error) {
        console.error('Failed to fetch seller orders:', error)
      }
    }

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
      setUpdating(true)
      try {
        const res = await fetch('/api/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, status: newStatus }),
        })
        const data = await res.json()
        if (res.ok) {
          setSellerOrders(sellerOrders.map(o => o.id === orderId ? {...o, status: newStatus} : o))
          toast({ title: 'Order Updated', description: `Order status changed to ${newStatus}` })
          fetchSellerOrders()
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to update order', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to update order', variant: 'destructive' })
      }
      setUpdating(false)
    }

    const handleAddTracking = async () => {
      if (!selectedOrder || !trackingNumber) return
      
      setUpdating(true)
      try {
        const res = await fetch('/api/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            orderId: selectedOrder.id, 
            trackingNumber,
            courierName: courierName || 'Standard Courier',
            status: 'SHIPPED'
          }),
        })
        const data = await res.json()
        if (res.ok) {
          toast({ title: 'Tracking Added', description: 'Order has been marked as shipped' })
          setTrackingNumber('')
          setCourierName('')
          setShowOrderModal(false)
          fetchSellerOrders()
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to add tracking', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to add tracking', variant: 'destructive' })
      }
      setUpdating(false)
    }

    const openOrderDetails = (order: Order) => {
      setSelectedOrder(order)
      setTrackingNumber('')
      setCourierName('')
      setShowOrderModal(true)
    }

    const handlePrintInvoice = (order: Order) => {
      // Create a printable invoice
      const invoiceContent = `
        <html>
        <head>
          <title>Invoice - ${order.orderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #10b981; padding-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #10b981; }
            .invoice-title { font-size: 20px; margin-top: 10px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .info-box { padding: 15px; background: #f5f5f5; border-radius: 8px; }
            .info-box h3 { margin: 0 0 10px 0; color: #333; font-size: 14px; }
            .info-box p { margin: 5px 0; font-size: 13px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #10b981; color: white; padding: 12px; text-align: left; }
            td { padding: 12px; border-bottom: 1px solid #eee; }
            .total-row { font-weight: bold; background: #f5f5f5; }
            .footer { text-align: center; margin-top: 40px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">LUMINVERA</div>
            <div class="invoice-title">INVOICE</div>
          </div>
          
          <div class="info-grid">
            <div class="info-box">
              <h3>Order Details</h3>
              <p><strong>Order #:</strong> ${order.orderNumber}</p>
              <p><strong>Date:</strong> ${formatDate(order.placedAt)}</p>
              <p><strong>Status:</strong> ${order.status}</p>
              <p><strong>Payment:</strong> ${order.paymentMethod}</p>
            </div>
            <div class="info-box">
              <h3>Shipping Address</h3>
              <p><strong>Name:</strong> ${order.shippingRecipientName}</p>
              <p><strong>Phone:</strong> ${order.shippingPhone}</p>
              <p><strong>Address:</strong> ${order.shippingStreetAddress}</p>
              <p><strong>City:</strong> ${order.shippingCity}</p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>${item.productName}</td>
                  <td>${item.productSku}</td>
                  <td>${item.quantity}</td>
                  <td>${formatPrice(item.unitPrice)}</td>
                  <td>${formatPrice(item.totalPrice)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4">Subtotal</td>
                <td>${formatPrice(order.subtotal)}</td>
              </tr>
              <tr>
                <td colspan="4">Delivery Fee</td>
                <td>${formatPrice(order.deliveryFee)}</td>
              </tr>
              ${order.discount > 0 ? `
                <tr>
                  <td colspan="4">Discount</td>
                  <td>-${formatPrice(order.discount)}</td>
                </tr>
              ` : ''}
              <tr class="total-row">
                <td colspan="4">Total</td>
                <td>${formatPrice(order.total)}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="footer">
            <p>Thank you for shopping with Luminvera!</p>
            <p>Store: ${user?.sellerProfile?.storeName || 'Luminvera Seller'}</p>
          </div>
        </body>
        </html>
      `
      
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(invoiceContent)
        printWindow.document.close()
        printWindow.print()
      }
    }

    const statusTabs = [
      { key: 'all', label: 'All', count: sellerOrders.length },
      { key: 'PLACED', label: 'New', count: sellerOrders.filter(o => o.status === 'PLACED').length },
      { key: 'CONFIRMED', label: 'Confirmed', count: sellerOrders.filter(o => o.status === 'CONFIRMED').length },
      { key: 'SHIPPED', label: 'Shipped', count: sellerOrders.filter(o => o.status === 'SHIPPED').length },
      { key: 'DELIVERED', label: 'Delivered', count: sellerOrders.filter(o => o.status === 'DELIVERED').length },
    ]

    const filteredOrders = sellerOrders.filter(o => 
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.shippingRecipientName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Orders Management</h1>
          <div className="flex gap-2">
            <Input 
              placeholder="Search orders..." 
              className="w-64" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button variant="outline" onClick={fetchSellerOrders}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {statusTabs.map((tab) => (
            <Card key={tab.key} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{tab.count}</p>
                <p className="text-sm text-muted-foreground">{tab.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            {statusTabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>{tab.label} ({tab.count})</TabsTrigger>
            ))}
          </TabsList>
          
          {statusTabs.map((tab) => (
            <TabsContent key={tab.key} value={tab.key}>
              {filteredOrders.filter(o => tab.key === 'all' || o.status === tab.key).length > 0 ? (
                <div className="space-y-4">
                  {filteredOrders.filter(o => tab.key === 'all' || o.status === tab.key).map((order) => (
                    <Card key={order.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold">{order.orderNumber}</p>
                            <p className="text-sm text-muted-foreground">{formatDate(order.placedAt)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                            <Button variant="ghost" size="icon" onClick={() => handlePrintInvoice(order)}>
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Customer Info */}
                        <div className="flex items-center gap-4 mb-3 p-3 bg-slate-50 rounded-lg">
                          <Avatar className="h-10 w-10"><AvatarFallback>{order.shippingRecipientName[0]}</AvatarFallback></Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{order.shippingRecipientName}</p>
                            <p className="text-sm text-muted-foreground">{order.shippingPhone}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">{order.shippingCity}</p>
                            <p className="text-xs text-muted-foreground">{order.paymentMethod}</p>
                          </div>
                        </div>

                        {/* Items Preview */}
                        <div className="flex items-center gap-3 mb-3">
                          {order.items.slice(0, 3).map((item, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                                <Package className="h-5 w-5 text-slate-300" />
                              </div>
                              <div>
                                <p className="font-medium line-clamp-1 max-w-32">{item.productName}</p>
                                <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                              </div>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <Badge variant="secondary">+{order.items.length - 3} more</Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t">
                          <div>
                            <p className="text-sm text-muted-foreground">{order.items.length} items</p>
                            <p className="font-bold text-lg text-emerald-600">{formatPrice(order.total)}</p>
                          </div>
                          <div className="flex gap-2">
                            {order.status === 'PLACED' && (
                              <Button 
                                size="sm" 
                                onClick={() => updateOrderStatus(order.id, 'CONFIRMED')}
                                disabled={updating}
                                className="bg-emerald-600 hover:bg-emerald-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" /> Confirm
                              </Button>
                            )}
                            {order.status === 'CONFIRMED' && (
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setSelectedOrder(order)
                                  setShowOrderModal(true)
                                }}
                                disabled={updating}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Truck className="h-4 w-4 mr-1" /> Ship
                              </Button>
                            )}
                            {order.status === 'SHIPPED' && (
                              <Button 
                                size="sm" 
                                onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                                disabled={updating}
                                className="bg-emerald-600 hover:bg-emerald-700"
                              >
                                <CheckCheck className="h-4 w-4 mr-1" /> Delivered
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => openOrderDetails(order)}>
                              <Eye className="h-4 w-4 mr-1" /> Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Package className="h-24 w-24 mx-auto text-slate-200 mb-4" />
                  <h3 className="text-xl font-medium mb-2">No orders found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Try a different search term' : 'Orders will appear here when customers place them'}
                  </p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Order Details Modal */}
        <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Order {selectedOrder?.orderNumber}</span>
                {selectedOrder && (
                  <Button variant="outline" size="sm" onClick={() => handlePrintInvoice(selectedOrder)}>
                    <Printer className="h-4 w-4 mr-1" /> Print Invoice
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                {/* Order Timeline */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Order Timeline</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      {['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED'].map((status, i) => {
                        const currentIndex = ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED'].indexOf(selectedOrder.status)
                        const isActive = i <= currentIndex
                        return (
                          <div key={status} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                              {isActive ? <Check className="h-4 w-4" /> : i + 1}
                            </div>
                            <span className={`ml-2 text-xs ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>{status}</span>
                            {i < 3 && <div className={`w-12 h-1 mx-2 ${isActive && i < currentIndex ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Tracking Input for Confirmed Orders */}
                {selectedOrder.status === 'CONFIRMED' && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Truck className="h-4 w-4" /> Add Tracking Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Courier Name</Label>
                          <Select value={courierName} onValueChange={setCourierName}>
                            <SelectTrigger className="mt-1.5">
                              <SelectValue placeholder="Select courier" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Leopards">Leopards Courier</SelectItem>
                              <SelectItem value="TCS">TCS Express</SelectItem>
                              <SelectItem value="M&P">M&P Courier</SelectItem>
                              <SelectItem value="Daewoo">Daewoo Express</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Tracking Number *</Label>
                          <Input 
                            className="mt-1.5"
                            placeholder="Enter tracking number"
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                          />
                        </div>
                      </div>
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700" 
                        onClick={handleAddTracking}
                        disabled={!trackingNumber || updating}
                      >
                        {updating ? 'Updating...' : 'Mark as Shipped'}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Items */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Order Items</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {selectedOrder.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
                          <Package className="h-6 w-6 text-slate-300" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-muted-foreground">SKU: {item.productSku}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">x{item.quantity}</p>
                          <p className="font-medium">{formatPrice(item.totalPrice)}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Shipping Address */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Shipping Address</CardTitle></CardHeader>
                  <CardContent>
                    <p className="font-medium">{selectedOrder.shippingRecipientName}</p>
                    <p className="text-sm text-muted-foreground">{selectedOrder.shippingPhone}</p>
                    <p className="text-sm text-muted-foreground">{selectedOrder.shippingStreetAddress}, {selectedOrder.shippingCity}</p>
                  </CardContent>
                </Card>

                {/* Order Summary */}
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatPrice(selectedOrder.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivery Fee</span>
                        <span>{formatPrice(selectedOrder.deliveryFee)}</span>
                      </div>
                      {selectedOrder.discount > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Discount</span>
                          <span>-{formatPrice(selectedOrder.discount)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span className="text-emerald-600">{formatPrice(selectedOrder.total)}</span>
                      </div>
                      <div className="flex justify-between pt-2">
                        <span className="text-muted-foreground">Payment Method</span>
                        <span>{selectedOrder.paymentMethod}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  function SellerAnalytics() {
    const [period, setPeriod] = useState('7d')
    const [analyticsData, setAnalyticsData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)

    // Fetch seller analytics
    useEffect(() => {
      const fetchAnalytics = async () => {
        if (!user?.sellerProfile?.id) return
        
        setLoading(true)
        try {
          const res = await fetch(`/api/analytics?type=seller&sellerId=${user.sellerProfile.id}&period=${period}`)
          if (res.ok) {
            const data = await res.json()
            setAnalyticsData(data)
          }
        } catch (error) {
          console.error('Failed to fetch seller analytics:', error)
          toast({ title: 'Error', description: 'Failed to load analytics', variant: 'destructive' })
        }
        setLoading(false)
      }

      fetchAnalytics()
    }, [user?.sellerProfile?.id, period])

    // Export analytics to CSV
    const handleExport = async () => {
      if (!analyticsData) return
      
      setExporting(true)
      try {
        const csvRows = [
          ['Metric', 'Value'],
          ['Period', analyticsData.periodLabel || period],
          ['Total Revenue', analyticsData.period?.revenue || 0],
          ['Total Orders', analyticsData.period?.orders || 0],
          ['Delivered Orders', analyticsData.period?.deliveredOrders || 0],
          ['Average Order Value', analyticsData.metrics?.averageOrderValue || 0],
          ['Total Views', analyticsData.metrics?.totalViews || 0],
          ['Total Purchases', analyticsData.metrics?.totalPurchases || 0],
          ['Conversion Rate', analyticsData.metrics?.conversionRate || '0%'],
          ['Low Stock Products', analyticsData.inventory?.lowStock || 0],
          ['Out of Stock Products', analyticsData.inventory?.outOfStock || 0],
          '',
          ['Top Products'],
          ['Product Name', 'SKU', 'Sold', 'Revenue'],
          ...(analyticsData.topProducts || []).map((p: any) => [p.name, p.sku, p.purchase_count, p.base_price * (p.purchase_count || 0)])
        ]

        const csvContent = csvRows.map(row => row.join(',')).join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `seller-analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
        
        toast({ title: 'Export Complete', description: 'Analytics data exported to CSV' })
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to export data', variant: 'destructive' })
      }
      setExporting(false)
    }

    // Get revenue chart data
    const revenueChart = analyticsData?.revenueChart || []
    const maxRevenue = Math.max(...revenueChart.map((d: any) => d.revenue), 1)
    const maxOrders = Math.max(...revenueChart.map((d: any) => d.orders), 1)

    // Key metrics
    const metrics = [
      { 
        label: 'Total Revenue', 
        value: formatPrice(analyticsData?.period?.revenue || 0), 
        change: analyticsData?.period?.orders ? `${analyticsData.period.orders} orders` : 'No orders', 
        trend: 'up', 
        icon: DollarSign 
      },
      { 
        label: 'Orders', 
        value: String(analyticsData?.period?.orders || 0), 
        change: `${analyticsData?.period?.deliveredOrders || 0} delivered`, 
        trend: 'up', 
        icon: ShoppingBag 
      },
      { 
        label: 'Avg. Order Value', 
        value: formatPrice(analyticsData?.metrics?.averageOrderValue || 0), 
        change: 'per order', 
        trend: 'up', 
        icon: TrendingUp 
      },
      { 
        label: 'Conversion Rate', 
        value: `${analyticsData?.metrics?.conversionRate || 0}%`, 
        change: `${analyticsData?.metrics?.totalViews || 0} views`, 
        trend: 'up', 
        icon: Activity 
      },
    ]

    // Traffic sources from API
    const trafficSources = analyticsData?.trafficSources || [
      { source: 'Direct', percentage: 35, sessions: 0 },
      { source: 'Search', percentage: 28, sessions: 0 },
      { source: 'Category', percentage: 22, sessions: 0 },
      { source: 'Social', percentage: 10, sessions: 0 },
      { source: 'Referral', percentage: 5, sessions: 0 }
    ]

    const trafficColors: Record<string, string> = {
      'Direct': 'bg-emerald-500',
      'Search': 'bg-blue-500',
      'Category': 'bg-purple-500',
      'Social': 'bg-pink-500',
      'Referral': 'bg-orange-500'
    }

    if (loading) {
      return (
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-96">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Analytics & Insights</h1>
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="1y">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport} disabled={exporting}>
              <Download className="h-4 w-4 mr-2" /> {exporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {metrics.map((metric, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <metric.icon className="h-5 w-5 text-muted-foreground" />
                  <Badge className="bg-emerald-100 text-emerald-800">
                    {metric.change}
                  </Badge>
                </div>
                <p className="text-2xl font-bold">{metric.value}</p>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Inventory Alerts */}
        {(analyticsData?.inventory?.lowStock > 0 || analyticsData?.inventory?.outOfStock > 0) && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <AlertTriangle className="h-8 w-8 text-orange-500" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-800">Inventory Alert</h3>
                  <p className="text-sm text-orange-700">
                    {analyticsData?.inventory?.outOfStock > 0 && `${analyticsData.inventory.outOfStock} products out of stock. `}
                    {analyticsData?.inventory?.lowStock > 0 && `${analyticsData.inventory.lowStock} products low on stock.`}
                  </p>
                </div>
                <Button variant="outline" onClick={() => setCurrentView('seller-products')}>
                  View Products
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Revenue Overview</CardTitle>
                <Badge variant="outline">{period.replace('_', ' ')}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {revenueChart.length > 0 ? (
                <>
                  <div className="h-64 flex items-end justify-between gap-1 px-2">
                    {revenueChart.slice(-14).map((data: any, i: number) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div 
                          className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t transition-all hover:from-emerald-600 hover:to-emerald-500 cursor-pointer"
                          style={{ height: `${Math.max((data.revenue / maxRevenue) * 180, 4)}px` }}
                          title={`${formatPrice(data.revenue)} - ${data.orders} orders`}
                        />
                        {i % 2 === 0 && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(data.date).toLocaleDateString('en-US', { day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-emerald-500" />
                      <span>Revenue</span>
                    </div>
                    <span className="text-muted-foreground">Total: {formatPrice(analyticsData?.period?.revenue || 0)}</span>
                  </div>
                </>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No revenue data for this period
                </div>
              )}
            </CardContent>
          </Card>

          {/* Orders Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Orders Trend</CardTitle>
                <Badge variant="outline">{analyticsData?.period?.orders || 0} orders</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {revenueChart.length > 0 ? (
                <>
                  <div className="h-64 flex items-end justify-between gap-1 px-2">
                    {revenueChart.slice(-14).map((data: any, i: number) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div 
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all hover:from-blue-600 hover:to-blue-500 cursor-pointer"
                          style={{ height: `${Math.max((data.orders / maxOrders) * 180, 4)}px` }}
                          title={`${data.orders} orders - ${formatPrice(data.revenue)}`}
                        />
                        {i % 2 === 0 && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(data.date).toLocaleDateString('en-US', { day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-blue-500" />
                      <span>Orders</span>
                    </div>
                    <span className="text-muted-foreground">
                      {analyticsData?.period?.deliveredOrders || 0} delivered
                    </span>
                  </div>
                </>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No order data for this period
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Top Products */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Top Selling Products</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setCurrentView('seller-products')}>
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {analyticsData?.topProducts?.length > 0 ? (
                <div className="space-y-4">
                  {analyticsData.topProducts.slice(0, 5).map((product: any, i: number) => (
                    <div key={product.id} className="flex items-center gap-4">
                      <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Package className="h-6 w-6 text-slate-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium line-clamp-1">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.purchase_count || 0} sold • Stock: {product.stock_quantity || 0}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">
                          {formatPrice((product.purchase_count || 0) * (product.base_price || 0))}
                        </p>
                        <div className="flex items-center justify-end gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs">{product.average_rating?.toFixed(1) || '0.0'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No product sales data available</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setCurrentView('seller-products')}>
                    Add Products
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Traffic Sources */}
          <Card>
            <CardHeader><CardTitle>Traffic Sources</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {trafficSources.map((item: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{item.source}</span>
                    <span className="font-medium">{item.percentage}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${trafficColors[item.source] || 'bg-gray-500'} rounded-full transition-all`} 
                      style={{ width: `${item.percentage}%` }} 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{item.sessions || 0} sessions</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Order Status Breakdown */}
        {analyticsData?.orderStatusBreakdown && Object.keys(analyticsData.orderStatusBreakdown).length > 0 && (
          <Card className="mt-6">
            <CardHeader><CardTitle>Order Status Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(analyticsData.orderStatusBreakdown).map(([status, count]) => (
                  <div key={status} className="text-center p-4 bg-slate-50 rounded-xl">
                    <p className="text-2xl font-bold">{count as number}</p>
                    <Badge className={getStatusColor(status)}>{status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Performance Metrics */}
        <Card className="mt-6">
          <CardHeader><CardTitle>Performance Metrics</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { label: 'Total Products', value: analyticsData?.inventory?.totalProducts || sellerProducts.length, suffix: '' },
                { label: 'Low Stock', value: analyticsData?.inventory?.lowStock || 0, suffix: 'products' },
                { label: 'Out of Stock', value: analyticsData?.inventory?.outOfStock || 0, suffix: 'products' },
                { label: 'Avg. Order Value', value: analyticsData?.metrics?.averageOrderValue || 0, suffix: 'PKR' },
              ].map((metric, i) => (
                <div key={i} className="text-center">
                  <p className="text-3xl font-bold text-emerald-600">{metric.value}</p>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  {metric.suffix && <p className="text-xs text-muted-foreground">{metric.suffix}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  function SellerSettings() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [storeForm, setStoreForm] = useState({
      storeName: '',
      storeSlug: '',
      description: '',
      phone: '',
      email: '',
      address: '',
      logoUrl: ''
    })
    const [bankForm, setBankForm] = useState({
      bankName: '',
      accountTitle: '',
      accountNumber: '',
      iban: '',
      jazzCashNumber: '',
      easypaisaNumber: ''
    })
    const [policies, setPolicies] = useState({
      returnPolicy: '',
      shippingPolicy: '',
      warrantyPolicy: ''
    })
    const [storeStatus, setStoreStatus] = useState({
      isActive: true,
      acceptOrders: true,
      showInSearch: true
    })
    const [sellerData, setSellerData] = useState<any>(null)

    // Fetch seller settings on mount
    useEffect(() => {
      const fetchSellerSettings = async () => {
        if (!user?.sellerProfile?.id) return
        
        setLoading(true)
        try {
          const res = await fetch(`/api/sellers?id=${user.sellerProfile.id}`)
          if (res.ok) {
            const data = await res.json()
            const seller = data.seller
            setSellerData(seller)
            
            // Populate form fields
            setStoreForm({
              storeName: seller.store_name || '',
              storeSlug: seller.store_slug || '',
              description: seller.store_description || '',
              phone: seller.business_phone || '',
              email: seller.business_email || '',
              address: seller.business_address || '',
              logoUrl: seller.store_logo_url || ''
            })
            
            setBankForm({
              bankName: seller.bank_name || '',
              accountTitle: seller.bank_account_title || '',
              accountNumber: seller.bank_account_number || '',
              iban: seller.iban || '',
              jazzCashNumber: seller.jazz_cash_number || '',
              easypaisaNumber: seller.easypaisa_number || ''
            })
            
            setPolicies({
              returnPolicy: seller.return_policy || '',
              shippingPolicy: seller.shipping_policy || '',
              warrantyPolicy: seller.warranty_policy || ''
            })
          }
        } catch (error) {
          console.error('Failed to fetch seller settings:', error)
          toast({ title: 'Error', description: 'Failed to load store settings', variant: 'destructive' })
        }
        setLoading(false)
      }

      fetchSellerSettings()
    }, [user?.sellerProfile?.id])

    // Save store profile
    const handleSaveProfile = async () => {
      if (!user?.sellerProfile?.id || !user?.id) return
      
      setSaving(true)
      try {
        const res = await fetch('/api/sellers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sellerId: user.sellerProfile.id,
            userId: user.id,
            store_name: storeForm.storeName,
            store_description: storeForm.description,
            business_phone: storeForm.phone,
            business_email: storeForm.email,
            store_logo_url: storeForm.logoUrl
          })
        })
        
        const data = await res.json()
        if (res.ok) {
          toast({ title: 'Settings Saved', description: 'Store profile updated successfully' })
          setSellerData(data.seller)
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to save settings', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' })
      }
      setSaving(false)
    }

    // Save payment settings
    const handleSavePayment = async () => {
      if (!user?.sellerProfile?.id || !user?.id) return
      
      setSaving(true)
      try {
        const res = await fetch('/api/sellers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sellerId: user.sellerProfile.id,
            userId: user.id,
            bank_name: bankForm.bankName,
            bank_account_title: bankForm.accountTitle,
            bank_account_number: bankForm.accountNumber,
            iban: bankForm.iban,
            jazz_cash_number: bankForm.jazzCashNumber,
            easypaisa_number: bankForm.easypaisaNumber
          })
        })
        
        const data = await res.json()
        if (res.ok) {
          toast({ title: 'Payment Info Updated', description: 'Bank details saved successfully' })
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to save payment info', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to save payment info', variant: 'destructive' })
      }
      setSaving(false)
    }

    // Save policies
    const handleSavePolicies = async () => {
      if (!user?.sellerProfile?.id || !user?.id) return
      
      setSaving(true)
      try {
        const res = await fetch('/api/sellers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sellerId: user.sellerProfile.id,
            userId: user.id,
            return_policy: policies.returnPolicy,
            shipping_policy: policies.shippingPolicy,
            warranty_policy: policies.warrantyPolicy
          })
        })
        
        const data = await res.json()
        if (res.ok) {
          toast({ title: 'Policies Updated', description: 'Store policies saved successfully' })
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to save policies', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to save policies', variant: 'destructive' })
      }
      setSaving(false)
    }

    // Handle logo upload
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      try {
        // Convert to base64 for demo (in production, use proper file storage)
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64 = reader.result as string
          setStoreForm({ ...storeForm, logoUrl: base64 })
        }
        reader.readAsDataURL(file)
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to upload logo', variant: 'destructive' })
      }
    }

    if (loading) {
      return (
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-96">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Store Settings</h1>
        
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Store Profile */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Store Profile</CardTitle>
                  <Badge className={sellerData?.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'}>
                    {sellerData?.status || 'PENDING'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="h-20 w-20">
                    {storeForm.logoUrl ? (
                      <AvatarImage src={storeForm.logoUrl} alt={storeForm.storeName} />
                    ) : (
                      <AvatarFallback className="text-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                        {storeForm.storeName?.substring(0, 2).toUpperCase() || 'ST'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="store-logo-upload"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => document.getElementById('store-logo-upload')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" /> Change Logo
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">Recommended: 200x200px, PNG or JPG</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Store Name</Label>
                    <Input 
                      value={storeForm.storeName} 
                      onChange={e => setStoreForm({...storeForm, storeName: e.target.value})} 
                      className="mt-1.5" 
                    />
                  </div>
                  <div>
                    <Label>Store Slug</Label>
                    <Input 
                      value={storeForm.storeSlug} 
                      className="mt-1.5 bg-slate-50" 
                      disabled 
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Contact Phone</Label>
                    <Input 
                      value={storeForm.phone} 
                      onChange={e => setStoreForm({...storeForm, phone: e.target.value})} 
                      className="mt-1.5"
                      placeholder="03XX-XXXXXXX"
                    />
                  </div>
                  <div>
                    <Label>Contact Email</Label>
                    <Input 
                      type="email"
                      value={storeForm.email} 
                      onChange={e => setStoreForm({...storeForm, email: e.target.value})} 
                      className="mt-1.5"
                      placeholder="store@example.com"
                    />
                  </div>
                </div>
                <div>
                  <Label>Store Description</Label>
                  <Textarea 
                    value={storeForm.description} 
                    onChange={e => setStoreForm({...storeForm, description: e.target.value})} 
                    className="mt-1.5" 
                    rows={3}
                    placeholder="Describe your store..."
                  />
                </div>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700" 
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>

            {/* Payment Settings */}
            <Card>
              <CardHeader><CardTitle>Payment Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Bank Name</Label>
                    <Select 
                      value={bankForm.bankName} 
                      onValueChange={v => setBankForm({...bankForm, bankName: v})}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select bank" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HBL">HBL</SelectItem>
                        <SelectItem value="UBL">UBL</SelectItem>
                        <SelectItem value="MCB">MCB Bank</SelectItem>
                        <SelectItem value="ABL">Allied Bank</SelectItem>
                        <SelectItem value="BankAlfalah">Bank Alfalah</SelectItem>
                        <SelectItem value="AskariBank">Askari Bank</SelectItem>
                        <SelectItem value="StandardChartered">Standard Chartered</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Account Title</Label>
                    <Input 
                      value={bankForm.accountTitle} 
                      onChange={e => setBankForm({...bankForm, accountTitle: e.target.value})} 
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Account Number</Label>
                    <Input 
                      value={bankForm.accountNumber} 
                      onChange={e => setBankForm({...bankForm, accountNumber: e.target.value})} 
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>IBAN</Label>
                    <Input 
                      value={bankForm.iban} 
                      onChange={e => setBankForm({...bankForm, iban: e.target.value})} 
                      className="mt-1.5"
                      placeholder="PK36HABB..."
                    />
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>JazzCash Number</Label>
                    <Input 
                      value={bankForm.jazzCashNumber} 
                      onChange={e => setBankForm({...bankForm, jazzCashNumber: e.target.value})} 
                      className="mt-1.5"
                      placeholder="03XX-XXXXXXX"
                    />
                  </div>
                  <div>
                    <Label>Easypaisa Number</Label>
                    <Input 
                      value={bankForm.easypaisaNumber} 
                      onChange={e => setBankForm({...bankForm, easypaisaNumber: e.target.value})} 
                      className="mt-1.5"
                      placeholder="03XX-XXXXXXX"
                    />
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleSavePayment}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Update Payment Info'}
                </Button>
              </CardContent>
            </Card>

            {/* Store Policies */}
            <Card>
              <CardHeader><CardTitle>Store Policies</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Return Policy</Label>
                  <Textarea 
                    value={policies.returnPolicy} 
                    onChange={e => setPolicies({...policies, returnPolicy: e.target.value})} 
                    className="mt-1.5" 
                    rows={2}
                    placeholder="e.g., 7-day easy returns on all products"
                  />
                </div>
                <div>
                  <Label>Shipping Policy</Label>
                  <Textarea 
                    value={policies.shippingPolicy} 
                    onChange={e => setPolicies({...policies, shippingPolicy: e.target.value})} 
                    className="mt-1.5" 
                    rows={2}
                    placeholder="e.g., Free shipping on orders above Rs. 5,000"
                  />
                </div>
                <div>
                  <Label>Warranty Policy</Label>
                  <Textarea 
                    value={policies.warrantyPolicy} 
                    onChange={e => setPolicies({...policies, warrantyPolicy: e.target.value})} 
                    className="mt-1.5" 
                    rows={2}
                    placeholder="e.g., Manufacturer warranty on all electronics"
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleSavePolicies}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Policies'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Store Stats */}
            <Card>
              <CardHeader><CardTitle>Store Performance</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{sellerData?.average_rating?.toFixed(1) || '0.0'}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{sellerData?.total_reviews || 0} reviews</span>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">{sellerData?.total_products || 0}</p>
                    <p className="text-sm text-muted-foreground">Products</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{sellerData?.total_orders || 0}</p>
                    <p className="text-sm text-muted-foreground">Orders</p>
                  </div>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                  <p className="text-xl font-bold text-emerald-600">{formatPrice(sellerData?.total_earnings || 0)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Store Status */}
            <Card>
              <CardHeader><CardTitle>Store Status</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Store Active</span>
                    <p className="text-xs text-muted-foreground">Your store is visible to customers</p>
                  </div>
                  <Switch 
                    checked={storeStatus.isActive}
                    onCheckedChange={v => setStoreStatus({...storeStatus, isActive: v})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Accept New Orders</span>
                    <p className="text-xs text-muted-foreground">Allow customers to place orders</p>
                  </div>
                  <Switch 
                    checked={storeStatus.acceptOrders}
                    onCheckedChange={v => setStoreStatus({...storeStatus, acceptOrders: v})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Show in Search</span>
                    <p className="text-xs text-muted-foreground">Appear in marketplace search</p>
                  </div>
                  <Switch 
                    checked={storeStatus.showInSearch}
                    onCheckedChange={v => setStoreStatus({...storeStatus, showInSearch: v})}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Commission Info */}
            <Card>
              <CardHeader><CardTitle>Commission & Fees</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Commission Rate</span>
                  <span className="font-medium">{sellerData?.commission_rate || 10}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Gateway Fee</span>
                  <span className="font-medium">2.5%</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium">Total Fees</span>
                  <span className="font-bold text-emerald-600">{((sellerData?.commission_rate || 10) + 2.5)}%</span>
                </div>
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>Available Balance:</strong> {formatPrice(sellerData?.available_balance || 0)}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    <strong>Pending Balance:</strong> {formatPrice(sellerData?.pending_balance || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => setCurrentView('seller-products')}>
                  <Package className="h-4 w-4 mr-2" /> Manage Products
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setCurrentView('seller-orders')}>
                  <ShoppingBag className="h-4 w-4 mr-2" /> View Orders
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setCurrentView('seller-analytics')}>
                  <BarChart3 className="h-4 w-4 mr-2" /> View Analytics
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // Admin Dashboard Pages
  // ============================================

  function AdminDashboard() {
    const [analyticsPeriod, setAnalyticsPeriod] = useState('this_month')
    const [analyticsData, setAnalyticsData] = useState<any>(null)
    const [analyticsLoading, setAnalyticsLoading] = useState(true)
    const [lowStockProducts, setLowStockProducts] = useState<any[]>([])
    const [recentOrders, setRecentOrders] = useState<any[]>([])
    const [disputedOrders, setDisputedOrders] = useState<any[]>([])

    // Fetch comprehensive analytics
    useEffect(() => {
      const fetchAnalytics = async () => {
        setAnalyticsLoading(true)
        try {
          const res = await fetch(`/api/analytics?type=platform&period=${analyticsPeriod}`)
          if (res.ok) {
            const data = await res.json()
            setAnalyticsData(data)
          }
        } catch (error) {
          console.error('Failed to fetch analytics:', error)
        }
        setAnalyticsLoading(false)
      }
      fetchAnalytics()
    }, [analyticsPeriod])

    // Fetch low stock products
    useEffect(() => {
      const fetchLowStock = async () => {
        try {
          const res = await fetch('/api/products?lowStock=true&limit=5')
          if (res.ok) {
            const data = await res.json()
            setLowStockProducts(data.products || [])
          }
        } catch (error) {
          console.error('Failed to fetch low stock products:', error)
        }
      }
      fetchLowStock()
    }, [])

    // Fetch recent orders
    useEffect(() => {
      const fetchRecentOrders = async () => {
        try {
          const res = await fetch('/api/orders?pageSize=5')
          if (res.ok) {
            const data = await res.json()
            setRecentOrders(data.orders || [])
            // Filter disputed orders
            setDisputedOrders((data.orders || []).filter((o: any) => o.status === 'DISPUTED'))
          }
        } catch (error) {
          console.error('Failed to fetch recent orders:', error)
        }
      }
      fetchRecentOrders()
    }, [])

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? '+100%' : '0%'
      const change = ((current - previous) / previous) * 100
      return change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`
    }

    // Get period comparison data
    const getPeriodComparison = () => {
      if (!analyticsData?.periodComparison) return null
      const pc = analyticsData.periodComparison
      
      let current: { users?: number; orders?: number; revenue?: number } = {}
      let previous: { users?: number; orders?: number; revenue?: number } = {}
      
      switch (analyticsPeriod) {
        case 'today':
          current = pc.today
          previous = pc.yesterday
          break
        case 'this_week':
          current = pc.thisWeek
          previous = pc.lastWeek
          break
        case 'this_month':
        default:
          current = pc.thisMonth
          previous = pc.lastMonth
      }
      
      return {
        userChange: calculateChange(current.users || 0, previous.users || 0),
        orderChange: calculateChange(current.orders || 0, previous.orders || 0),
        revenueChange: calculateChange(current.revenue || 0, previous.revenue || 0),
        current,
        previous
      }
    }

    const periodComp = getPeriodComparison()

    // Stats cards
    const stats = [
      { 
        icon: Users, 
        label: 'Total Users', 
        value: analyticsData?.overview?.totalUsers?.toLocaleString() || '0', 
        change: periodComp?.userChange || '+0%', 
        color: 'text-blue-600', 
        bg: 'bg-blue-100' 
      },
      { 
        icon: Store, 
        label: 'Active Sellers', 
        value: analyticsData?.overview?.totalSellers?.toLocaleString() || '0', 
        change: '+8%', 
        color: 'text-emerald-600', 
        bg: 'bg-emerald-100' 
      },
      { 
        icon: Package, 
        label: 'Total Orders', 
        value: (analyticsData?.overview?.totalOrders || 0).toLocaleString(), 
        change: periodComp?.orderChange || '+0%', 
        color: 'text-purple-600', 
        bg: 'bg-purple-100' 
      },
      { 
        icon: DollarSign, 
        label: 'Total Revenue', 
        value: formatPrice(analyticsData?.overview?.totalRevenue || 0), 
        change: periodComp?.revenueChange || '+0%', 
        color: 'text-orange-600', 
        bg: 'bg-orange-100' 
      },
    ]

    // Max revenue for chart scaling
    const maxRevenue = Math.max(...(analyticsData?.revenueGrowth?.map((d: any) => d.revenue) || [1]), 1)
    const maxUsers = Math.max(...(analyticsData?.userGrowth?.map((d: any) => d.users) || [1]), 1)

    // Pending approvals - derived from analytics data and admin data
    const pendingApprovals = [
      ...(adminSellers || []).filter(s => s.status === 'PENDING').map(s => ({
        id: s.id,
        type: 'Seller',
        name: s.storeName,
        email: s.user?.email || '',
        time: formatDate(s.createdAt),
        details: `${s.totalProducts || 0} products ready`
      })),
      ...(adminProducts || []).filter(p => p.status === 'PENDING_REVIEW').map(p => ({
        id: p.id,
        type: 'Product',
        name: p.name,
        email: p.seller?.storeName || '',
        time: formatDate(p.createdAt),
        details: p.seller?.storeName || 'Unknown seller'
      }))
    ].slice(0, 5)

    // Disputes - use real disputed orders
    const disputes = disputedOrders.map((order: any) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customer: order.shippingRecipientName || 'Customer',
      seller: order.sellerId || 'Seller',
      reason: 'Disputed order',
      amount: order.total,
      status: order.status
    }))

    const handleApprove = async (id: string, type: string) => {
      try {
        const action = type === 'Seller' ? 'approve-seller' : 'approve-product'
        await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, targetId: id })
        })
        toast({ title: 'Approved', description: `${type} has been approved successfully` })
        // Refresh data
        window.location.reload()
      } catch (error) {
        toast({ title: 'Error', description: `Failed to approve ${type}`, variant: 'destructive' })
      }
    }

    const handleReject = async (id: string, type: string) => {
      try {
        const action = type === 'Product' ? 'reject-product' : 'suspend-seller'
        await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, targetId: id, data: { reason: 'Does not meet guidelines' } })
        })
        toast({ title: 'Rejected', description: `${type} has been rejected`, variant: 'destructive' })
      } catch (error) {
        toast({ title: 'Error', description: `Failed to reject ${type}`, variant: 'destructive' })
      }
    }

    // Payment method colors
    const getPaymentMethodColor = (method: string) => {
      const colors: Record<string, string> = {
        'COD': 'bg-orange-500',
        'JAZZ_CASH': 'bg-red-500',
        'EASY_PAISA': 'bg-green-500',
        'CARD': 'bg-blue-500',
        'WALLET': 'bg-purple-500',
        'BANK_TRANSFER': 'bg-slate-500'
      }
      return colors[method] || 'bg-gray-500'
    }

    // Order status colors
    const getStatusColor = (status: string) => {
      const colors: Record<string, string> = {
        'PLACED': 'bg-blue-500',
        'CONFIRMED': 'bg-indigo-500',
        'PACKED': 'bg-purple-500',
        'SHIPPED': 'bg-yellow-500',
        'DELIVERED': 'bg-green-500',
        'COMPLETED': 'bg-emerald-500',
        'CANCELLED': 'bg-red-500',
        'RETURNED': 'bg-orange-500',
        'REFUNDED': 'bg-pink-500'
      }
      return colors[status] || 'bg-gray-500'
    }

    if (analyticsLoading) {
      return (
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <div className="flex gap-2">
            <Select value={analyticsPeriod} onValueChange={setAnalyticsPeriod}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="last_week">Last Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="1y">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline"><Download className="h-4 w-4 mr-2" /> Export Report</Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <Badge className={stat.change.startsWith('+') ? 'text-emerald-600 bg-emerald-100' : 'text-red-600 bg-red-100'}>
                    {stat.change}
                  </Badge>
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Revenue & User Growth Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Revenue Growth</CardTitle>
                <Badge variant="outline">{analyticsPeriod.replace('_', ' ')}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-end justify-between gap-1 px-2">
                {(analyticsData?.revenueGrowth || []).slice(-12).map((data: any, i: number) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t transition-all hover:from-emerald-600 hover:to-teal-500 cursor-pointer"
                      style={{ height: `${Math.max((data.revenue / maxRevenue) * 140, 4)}px` }}
                      title={`${data.month}: ${formatPrice(data.revenue)} - ${data.orders} orders`}
                    />
                    <span className="text-xs text-muted-foreground">{data.month}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-sm">
                <span className="text-muted-foreground">Total: {formatPrice(analyticsData?.overview?.totalRevenue || 0)}</span>
                <span className="font-medium text-emerald-600">{periodComp?.revenueChange || '+0%'} vs previous</span>
              </div>
            </CardContent>
          </Card>

          {/* User Growth Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>User Growth</CardTitle>
                <Badge variant="outline">Last 12 months</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-end justify-between gap-1 px-2">
                {(analyticsData?.userGrowth || []).slice(-12).map((data: any, i: number) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full bg-gradient-to-t from-blue-500 to-indigo-400 rounded-t transition-all hover:from-blue-600 hover:to-indigo-500 cursor-pointer"
                      style={{ height: `${Math.max((data.users / maxUsers) * 140, 4)}px` }}
                      title={`${data.month}: ${data.users?.toLocaleString()} users`}
                    />
                    <span className="text-xs text-muted-foreground">{data.month}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-sm">
                <span className="text-muted-foreground">Total: {analyticsData?.overview?.totalUsers?.toLocaleString() || 0} users</span>
                <span className="font-medium text-blue-600">{periodComp?.userChange || '+0%'} vs previous</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Status & Payment Method Distribution */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Order Status Breakdown */}
          <Card>
            <CardHeader><CardTitle>Order Status Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(analyticsData?.statusBreakdown || {}).map(([status, count]) => {
                  const total = Object.values(analyticsData?.statusBreakdown || {}).reduce((a: number, b: number) => a + b, 0) as number
                  const percentage = total > 0 ? ((count as number) / total) * 100 : 0
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{status.replace('_', ' ')}</span>
                          <span className="text-sm text-muted-foreground">{count as number}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getStatusColor(status)} rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Distribution */}
          <Card>
            <CardHeader><CardTitle>Payment Method Distribution</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(analyticsData?.paymentMethodBreakdown || {}).map(([method, data]: [string, any]) => {
                  const total = Object.values(analyticsData?.paymentMethodBreakdown || {}).reduce((sum: number, d: any) => sum + d.count, 0) as number
                  const percentage = total > 0 ? (data.count / total) * 100 : 0
                  return (
                    <div key={method} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getPaymentMethodColor(method)}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{method.replace('_', ' ')}</span>
                          <span className="text-sm text-muted-foreground">{data.count} orders</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getPaymentMethodColor(method)} rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{formatPrice(data.amount)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Selling Products & Top Sellers */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Top Selling Products */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Top Selling Products</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setCurrentView('admin-products')}>View All</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {(analyticsData?.topProducts || []).slice(0, 5).map((product: any, i: number) => (
                  <div key={product.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sellers?.store_name || 'Unknown Store'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{product.purchase_count} sold</p>
                      <p className="text-xs text-muted-foreground">{formatPrice(product.base_price)}</p>
                    </div>
                  </div>
                ))}
                {(!analyticsData?.topProducts || analyticsData.topProducts.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No product data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Sellers */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Top Sellers</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setCurrentView('admin-sellers')}>View All</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {(analyticsData?.topSellers || []).slice(0, 5).map((seller: any, i: number) => (
                  <div key={seller.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-600">
                      {i + 1}
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-emerald-100 text-emerald-600">
                        <Store className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{seller.store_name}</p>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-muted-foreground">{seller.average_rating?.toFixed(1) || '0.0'}</span>
                        <span className="text-xs text-muted-foreground">• {seller.total_orders || 0} orders</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatPrice(seller.total_earnings || 0)}</p>
                      <p className="text-xs text-emerald-600">earnings</p>
                    </div>
                  </div>
                ))}
                {(!analyticsData?.topSellers || analyticsData.topSellers.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Store className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No seller data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Performance */}
        <Card className="mb-6">
          <CardHeader><CardTitle>Category Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-sm">Category</th>
                    <th className="text-right py-3 px-2 font-medium text-sm">Products</th>
                    <th className="text-right py-3 px-2 font-medium text-sm">Sales</th>
                    <th className="text-right py-3 px-2 font-medium text-sm">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(analyticsData?.categoryPerformance || []).slice(0, 6).map((cat: any) => (
                    <tr key={cat.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                            <Layers className="h-4 w-4 text-emerald-600" />
                          </div>
                          <span className="font-medium">{cat.name}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-2 text-muted-foreground">{cat.productCount}</td>
                      <td className="text-right py-3 px-2">{cat.totalSales}</td>
                      <td className="text-right py-3 px-2 font-medium">{formatPrice(cat.totalRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!analyticsData?.categoryPerformance || analyticsData.categoryPerformance.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No category data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals & Open Disputes */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Pending Approvals */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Pending Approvals</CardTitle>
              <Badge variant="destructive">{(analyticsData?.overview?.pendingSellers || 0) + (analyticsData?.overview?.pendingProducts || 0)}</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {pendingApprovals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
                    <p>All caught up! No pending approvals.</p>
                  </div>
                ) : (
                  pendingApprovals.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className={item.type === 'Seller' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}>
                            {item.type === 'Seller' ? <Store className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.details}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApprove(item.id, item.type)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleReject(item.id, item.type)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Open Disputes */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Open Disputes</CardTitle>
              <Badge variant="destructive">{disputes.length}</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {disputes.map((dispute) => (
                  <div key={dispute.id} className="p-3 bg-red-50 border border-red-100 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{dispute.orderNumber}</p>
                      <Badge variant={dispute.status === 'OPEN' ? 'destructive' : 'secondary'}>{dispute.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{dispute.reason}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span>{dispute.customer} vs {dispute.seller}</span>
                      <span className="font-medium">{formatPrice(dispute.amount)}</span>
                    </div>
                    <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => setCurrentView('admin-orders')}>
                      Handle Dispute
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Platform Health & Quick Links */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Platform Health */}
          <Card>
            <CardHeader><CardTitle>Platform Health</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'System Status', value: 'Operational', status: 'good' },
                { label: 'API Response Time', value: '45ms', status: 'good' },
                { label: 'Database', value: 'Healthy', status: 'good' },
                { label: 'Payment Gateway', value: 'Connected', status: 'good' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{item.value}</span>
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { icon: Users, label: 'Users', view: 'admin-users', count: analyticsData?.overview?.totalUsers?.toLocaleString() || '0' },
                  { icon: Store, label: 'Sellers', view: 'admin-sellers', count: analyticsData?.overview?.totalSellers?.toLocaleString() || '0' },
                  { icon: Package, label: 'Products', view: 'admin-products', count: analyticsData?.overview?.totalProducts?.toLocaleString() || '0' },
                  { icon: ShoppingBag, label: 'Orders', view: 'admin-orders', count: analyticsData?.overview?.totalOrders?.toLocaleString() || '0' },
                  { icon: Zap, label: 'Offers', view: 'admin-offers', count: 'Manage' },
                  { icon: AlertTriangle, label: 'Disputes', view: 'admin-disputes', count: disputes.length.toString() },
                  { icon: Palette, label: 'Theme', view: 'admin-theme', count: 'Customize' },
                  { icon: FileText, label: 'SEO', view: 'admin-seo', count: 'Configure' },
                  { icon: Settings, label: 'Site', view: 'admin-site-settings', count: 'Settings' },
                  { icon: Database, label: 'Database', view: 'admin-database', count: 'Manage' },
                  { icon: Activity, label: 'Activities', view: 'admin-activities', count: 'Logs' },
                  { icon: BarChart3, label: 'Analytics', view: 'admin-analytics', count: 'View' },
                ].map((link, i) => (
                  <Card 
                    key={i}
                    className="cursor-pointer hover:shadow-md transition-shadow border-slate-200"
                    onClick={() => setCurrentView(link.view as any)}
                  >
                    <CardContent className="p-4 text-center">
                      <link.icon className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
                      <p className="font-medium">{link.label}</p>
                      <p className="text-sm text-muted-foreground">{link.count}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* More Admin Tools */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>All Admin Modules</CardTitle>
            <CardDescription>Access all administrative features and tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { label: 'Users', view: 'admin-users', icon: Users },
                { label: 'Sellers', view: 'admin-sellers', icon: Store },
                { label: 'Products', view: 'admin-products', icon: Package },
                { label: 'Orders', view: 'admin-orders', icon: ShoppingBag },
                { label: 'Offers', view: 'admin-offers', icon: Zap },
                { label: 'Disputes', view: 'admin-disputes', icon: AlertTriangle },
                { label: 'Theme', view: 'admin-theme', icon: Palette },
                { label: 'SEO', view: 'admin-seo', icon: FileText },
                { label: 'Site Settings', view: 'admin-site-settings', icon: Settings },
                { label: 'Database', view: 'admin-database', icon: Database },
                { label: 'Activities', view: 'admin-activities', icon: Activity },
                { label: 'Reviews', view: 'admin-reviews', icon: Star },
                { label: 'Payouts', view: 'admin-payouts', icon: Wallet },
                { label: 'Notifications', view: 'admin-notifications', icon: Bell },
                { label: 'Banners', view: 'admin-banners', icon: Image },
                { label: 'Categories', view: 'admin-categories', icon: Layers },
                { label: 'Coupons', view: 'admin-coupons', icon: Gift },
                { label: 'Inventory', view: 'admin-inventory', icon: Package },
                { label: 'Support', view: 'admin-support', icon: HeadphonesIcon },
                { label: 'Analytics', view: 'admin-analytics', icon: BarChart3 },
                { label: 'Marketing', view: 'admin-marketing', icon: TrendingUp },
                { label: 'Financials', view: 'admin-financials', icon: DollarSign },
                { label: 'Shipping', view: 'admin-shipping', icon: Truck },
                { label: 'Reports', view: 'admin-reports', icon: FileText },
                { label: 'Platform Services', view: 'admin-platform-services', icon: Database },
                { label: 'Platform Features', view: 'admin-platform-features', icon: Zap },
                { label: 'Platform Tools', view: 'admin-platform-tools', icon: Settings },
                { label: 'Color Palette', view: 'admin-color-palette', icon: Palette },
              ].map((link, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => setCurrentView(link.view as any)}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  function AdminUsers() {
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedRole, setSelectedRole] = useState<string>('all')
    const [selectedStatus, setSelectedStatus] = useState<string>('all')
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const [showUserModal, setShowUserModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [users, setUsers] = useState<any[]>([])
    const [stats, setStats] = useState({ total: 0, active: 0, sellers: 0, suspended: 0 })
    const [editForm, setEditForm] = useState({
      id: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'USER',
      accountStatus: 'ACTIVE'
    })

    useEffect(() => {
      fetchUsers()
    }, [selectedRole, selectedStatus])

    const fetchUsers = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (selectedRole !== 'all') params.append('role', selectedRole)
        if (selectedStatus !== 'all') params.append('status', selectedStatus)
        if (searchQuery) params.append('search', searchQuery)
        
        const res = await fetch(`/api/admin/users?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setUsers(data.users || [])
          setStats(data.stats || { total: 0, active: 0, sellers: 0, suspended: 0 })
        }
      } catch (error) {
        console.error('Failed to fetch users:', error)
      }
      setLoading(false)
    }

    const handleSearch = (e: React.FormEvent) => {
      e.preventDefault()
      fetchUsers()
    }

    const handleUserAction = async (userId: string, action: string) => {
      try {
        // Map action to accountStatus
        let accountStatus = undefined
        if (action === 'activate') accountStatus = 'ACTIVE'
        else if (action === 'suspend') accountStatus = 'SUSPENDED'
        else if (action === 'ban') accountStatus = 'BANNED'
        
        const res = await fetch('/api/admin/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, accountStatus })
        })
        if (res.ok) {
          toast({ title: 'Action Completed', description: `User ${action} successfully` })
          fetchUsers()
        } else {
          const data = await res.json()
          toast({ title: 'Error', description: data.error || 'Failed to perform action', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to perform action', variant: 'destructive' })
      }
      setShowUserModal(false)
    }

    const handleEditUser = async () => {
      try {
        const res = await fetch('/api/admin/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: editForm.id,
            firstName: editForm.firstName,
            lastName: editForm.lastName,
            phone: editForm.phone,
            role: editForm.role,
            accountStatus: editForm.accountStatus
          })
        })
        if (res.ok) {
          toast({ title: 'User Updated', description: 'User information has been updated' })
          setShowEditModal(false)
          fetchUsers()
        } else {
          const data = await res.json()
          toast({ title: 'Error', description: data.error || 'Failed to update user', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to update user', variant: 'destructive' })
      }
    }

    const handleDeleteUser = async (userId: string) => {
      if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return
      try {
        const res = await fetch(`/api/admin/users?userId=${userId}`, { method: 'DELETE' })
        if (res.ok) {
          toast({ title: 'User Deleted', description: 'User has been removed from the system' })
          fetchUsers()
        } else {
          const data = await res.json()
          toast({ title: 'Error', description: data.error || 'Failed to delete user', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete user', variant: 'destructive' })
      }
    }

    const openEditModal = (user: any) => {
      setEditForm({
        id: user.id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'USER',
        accountStatus: user.accountStatus || 'ACTIVE'
      })
      setShowEditModal(true)
    }

    const filteredUsers = users.filter(u => {
      const matchesSearch = !searchQuery || 
        (u.firstName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.lastName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesSearch
    })

    if (loading) {
      return (
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-96">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">User Management</h1>
          <div className="flex gap-2">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-64" />
              <Button type="submit" variant="outline"><Search className="h-4 w-4" /></Button>
            </form>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="USER">Users</SelectItem>
                <SelectItem value="SELLER">Sellers</SelectItem>
                <SelectItem value="ADMIN">Admins</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="BANNED">Banned</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => window.open('/api/admin/export?type=users', '_blank')}>
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Users', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-100' },
            { label: 'Active', value: stats.active, color: 'text-emerald-600', bg: 'bg-emerald-100' },
            { label: 'Sellers', value: stats.sellers, color: 'text-purple-600', bg: 'bg-purple-100' },
            { label: 'Suspended', value: stats.suspended, color: 'text-red-600', bg: 'bg-red-100' },
          ].map((stat, i) => (
            <Card key={i}><CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Users className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 font-medium">User</th>
                    <th className="text-left p-4 font-medium">Email</th>
                    <th className="text-left p-4 font-medium">Role</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Joined</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.length > 0 ? filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>{(u.firstName?.[0] || '')}{(u.lastName?.[0] || '')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-muted-foreground">{u.phone || 'No phone'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{u.email}</td>
                      <td className="p-4"><Badge variant={u.role === 'ADMIN' || u.role === 'SUPER_ADMIN' ? 'default' : 'secondary'}>{u.role}</Badge></td>
                      <td className="p-4">
                        <Badge className={
                          u.accountStatus === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 
                          u.accountStatus === 'SUSPENDED' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'
                        }>{u.accountStatus}</Badge>
                      </td>
                      <td className="p-4 text-muted-foreground text-sm">{formatDate(u.createdAt)}</td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(u); setShowUserModal(true) }}>View</Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(u)}>Edit</Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleUserAction(u.id, 'suspend')}>Suspend</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUserAction(u.id, 'activate')}>Activate</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUserAction(u.id, 'verify')}>Verify Email</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteUser(u.id)}>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* User Details Modal */}
        <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>User Details</DialogTitle></DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16"><AvatarFallback className="text-xl">{(selectedUser.firstName?.[0] || '')}{(selectedUser.lastName?.[0] || '')}</AvatarFallback></Avatar>
                  <div>
                    <p className="text-lg font-semibold">{selectedUser.firstName} {selectedUser.lastName}</p>
                    <p className="text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><Label className="text-muted-foreground">Role</Label><p className="font-medium">{selectedUser.role}</p></div>
                  <div><Label className="text-muted-foreground">Status</Label><p className="font-medium">{selectedUser.accountStatus}</p></div>
                  <div><Label className="text-muted-foreground">Phone</Label><p className="font-medium">{selectedUser.phone || 'N/A'}</p></div>
                  <div><Label className="text-muted-foreground">Joined</Label><p className="font-medium">{formatDate(selectedUser.createdAt)}</p></div>
                  <div><Label className="text-muted-foreground">Email Verified</Label><p className="font-medium">{selectedUser.emailVerified ? 'Yes' : 'No'}</p></div>
                  <div><Label className="text-muted-foreground">Phone Verified</Label><p className="font-medium">{selectedUser.phoneVerified ? 'Yes' : 'No'}</p></div>
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => handleUserAction(selectedUser.id, 'suspend')}>Suspend</Button>
                  <Button variant="outline" className="flex-1" onClick={() => handleUserAction(selectedUser.id, 'activate')}>Activate</Button>
                  <Button variant="destructive" className="flex-1" onClick={() => handleDeleteUser(selectedUser.id)}>Delete</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit User Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className="mt-1.5" />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="mt-1.5" type="email" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="mt-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Role</Label>
                  <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">User</SelectItem>
                      <SelectItem value="SELLER">Seller</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editForm.accountStatus} onValueChange={(v) => setEditForm({ ...editForm, accountStatus: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      <SelectItem value="BANNED">Banned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleEditUser}>Save Changes</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  function AdminSellers() {
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedStatus, setSelectedStatus] = useState<string>('all')
    const [selectedSeller, setSelectedSeller] = useState<any>(null)
    const [showSellerModal, setShowSellerModal] = useState(false)
    const [sellers, setSellers] = useState<any[]>([])
    const [stats, setStats] = useState({ total: 0, pending: 0, verified: 0, suspended: 0 })

    useEffect(() => {
      fetchSellers()
    }, [selectedStatus])

    const fetchSellers = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (selectedStatus !== 'all') params.append('status', selectedStatus)
        if (searchQuery) params.append('search', searchQuery)
        
        const res = await fetch(`/api/admin/sellers?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setSellers(data.sellers || [])
          setStats(data.stats || { total: 0, pending: 0, verified: 0, suspended: 0 })
        }
      } catch (error) {
        console.error('Failed to fetch sellers:', error)
      }
      setLoading(false)
    }

    const handleVerify = async (sellerId: string) => {
      try {
        const res = await fetch('/api/admin/sellers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sellerId, action: 'verify' })
        })
        if (res.ok) {
          toast({ title: 'Seller Verified', description: 'Seller has been verified successfully' })
          fetchSellers()
        } else {
          const data = await res.json()
          toast({ title: 'Error', description: data.error || 'Failed to verify seller', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to verify seller', variant: 'destructive' })
      }
      setShowSellerModal(false)
    }

    const handleSuspend = async (sellerId: string) => {
      try {
        const res = await fetch('/api/admin/sellers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: sellerId, action: 'suspend' })
        })
        if (res.ok) {
          toast({ title: 'Seller Suspended', description: 'Seller has been suspended', variant: 'destructive' })
          fetchSellers()
        } else {
          const data = await res.json()
          toast({ title: 'Error', description: data.error || 'Failed to suspend seller', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to suspend seller', variant: 'destructive' })
      }
      setShowSellerModal(false)
    }

    if (loading) {
      return (
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-96">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Seller Management</h1>
          <div className="flex gap-2">
            <Input placeholder="Search sellers..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-64" />
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => window.open('/api/admin/export?type=sellers', '_blank')}>
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Sellers', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-100' },
            { label: 'Verified', value: stats.verified, color: 'text-emerald-600', bg: 'bg-emerald-100' },
            { label: 'Pending', value: stats.pending, color: 'text-yellow-600', bg: 'bg-yellow-100' },
            { label: 'Suspended', value: stats.suspended, color: 'text-red-600', bg: 'bg-red-100' },
          ].map((stat, i) => (
            <Card key={i}><CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Store className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 font-medium">Store</th>
                    <th className="text-left p-4 font-medium">Owner</th>
                    <th className="text-left p-4 font-medium">Products</th>
                    <th className="text-left p-4 font-medium">Rating</th>
                    <th className="text-left p-4 font-medium">Total Sales</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sellers.length > 0 ? sellers.map((seller: any) => (
                    <tr key={seller.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                              {(seller.storeName || seller.store || 'ST').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{seller.storeName || seller.store}</p>
                            <p className="text-xs text-muted-foreground">{seller.email || seller.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">{seller.user ? `${seller.user.firstName || ''} ${seller.user.lastName || ''}`.trim() : seller.owner || 'N/A'}</td>
                      <td className="p-4">{seller._count?.products ?? seller.products ?? 0}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{(seller.rating || 0).toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="p-4 font-medium">{formatPrice(seller.totalSales || seller.sales || 0)}</td>
                      <td className="p-4">
                        <Badge className={
                          seller.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                          seller.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {seller.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedSeller(seller); setShowSellerModal(true) }}>View</Button>
                          {seller.status === 'PENDING' && (
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleVerify(seller.id)}>Verify</Button>
                          )}
                          {seller.status === 'VERIFIED' && (
                            <Button variant="outline" size="sm" onClick={() => handleSuspend(seller.id)}>Suspend</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No sellers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Seller Details Modal */}
        <Dialog open={showSellerModal} onOpenChange={setShowSellerModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Seller Details</DialogTitle></DialogHeader>
            {selectedSeller && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16"><AvatarFallback className="text-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">{(selectedSeller.storeName || selectedSeller.store || 'ST').slice(0, 2)}</AvatarFallback></Avatar>
                  <div>
                    <p className="text-lg font-semibold">{selectedSeller.storeName || selectedSeller.store}</p>
                    <p className="text-muted-foreground">{selectedSeller.email || selectedSeller.user?.email}</p>
                  </div>
                  <Badge className={
                    selectedSeller.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                    selectedSeller.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }>{selectedSeller.status}</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><Label className="text-muted-foreground">Owner</Label><p className="font-medium">{selectedSeller.user ? `${selectedSeller.user.firstName || ''} ${selectedSeller.user.lastName || ''}`.trim() : selectedSeller.owner || 'N/A'}</p></div>
                  <div><Label className="text-muted-foreground">Products</Label><p className="font-medium">{selectedSeller._count?.products ?? selectedSeller.products ?? 0}</p></div>
                  <div><Label className="text-muted-foreground">Rating</Label><p className="font-medium">{(selectedSeller.rating || 0).toFixed(1)}</p></div>
                  <div><Label className="text-muted-foreground">Joined</Label><p className="font-medium">{formatDate(selectedSeller.createdAt || selectedSeller.joined)}</p></div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <Card><CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{formatPrice(selectedSeller.sales)}</p>
                    <p className="text-sm text-muted-foreground">Total Sales</p>
                  </CardContent></Card>
                  <Card><CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-orange-600">{formatPrice(selectedSeller.commission)}</p>
                    <p className="text-sm text-muted-foreground">Commission Earned</p>
                  </CardContent></Card>
                </div>
                <Separator />
                <div className="flex gap-2">
                  {selectedSeller.status === 'PENDING' && (
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleVerify(selectedSeller.id)}>
                      <CheckCircle className="h-4 w-4 mr-2" /> Verify Seller
                    </Button>
                  )}
                  {selectedSeller.status === 'VERIFIED' && (
                    <Button variant="outline" className="flex-1 text-red-600 hover:text-red-700" onClick={() => handleSuspend(selectedSeller.id)}>
                      <Ban className="h-4 w-4 mr-2" /> Suspend
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1"><Eye className="h-4 w-4 mr-2" /> View Products</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  function AdminProducts() {
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedStatus, setSelectedStatus] = useState<string>('all')
    const [products, setProducts] = useState<any[]>([])
    const [sellers, setSellers] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [stats, setStats] = useState({ total: 0, live: 0, pending: 0, suspended: 0, outOfStock: 0 })
    const [showAddModal, setShowAddModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<any>(null)
    const [saving, setSaving] = useState(false)
    const [productForm, setProductForm] = useState({
      sellerId: '',
      name: '',
      description: '',
      shortDescription: '',
      categoryId: '',
      basePrice: '',
      compareAtPrice: '',
      stockQuantity: '',
      sku: '',
      primaryImageUrl: '',
      status: 'DRAFT',
      freeShipping: false,
      shippingFee: '0',
      isFeatured: false,
      warrantyPeriod: '',
      discountPercentage: '0'
    })

    useEffect(() => {
      fetchProducts()
      fetchSellers()
      fetchCategories()
    }, [selectedStatus])

    const fetchProducts = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.append('pageSize', '100')
        if (selectedStatus !== 'all') params.append('status', selectedStatus)
        if (searchQuery) params.append('search', searchQuery)
        
        const res = await fetch(`/api/admin/products?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setProducts(data.products || [])
          setStats(data.stats || { total: 0, live: 0, pending: 0, suspended: 0, outOfStock: 0 })
        }
      } catch (error) {
        console.error('Failed to fetch products:', error)
      }
      setLoading(false)
    }

    const fetchSellers = async () => {
      try {
        const res = await fetch('/api/admin/sellers?pageSize=100')
        if (res.ok) {
          const data = await res.json()
          setSellers(data.sellers || [])
        }
      } catch (error) {
        console.error('Failed to fetch sellers:', error)
      }
    }

    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories')
        if (res.ok) {
          const data = await res.json()
          setCategories(data.categories || [])
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      }
    }

    const handleProductAction = async (productId: string, action: string, newStatus?: string) => {
      try {
        const status = newStatus || (action === 'approve' ? 'LIVE' : action === 'suspend' ? 'SUSPENDED' : action === 'activate' ? 'LIVE' : 'DRAFT')
        const res = await fetch('/api/admin/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, status })
        })
        if (res.ok) {
          toast({ title: 'Action Completed', description: `Product ${action} successfully` })
          fetchProducts()
        } else {
          const data = await res.json()
          toast({ title: 'Error', description: data.error || 'Failed to update product', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to update product', variant: 'destructive' })
      }
    }

    const handleAddProduct = async () => {
      if (!productForm.name || !productForm.basePrice || !productForm.sellerId) {
        toast({ title: 'Error', description: 'Name, Price, and Seller are required', variant: 'destructive' })
        return
      }
      setSaving(true)
      try {
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productForm)
        })
        if (res.ok) {
          toast({ title: 'Product Created', description: 'Product has been added successfully' })
          setShowAddModal(false)
          resetForm()
          fetchProducts()
        } else {
          const data = await res.json()
          toast({ title: 'Error', description: data.error || 'Failed to create product', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to create product', variant: 'destructive' })
      }
      setSaving(false)
    }

    const handleEditProduct = async () => {
      if (!selectedProduct) return
      setSaving(true)
      try {
        const res = await fetch('/api/admin/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: selectedProduct.id, ...productForm })
        })
        if (res.ok) {
          toast({ title: 'Product Updated', description: 'Product has been updated successfully' })
          setShowEditModal(false)
          setSelectedProduct(null)
          resetForm()
          fetchProducts()
        } else {
          const data = await res.json()
          toast({ title: 'Error', description: data.error || 'Failed to update product', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to update product', variant: 'destructive' })
      }
      setSaving(false)
    }

    const handleDeleteProduct = async (productId: string) => {
      if (!confirm('Are you sure you want to delete this product?')) return
      try {
        const res = await fetch(`/api/admin/products?productId=${productId}`, { method: 'DELETE' })
        if (res.ok) {
          toast({ title: 'Product Deleted', description: 'Product has been removed' })
          fetchProducts()
        } else {
          const data = await res.json()
          toast({ title: 'Error', description: data.error || 'Failed to delete product', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete product', variant: 'destructive' })
      }
    }

    const openEditModal = (product: any) => {
      setSelectedProduct(product)
      setProductForm({
        sellerId: product.sellerId || '',
        name: product.name || '',
        description: product.description || '',
        shortDescription: product.shortDescription || '',
        categoryId: product.categoryId || '',
        basePrice: String(product.basePrice || ''),
        compareAtPrice: String(product.compareAtPrice || ''),
        stockQuantity: String(product.stockQuantity || 0),
        sku: product.sku || '',
        primaryImageUrl: product.primaryImageUrl || '',
        status: product.status || 'DRAFT',
        freeShipping: product.freeShipping || false,
        shippingFee: String(product.shippingFee || 0),
        isFeatured: product.isFeatured || false,
        warrantyPeriod: product.warrantyPeriod || '',
        discountPercentage: String(product.discountPercentage || 0)
      })
      setShowEditModal(true)
    }

    const resetForm = () => {
      setProductForm({
        sellerId: '',
        name: '',
        description: '',
        shortDescription: '',
        categoryId: '',
        basePrice: '',
        compareAtPrice: '',
        stockQuantity: '',
        sku: '',
        primaryImageUrl: '',
        status: 'DRAFT',
        freeShipping: false,
        shippingFee: '0',
        isFeatured: false,
        warrantyPeriod: '',
        discountPercentage: '0'
      })
    }

    if (loading) {
      return (
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-96">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Product Management</h1>
          <div className="flex gap-2">
            <Input placeholder="Search products..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-64" />
            <Button variant="outline" onClick={fetchProducts}><Search className="h-4 w-4" /></Button>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="LIVE">Live</SelectItem>
                <SelectItem value="PENDING_REVIEW">Pending</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => { resetForm(); setShowAddModal(true) }} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>
            <Button variant="outline" onClick={() => window.open('/api/admin/export?type=products', '_blank')}>
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-100' },
            { label: 'Live', value: stats.live, color: 'text-emerald-600', bg: 'bg-emerald-100' },
            { label: 'Pending', value: stats.pending, color: 'text-yellow-600', bg: 'bg-yellow-100' },
            { label: 'Suspended', value: stats.suspended, color: 'text-red-600', bg: 'bg-red-100' },
            { label: 'Out of Stock', value: stats.outOfStock, color: 'text-orange-600', bg: 'bg-orange-100' },
          ].map((stat, i) => (
            <Card key={i}><CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Package className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </div>

        {/* Product Approval Queue */}
        {selectedStatus === 'PENDING_REVIEW' && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardHeader><CardTitle className="text-yellow-800">Products Pending Approval</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {products.filter(p => p.status === 'PENDING_REVIEW' || p.status === 'DRAFT').slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-4 bg-white rounded-xl border">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Package className="h-8 w-8 text-slate-300" />
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">by {product.seller?.storeName || product.seller || 'Unknown'} • {product.category?.name || product.category || 'N/A'}</p>
                        <p className="text-sm font-medium mt-1">{formatPrice(product.price)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleProductAction(product.id, 'approved')}>
                        <Check className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleProductAction(product.id, 'rejected')}>
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                      <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 font-medium">Product</th>
                    <th className="text-left p-4 font-medium">Seller</th>
                    <th className="text-left p-4 font-medium">Category</th>
                    <th className="text-left p-4 font-medium">Price</th>
                    <th className="text-left p-4 font-medium">Stock</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.length > 0 ? products.map((product: any) => (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                            {product.primaryImage ? (
                              <img src={product.primaryImage} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="h-6 w-6 text-slate-300" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium line-clamp-1">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.sku || 'No SKU'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">{product.seller?.storeName || product.seller || 'Unknown'}</td>
                      <td className="p-4">{product.category?.name || product.category || 'N/A'}</td>
                      <td className="p-4 font-medium">{formatPrice(product.price)}</td>
                      <td className="p-4">
                        <span className={product.stock <= 5 ? 'text-red-600 font-bold' : ''}>{product.stock}</span>
                      </td>
                      <td className="p-4">
                        <Badge className={
                          product.status === 'LIVE' ? 'bg-emerald-100 text-emerald-800' :
                          product.status === 'PENDING_REVIEW' ? 'bg-yellow-100 text-yellow-800' :
                          product.status === 'DRAFT' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }>{product.status}</Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(product)} title="Edit"><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteProduct(product.id)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                          {product.status === 'LIVE' && (
                            <Button variant="ghost" size="sm" className="text-orange-600" onClick={() => handleProductAction(product.id, 'suspend')}>Suspend</Button>
                          )}
                          {product.status === 'SUSPENDED' && (
                            <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => handleProductAction(product.id, 'activate')}>Activate</Button>
                          )}
                          {(product.status === 'PENDING_REVIEW' || product.status === 'DRAFT') && (
                            <>
                              <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => handleProductAction(product.id, 'approve')}>Approve</Button>
                              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleProductAction(product.id, 'reject')}>Reject</Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No products found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Add Product Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>Create a new product listing</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Seller *</Label>
                  <Select value={productForm.sellerId} onValueChange={(v) => setProductForm({...productForm, sellerId: v})}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select seller" /></SelectTrigger>
                    <SelectContent>
                      {sellers.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.storeName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={productForm.categoryId} onValueChange={(v) => setProductForm({...productForm, categoryId: v})}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Product Name *</Label>
                <Input value={productForm.name} onChange={(e) => setProductForm({...productForm, name: e.target.value})} placeholder="Enter product name" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price (PKR) *</Label>
                  <Input type="number" value={productForm.basePrice} onChange={(e) => setProductForm({...productForm, basePrice: e.target.value})} placeholder="0" className="mt-1" />
                </div>
                <div>
                  <Label>Compare at Price</Label>
                  <Input type="number" value={productForm.compareAtPrice} onChange={(e) => setProductForm({...productForm, compareAtPrice: e.target.value})} placeholder="0" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Stock Quantity</Label>
                  <Input type="number" value={productForm.stockQuantity} onChange={(e) => setProductForm({...productForm, stockQuantity: e.target.value})} placeholder="0" className="mt-1" />
                </div>
                <div>
                  <Label>SKU</Label>
                  <Input value={productForm.sku} onChange={(e) => setProductForm({...productForm, sku: e.target.value})} placeholder="Auto-generated if empty" className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Image URL</Label>
                <Input value={productForm.primaryImageUrl} onChange={(e) => setProductForm({...productForm, primaryImageUrl: e.target.value})} placeholder="https://..." className="mt-1" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={productForm.description} onChange={(e) => setProductForm({...productForm, description: e.target.value})} placeholder="Product description" className="mt-1" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={productForm.status} onValueChange={(v) => setProductForm({...productForm, status: v})}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
                      <SelectItem value="LIVE">Live</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Discount %</Label>
                  <Input type="number" value={productForm.discountPercentage} onChange={(e) => setProductForm({...productForm, discountPercentage: e.target.value})} className="mt-1" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={productForm.freeShipping} onChange={(e) => setProductForm({...productForm, freeShipping: e.target.checked})} />
                  Free Shipping
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={productForm.isFeatured} onChange={(e) => setProductForm({...productForm, isFeatured: e.target.checked})} />
                  Featured
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button onClick={handleAddProduct} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Product Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>Update product information</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Seller</Label>
                  <Select value={productForm.sellerId} onValueChange={(v) => setProductForm({...productForm, sellerId: v})}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sellers.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.storeName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={productForm.categoryId} onValueChange={(v) => setProductForm({...productForm, categoryId: v})}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Product Name</Label>
                <Input value={productForm.name} onChange={(e) => setProductForm({...productForm, name: e.target.value})} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price (PKR)</Label>
                  <Input type="number" value={productForm.basePrice} onChange={(e) => setProductForm({...productForm, basePrice: e.target.value})} className="mt-1" />
                </div>
                <div>
                  <Label>Compare at Price</Label>
                  <Input type="number" value={productForm.compareAtPrice} onChange={(e) => setProductForm({...productForm, compareAtPrice: e.target.value})} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Stock</Label>
                  <Input type="number" value={productForm.stockQuantity} onChange={(e) => setProductForm({...productForm, stockQuantity: e.target.value})} className="mt-1" />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={productForm.status} onValueChange={(v) => setProductForm({...productForm, status: v})}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
                      <SelectItem value="LIVE">Live</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Image URL</Label>
                <Input value={productForm.primaryImageUrl} onChange={(e) => setProductForm({...productForm, primaryImageUrl: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={productForm.description} onChange={(e) => setProductForm({...productForm, description: e.target.value})} rows={3} className="mt-1" />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={productForm.freeShipping} onChange={(e) => setProductForm({...productForm, freeShipping: e.target.checked})} />
                  Free Shipping
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={productForm.isFeatured} onChange={(e) => setProductForm({...productForm, isFeatured: e.target.checked})} />
                  Featured
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button onClick={handleEditProduct} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  function AdminOrders() {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedStatus, setSelectedStatus] = useState<string>('all')
    const [selectedOrder, setSelectedOrder] = useState<any>(null)
    const [showDisputeModal, setShowDisputeModal] = useState(false)
    const [showOrderModal, setShowOrderModal] = useState(false)
    const [showBulkModal, setShowBulkModal] = useState(false)
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedOrders, setSelectedOrders] = useState<string[]>([])
    const [bulkStatus, setBulkStatus] = useState('')
    const [courierName, setCourierName] = useState('')
    const [trackingNumber, setTrackingNumber] = useState('')
    const [resolutionAction, setResolutionAction] = useState('refund')
    const [adminNotes, setAdminNotes] = useState('')
    const [exporting, setExporting] = useState(false)

    // Fetch all orders
    useEffect(() => {
      const fetchOrders = async () => {
        setLoading(true)
        try {
          const res = await fetch('/api/orders?pageSize=100')
          if (res.ok) {
            const data = await res.json()
            setOrders(data.orders || [])
          }
        } catch (error) {
          console.error('Failed to fetch orders:', error)
          toast({ title: 'Error', description: 'Failed to load orders', variant: 'destructive' })
        }
        setLoading(false)
      }
      fetchOrders()
    }, [])

    // Filter orders
    const filteredOrders = orders.filter(o => {
      const matchesSearch = o.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           o.shippingRecipientName?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = selectedStatus === 'all' || o.status === selectedStatus
      return matchesSearch && matchesStatus
    })

    // Disputed orders
    const disputedOrders = orders.filter(o => o.status === 'DISPUTED')

    // Order stats
    const orderStats = [
      { label: 'Total Orders', value: orders.length, color: 'text-blue-600' },
      { label: 'Processing', value: orders.filter(o => ['PLACED', 'CONFIRMED', 'PACKED'].includes(o.status)).length, color: 'text-yellow-600' },
      { label: 'Shipped', value: orders.filter(o => o.status === 'SHIPPED').length, color: 'text-purple-600' },
      { label: 'Delivered', value: orders.filter(o => ['DELIVERED', 'COMPLETED'].includes(o.status)).length, color: 'text-emerald-600' },
      { label: 'Disputes', value: disputedOrders.length, color: 'text-red-600' },
    ]

    // Handle order status update
    const handleStatusUpdate = async (orderId: string, newStatus: string) => {
      try {
        const res = await fetch('/api/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, status: newStatus })
        })
        if (res.ok) {
          toast({ title: 'Status Updated', description: `Order status changed to ${newStatus}` })
          setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
        } else {
          toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' })
      }
    }

    // Handle assign courier
    const handleAssignCourier = async () => {
      if (!selectedOrder || !courierName || !trackingNumber) {
        toast({ title: 'Error', description: 'Please fill all courier details', variant: 'destructive' })
        return
      }
      try {
        const res = await fetch('/api/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            orderId: selectedOrder.id, 
            status: 'SHIPPED',
            courierName,
            trackingNumber
          })
        })
        if (res.ok) {
          toast({ title: 'Courier Assigned', description: 'Order has been marked as shipped' })
          setOrders(orders.map(o => o.id === selectedOrder.id ? { ...o, status: 'SHIPPED', courierName, courierTrackingNumber: trackingNumber } : o))
          setShowOrderModal(false)
          setCourierName('')
          setTrackingNumber('')
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to assign courier', variant: 'destructive' })
      }
    }

    // Handle dispute resolution
    const handleDisputeResolution = async () => {
      if (!selectedOrder) return
      try {
        const res = await fetch('/api/disputes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: selectedOrder.id,
            action: 'resolve',
            resolutionType: resolutionAction,
            adminNotes
          })
        })
        if (res.ok) {
          toast({ title: 'Dispute Resolved', description: 'The dispute has been resolved' })
          setOrders(orders.map(o => o.id === selectedOrder.id ? { ...o, status: 'COMPLETED' } : o))
          setShowDisputeModal(false)
          setResolutionAction('refund')
          setAdminNotes('')
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to resolve dispute', variant: 'destructive' })
      }
    }

    // Handle bulk status update
    const handleBulkStatusUpdate = async () => {
      if (selectedOrders.length === 0 || !bulkStatus) {
        toast({ title: 'Error', description: 'Please select orders and status', variant: 'destructive' })
        return
      }
      try {
        for (const orderId of selectedOrders) {
          await fetch('/api/orders', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, status: bulkStatus })
          })
        }
        toast({ title: 'Bulk Update Complete', description: `${selectedOrders.length} orders updated` })
        setOrders(orders.map(o => selectedOrders.includes(o.id) ? { ...o, status: bulkStatus } : o))
        setSelectedOrders([])
        setShowBulkModal(false)
      } catch (error) {
        toast({ title: 'Error', description: 'Bulk update failed', variant: 'destructive' })
      }
    }

    // Handle export
    const handleExport = async () => {
      setExporting(true)
      try {
        const headers = ['Order Number', 'Customer', 'City', 'Total', 'Status', 'Payment Method', 'Date']
        const rows = filteredOrders.map(o => [
          o.orderNumber,
          o.shippingRecipientName || 'N/A',
          o.shippingCity || 'N/A',
          o.total?.toString() || '0',
          o.status,
          o.paymentMethod,
          formatDate(o.placedAt || o.createdAt)
        ])
        
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast({ title: 'Export Complete', description: `${filteredOrders.length} orders exported` })
      } catch (error) {
        toast({ title: 'Error', description: 'Export failed', variant: 'destructive' })
      }
      setExporting(false)
    }

    // Handle print invoice
    const handlePrintInvoice = (order: any) => {
      const invoiceContent = `
        <html>
        <head>
          <title>Invoice - ${order.orderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #10B981; }
            .details { margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f5f5f5; }
            .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">LUMINVERA</div>
            <p>Pakistan's #1 Marketplace</p>
          </div>
          <div class="details">
            <h2>Invoice: ${order.orderNumber}</h2>
            <p>Date: ${formatDate(order.placedAt || order.createdAt)}</p>
            <p>Status: ${order.status}</p>
          </div>
          <div class="section">
            <h3>Shipping Address</h3>
            <p>${order.shippingRecipientName || 'N/A'}</p>
            <p>${order.shippingStreetAddress || ''}</p>
            <p>${order.shippingCity || ''}, ${order.shippingProvince || ''}</p>
            <p>Phone: ${order.shippingPhone || 'N/A'}</p>
          </div>
          <div class="section">
            <h3>Order Items</h3>
            <table>
              <thead>
                <tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr>
              </thead>
              <tbody>
                ${(order.items || []).map((item: any) => `
                  <tr>
                    <td>${item.productName || 'Product'}</td>
                    <td>${item.quantity}</td>
                    <td>${formatPrice(item.unitPrice)}</td>
                    <td>${formatPrice(item.totalPrice)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="total">
            <p>Subtotal: ${formatPrice(order.subtotal || 0)}</p>
            <p>Delivery: ${formatPrice(order.deliveryFee || 0)}</p>
            <p>Total: ${formatPrice(order.total || 0)}</p>
          </div>
        </body>
        </html>
      `
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(invoiceContent)
        printWindow.document.close()
        printWindow.print()
      }
    }

    // Toggle order selection
    const toggleOrderSelection = (orderId: string) => {
      if (selectedOrders.includes(orderId)) {
        setSelectedOrders(selectedOrders.filter(id => id !== orderId))
      } else {
        setSelectedOrders([...selectedOrders, orderId])
      }
    }

    // Select all orders
    const toggleSelectAll = () => {
      if (selectedOrders.length === filteredOrders.length) {
        setSelectedOrders([])
      } else {
        setSelectedOrders(filteredOrders.map(o => o.id))
      }
    }

    // Order timeline steps
    const getOrderTimeline = (order: any) => {
      const steps = [
        { status: 'PLACED', label: 'Order Placed', date: order.placedAt, icon: ShoppingBag },
        { status: 'CONFIRMED', label: 'Confirmed', date: order.confirmedAt, icon: Check },
        { status: 'PACKED', label: 'Packed', date: order.packedAt, icon: Package },
        { status: 'SHIPPED', label: 'Shipped', date: order.shippedAt, icon: Truck },
        { status: 'DELIVERED', label: 'Delivered', date: order.deliveredAt, icon: CheckCircle },
      ]
      const currentIndex = steps.findIndex(s => s.status === order.status)
      return steps.map((step, i) => ({
        ...step,
        completed: i <= currentIndex || ['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(order.status),
        current: step.status === order.status
      }))
    }

    if (loading) {
      return (
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Order Management</h1>
            <p className="text-muted-foreground">Manage all platform orders</p>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Search orders..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-64" />
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PLACED">Placed</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="SHIPPED">Shipped</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="DISPUTED">Disputed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            {selectedOrders.length > 0 && (
              <Button variant="outline" onClick={() => setShowBulkModal(true)}>
                Bulk Update ({selectedOrders.length})
              </Button>
            )}
            <Button onClick={handleExport} disabled={exporting}>
              <Download className="h-4 w-4 mr-2" /> {exporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {orderStats.map((stat, i) => (
            <Card key={i} className={stat.label === 'Disputes' && stat.value > 0 ? 'border-red-200 bg-red-50' : ''}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Disputed Orders Section */}
        {disputedOrders.length > 0 && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-red-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Active Disputes ({disputedOrders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {disputedOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-red-200">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">{order.shippingRecipientName} • {order.shippingCity}</p>
                        <p className="text-sm font-medium text-red-600 mt-1">Amount: {formatPrice(order.total)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setSelectedOrder(order); setShowDisputeModal(true) }}>
                        Resolve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handlePrintInvoice(order)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Orders Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 font-medium">
                      <input 
                        type="checkbox" 
                        checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left p-4 font-medium">Order</th>
                    <th className="text-left p-4 font-medium">Customer</th>
                    <th className="text-left p-4 font-medium">Total</th>
                    <th className="text-left p-4 font-medium">Payment</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                    <tr key={order.id} className={`hover:bg-slate-50 ${order.status === 'DISPUTED' ? 'bg-red-50' : ''}`}>
                      <td className="p-4">
                        <input 
                          type="checkbox" 
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="p-4">
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{order.shippingCity}</p>
                      </td>
                      <td className="p-4">
                        <p>{order.shippingRecipientName || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{order.shippingPhone}</p>
                      </td>
                      <td className="p-4 font-medium">{formatPrice(order.total)}</td>
                      <td className="p-4">
                        <Badge variant="outline">{order.paymentMethod}</Badge>
                      </td>
                      <td className="p-4">
                        <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                      </td>
                      <td className="p-4 text-muted-foreground text-sm">{formatDate(order.placedAt || order.createdAt)}</td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedOrder(order); setShowOrderModal(true) }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handlePrintInvoice(order)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                          {['PLACED', 'CONFIRMED', 'PACKED'].includes(order.status) && (
                            <Button variant="ghost" size="sm" onClick={() => handleStatusUpdate(order.id, 'SHIPPED')}>
                              <Truck className="h-4 w-4" />
                            </Button>
                          )}
                          {order.status === 'DISPUTED' && (
                            <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => { setSelectedOrder(order); setShowDisputeModal(true) }}>
                              Resolve
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No orders found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Order Detail Modal */}
        <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Order Details</DialogTitle></DialogHeader>
            {selectedOrder && (
              <div className="space-y-6">
                {/* Order Info */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold">{selectedOrder.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(selectedOrder.placedAt || selectedOrder.createdAt)}</p>
                  </div>
                  <Badge className={getStatusColor(selectedOrder.status)}>{selectedOrder.status}</Badge>
                </div>

                {/* Timeline */}
                <Card>
                  <CardHeader><CardTitle className="text-sm">Order Timeline</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      {getOrderTimeline(selectedOrder).map((step, i) => (
                        <div key={i} className="flex flex-col items-center flex-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step.completed ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                            <step.icon className="h-4 w-4" />
                          </div>
                          <p className={`text-xs mt-2 ${step.current ? 'font-bold' : ''}`}>{step.label}</p>
                          {step.date && <p className="text-xs text-muted-foreground">{formatDate(step.date)}</p>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Shipping Info */}
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Shipping Address</CardTitle></CardHeader>
                    <CardContent>
                      <p className="font-medium">{selectedOrder.shippingRecipientName}</p>
                      <p className="text-sm text-muted-foreground">{selectedOrder.shippingPhone}</p>
                      <p className="text-sm text-muted-foreground">{selectedOrder.shippingStreetAddress}</p>
                      <p className="text-sm text-muted-foreground">{selectedOrder.shippingCity}, {selectedOrder.shippingProvince}</p>
                    </CardContent>
                  </Card>

                  {/* Courier Info */}
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Courier Details</CardTitle></CardHeader>
                    <CardContent>
                      {selectedOrder.courierName ? (
                        <div>
                          <p className="font-medium">{selectedOrder.courierName}</p>
                          <p className="text-sm text-muted-foreground">Tracking: {selectedOrder.courierTrackingNumber}</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Input placeholder="Courier Name" value={courierName} onChange={e => setCourierName(e.target.value)} />
                          <Input placeholder="Tracking Number" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} />
                          <Button onClick={handleAssignCourier} className="w-full">Assign Courier</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Order Items */}
                <Card>
                  <CardHeader><CardTitle className="text-sm">Order Items</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(selectedOrder.items || []).map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-slate-200 rounded flex items-center justify-center">
                              <Package className="h-6 w-6 text-slate-400" />
                            </div>
                            <div>
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-xs text-muted-foreground">SKU: {item.productSku}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatPrice(item.unitPrice)} × {item.quantity}</p>
                            <p className="text-sm text-muted-foreground">{formatPrice(item.totalPrice)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Order Summary */}
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="text-sm"><span className="text-muted-foreground">Subtotal:</span> {formatPrice(selectedOrder.subtotal || 0)}</p>
                    <p className="text-sm"><span className="text-muted-foreground">Delivery:</span> {formatPrice(selectedOrder.deliveryFee || 0)}</p>
                    <p className="text-sm"><span className="text-muted-foreground">Discount:</span> -{formatPrice(selectedOrder.discount || 0)}</p>
                    <p className="text-lg font-bold">Total: {formatPrice(selectedOrder.total || 0)}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Select onValueChange={(value) => handleStatusUpdate(selectedOrder.id, value)}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Update Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CONFIRMED">Confirm</SelectItem>
                        <SelectItem value="PACKED">Mark Packed</SelectItem>
                        <SelectItem value="SHIPPED">Mark Shipped</SelectItem>
                        <SelectItem value="DELIVERED">Mark Delivered</SelectItem>
                        <SelectItem value="CANCELLED">Cancel Order</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => handlePrintInvoice(selectedOrder)}>
                      <Printer className="h-4 w-4 mr-2" /> Print Invoice
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dispute Resolution Modal */}
        <Dialog open={showDisputeModal} onOpenChange={setShowDisputeModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Resolve Dispute</DialogTitle></DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="font-medium">{selectedOrder.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.shippingRecipientName}</p>
                  <p className="text-lg font-bold mt-2">{formatPrice(selectedOrder.total)}</p>
                </div>
                <div className="space-y-2">
                  <Label>Resolution Action</Label>
                  <Select value={resolutionAction} onValueChange={setResolutionAction}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_refund">Full Refund to Customer</SelectItem>
                      <SelectItem value="partial_refund">Partial Refund</SelectItem>
                      <SelectItem value="dispute_rejected">Reject Dispute (Seller Wins)</SelectItem>
                      <SelectItem value="replacement_sent">Send Replacement</SelectItem>
                      <SelectItem value="return_accepted">Return Accepted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Admin Notes</Label>
                  <Textarea 
                    placeholder="Add notes about this dispute resolution..." 
                    className="mt-1.5" 
                    rows={3} 
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                  />
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleDisputeResolution}>
                    <CheckCircle className="h-4 w-4 mr-2" /> Confirm Resolution
                  </Button>
                  <Button variant="outline" onClick={() => setShowDisputeModal(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Bulk Status Update Modal */}
        <Dialog open={showBulkModal} onOpenChange={setShowBulkModal}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Bulk Status Update</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Update status for {selectedOrders.length} selected orders
              </p>
              <div className="space-y-2">
                <Label>New Status</Label>
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="PACKED">Packed</SelectItem>
                    <SelectItem value="SHIPPED">Shipped</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleBulkStatusUpdate} disabled={!bulkStatus}>
                  Update {selectedOrders.length} Orders
                </Button>
                <Button variant="outline" onClick={() => setShowBulkModal(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ============================================
  // Admin Settings - Comprehensive Control Panel
  // ============================================

  function AdminSettings() {
    const [activeTab, setActiveTab] = useState('theme')
    const [isLoading, setIsLoading] = useState(false)
    const [settings, setSettings] = useState({
      // Theme & Branding
      siteName: platformSettings.siteName || 'LUMINVERA',
      siteTagline: platformSettings.siteTagline || "Pakistan's #1 Marketplace",
      logoUrl: platformSettings.logoUrl || '',
      faviconUrl: platformSettings.faviconUrl || '',
      primaryColor: platformSettings.primaryColor || 'emerald',
      headingFont: platformSettings.headingFont || 'inter',
      bodyFont: platformSettings.bodyFont || 'inter',
      
      // General Settings
      platformName: platformSettings.platformName || 'LUMINVERA',
      contactEmail: platformSettings.contactEmail || 'support@luminvera.pk',
      supportPhone: platformSettings.supportPhone || '+92 300 1234567',
      businessAddress: platformSettings.businessAddress || 'Lahore, Punjab, Pakistan',
      defaultCurrency: platformSettings.defaultCurrency || 'PKR',
      defaultCommissionRate: parseFloat(platformSettings.defaultCommissionRate || '10'),
      
      // Homepage
      heroTitle: platformSettings.heroTitle || 'Shop Smart, Shop Luminvera',
      heroSubtitle: platformSettings.heroSubtitle || 'Millions of products from trusted sellers',
      heroButtonText: platformSettings.heroButtonText || 'Start Shopping',
      
      // Payment Gateways
      codEnabled: platformSettings.codEnabled === 'true',
      codFee: parseFloat(platformSettings.codFee || '100'),
      jazzcashEnabled: platformSettings.jazzcashEnabled === 'true',
      easypaisaEnabled: platformSettings.easypaisaEnabled === 'true',
      stripeEnabled: platformSettings.stripeEnabled === 'true',
      
      // Shipping
      freeShippingThreshold: parseFloat(platformSettings.freeShippingThreshold || '5000'),
      defaultShippingFee: parseFloat(platformSettings.defaultShippingFee || '150'),
      
      // Email
      smtpHost: platformSettings.smtpHost || '',
      smtpPort: parseInt(platformSettings.smtpPort || '587'),
      smtpUsername: platformSettings.smtpUsername || '',
      smtpFromEmail: platformSettings.smtpFromEmail || '',
      
      // Notifications
      orderNotifications: platformSettings.orderNotifications !== 'false',
      paymentNotifications: platformSettings.paymentNotifications !== 'false',
      promotionNotifications: platformSettings.promotionNotifications !== 'false',
    })

    const [banners, setBanners] = useState([
      { id: '1', title: 'Flash Sale', subtitle: 'Up to 70% off', position: 'hero', isActive: true, sortOrder: 1 },
      { id: '2', title: 'New Arrivals', subtitle: 'Check out latest products', position: 'promotional', isActive: true, sortOrder: 2 },
    ])
    
    const [showBannerModal, setShowBannerModal] = useState(false)
    const [editingBanner, setEditingBanner] = useState<any>(null)
    const [bannerForm, setBannerForm] = useState({
      title: '',
      subtitle: '',
      imageUrl: '',
      linkUrl: '',
      position: 'hero',
      isActive: true,
    })

    // Category Management State
    const [showCategoryModal, setShowCategoryModal] = useState(false)
    const [editingCategory, setEditingCategory] = useState<any>(null)
    const [categoryLoading, setCategoryLoading] = useState(false)
    const [adminCategories, setAdminCategories] = useState<any[]>([])
    const [categoryForm, setCategoryForm] = useState({
      name: '',
      slug: '',
      description: '',
      imageUrl: '',
      parentId: '',
      isActive: true,
      isFeatured: false,
      defaultCommission: 10,
    })

    // Fetch categories for admin
    const fetchAdminCategories = async () => {
      try {
        const res = await fetch('/api/categories?flat=true&includeInactive=true')
        if (res.ok) {
          const data = await res.json()
          setAdminCategories(data.categories || [])
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      }
    }

    // Load categories on mount
    useEffect(() => {
      fetchAdminCategories()
    }, [])

    const colorOptions = [
      { value: 'emerald', label: 'Emerald', color: '#10B981' },
      { value: 'blue', label: 'Blue', color: '#3B82F6' },
      { value: 'purple', label: 'Purple', color: '#8B5CF6' },
      { value: 'orange', label: 'Orange', color: '#F97316' },
      { value: 'rose', label: 'Rose', color: '#F43F5E' },
      { value: 'teal', label: 'Teal', color: '#14B8A6' },
    ]

    const fontOptions = [
      { value: 'inter', label: 'Inter' },
      { value: 'poppins', label: 'Poppins' },
      { value: 'roboto', label: 'Roboto' },
      { value: 'opensans', label: 'Open Sans' },
      { value: 'montserrat', label: 'Montserrat' },
    ]

    const handleSaveSettings = async (section: string) => {
      if (!user?.id) {
        toast({ title: 'Error', description: 'You must be logged in', variant: 'destructive' })
        return
      }
      setIsLoading(true)
      try {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: user.id,
            settings: {
              siteName: settings.siteName,
              siteTagline: settings.siteTagline,
              logoUrl: settings.logoUrl,
              faviconUrl: settings.faviconUrl,
              primaryColor: settings.primaryColor,
              headingFont: settings.headingFont,
              bodyFont: settings.bodyFont,
              platformName: settings.platformName,
              contactEmail: settings.contactEmail,
              supportPhone: settings.supportPhone,
              businessAddress: settings.businessAddress,
              defaultCurrency: settings.defaultCurrency,
              defaultCommissionRate: String(settings.defaultCommissionRate),
              heroTitle: settings.heroTitle,
              heroSubtitle: settings.heroSubtitle,
              heroButtonText: settings.heroButtonText,
              codEnabled: String(settings.codEnabled),
              codFee: String(settings.codFee),
              jazzcashEnabled: String(settings.jazzcashEnabled),
              easypaisaEnabled: String(settings.easypaisaEnabled),
              stripeEnabled: String(settings.stripeEnabled),
              freeShippingThreshold: String(settings.freeShippingThreshold),
              defaultShippingFee: String(settings.defaultShippingFee),
              smtpHost: settings.smtpHost,
              smtpPort: String(settings.smtpPort),
              smtpUsername: settings.smtpUsername,
              smtpFromEmail: settings.smtpFromEmail,
              orderNotifications: String(settings.orderNotifications),
              paymentNotifications: String(settings.paymentNotifications),
              promotionNotifications: String(settings.promotionNotifications),
            }
          }),
        })
        if (res.ok) {
          toast({ title: 'Settings Saved', description: `${section} settings updated successfully` })
        } else {
          const data = await res.json()
          toast({ title: 'Error', description: data.error || 'Failed to save settings', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' })
      }
      setIsLoading(false)
    }

    const handleSaveBanner = async () => {
      if (editingBanner) {
        setBanners(banners.map(b => b.id === editingBanner.id ? { ...b, ...bannerForm } : b))
        toast({ title: 'Banner Updated', description: 'Banner has been updated' })
      } else {
        setBanners([...banners, { id: Date.now().toString(), ...bannerForm, sortOrder: banners.length + 1 }])
        toast({ title: 'Banner Created', description: 'New banner has been added' })
      }
      setShowBannerModal(false)
      setEditingBanner(null)
      setBannerForm({ title: '', subtitle: '', imageUrl: '', linkUrl: '', position: 'hero', isActive: true })
    }

    const handleDeleteBanner = (id: string) => {
      setBanners(banners.filter(b => b.id !== id))
      toast({ title: 'Banner Deleted', description: 'Banner has been removed' })
    }

    // Category Management Functions
    const openAddCategory = () => {
      setEditingCategory(null)
      setCategoryForm({
        name: '',
        slug: '',
        description: '',
        imageUrl: '',
        parentId: '',
        isActive: true,
        isFeatured: false,
        defaultCommission: 10,
      })
      setShowCategoryModal(true)
    }

    const openEditCategory = (category: any) => {
      setEditingCategory(category)
      setCategoryForm({
        name: category.name || '',
        slug: category.slug || '',
        description: category.description || '',
        imageUrl: category.imageUrl || '',
        parentId: category.parentId || '',
        isActive: category.isActive ?? true,
        isFeatured: category.isFeatured ?? false,
        defaultCommission: category.defaultCommission || 10,
      })
      setShowCategoryModal(true)
    }

    const handleSaveCategory = async () => {
      if (!user?.id) {
        toast({ title: 'Error', description: 'You must be logged in', variant: 'destructive' })
        return
      }
      
      if (!categoryForm.name) {
        toast({ title: 'Error', description: 'Category name is required', variant: 'destructive' })
        return
      }
      
      setCategoryLoading(true)
      try {
        if (editingCategory) {
          // Update existing category
          const res = await fetch('/api/categories', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              categoryId: editingCategory.id,
              userId: user.id,
              ...categoryForm,
              parentId: categoryForm.parentId || null,
            }),
          })
          const data = await res.json()
          if (res.ok) {
            toast({ title: 'Category Updated', description: 'Category has been updated successfully' })
            fetchAdminCategories()
            setShowCategoryModal(false)
          } else {
            toast({ title: 'Error', description: data.error || 'Failed to update category', variant: 'destructive' })
          }
        } else {
          // Create new category
          const res = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              ...categoryForm,
              parentId: categoryForm.parentId || null,
            }),
          })
          const data = await res.json()
          if (res.ok) {
            toast({ title: 'Category Created', description: 'New category has been added' })
            fetchAdminCategories()
            setShowCategoryModal(false)
          } else {
            toast({ title: 'Error', description: data.error || 'Failed to create category', variant: 'destructive' })
          }
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to save category', variant: 'destructive' })
      }
      setCategoryLoading(false)
    }

    const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
      if (!user?.id) return
      
      if (!confirm(`Are you sure you want to delete "${categoryName}"? This action cannot be undone.`)) {
        return
      }
      
      try {
        const res = await fetch(`/api/categories?categoryId=${categoryId}&userId=${user.id}`, {
          method: 'DELETE',
        })
        const data = await res.json()
        if (res.ok) {
          toast({ title: 'Category Deleted', description: data.message || 'Category has been removed' })
          fetchAdminCategories()
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to delete category', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete category', variant: 'destructive' })
      }
    }

    const handleToggleCategoryStatus = async (category: any) => {
      if (!user?.id) return
      
      try {
        const res = await fetch('/api/categories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoryId: category.id,
            userId: user.id,
            isActive: !category.isActive,
          }),
        })
        if (res.ok) {
          toast({ 
            title: 'Status Updated', 
            description: `Category ${!category.isActive ? 'activated' : 'deactivated'}` 
          })
          fetchAdminCategories()
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' })
      }
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Platform Settings</h1>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="theme" className="gap-1"><Palette className="h-4 w-4" /> Theme</TabsTrigger>
            <TabsTrigger value="homepage" className="gap-1"><Home className="h-4 w-4" /> Homepage</TabsTrigger>
            <TabsTrigger value="general" className="gap-1"><Settings className="h-4 w-4" /> General</TabsTrigger>
            <TabsTrigger value="users" className="gap-1"><Users className="h-4 w-4" /> Users</TabsTrigger>
            <TabsTrigger value="sellers" className="gap-1"><Store className="h-4 w-4" /> Sellers</TabsTrigger>
            <TabsTrigger value="products" className="gap-1"><Package className="h-4 w-4" /> Products</TabsTrigger>
            <TabsTrigger value="orders" className="gap-1"><ShoppingBag className="h-4 w-4" /> Orders</TabsTrigger>
            <TabsTrigger value="payments" className="gap-1"><CreditCard className="h-4 w-4" /> Payments</TabsTrigger>
            <TabsTrigger value="shipping" className="gap-1"><Truck className="h-4 w-4" /> Shipping</TabsTrigger>
            <TabsTrigger value="email" className="gap-1"><Mail className="h-4 w-4" /> Email</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1"><Bell className="h-4 w-4" /> Notifications</TabsTrigger>
          </TabsList>

          {/* Theme & Branding Tab */}
          <TabsContent value="theme">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader><CardTitle>Brand Identity</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Site Name</Label>
                        <Input value={settings.siteName} onChange={e => setSettings({...settings, siteName: e.target.value})} className="mt-1.5" />
                      </div>
                      <div>
                        <Label>Tagline</Label>
                        <Input value={settings.siteTagline} onChange={e => setSettings({...settings, siteTagline: e.target.value})} className="mt-1.5" />
                      </div>
                    </div>
                    <div>
                      <Label>Logo URL</Label>
                      <Input value={settings.logoUrl} onChange={e => setSettings({...settings, logoUrl: e.target.value})} placeholder="https://example.com/logo.png" className="mt-1.5" />
                    </div>
                    <div>
                      <Label>Favicon URL</Label>
                      <Input value={settings.faviconUrl} onChange={e => setSettings({...settings, faviconUrl: e.target.value})} placeholder="https://example.com/favicon.ico" className="mt-1.5" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Color Scheme</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="mb-3 block">Primary Color</Label>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                        {colorOptions.map(color => (
                          <button
                            key={color.value}
                            onClick={() => setSettings({...settings, primaryColor: color.value})}
                            className={`p-3 rounded-xl border-2 transition-all ${settings.primaryColor === color.value ? 'border-slate-900 ring-2 ring-slate-200' : 'border-slate-200 hover:border-slate-300'}`}
                          >
                            <div className="w-full h-8 rounded-lg mb-2" style={{ backgroundColor: color.color }} />
                            <p className="text-xs font-medium">{color.label}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Typography</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Heading Font</Label>
                        <Select value={settings.headingFont} onValueChange={v => setSettings({...settings, headingFont: v})}>
                          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {fontOptions.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Body Font</Label>
                        <Select value={settings.bodyFont} onValueChange={v => setSettings({...settings, bodyFont: v})}>
                          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {fontOptions.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Preview Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
                  <CardContent>
                    <div className="rounded-xl border overflow-hidden">
                      <div className="h-32 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${colorOptions.find(c => c.value === settings.primaryColor)?.color || '#10B981'}, ${colorOptions.find(c => c.value === settings.primaryColor)?.color || '#10B981'}cc)` }}>
                        <div className="text-center text-white">
                          <p className="text-lg font-bold">{settings.siteName}</p>
                          <p className="text-sm opacity-90">{settings.siteTagline}</p>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 space-y-2">
                        <div className="h-3 bg-slate-200 rounded w-3/4" />
                        <div className="h-3 bg-slate-200 rounded w-1/2" />
                        <div className="h-8 rounded mt-2" style={{ backgroundColor: colorOptions.find(c => c.value === settings.primaryColor)?.color }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSaveSettings('theme')} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" /> Save Theme Settings
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Homepage Tab */}
          <TabsContent value="homepage">
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>Hero Banners</CardTitle>
                  <Button onClick={() => { setEditingBanner(null); setBannerForm({ title: '', subtitle: '', imageUrl: '', linkUrl: '', position: 'hero', isActive: true }); setShowBannerModal(true) }}>
                    <Plus className="h-4 w-4 mr-2" /> Add Banner
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {banners.map((banner, i) => (
                      <div key={banner.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-slate-50">
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center text-white text-xs font-medium">
                            {banner.position}
                          </div>
                          <div>
                            <p className="font-medium">{banner.title}</p>
                            <p className="text-sm text-muted-foreground">{banner.subtitle}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={banner.isActive ? 'default' : 'secondary'}>{banner.isActive ? 'Active' : 'Inactive'}</Badge>
                          <Button variant="ghost" size="sm" onClick={() => { setEditingBanner(banner); setBannerForm(banner); setShowBannerModal(true) }}>Edit</Button>
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteBanner(banner.id)}>Delete</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Homepage Sections</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: 'Featured Products', enabled: true, type: 'featured' },
                    { name: 'Best Sellers', enabled: true, type: 'bestseller' },
                    { name: 'New Arrivals', enabled: true, type: 'newarrivals' },
                    { name: 'Flash Sale', enabled: true, type: 'flashsale' },
                    { name: 'Categories Grid', enabled: true, type: 'categories' },
                    { name: 'Newsletter', enabled: true, type: 'newsletter' },
                  ].map((section, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                        <span className="font-medium">{section.name}</span>
                      </div>
                      <Switch defaultChecked={section.enabled} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Banner Modal */}
            <Dialog open={showBannerModal} onOpenChange={setShowBannerModal}>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{editingBanner ? 'Edit Banner' : 'Add New Banner'}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input value={bannerForm.title} onChange={e => setBannerForm({...bannerForm, title: e.target.value})} className="mt-1.5" placeholder="Flash Sale!" />
                  </div>
                  <div>
                    <Label>Subtitle</Label>
                    <Input value={bannerForm.subtitle} onChange={e => setBannerForm({...bannerForm, subtitle: e.target.value})} className="mt-1.5" placeholder="Up to 70% off" />
                  </div>
                  <div>
                    <Label>Image URL</Label>
                    <Input value={bannerForm.imageUrl} onChange={e => setBannerForm({...bannerForm, imageUrl: e.target.value})} className="mt-1.5" placeholder="https://example.com/banner.jpg" />
                  </div>
                  <div>
                    <Label>Link URL</Label>
                    <Input value={bannerForm.linkUrl} onChange={e => setBannerForm({...bannerForm, linkUrl: e.target.value})} className="mt-1.5" placeholder="/products" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Position</Label>
                      <Select value={bannerForm.position} onValueChange={v => setBannerForm({...bannerForm, position: v})}>
                        <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hero">Hero Banner</SelectItem>
                          <SelectItem value="promotional">Promotional</SelectItem>
                          <SelectItem value="category">Category</SelectItem>
                          <SelectItem value="sidebar">Sidebar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <div className="flex items-center gap-2 mt-3">
                        <Switch checked={bannerForm.isActive} onCheckedChange={v => setBannerForm({...bannerForm, isActive: v})} />
                        <span className="text-sm">{bannerForm.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowBannerModal(false)}>Cancel</Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveBanner}>{editingBanner ? 'Update' : 'Create'} Banner</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* General Settings Tab */}
          <TabsContent value="general">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Platform Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Platform Name</Label>
                    <Input value={settings.platformName} onChange={e => setSettings({...settings, platformName: e.target.value})} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Contact Email</Label>
                    <Input value={settings.contactEmail} onChange={e => setSettings({...settings, contactEmail: e.target.value})} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Support Phone</Label>
                    <Input value={settings.supportPhone} onChange={e => setSettings({...settings, supportPhone: e.target.value})} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Business Address</Label>
                    <Textarea value={settings.businessAddress} onChange={e => setSettings({...settings, businessAddress: e.target.value})} className="mt-1.5" rows={2} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Localization</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Default Currency</Label>
                      <Select value={settings.defaultCurrency} onValueChange={v => setSettings({...settings, defaultCurrency: v})}>
                        <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PKR">PKR - Pakistani Rupee</SelectItem>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Default Language</Label>
                      <Select defaultValue="en">
                        <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ur">Urdu</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Timezone</Label>
                    <Select defaultValue="Asia/Karachi">
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Karachi">Asia/Karachi (GMT+5)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Commission Settings</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Default Commission Rate (%)</Label>
                    <Input type="number" value={settings.defaultCommissionRate} onChange={e => setSettings({...settings, defaultCommissionRate: parseFloat(e.target.value)})} className="mt-1.5" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Min Commission (%)</Label>
                      <Input type="number" defaultValue="5" className="mt-1.5" />
                    </div>
                    <div>
                      <Label>Max Commission (%)</Label>
                      <Input type="number" defaultValue="25" className="mt-1.5" />
                    </div>
                  </div>
                  <div>
                    <Label>Payment Gateway Fee (%)</Label>
                    <Input type="number" defaultValue="2.5" className="mt-1.5" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Order Settings</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Min Order Amount (Rs.)</Label>
                      <Input type="number" defaultValue="100" className="mt-1.5" />
                    </div>
                    <div>
                      <Label>Free Shipping Threshold (Rs.)</Label>
                      <Input type="number" value={settings.freeShippingThreshold} onChange={e => setSettings({...settings, freeShippingThreshold: parseFloat(e.target.value)})} className="mt-1.5" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Return Policy (Days)</Label>
                      <Input type="number" defaultValue="7" className="mt-1.5" />
                    </div>
                    <div>
                      <Label>Max COD Amount (Rs.)</Label>
                      <Input type="number" defaultValue="50000" className="mt-1.5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="flex justify-end mt-6">
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSaveSettings('general')} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" /> Save General Settings
              </Button>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{platformStats.totalUsers || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{adminUsers.filter(u => u.accountStatus === 'ACTIVE').length}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">{platformStats.totalSellers || 0}</p>
                  <p className="text-sm text-muted-foreground">Sellers</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{adminUsers.filter(u => u.accountStatus === 'SUSPENDED' || u.accountStatus === 'BANNED').length}</p>
                  <p className="text-sm text-muted-foreground">Suspended</p>
                </CardContent></Card>
              </div>

              <Card>
                <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <Input placeholder="Search users..." className="flex-1" />
                    <Select defaultValue="all">
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="USER">Users</SelectItem>
                        <SelectItem value="SELLER">Sellers</SelectItem>
                        <SelectItem value="ADMIN">Admins</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button><Filter className="h-4 w-4 mr-2" /> Filter</Button>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-3 font-medium">User</th>
                          <th className="text-left p-3 font-medium">Role</th>
                          <th className="text-left p-3 font-medium">Status</th>
                          <th className="text-left p-3 font-medium">Joined</th>
                          <th className="text-left p-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {adminUsers.length > 0 ? adminUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8"><AvatarFallback>{u.firstName?.[0] || u.email?.[0]?.toUpperCase()}</AvatarFallback></Avatar>
                                <div>
                                  <p className="font-medium">{u.firstName} {u.lastName}</p>
                                  <p className="text-xs text-muted-foreground">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3"><Badge variant="secondary">{u.role}</Badge></td>
                            <td className="p-3">
                              <Badge className={u.accountStatus === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                                {u.accountStatus}
                              </Badge>
                            </td>
                            <td className="p-3 text-muted-foreground text-sm">{formatDate(u.createdAt)}</td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="sm" className="text-red-600"><Ban className="h-4 w-4" /></Button>
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-muted-foreground">
                              No users found. Users will appear here when they register.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Sellers Tab */}
          <TabsContent value="sellers">
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{adminSellers.length}</p>
                  <p className="text-sm text-muted-foreground">Total Sellers</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{adminSellers.filter(s => s.status === 'VERIFIED').length}</p>
                  <p className="text-sm text-muted-foreground">Verified</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{adminSellers.filter(s => s.status === 'PENDING').length}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{adminSellers.filter(s => s.status === 'SUSPENDED').length}</p>
                  <p className="text-sm text-muted-foreground">Suspended</p>
                </CardContent></Card>
              </div>

              <Card>
                <CardHeader><CardTitle>Seller Verification</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {adminSellers.filter(s => s.status === 'PENDING').length > 0 ? (
                      adminSellers.filter(s => s.status === 'PENDING').map((seller) => (
                        <div key={seller.id} className="flex items-center justify-between p-4 border rounded-xl">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white">{seller.storeName?.slice(0, 2) || 'ST'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{seller.storeName}</p>
                              <p className="text-sm text-muted-foreground">Owner: {seller.user?.firstName} {seller.user?.lastName} • {seller.totalProducts} products</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={async () => {
                              await fetch('/api/admin', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'approve-seller', targetId: seller.id })
                              })
                              toast({ title: 'Seller Approved', description: `${seller.storeName} has been verified` })
                            }}><Check className="h-4 w-4 mr-1" /> Verify</Button>
                            <Button size="sm" variant="outline"><Eye className="h-4 w-4 mr-1" /> Review</Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Store className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No pending seller applications</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>All Sellers</CardTitle></CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-3 font-medium">Store</th>
                          <th className="text-left p-3 font-medium">Owner</th>
                          <th className="text-left p-3 font-medium">Status</th>
                          <th className="text-left p-3 font-medium">Products</th>
                          <th className="text-left p-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {adminSellers.map((seller) => (
                          <tr key={seller.id} className="hover:bg-slate-50">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>{seller.storeName?.slice(0, 2)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{seller.storeName}</span>
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground">{seller.user?.firstName} {seller.user?.lastName}</td>
                            <td className="p-3">
                              <Badge className={seller.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : seller.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                                {seller.status}
                              </Badge>
                            </td>
                            <td className="p-3">{seller.totalProducts}</td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{platformStats.totalProducts || adminProducts.length}</p>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{adminProducts.filter(p => p.status === 'LIVE').length}</p>
                  <p className="text-sm text-muted-foreground">Live</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{adminProducts.filter(p => p.status === 'PENDING_REVIEW').length}</p>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">{adminCategories.length}</p>
                  <p className="text-sm text-muted-foreground">Categories</p>
                </CardContent></Card>
              </div>

              {/* Category Management Section */}
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" /> Category Management
                  </CardTitle>
                  <Button onClick={openAddCategory} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="h-4 w-4 mr-2" /> Add Category
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {adminCategories.length > 0 ? (
                      adminCategories.map((category) => {
                        const parentCategory = adminCategories.find(c => c.id === category.parentId)
                        return (
                          <div key={category.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center">
                                {category.imageUrl ? (
                                  <img src={category.imageUrl} alt={category.name} className="w-8 h-8 object-cover rounded" />
                                ) : (
                                  <Layers className="h-6 w-6 text-emerald-600" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{category.name}</p>
                                  {category.isFeatured && (
                                    <Badge variant="secondary" className="text-xs">Featured</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span>/{category.slug}</span>
                                  {parentCategory && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        <ChevronRight className="h-3 w-3" />
                                        {parentCategory.name}
                                      </span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span>{category.productCount || 0} products</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Commission</p>
                                <p className="font-medium">{category.defaultCommission || 10}%</p>
                              </div>
                              <Badge className={category.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}>
                                {category.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openEditCategory(category)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleToggleCategoryStatus(category)}>
                                  {category.isActive ? <Ban className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteCategory(category.id, category.name)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No categories found</p>
                        <Button variant="outline" className="mt-4" onClick={openAddCategory}>
                          <Plus className="h-4 w-4 mr-2" /> Add your first category
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Product Approval Queue</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {adminProducts.filter(p => p.status === 'PENDING_REVIEW').length > 0 ? (
                      adminProducts.filter(p => p.status === 'PENDING_REVIEW').map((product) => (
                        <div key={product.id} className="flex items-center justify-between p-4 border rounded-xl">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                              <Package className="h-8 w-8 text-slate-300" />
                            </div>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-muted-foreground">{product.seller?.storeName} • {product.category?.name || 'No category'}</p>
                              <p className="text-sm font-medium mt-1">{formatPrice(product.basePrice)}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={async () => {
                              await fetch('/api/admin', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'approve-product', targetId: product.id })
                              })
                              toast({ title: 'Product Approved', description: `${product.name} is now live` })
                            }}><Check className="h-4 w-4 mr-1" /> Approve</Button>
                            <Button size="sm" variant="outline" onClick={async () => {
                              await fetch('/api/admin', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'reject-product', targetId: product.id, data: { reason: 'Does not meet guidelines' } })
                              })
                              toast({ title: 'Product Rejected', variant: 'destructive' })
                            }}><X className="h-4 w-4 mr-1" /> Reject</Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No products pending review</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>All Products</CardTitle></CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-3 font-medium">Product</th>
                          <th className="text-left p-3 font-medium">Seller</th>
                          <th className="text-left p-3 font-medium">Category</th>
                          <th className="text-left p-3 font-medium">Price</th>
                          <th className="text-left p-3 font-medium">Status</th>
                          <th className="text-left p-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {adminProducts.length > 0 ? adminProducts.map((product) => (
                          <tr key={product.id} className="hover:bg-slate-50">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                                  <Package className="h-5 w-5 text-slate-300" />
                                </div>
                                <span className="font-medium line-clamp-1">{product.name}</span>
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground">{product.seller?.storeName || 'Unknown'}</td>
                            <td className="p-3 text-muted-foreground">{product.category?.name || 'No category'}</td>
                            <td className="p-3 font-medium">{formatPrice(product.basePrice)}</td>
                            <td className="p-3">
                              <Badge className={product.status === 'LIVE' ? 'bg-emerald-100 text-emerald-800' : product.status === 'PENDING_REVIEW' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                                {product.status}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-muted-foreground">
                              No products found. Products will appear here when sellers add them.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Modal */}
            <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
                  <DialogDescription>
                    {editingCategory ? 'Update category details' : 'Create a new product category'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category Name *</Label>
                      <Input 
                        value={categoryForm.name} 
                        onChange={e => setCategoryForm({...categoryForm, name: e.target.value, slug: categoryForm.slug || e.target.value.toLowerCase().replace(/\s+/g, '-')})} 
                        className="mt-1.5" 
                        placeholder="e.g., Electronics" 
                      />
                    </div>
                    <div>
                      <Label>Slug</Label>
                      <Input 
                        value={categoryForm.slug} 
                        onChange={e => setCategoryForm({...categoryForm, slug: e.target.value})} 
                        className="mt-1.5" 
                        placeholder="electronics" 
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea 
                      value={categoryForm.description} 
                      onChange={e => setCategoryForm({...categoryForm, description: e.target.value})} 
                      className="mt-1.5" 
                      rows={2} 
                      placeholder="Category description" 
                    />
                  </div>
                  <div>
                    <Label>Image URL</Label>
                    <Input 
                      value={categoryForm.imageUrl} 
                      onChange={e => setCategoryForm({...categoryForm, imageUrl: e.target.value})} 
                      className="mt-1.5" 
                      placeholder="https://example.com/image.jpg" 
                    />
                  </div>
                  <div>
                    <Label>Parent Category</Label>
                    <Select value={categoryForm.parentId || 'none'} onValueChange={v => setCategoryForm({...categoryForm, parentId: v === 'none' ? '' : v})}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="None (Top Level)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Top Level)</SelectItem>
                        {adminCategories
                          .filter(c => c.id !== editingCategory?.id && !c.parentId)
                          .map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Commission Rate (%)</Label>
                      <Input 
                        type="number" 
                        value={categoryForm.defaultCommission} 
                        onChange={e => setCategoryForm({...categoryForm, defaultCommission: parseFloat(e.target.value) || 0})} 
                        className="mt-1.5" 
                        min={0}
                        max={100}
                      />
                    </div>
                    <div className="flex items-end gap-4">
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={categoryForm.isActive} 
                          onCheckedChange={v => setCategoryForm({...categoryForm, isActive: v})} 
                        />
                        <Label className="cursor-pointer">Active</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={categoryForm.isFeatured} 
                          onCheckedChange={v => setCategoryForm({...categoryForm, isFeatured: v})} 
                        />
                        <Label className="cursor-pointer">Featured</Label>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCategoryModal(false)}>Cancel</Button>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700" 
                    onClick={handleSaveCategory}
                    disabled={categoryLoading || !categoryForm.name}
                  >
                    {categoryLoading ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card><CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">2,345</p>
                  <p className="text-sm text-muted-foreground">Total Today</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">456</p>
                  <p className="text-sm text-muted-foreground">Processing</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">789</p>
                  <p className="text-sm text-muted-foreground">Shipped</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">1,100</p>
                  <p className="text-sm text-muted-foreground">Delivered</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">23</p>
                  <p className="text-sm text-muted-foreground">Disputes</p>
                </CardContent></Card>
              </div>

              <Card>
                <CardHeader><CardTitle>Order Status Management</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Auto-confirm Orders</h4>
                      <p className="text-sm text-muted-foreground mb-3">Automatically confirm orders after payment verification</p>
                      <Switch defaultChecked />
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Auto-cancel Unpaid</h4>
                      <p className="text-sm text-muted-foreground mb-3">Cancel unpaid orders after specified time</p>
                      <div className="flex items-center gap-2">
                        <Input type="number" defaultValue={24} className="w-20" />
                        <span className="text-sm">hours</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Dispute Resolution</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { order: 'ORD-2025-001230', customer: 'Ali Ahmed', seller: 'TechZone', reason: 'Item not received', amount: 8999 },
                      { order: 'ORD-2025-001225', customer: 'Sara Khan', seller: 'StyleHub', reason: 'Wrong item received', amount: 2499 },
                    ].map((dispute, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border rounded-xl border-red-200 bg-red-50">
                        <div>
                          <p className="font-medium">{dispute.order}</p>
                          <p className="text-sm text-muted-foreground">{dispute.customer} vs {dispute.seller}</p>
                          <p className="text-sm text-red-600 mt-1">{dispute.reason}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">Rs. {dispute.amount.toLocaleString()}</p>
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">Resolve</Button>
                            <Button size="sm" variant="outline">View</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Payment Gateways</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {/* COD */}
                  <div className="flex items-start justify-between p-4 border rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium">Cash on Delivery (COD)</p>
                        <p className="text-sm text-muted-foreground">Accept cash payments upon delivery</p>
                      </div>
                    </div>
                    <Switch checked={settings.codEnabled} onCheckedChange={v => setSettings({...settings, codEnabled: v})} />
                  </div>

                  {/* JazzCash */}
                  <div className="flex items-start justify-between p-4 border rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                        <Wallet className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium">JazzCash</p>
                        <p className="text-sm text-muted-foreground">Mobile wallet payment gateway</p>
                      </div>
                    </div>
                    <Switch checked={settings.jazzcashEnabled} onCheckedChange={v => setSettings({...settings, jazzcashEnabled: v})} />
                  </div>

                  {/* EasyPaisa */}
                  <div className="flex items-start justify-between p-4 border rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <Wallet className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">EasyPaisa</p>
                        <p className="text-sm text-muted-foreground">Mobile wallet payment gateway</p>
                      </div>
                    </div>
                    <Switch checked={settings.easypaisaEnabled} onCheckedChange={v => setSettings({...settings, easypaisaEnabled: v})} />
                  </div>

                  {/* Stripe */}
                  <div className="flex items-start justify-between p-4 border rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <CreditCard className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">Stripe (International Cards)</p>
                        <p className="text-sm text-muted-foreground">Accept international credit/debit cards</p>
                      </div>
                    </div>
                    <Switch checked={settings.stripeEnabled} onCheckedChange={v => setSettings({...settings, stripeEnabled: v})} />
                  </div>
                </CardContent>
              </Card>

              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle>COD Settings</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>COD Fee (Rs.)</Label>
                      <Input type="number" value={settings.codFee} onChange={e => setSettings({...settings, codFee: parseFloat(e.target.value)})} className="mt-1.5" />
                    </div>
                    <div>
                      <Label>Maximum COD Amount (Rs.)</Label>
                      <Input type="number" defaultValue={50000} className="mt-1.5" />
                    </div>
                    <div>
                      <Label>Allowed Cities for COD</Label>
                      <Textarea defaultValue="Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad, Multan" className="mt-1.5" rows={3} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>JazzCash Configuration</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Merchant ID</Label>
                      <Input type="text" placeholder="Enter Merchant ID" className="mt-1.5" />
                    </div>
                    <div>
                      <Label>Password</Label>
                      <Input type="password" placeholder="Enter Password" className="mt-1.5" />
                    </div>
                    <div>
                      <Label>Integrity Salt</Label>
                      <Input type="password" placeholder="Enter Integrity Salt" className="mt-1.5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch defaultChecked={false} />
                      <Label>Sandbox Mode</Label>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSaveSettings('payment')} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" /> Save Payment Settings
              </Button>
            </div>
          </TabsContent>

          {/* Shipping Tab */}
          <TabsContent value="shipping">
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Delivery Zones</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: 'Metro Cities', provinces: 'Punjab, Sindh, Islamabad', baseRate: 150, perKg: 50, days: 2, free: 5000 },
                      { name: 'Other Cities', provinces: 'All Provinces', baseRate: 200, perKg: 75, days: 4, free: 8000 },
                      { name: 'Remote Areas', provinces: 'Gilgit-Baltistan, Azad Kashmir', baseRate: 350, perKg: 100, days: 7, free: 15000 },
                    ].map((zone, i) => (
                      <div key={i} className="p-4 border rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium">{zone.name}</p>
                            <p className="text-sm text-muted-foreground">{zone.provinces}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                            <Switch defaultChecked />
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Base Rate</p>
                            <p className="font-medium">Rs. {zone.baseRate}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Per Kg</p>
                            <p className="font-medium">Rs. {zone.perKg}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Est. Days</p>
                            <p className="font-medium">{zone.days} days</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Free Above</p>
                            <p className="font-medium">Rs. {zone.free.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="mt-4"><Plus className="h-4 w-4 mr-2" /> Add Zone</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Courier Integrations</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: 'Leopards Courier', status: 'Connected', default: true },
                    { name: 'Trax', status: 'Connected', default: false },
                    { name: 'M&P', status: 'Not Connected', default: false },
                    { name: 'PostEx', status: 'Not Connected', default: false },
                  ].map((courier, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Truck className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{courier.name}</p>
                          <Badge variant={courier.status === 'Connected' ? 'default' : 'secondary'} className={courier.status === 'Connected' ? 'bg-emerald-100 text-emerald-800' : ''}>
                            {courier.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {courier.default && <Badge variant="outline">Default</Badge>}
                        <Button variant="outline" size="sm">{courier.status === 'Connected' ? 'Configure' : 'Connect'}</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>SMTP Configuration</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>SMTP Host</Label>
                    <Input value={settings.smtpHost} onChange={e => setSettings({...settings, smtpHost: e.target.value})} placeholder="smtp.example.com" className="mt-1.5" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Port</Label>
                      <Input type="number" value={settings.smtpPort} onChange={e => setSettings({...settings, smtpPort: parseInt(e.target.value)})} className="mt-1.5" />
                    </div>
                    <div>
                      <Label>Encryption</Label>
                      <Select defaultValue="tls">
                        <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tls">TLS</SelectItem>
                          <SelectItem value="ssl">SSL</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Username</Label>
                    <Input value={settings.smtpUsername} onChange={e => setSettings({...settings, smtpUsername: e.target.value})} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input type="password" placeholder="••••••••" className="mt-1.5" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>From Email</Label>
                      <Input value={settings.smtpFromEmail} onChange={e => setSettings({...settings, smtpFromEmail: e.target.value})} placeholder="noreply@luminvera.pk" className="mt-1.5" />
                    </div>
                    <div>
                      <Label>From Name</Label>
                      <Input defaultValue="LUMINVERA" className="mt-1.5" />
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">Send Test Email</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Email Templates</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: 'Welcome Email', type: 'welcome', enabled: true },
                    { name: 'Order Confirmation', type: 'order_confirmation', enabled: true },
                    { name: 'Order Shipped', type: 'order_shipped', enabled: true },
                    { name: 'Order Delivered', type: 'order_delivered', enabled: true },
                    { name: 'Password Reset', type: 'password_reset', enabled: true },
                    { name: 'Seller Verification', type: 'seller_verification', enabled: true },
                  ].map((template, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{template.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                        <Switch defaultChecked={template.enabled} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <div className="flex justify-end mt-6">
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSaveSettings('email')} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" /> Save Email Settings
              </Button>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Push Notifications</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Enable Push Notifications</p>
                      <p className="text-sm text-muted-foreground">Send real-time push notifications to users</p>
                    </div>
                    <Switch />
                  </div>
                  <div>
                    <Label>Push Provider</Label>
                    <Select defaultValue="firebase">
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="firebase">Firebase Cloud Messaging</SelectItem>
                        <SelectItem value="onesignal">OneSignal</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Firebase API Key</Label>
                    <Input type="password" placeholder="Enter API Key" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Firebase Sender ID</Label>
                    <Input placeholder="Enter Sender ID" className="mt-1.5" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>SMS Notifications</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Enable SMS Notifications</p>
                      <p className="text-sm text-muted-foreground">Send SMS alerts to users</p>
                    </div>
                    <Switch />
                  </div>
                  <div>
                    <Label>SMS Provider</Label>
                    <Select defaultValue="twilio">
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="twilio">Twilio</SelectItem>
                        <SelectItem value="vonage">Vonage</SelectItem>
                        <SelectItem value="custom">Custom Gateway</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Account SID</Label>
                      <Input placeholder="Enter SID" className="mt-1.5" />
                    </div>
                    <div>
                      <Label>Auth Token</Label>
                      <Input type="password" placeholder="Enter Token" className="mt-1.5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Notification Preferences</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { name: 'Order Updates', desc: 'Order placed, shipped, delivered', key: 'orderNotifications' },
                      { name: 'Payment Alerts', desc: 'Payment received, failed, refunded', key: 'paymentNotifications' },
                      { name: 'Promotional', desc: 'Flash sales, discounts, new products', key: 'promotionNotifications' },
                      { name: 'Dispute Alerts', desc: 'New disputes, resolution updates', key: 'disputeNotifications' },
                    ].map((pref, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{pref.name}</p>
                          <p className="text-sm text-muted-foreground">{pref.desc}</p>
                        </div>
                        <Switch checked={settings[pref.key as keyof typeof settings] as boolean} onCheckedChange={v => setSettings({...settings, [pref.key]: v})} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="flex justify-end mt-6">
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSaveSettings('notifications')} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" /> Save Notification Settings
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // ============================================
  // Dispute Management Components
  // ============================================

  // User Disputes Component
  function UserDisputes() {
    const [loading, setLoading] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [selectedOrderForDispute, setSelectedOrderForDispute] = useState<Order | null>(null)
    const [disputeForm, setDisputeForm] = useState({
      type: 'return',
      reason: '',
      description: '',
      requestedAmount: 0
    })
    const [viewingDispute, setViewingDispute] = useState<any>(null)
    const [replyMessage, setReplyMessage] = useState('')

    const disputeReasons: Record<string, string[]> = {
      return: ['Item not as described', 'Wrong item received', 'Item damaged/defective', 'Changed my mind', 'Item does not fit'],
      refund: ['Item not received', 'Item significantly different', 'Counterfeit product', 'Quality issues'],
      replacement: ['Wrong item received', 'Item damaged/defective', 'Missing parts'],
      complaint: ['Late delivery', 'Poor seller communication', 'Packaging issues', 'Other']
    }

    const fetchDisputes = async () => {
      if (!user?.id) return
      setLoading(true)
      try {
        const res = await fetch(`/api/disputes?buyerId=${user.id}&userRole=buyer`)
        if (res.ok) {
          const data = await res.json()
          setDisputes(data.disputes || [])
        }
      } catch (error) {
        console.error('Failed to fetch disputes:', error)
      }
      setLoading(false)
    }

    useEffect(() => {
      fetchDisputes()
    }, [user?.id])

    const handleCreateDispute = async () => {
      if (!user?.id || !selectedOrderForDispute) return
      if (!disputeForm.reason) {
        toast({ title: 'Error', description: 'Please select a reason', variant: 'destructive' })
        return
      }

      setLoading(true)
      try {
        const res = await fetch('/api/disputes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: selectedOrderForDispute.id,
            buyerId: user.id,
            sellerId: selectedOrderForDispute.items[0]?.sellerId || user.sellerProfile?.id,
            type: disputeForm.type,
            reason: disputeForm.reason,
            description: disputeForm.description,
            requestedAmount: disputeForm.type === 'refund' ? disputeForm.requestedAmount : undefined
          })
        })
        const data = await res.json()
        if (res.ok) {
          toast({ title: 'Success', description: 'Dispute created successfully' })
          setShowCreateModal(false)
          setSelectedOrderForDispute(null)
          setDisputeForm({ type: 'return', reason: '', description: '', requestedAmount: 0 })
          fetchDisputes()
        } else {
          toast({ title: 'Error', description: data.error || 'Failed to create dispute', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
      }
      setLoading(false)
    }

    const handleAddReply = async () => {
      if (!viewingDispute || !replyMessage.trim()) return

      setLoading(true)
      try {
        const res = await fetch('/api/disputes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            disputeId: viewingDispute.id,
            action: 'add_message',
            senderId: user?.id,
            senderRole: 'buyer',
            message: replyMessage
          })
        })
        if (res.ok) {
          toast({ title: 'Success', description: 'Reply added successfully' })
          setReplyMessage('')
          // Refresh dispute details
          const detailRes = await fetch(`/api/disputes?disputeId=${viewingDispute.id}`)
          if (detailRes.ok) {
            const data = await detailRes.json()
            setViewingDispute(data.dispute)
          }
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to add reply', variant: 'destructive' })
      }
      setLoading(false)
    }

    const getStatusColor = (status: string) => {
      const colors: Record<string, string> = {
        'OPEN': 'bg-red-100 text-red-800',
        'IN_REVIEW': 'bg-yellow-100 text-yellow-800',
        'RESOLVED_BUYER': 'bg-green-100 text-green-800',
        'RESOLVED_SELLER': 'bg-blue-100 text-blue-800',
        'RESOLVED_PARTIAL': 'bg-purple-100 text-purple-800',
        'CLOSED': 'bg-gray-100 text-gray-800'
      }
      return colors[status] || 'bg-gray-100 text-gray-800'
    }

    // Dispute Detail View
    if (viewingDispute) {
      return (
        <div className="container mx-auto px-4 py-6">
          <Button variant="ghost" className="mb-4" onClick={() => setViewingDispute(null)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Disputes
          </Button>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Dispute Info */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dispute Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Dispute Number</p>
                    <p className="font-mono font-medium">{viewingDispute.dispute_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <Badge variant="outline" className="capitalize">{viewingDispute.type}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reason</p>
                    <p className="font-medium">{viewingDispute.reason}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(viewingDispute.status)}>
                      {viewingDispute.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-sm">{formatDate(viewingDispute.created_at)}</p>
                  </div>
                  {viewingDispute.resolution_type && (
                    <div>
                      <p className="text-sm text-muted-foreground">Resolution</p>
                      <p className="font-medium capitalize">{viewingDispute.resolution_type.replace(/_/g, ' ')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Info */}
              {viewingDispute.orders && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Order Number</p>
                      <p className="font-medium">{viewingDispute.orders.order_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-bold text-emerald-600">{formatPrice(viewingDispute.orders.total)}</p>
                    </div>
                    <Separator />
                    <p className="text-sm text-muted-foreground">Items:</p>
                    {viewingDispute.orders.items?.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                        <Package className="h-4 w-4 text-slate-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-1">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-medium">{formatPrice(item.total_price)}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Messages */}
            <div className="lg:col-span-2">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">Conversation</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto max-h-96 space-y-4">
                  {viewingDispute.messages?.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_role === 'buyer' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-4 rounded-xl ${
                          msg.sender_role === 'buyer'
                            ? 'bg-emerald-600 text-white'
                            : msg.sender_role === 'seller'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-slate-100 text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium opacity-75">
                            {msg.sender_role === 'buyer' ? 'You' : msg.sender_role === 'seller' ? 'Seller' : 'Admin'}
                          </span>
                          <span className="text-xs opacity-50">{formatDate(msg.created_at)}</span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>

                {/* Reply Input */}
                {viewingDispute.status !== 'CLOSED' && !viewingDispute.status.startsWith('RESOLVED') && (
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type your reply..."
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        className="flex-1 min-h-[80px]"
                      />
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 self-end"
                        onClick={handleAddReply}
                        disabled={loading || !replyMessage.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" className="mb-4" onClick={() => setCurrentView('user-dashboard')}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Disputes</h1>
          <Button onClick={() => setShowCreateModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <AlertTriangle className="h-4 w-4 mr-2" /> File New Dispute
          </Button>
        </div>

        {disputes.length > 0 ? (
          <div className="space-y-4">
            {disputes.map((dispute: any) => (
              <Card key={dispute.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setViewingDispute(dispute)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        dispute.status === 'OPEN' ? 'bg-red-100' :
                        dispute.status === 'IN_REVIEW' ? 'bg-yellow-100' :
                        'bg-green-100'
                      }`}>
                        <AlertTriangle className={`h-6 w-6 ${
                          dispute.status === 'OPEN' ? 'text-red-600' :
                          dispute.status === 'IN_REVIEW' ? 'text-yellow-600' :
                          'text-green-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-semibold">{dispute.dispute_number}</p>
                        <p className="text-sm text-muted-foreground">{dispute.orders?.order_number || 'Unknown Order'}</p>
                        <p className="text-sm mt-1">{dispute.reason}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(dispute.status)}>
                        {dispute.status.replace(/_/g, ' ')}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-2">{formatDate(dispute.created_at)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <AlertTriangle className="h-24 w-24 mx-auto text-slate-200 mb-4" />
            <h3 className="text-xl font-medium mb-2">No disputes</h3>
            <p className="text-muted-foreground mb-4">You haven't filed any disputes yet</p>
            <Button onClick={() => setShowCreateModal(true)}>File a Dispute</Button>
          </div>
        )}

        {/* Create Dispute Modal */}
        <Dialog open={showCreateModal} onOpenChange={(open) => { setShowCreateModal(open); if (!open) setSelectedOrderForDispute(null) }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>File a Dispute</DialogTitle>
              <DialogDescription>Report an issue with your order</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {!selectedOrderForDispute ? (
                <>
                  <Label>Select Order</Label>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {orders.filter(o => ['DELIVERED', 'COMPLETED', 'DISPUTED'].includes(o.status)).map((order) => (
                      <div
                        key={order.id}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-slate-50"
                        onClick={() => setSelectedOrderForDispute(order)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{order.orderNumber}</p>
                            <p className="text-sm text-muted-foreground">{order.items.length} items</p>
                          </div>
                          <p className="font-bold">{formatPrice(order.total)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {orders.filter(o => ['DELIVERED', 'COMPLETED', 'DISPUTED'].includes(o.status)).length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No eligible orders for dispute</p>
                  )}
                </>
              ) : (
                <>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="font-medium">{selectedOrderForDispute.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">{selectedOrderForDispute.items.length} items • {formatPrice(selectedOrderForDispute.total)}</p>
                  </div>
                  <div>
                    <Label>Dispute Type</Label>
                    <Select value={disputeForm.type} onValueChange={(v) => setDisputeForm({...disputeForm, type: v, reason: ''})}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="return">Return</SelectItem>
                        <SelectItem value="refund">Refund</SelectItem>
                        <SelectItem value="replacement">Replacement</SelectItem>
                        <SelectItem value="complaint">Complaint</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Reason</Label>
                    <Select value={disputeForm.reason} onValueChange={(v) => setDisputeForm({...disputeForm, reason: v})}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {(disputeReasons[disputeForm.type] || []).map((reason) => (
                          <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {disputeForm.type === 'refund' && (
                    <div>
                      <Label>Requested Amount (PKR)</Label>
                      <Input
                        type="number"
                        value={disputeForm.requestedAmount}
                        onChange={(e) => setDisputeForm({...disputeForm, requestedAmount: parseFloat(e.target.value) || 0})}
                        className="mt-1.5"
                        placeholder={String(selectedOrderForDispute.total)}
                      />
                    </div>
                  )}
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={disputeForm.description}
                      onChange={(e) => setDisputeForm({...disputeForm, description: e.target.value})}
                      className="mt-1.5"
                      placeholder="Provide additional details about your issue..."
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setSelectedOrderForDispute(null)}>Back</Button>
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleCreateDispute} disabled={loading}>
                      Submit Dispute
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Seller Disputes Component
  function SellerDisputes() {
    const [loading, setLoading] = useState(false)
    const [viewingDispute, setViewingDispute] = useState<any>(null)
    const [replyMessage, setReplyMessage] = useState('')

    const fetchDisputes = async () => {
      if (!user?.sellerProfile?.id) return
      setLoading(true)
      try {
        const res = await fetch(`/api/disputes?sellerId=${user.sellerProfile.id}&userRole=seller`)
        if (res.ok) {
          const data = await res.json()
          setDisputes(data.disputes || [])
        }
      } catch (error) {
        console.error('Failed to fetch disputes:', error)
      }
      setLoading(false)
    }

    useEffect(() => {
      fetchDisputes()
    }, [user?.sellerProfile?.id])

    const handleAddReply = async () => {
      if (!viewingDispute || !replyMessage.trim()) return

      setLoading(true)
      try {
        const res = await fetch('/api/disputes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            disputeId: viewingDispute.id,
            action: 'add_message',
            senderId: user?.id,
            senderRole: 'seller',
            message: replyMessage
          })
        })
        if (res.ok) {
          toast({ title: 'Success', description: 'Reply added successfully' })
          setReplyMessage('')
          const detailRes = await fetch(`/api/disputes?disputeId=${viewingDispute.id}`)
          if (detailRes.ok) {
            const data = await detailRes.json()
            setViewingDispute(data.dispute)
          }
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to add reply', variant: 'destructive' })
      }
      setLoading(false)
    }

    const getStatusColor = (status: string) => {
      const colors: Record<string, string> = {
        'OPEN': 'bg-red-100 text-red-800',
        'IN_REVIEW': 'bg-yellow-100 text-yellow-800',
        'RESOLVED_BUYER': 'bg-green-100 text-green-800',
        'RESOLVED_SELLER': 'bg-blue-100 text-blue-800',
        'RESOLVED_PARTIAL': 'bg-purple-100 text-purple-800',
        'CLOSED': 'bg-gray-100 text-gray-800'
      }
      return colors[status] || 'bg-gray-100 text-gray-800'
    }

    // Dispute Detail View
    if (viewingDispute) {
      return (
        <div className="container mx-auto px-4 py-6">
          <Button variant="ghost" className="mb-4" onClick={() => setViewingDispute(null)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Disputes
          </Button>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Dispute Info */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dispute Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Dispute Number</p>
                    <p className="font-mono font-medium">{viewingDispute.dispute_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Buyer</p>
                    <p className="font-medium">{viewingDispute.buyer?.first_name} {viewingDispute.buyer?.last_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <Badge variant="outline" className="capitalize">{viewingDispute.type}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reason</p>
                    <p className="font-medium">{viewingDispute.reason}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(viewingDispute.status)}>
                      {viewingDispute.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  {viewingDispute.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="text-sm">{viewingDispute.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Info */}
              {viewingDispute.orders && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Order Number</p>
                      <p className="font-medium">{viewingDispute.orders.order_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-bold text-emerald-600">{formatPrice(viewingDispute.orders.total)}</p>
                    </div>
                    <Separator />
                    {viewingDispute.orders.items?.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                        <Package className="h-4 w-4 text-slate-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-1">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-medium">{formatPrice(item.total_price)}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Messages */}
            <div className="lg:col-span-2">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">Conversation</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto max-h-96 space-y-4">
                  {viewingDispute.messages?.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_role === 'seller' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-4 rounded-xl ${
                          msg.sender_role === 'seller'
                            ? 'bg-blue-600 text-white'
                            : msg.sender_role === 'buyer'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-slate-100 text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium opacity-75">
                            {msg.sender_role === 'seller' ? 'You' : msg.sender_role === 'buyer' ? 'Buyer' : 'Admin'}
                          </span>
                          <span className="text-xs opacity-50">{formatDate(msg.created_at)}</span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>

                {/* Reply Input */}
                {viewingDispute.status !== 'CLOSED' && !viewingDispute.status.startsWith('RESOLVED') && (
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type your response..."
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        className="flex-1 min-h-[80px]"
                      />
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 self-end"
                        onClick={handleAddReply}
                        disabled={loading || !replyMessage.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" className="mb-4" onClick={() => setCurrentView('seller-dashboard')}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Button>

        <h1 className="text-2xl font-bold mb-6">Disputes</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Open', value: disputes.filter(d => d.status === 'OPEN').length, color: 'text-red-600', bg: 'bg-red-100' },
            { label: 'In Review', value: disputes.filter(d => d.status === 'IN_REVIEW').length, color: 'text-yellow-600', bg: 'bg-yellow-100' },
            { label: 'Resolved', value: disputes.filter(d => d.status.startsWith('RESOLVED')).length, color: 'text-green-600', bg: 'bg-green-100' },
            { label: 'Closed', value: disputes.filter(d => d.status === 'CLOSED').length, color: 'text-gray-600', bg: 'bg-gray-100' },
          ].map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-2`}>
                  <AlertTriangle className={`h-5 w-5 ${stat.color}`} />
                </div>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {disputes.length > 0 ? (
          <div className="space-y-4">
            {disputes.map((dispute: any) => (
              <Card key={dispute.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setViewingDispute(dispute)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        dispute.status === 'OPEN' ? 'bg-red-100' :
                        dispute.status === 'IN_REVIEW' ? 'bg-yellow-100' :
                        'bg-green-100'
                      }`}>
                        <AlertTriangle className={`h-6 w-6 ${
                          dispute.status === 'OPEN' ? 'text-red-600' :
                          dispute.status === 'IN_REVIEW' ? 'text-yellow-600' :
                          'text-green-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-semibold">{dispute.dispute_number}</p>
                        <p className="text-sm text-muted-foreground">
                          Buyer: {dispute.buyer?.first_name} {dispute.buyer?.last_name}
                        </p>
                        <p className="text-sm mt-1"><span className="capitalize">{dispute.type}</span>: {dispute.reason}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(dispute.status)}>
                        {dispute.status.replace(/_/g, ' ')}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-2">{formatDate(dispute.created_at)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <CheckCircle className="h-24 w-24 mx-auto text-slate-200 mb-4" />
            <h3 className="text-xl font-medium mb-2">No disputes</h3>
            <p className="text-muted-foreground">Great! You have no active disputes</p>
          </div>
        )}
      </div>
    )
  }

  // Admin Disputes Component
  function AdminDisputes() {
    const [loading, setLoading] = useState(false)
    const [viewingDispute, setViewingDispute] = useState<any>(null)
    const [replyMessage, setReplyMessage] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [typeFilter, setTypeFilter] = useState('all')
    const [resolutionType, setResolutionType] = useState('full_refund')
    const [resolutionAmount, setResolutionAmount] = useState(0)
    const [resolutionNotes, setResolutionNotes] = useState('')
    const [showResolveModal, setShowResolveModal] = useState(false)

    const fetchDisputes = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ isAdmin: 'true', userRole: 'admin' })
        if (statusFilter !== 'all') params.append('status', statusFilter)
        if (typeFilter !== 'all') params.append('type', typeFilter)
        
        const res = await fetch(`/api/disputes?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setDisputes(data.disputes || [])
        }
      } catch (error) {
        console.error('Failed to fetch disputes:', error)
      }
      setLoading(false)
    }

    useEffect(() => {
      fetchDisputes()
    }, [statusFilter, typeFilter])

    const handleAddReply = async () => {
      if (!viewingDispute || !replyMessage.trim()) return

      setLoading(true)
      try {
        const res = await fetch('/api/disputes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            disputeId: viewingDispute.id,
            action: 'add_message',
            senderId: user?.id,
            senderRole: 'admin',
            message: replyMessage
          })
        })
        if (res.ok) {
          toast({ title: 'Success', description: 'Reply added successfully' })
          setReplyMessage('')
          const detailRes = await fetch(`/api/disputes?disputeId=${viewingDispute.id}`)
          if (detailRes.ok) {
            const data = await detailRes.json()
            setViewingDispute(data.dispute)
          }
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to add reply', variant: 'destructive' })
      }
      setLoading(false)
    }

    const handleResolve = async () => {
      if (!viewingDispute) return

      setLoading(true)
      try {
        const res = await fetch('/api/disputes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            disputeId: viewingDispute.id,
            action: 'resolve',
            resolutionType,
            resolutionAmount: resolutionType === 'partial_refund' ? resolutionAmount : undefined,
            resolutionNotes,
            refundToWallet: true,
            resolvedBy: user?.id
          })
        })
        if (res.ok) {
          toast({ title: 'Success', description: 'Dispute resolved successfully' })
          setShowResolveModal(false)
          setViewingDispute(null)
          fetchDisputes()
        } else {
          const data = await res.json()
          toast({ title: 'Error', description: data.error || 'Failed to resolve dispute', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to resolve dispute', variant: 'destructive' })
      }
      setLoading(false)
    }

    const getStatusColor = (status: string) => {
      const colors: Record<string, string> = {
        'OPEN': 'bg-red-100 text-red-800',
        'IN_REVIEW': 'bg-yellow-100 text-yellow-800',
        'RESOLVED_BUYER': 'bg-green-100 text-green-800',
        'RESOLVED_SELLER': 'bg-blue-100 text-blue-800',
        'RESOLVED_PARTIAL': 'bg-purple-100 text-purple-800',
        'CLOSED': 'bg-gray-100 text-gray-800'
      }
      return colors[status] || 'bg-gray-100 text-gray-800'
    }

    // Dispute Detail View
    if (viewingDispute && !showResolveModal) {
      return (
        <div className="container mx-auto px-4 py-6">
          <Button variant="ghost" className="mb-4" onClick={() => setViewingDispute(null)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Disputes
          </Button>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Dispute Info */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dispute Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Dispute Number</p>
                    <p className="font-mono font-medium">{viewingDispute.dispute_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Buyer</p>
                    <p className="font-medium">{viewingDispute.buyer?.first_name} {viewingDispute.buyer?.last_name}</p>
                    <p className="text-xs text-muted-foreground">{viewingDispute.buyer?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Seller</p>
                    <p className="font-medium">{viewingDispute.seller?.store_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <Badge variant="outline" className="capitalize">{viewingDispute.type}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reason</p>
                    <p className="font-medium">{viewingDispute.reason}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(viewingDispute.status)}>
                      {viewingDispute.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Order Info */}
              {viewingDispute.orders && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Order Number</p>
                      <p className="font-medium">{viewingDispute.orders.order_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Status</p>
                      <Badge variant="outline">{viewingDispute.orders.payment_status}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-bold text-emerald-600">{formatPrice(viewingDispute.orders.total)}</p>
                    </div>
                    <Separator />
                    {viewingDispute.orders.items?.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                        <Package className="h-4 w-4 text-slate-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-1">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-medium">{formatPrice(item.total_price)}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Resolution Actions */}
              {viewingDispute.status !== 'CLOSED' && !viewingDispute.status.startsWith('RESOLVED') && (
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardHeader>
                    <CardTitle className="text-lg text-emerald-800">Resolve Dispute</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        setResolutionAmount(viewingDispute.orders?.total || 0)
                        setShowResolveModal(true)
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" /> Resolve Dispute
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Messages */}
            <div className="lg:col-span-2">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">Conversation Thread</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto max-h-96 space-y-4">
                  {viewingDispute.messages?.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-4 rounded-xl ${
                          msg.sender_role === 'admin'
                            ? 'bg-slate-800 text-white'
                            : msg.sender_role === 'seller'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium opacity-75 capitalize">
                            {msg.sender_role}
                          </span>
                          <span className="text-xs opacity-50">{formatDate(msg.created_at)}</span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>

                {/* Reply Input */}
                {viewingDispute.status !== 'CLOSED' && !viewingDispute.status.startsWith('RESOLVED') && (
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type admin response..."
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        className="flex-1 min-h-[80px]"
                      />
                      <Button
                        className="bg-slate-800 hover:bg-slate-700 self-end"
                        onClick={handleAddReply}
                        disabled={loading || !replyMessage.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Dispute Management</h1>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_REVIEW">In Review</SelectItem>
                <SelectItem value="RESOLVED_BUYER">Resolved (Buyer)</SelectItem>
                <SelectItem value="RESOLVED_SELLER">Resolved (Seller)</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="return">Return</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
                <SelectItem value="replacement">Replacement</SelectItem>
                <SelectItem value="complaint">Complaint</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Total', value: disputes.length, color: 'text-slate-600', bg: 'bg-slate-100' },
            { label: 'Open', value: disputes.filter(d => d.status === 'OPEN').length, color: 'text-red-600', bg: 'bg-red-100' },
            { label: 'In Review', value: disputes.filter(d => d.status === 'IN_REVIEW').length, color: 'text-yellow-600', bg: 'bg-yellow-100' },
            { label: 'Resolved', value: disputes.filter(d => d.status.startsWith('RESOLVED')).length, color: 'text-green-600', bg: 'bg-green-100' },
            { label: 'Closed', value: disputes.filter(d => d.status === 'CLOSED').length, color: 'text-gray-600', bg: 'bg-gray-100' },
          ].map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-2`}>
                  <AlertTriangle className={`h-5 w-5 ${stat.color}`} />
                </div>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {disputes.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-4 font-medium">Dispute</th>
                      <th className="text-left p-4 font-medium">Buyer</th>
                      <th className="text-left p-4 font-medium">Seller</th>
                      <th className="text-left p-4 font-medium">Type</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {disputes.map((dispute: any) => (
                      <tr key={dispute.id} className={`hover:bg-slate-50 ${dispute.status === 'OPEN' ? 'bg-red-50' : ''}`}>
                        <td className="p-4">
                          <p className="font-medium">{dispute.dispute_number}</p>
                          <p className="text-xs text-muted-foreground">{dispute.reason}</p>
                        </td>
                        <td className="p-4">
                          <p>{dispute.buyer?.first_name} {dispute.buyer?.last_name}</p>
                        </td>
                        <td className="p-4">{dispute.seller?.store_name}</td>
                        <td className="p-4">
                          <Badge variant="outline" className="capitalize">{dispute.type}</Badge>
                        </td>
                        <td className="p-4">
                          <Badge className={getStatusColor(dispute.status)}>
                            {dispute.status.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="p-4 text-muted-foreground text-sm">{formatDate(dispute.created_at)}</td>
                        <td className="p-4">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setViewingDispute(dispute)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {dispute.status !== 'CLOSED' && !dispute.status.startsWith('RESOLVED') && (
                              <Button variant="ghost" size="sm" className="text-emerald-600" onClick={() => {
                                setViewingDispute(dispute)
                                setResolutionAmount(dispute.orders?.total || 0)
                                setShowResolveModal(true)
                              }}>
                                Resolve
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-16">
            <CheckCircle className="h-24 w-24 mx-auto text-slate-200 mb-4" />
            <h3 className="text-xl font-medium mb-2">No disputes found</h3>
            <p className="text-muted-foreground">No disputes match the selected filters</p>
          </div>
        )}

        {/* Resolve Modal */}
        <Dialog open={showResolveModal} onOpenChange={(open) => { setShowResolveModal(open); if (!open) setResolutionNotes('') }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Resolve Dispute</DialogTitle>
              <DialogDescription>Choose how to resolve this dispute</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {viewingDispute && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="font-medium">{viewingDispute.dispute_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {viewingDispute.buyer?.first_name} vs {viewingDispute.seller?.store_name}
                  </p>
                  <p className="text-lg font-bold mt-2">{formatPrice(viewingDispute.orders?.total || 0)}</p>
                </div>
              )}
              <div>
                <Label>Resolution Action</Label>
                <Select value={resolutionType} onValueChange={setResolutionType}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_refund">Full Refund to Buyer</SelectItem>
                    <SelectItem value="partial_refund">Partial Refund</SelectItem>
                    <SelectItem value="dispute_rejected">Reject Dispute (Seller Wins)</SelectItem>
                    <SelectItem value="replacement_sent">Replacement Sent</SelectItem>
                    <SelectItem value="return_accepted">Return Accepted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {resolutionType === 'partial_refund' && (
                <div>
                  <Label>Refund Amount (PKR)</Label>
                  <Input
                    type="number"
                    value={resolutionAmount}
                    onChange={(e) => setResolutionAmount(parseFloat(e.target.value) || 0)}
                    className="mt-1.5"
                  />
                </div>
              )}
              <div>
                <Label>Admin Notes</Label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="mt-1.5"
                  placeholder="Add notes about this resolution..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowResolveModal(false)}>Cancel</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleResolve} disabled={loading}>
                  Confirm Resolution
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ============================================
  // Admin Financials Dashboard
  // ============================================

  function AdminFinancials() {
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState('month')
    const [financialData, setFinancialData] = useState({
      summary: {
        totalRevenue: 0,
        productRevenue: 0,
        shippingRevenue: 0,
        totalCommission: 0,
        sellerEarnings: 0,
        totalPayouts: 0,
        pendingPayouts: 0,
        totalRefunds: 0,
        platformProfit: 0,
        netRevenue: 0,
        discountGiven: 0,
        taxCollected: 0
      },
      paymentMethodTotals: [] as any[],
      dailyFinancials: [] as any[],
      payouts: [] as any[],
      refunds: [] as any[]
    })
    const [payouts, setPayouts] = useState<any[]>([])
    const [selectedPayout, setSelectedPayout] = useState<any>(null)
    const [showPayoutModal, setShowPayoutModal] = useState(false)

    const fetchFinancialData = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/reports?type=financial&period=${period}`)
        if (res.ok) {
          const data = await res.json()
          setFinancialData(data)
        }

        const payoutsRes = await fetch('/api/payouts?pageSize=20')
        if (payoutsRes.ok) {
          const payoutsData = await payoutsRes.json()
          setPayouts(payoutsData.payouts || [])
        }
      } catch (error) {
        console.error('Failed to fetch financial data:', error)
      }
      setLoading(false)
    }

    useEffect(() => {
      fetchFinancialData()
    }, [period])

    const handleProcessPayout = async (payoutId: string, action: 'process' | 'complete' | 'fail') => {
      try {
        const res = await fetch('/api/payouts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payoutId, action, userId: user?.id })
        })
        if (res.ok) {
          toast({ title: 'Payout Updated', description: `Payout has been ${action}ed` })
          fetchFinancialData()
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to update payout', variant: 'destructive' })
      }
    }

    const exportReport = async (format: 'csv' | 'excel') => {
      window.open(`/api/reports?type=financial&period=${period}&format=${format}`, '_blank')
    }

    return (
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Financial Dashboard</h1>
            <p className="text-muted-foreground">Revenue, payouts, commissions, and fees overview</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportReport('csv')}>Export CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportReport('excel')}>Export Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm text-muted-foreground">Total Revenue</span>
                  </div>
                  <p className="text-2xl font-bold">{formatPrice(financialData.summary.totalRevenue)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <span className="text-sm text-muted-foreground">Commission</span>
                  </div>
                  <p className="text-2xl font-bold">{formatPrice(financialData.summary.totalCommission)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-5 w-5 text-purple-600" />
                    <span className="text-sm text-muted-foreground">Seller Earnings</span>
                  </div>
                  <p className="text-2xl font-bold">{formatPrice(financialData.summary.sellerEarnings)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-5 w-5 text-orange-600" />
                    <span className="text-sm text-muted-foreground">Payouts</span>
                  </div>
                  <p className="text-2xl font-bold">{formatPrice(financialData.summary.totalPayouts)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm text-muted-foreground">Pending</span>
                  </div>
                  <p className="text-2xl font-bold">{formatPrice(financialData.summary.pendingPayouts)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUp className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-muted-foreground">Net Profit</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">{formatPrice(financialData.summary.platformProfit)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Revenue Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm">Product Sales</span>
                      <span className="font-semibold">{formatPrice(financialData.summary.productRevenue)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm">Shipping Fees</span>
                      <span className="font-semibold">{formatPrice(financialData.summary.shippingRevenue)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm">Discounts Given</span>
                      <span className="font-semibold text-red-600">-{formatPrice(financialData.summary.discountGiven)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm">Tax Collected</span>
                      <span className="font-semibold">{formatPrice(financialData.summary.taxCollected)}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                      <span className="font-medium">Net Revenue</span>
                      <span className="font-bold text-emerald-600">{formatPrice(financialData.summary.netRevenue)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Methods</CardTitle>
                </CardHeader>
                <CardContent>
                  {financialData.paymentMethodTotals.length > 0 ? (
                    <div className="space-y-4">
                      {financialData.paymentMethodTotals.map((pm: any) => (
                        <div key={pm.method} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{pm.method.replace('_', ' ')}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatPrice(pm.total)}</p>
                            <p className="text-xs text-muted-foreground">{pm.count} transactions</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No payment data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Payout Requests */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Recent Payout Requests</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setCurrentView('admin-sellers')}>
                    View All Sellers
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {payouts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 text-sm font-medium">ID</th>
                          <th className="text-left p-3 text-sm font-medium">Seller</th>
                          <th className="text-left p-3 text-sm font-medium">Amount</th>
                          <th className="text-left p-3 text-sm font-medium">Method</th>
                          <th className="text-left p-3 text-sm font-medium">Status</th>
                          <th className="text-left p-3 text-sm font-medium">Created</th>
                          <th className="text-left p-3 text-sm font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payouts.slice(0, 10).map((payout: any) => (
                          <tr key={payout.id} className="border-b hover:bg-slate-50">
                            <td className="p-3 text-sm font-mono">{payout.id.slice(0, 8)}...</td>
                            <td className="p-3 text-sm">{payout.seller?.storeName || 'N/A'}</td>
                            <td className="p-3 text-sm font-semibold">{formatPrice(payout.amount)}</td>
                            <td className="p-3 text-sm">{payout.payoutMethod || 'Bank Transfer'}</td>
                            <td className="p-3">
                              <Badge className={getStatusColor(payout.status)}>{payout.status}</Badge>
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">{formatDate(payout.createdAt)}</td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                {payout.status === 'PENDING' && (
                                  <Button size="sm" variant="outline" onClick={() => handleProcessPayout(payout.id, 'process')}>
                                    Process
                                  </Button>
                                )}
                                {payout.status === 'PROCESSING' && (
                                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleProcessPayout(payout.id, 'complete')}>
                                    Complete
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No payout requests
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    )
  }

  // ============================================
  // Admin Shipping Management
  // ============================================

  function AdminShipping() {
    const [loading, setLoading] = useState(false)
    const [deliveryZones, setDeliveryZones] = useState<any[]>([])
    const [couriers, setCouriers] = useState<any[]>([])
    const [showZoneModal, setShowZoneModal] = useState(false)
    const [showCourierModal, setShowCourierModal] = useState(false)
    const [editingZone, setEditingZone] = useState<any>(null)
    const [editingCourier, setEditingCourier] = useState<any>(null)
    const [zoneForm, setZoneForm] = useState({
      name: '',
      provinces: '',
      cities: '',
      baseFee: 150,
      perKgFee: 50,
      freeDeliveryMinimum: 5000,
      estimatedDays: 3,
      isActive: true
    })
    const [courierForm, setCourierForm] = useState({
      name: '',
      code: '',
      phone: '',
      email: '',
      apiEndpoint: '',
      apiKey: '',
      hasTracking: true,
      hasCod: true,
      isActive: true
    })

    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/settings?group=shipping')
        if (res.ok) {
          const data = await res.json()
          setDeliveryZones(data.deliveryZones || [])
          setCouriers(data.couriers || [])
        }
      } catch (error) {
        console.error('Failed to fetch shipping data:', error)
      }
      setLoading(false)
    }

    useEffect(() => {
      fetchData()
    }, [])

    const handleSaveZone = async () => {
      try {
        const res = await fetch('/api/shipping/zones', {
          method: editingZone ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...zoneForm,
            zoneId: editingZone?.id,
            userId: user?.id
          })
        })
        if (res.ok) {
          toast({ title: 'Zone Saved', description: 'Delivery zone has been saved' })
          setShowZoneModal(false)
          fetchData()
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to save zone', variant: 'destructive' })
      }
    }

    const handleSaveCourier = async () => {
      try {
        const res = await fetch('/api/shipping/couriers', {
          method: editingCourier ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...courierForm,
            courierId: editingCourier?.id,
            userId: user?.id
          })
        })
        if (res.ok) {
          toast({ title: 'Courier Saved', description: 'Courier has been saved' })
          setShowCourierModal(false)
          fetchData()
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to save courier', variant: 'destructive' })
      }
    }

    const openAddZone = () => {
      setEditingZone(null)
      setZoneForm({
        name: '',
        provinces: '',
        cities: '',
        baseFee: 150,
        perKgFee: 50,
        freeDeliveryMinimum: 5000,
        estimatedDays: 3,
        isActive: true
      })
      setShowZoneModal(true)
    }

    const openAddCourier = () => {
      setEditingCourier(null)
      setCourierForm({
        name: '',
        code: '',
        phone: '',
        email: '',
        apiEndpoint: '',
        apiKey: '',
        hasTracking: true,
        hasCod: true,
        isActive: true
      })
      setShowCourierModal(true)
    }

    return (
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Shipping Management</h1>
            <p className="text-muted-foreground">Manage delivery zones, couriers, and shipping rates</p>
          </div>
        </div>

        <Tabs defaultValue="zones" className="space-y-6">
          <TabsList>
            <TabsTrigger value="zones">Delivery Zones</TabsTrigger>
            <TabsTrigger value="couriers">Couriers</TabsTrigger>
            <TabsTrigger value="rates">Shipping Rates</TabsTrigger>
          </TabsList>

          <TabsContent value="zones">
            <div className="flex items-center justify-end mb-4">
              <Button onClick={openAddZone} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <Plus className="h-4 w-4" /> Add Zone
              </Button>
            </div>

            {deliveryZones.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deliveryZones.map((zone: any) => (
                  <Card key={zone.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{zone.name}</CardTitle>
                        <Badge className={zone.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {zone.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Base Fee:</span>
                          <span className="font-medium">{formatPrice(zone.baseFee)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Per Kg Fee:</span>
                          <span className="font-medium">{formatPrice(zone.perKgFee)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Free Delivery Min:</span>
                          <span className="font-medium">{formatPrice(zone.freeDeliveryMinimum || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Est. Days:</span>
                          <span className="font-medium">{zone.estimatedDays} days</span>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                          setEditingZone(zone)
                          setZoneForm({
                            name: zone.name,
                            provinces: zone.provinces || '',
                            cities: zone.cities || '',
                            baseFee: zone.baseFee,
                            perKgFee: zone.perKgFee,
                            freeDeliveryMinimum: zone.freeDeliveryMinimum || 5000,
                            estimatedDays: zone.estimatedDays,
                            isActive: zone.isActive
                          })
                          setShowZoneModal(true)
                        }}>
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Truck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No delivery zones configured</h3>
                  <p className="text-muted-foreground mb-4">Create delivery zones to set up shipping rates</p>
                  <Button onClick={openAddZone} className="bg-emerald-600 hover:bg-emerald-700">
                    Create First Zone
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="couriers">
            <div className="flex items-center justify-end mb-4">
              <Button onClick={openAddCourier} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <Plus className="h-4 w-4" /> Add Courier
              </Button>
            </div>

            {couriers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {couriers.map((courier: any) => (
                  <Card key={courier.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{courier.name}</CardTitle>
                        <Badge className={courier.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {courier.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{courier.code}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{courier.phone || 'Not set'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{courier.email || 'Not set'}</span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          {courier.hasTracking && <Badge variant="secondary">Tracking</Badge>}
                          {courier.hasCod && <Badge variant="secondary">COD</Badge>}
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <Button variant="outline" size="sm" className="w-full" onClick={() => {
                        setEditingCourier(courier)
                        setCourierForm({
                          name: courier.name,
                          code: courier.code,
                          phone: courier.phone || '',
                          email: courier.email || '',
                          apiEndpoint: courier.apiEndpoint || '',
                          apiKey: '',
                          hasTracking: courier.hasTracking,
                          hasCod: courier.hasCod,
                          isActive: courier.isActive
                        })
                        setShowCourierModal(true)
                      }}>
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No couriers configured</h3>
                  <p className="text-muted-foreground mb-4">Add courier partners for order fulfillment</p>
                  <Button onClick={openAddCourier} className="bg-emerald-600 hover:bg-emerald-700">
                    Add First Courier
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rates">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Rate Calculator</CardTitle>
                <CardDescription>Configure global shipping rate settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Default Shipping Fee (PKR)</Label>
                    <Input type="number" defaultValue={150} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Free Shipping Threshold (PKR)</Label>
                    <Input type="number" defaultValue={5000} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Per Kg Additional Fee (PKR)</Label>
                    <Input type="number" defaultValue={50} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>COD Fee (PKR)</Label>
                    <Input type="number" defaultValue={100} className="mt-1.5" />
                  </div>
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Save className="h-4 w-4 mr-2" /> Save Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Zone Modal */}
        <Dialog open={showZoneModal} onOpenChange={setShowZoneModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingZone ? 'Edit Zone' : 'Add Delivery Zone'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Zone Name</Label>
                <Input value={zoneForm.name} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} className="mt-1.5" placeholder="e.g., Punjab Metro" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Base Fee (PKR)</Label>
                  <Input type="number" value={zoneForm.baseFee} onChange={(e) => setZoneForm({ ...zoneForm, baseFee: parseFloat(e.target.value) })} className="mt-1.5" />
                </div>
                <div>
                  <Label>Per Kg Fee (PKR)</Label>
                  <Input type="number" value={zoneForm.perKgFee} onChange={(e) => setZoneForm({ ...zoneForm, perKgFee: parseFloat(e.target.value) })} className="mt-1.5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Free Delivery Min (PKR)</Label>
                  <Input type="number" value={zoneForm.freeDeliveryMinimum} onChange={(e) => setZoneForm({ ...zoneForm, freeDeliveryMinimum: parseFloat(e.target.value) })} className="mt-1.5" />
                </div>
                <div>
                  <Label>Est. Delivery Days</Label>
                  <Input type="number" value={zoneForm.estimatedDays} onChange={(e) => setZoneForm({ ...zoneForm, estimatedDays: parseInt(e.target.value) })} className="mt-1.5" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={zoneForm.isActive} onCheckedChange={(checked) => setZoneForm({ ...zoneForm, isActive: checked })} />
                <Label>Active</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowZoneModal(false)}>Cancel</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveZone}>Save Zone</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Courier Modal */}
        <Dialog open={showCourierModal} onOpenChange={setShowCourierModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCourier ? 'Edit Courier' : 'Add Courier'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Courier Name</Label>
                  <Input value={courierForm.name} onChange={(e) => setCourierForm({ ...courierForm, name: e.target.value })} className="mt-1.5" placeholder="e.g., TCS" />
                </div>
                <div>
                  <Label>Code</Label>
                  <Input value={courierForm.code} onChange={(e) => setCourierForm({ ...courierForm, code: e.target.value })} className="mt-1.5" placeholder="e.g., TCS" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input value={courierForm.phone} onChange={(e) => setCourierForm({ ...courierForm, phone: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={courierForm.email} onChange={(e) => setCourierForm({ ...courierForm, email: e.target.value })} className="mt-1.5" />
                </div>
              </div>
              <div>
                <Label>API Endpoint (Optional)</Label>
                <Input value={courierForm.apiEndpoint} onChange={(e) => setCourierForm({ ...courierForm, apiEndpoint: e.target.value })} className="mt-1.5" placeholder="https://api.courier.com" />
              </div>
              <div>
                <Label>API Key (Optional)</Label>
                <Input type="password" value={courierForm.apiKey} onChange={(e) => setCourierForm({ ...courierForm, apiKey: e.target.value })} className="mt-1.5" />
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={courierForm.hasTracking} onCheckedChange={(checked) => setCourierForm({ ...courierForm, hasTracking: checked })} />
                  <Label>Tracking</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={courierForm.hasCod} onCheckedChange={(checked) => setCourierForm({ ...courierForm, hasCod: checked })} />
                  <Label>COD</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={courierForm.isActive} onCheckedChange={(checked) => setCourierForm({ ...courierForm, isActive: checked })} />
                  <Label>Active</Label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowCourierModal(false)}>Cancel</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveCourier}>Save Courier</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ============================================
  // Admin Marketing Dashboard
  // ============================================

  function AdminMarketing() {
    const [loading, setLoading] = useState(false)
    const [banners, setBanners] = useState<any[]>([])
    const [coupons, setCoupons] = useState<any[]>([])
    const [flashSales, setFlashSales] = useState<any[]>([])
    const [showBannerModal, setShowBannerModal] = useState(false)
    const [showCouponModal, setShowCouponModal] = useState(false)
    const [showFlashSaleModal, setShowFlashSaleModal] = useState(false)
    const [bannerForm, setBannerForm] = useState({
      title: '',
      subtitle: '',
      imageUrl: '',
      linkUrl: '',
      position: 'hero',
      isActive: true
    })
    const [couponForm, setCouponForm] = useState({
      code: '',
      name: '',
      type: 'PERCENTAGE',
      discountValue: 10,
      minOrderValue: 0,
      maxUses: 100,
      validFrom: '',
      validUntil: '',
      isActive: true
    })
    const [flashSaleForm, setFlashSaleForm] = useState({
      name: '',
      description: '',
      discountPercentage: 20,
      startTime: '',
      endTime: '',
      isActive: true
    })
    const [editingFlashSale, setEditingFlashSale] = useState<any>(null)

    const fetchData = async () => {
      setLoading(true)
      try {
        const [bannersRes, couponsRes, flashSalesRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/coupons'),
          fetch('/api/flash-sale?admin=true')
        ])

        if (bannersRes.ok) {
          const data = await bannersRes.json()
          setBanners(data.banners || [])
        }

        if (couponsRes.ok) {
          const data = await couponsRes.json()
          setCoupons(data.coupons || [])
        }

        if (flashSalesRes.ok) {
          const data = await flashSalesRes.json()
          setFlashSales(data.flashSales || [])
        }
      } catch (error) {
        console.error('Failed to fetch marketing data:', error)
      }
      setLoading(false)
    }

    useEffect(() => {
      fetchData()
    }, [])

    const handleSaveBanner = async () => {
      try {
        const res = await fetch('/api/banners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...bannerForm, userId: user?.id })
        })
        if (res.ok) {
          toast({ title: 'Banner Saved', description: 'Banner has been created' })
          setShowBannerModal(false)
          fetchData()
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to save banner', variant: 'destructive' })
      }
    }

    const handleSaveCoupon = async () => {
      try {
        const res = await fetch('/api/coupons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...couponForm, userId: user?.id })
        })
        if (res.ok) {
          toast({ title: 'Coupon Saved', description: 'Coupon has been created' })
          setShowCouponModal(false)
          fetchData()
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to save coupon', variant: 'destructive' })
      }
    }

    const handleSaveFlashSale = async () => {
      try {
        const method = editingFlashSale ? 'PUT' : 'POST'
        const body = editingFlashSale 
          ? { ...flashSaleForm, id: editingFlashSale.id }
          : flashSaleForm
        
        const res = await fetch('/api/flash-sale', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        if (res.ok) {
          toast({ 
            title: editingFlashSale ? 'Flash Sale Updated' : 'Flash Sale Created', 
            description: `Flash sale has been ${editingFlashSale ? 'updated' : 'created'} successfully` 
          })
          setShowFlashSaleModal(false)
          setEditingFlashSale(null)
          setFlashSaleForm({
            name: '',
            description: '',
            discountPercentage: 20,
            startTime: '',
            endTime: '',
            isActive: true
          })
          fetchData()
        } else {
          const data = await res.json()
          toast({ title: 'Error', description: data.error || 'Failed to save flash sale', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to save flash sale', variant: 'destructive' })
      }
    }

    const handleDeleteFlashSale = async (id: string) => {
      if (!confirm('Are you sure you want to delete this flash sale?')) return
      try {
        const res = await fetch(`/api/flash-sale?id=${id}`, { method: 'DELETE' })
        if (res.ok) {
          toast({ title: 'Flash Sale Deleted', description: 'Flash sale has been deleted' })
          fetchData()
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete flash sale', variant: 'destructive' })
      }
    }

    const openEditFlashSale = (flashSale: any) => {
      setEditingFlashSale(flashSale)
      setFlashSaleForm({
        name: flashSale.name,
        description: flashSale.description || '',
        discountPercentage: flashSale.discountPercentage || 20,
        startTime: new Date(flashSale.startTime).toISOString().slice(0, 16),
        endTime: new Date(flashSale.endTime).toISOString().slice(0, 16),
        isActive: flashSale.isActive
      })
      setShowFlashSaleModal(true)
    }

    return (
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Marketing & Promotions</h1>
            <p className="text-muted-foreground">Manage banners, coupons, flash sales, and email campaigns</p>
          </div>
        </div>

        <Tabs defaultValue="banners" className="space-y-6">
          <TabsList>
            <TabsTrigger value="banners">Banners</TabsTrigger>
            <TabsTrigger value="coupons">Coupons</TabsTrigger>
            <TabsTrigger value="flash-sales">Flash Sales</TabsTrigger>
            <TabsTrigger value="campaigns">Email Campaigns</TabsTrigger>
          </TabsList>

          <TabsContent value="banners">
            <div className="flex items-center justify-end mb-4">
              <Button onClick={() => {
                setBannerForm({
                  title: '',
                  subtitle: '',
                  imageUrl: '',
                  linkUrl: '',
                  position: 'hero',
                  isActive: true
                })
                setShowBannerModal(true)
              }} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <Plus className="h-4 w-4" /> Add Banner
              </Button>
            </div>

            {banners.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {banners.map((banner: any) => (
                  <Card key={banner.id}>
                    <div className="relative h-40 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-lg flex items-center justify-center">
                      {banner.imageUrl ? (
                        <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                      ) : (
                        <Image className="h-16 w-16 text-white/50" aria-hidden="true" alt="" />
                      )}
                      <Badge className="absolute top-2 right-2" variant={banner.isActive ? 'default' : 'secondary'}>
                        {banner.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold">{banner.title}</h3>
                      <p className="text-sm text-muted-foreground">{banner.subtitle}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{banner.position}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Image className="h-16 w-16 mx-auto text-muted-foreground mb-4" aria-hidden="true" alt="" />
                  <h3 className="text-lg font-medium mb-2">No banners configured</h3>
                  <p className="text-muted-foreground mb-4">Create banners to promote products and offers</p>
                  <Button onClick={() => setShowBannerModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
                    Create First Banner
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="coupons">
            <div className="flex items-center justify-end mb-4">
              <Button onClick={() => {
                setCouponForm({
                  code: '',
                  name: '',
                  type: 'PERCENTAGE',
                  discountValue: 10,
                  minOrderValue: 0,
                  maxUses: 100,
                  validFrom: '',
                  validUntil: '',
                  isActive: true
                })
                setShowCouponModal(true)
              }} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <Plus className="h-4 w-4" /> Create Coupon
              </Button>
            </div>

            {coupons.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-medium">Code</th>
                      <th className="text-left p-3 text-sm font-medium">Name</th>
                      <th className="text-left p-3 text-sm font-medium">Discount</th>
                      <th className="text-left p-3 text-sm font-medium">Uses</th>
                      <th className="text-left p-3 text-sm font-medium">Valid Until</th>
                      <th className="text-left p-3 text-sm font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((coupon: any) => (
                      <tr key={coupon.id} className="border-b hover:bg-slate-50">
                        <td className="p-3">
                          <code className="bg-slate-100 px-2 py-1 rounded text-sm font-mono">{coupon.code}</code>
                        </td>
                        <td className="p-3 text-sm">{coupon.name}</td>
                        <td className="p-3 text-sm font-medium">
                          {coupon.type === 'PERCENTAGE' ? `${coupon.discountValue}%` : formatPrice(coupon.discountValue)}
                        </td>
                        <td className="p-3 text-sm">{coupon.currentUses} / {coupon.maxUses || '∞'}</td>
                        <td className="p-3 text-sm">{coupon.validUntil ? formatDate(coupon.validUntil) : 'No expiry'}</td>
                        <td className="p-3">
                          <Badge className={coupon.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {coupon.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Gift className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No coupons created</h3>
                  <p className="text-muted-foreground mb-4">Create discount coupons for promotions</p>
                  <Button onClick={() => setShowCouponModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
                    Create First Coupon
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="flash-sales">
            <div className="flex items-center justify-end mb-4">
              <Button onClick={() => {
                setEditingFlashSale(null)
                setFlashSaleForm({
                  name: '',
                  description: '',
                  discountPercentage: 20,
                  startTime: '',
                  endTime: '',
                  isActive: true
                })
                setShowFlashSaleModal(true)
              }} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <Plus className="h-4 w-4" /> Create Flash Sale
              </Button>
            </div>

            {flashSales.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-medium">Name</th>
                      <th className="text-left p-3 text-sm font-medium">Discount</th>
                      <th className="text-left p-3 text-sm font-medium">Start Time</th>
                      <th className="text-left p-3 text-sm font-medium">End Time</th>
                      <th className="text-left p-3 text-sm font-medium">Status</th>
                      <th className="text-left p-3 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flashSales.map((fs: any) => {
                      const now = new Date()
                      const startTime = new Date(fs.startTime)
                      const endTime = new Date(fs.endTime)
                      const isActive = startTime <= now && endTime >= now && fs.isActive
                      const isUpcoming = startTime > now
                      const isEnded = endTime < now
                      
                      return (
                        <tr key={fs.id} className="border-b hover:bg-slate-50">
                          <td className="p-3">
                            <div>
                              <p className="font-medium">{fs.name}</p>
                              {fs.description && (
                                <p className="text-xs text-muted-foreground">{fs.description}</p>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            {fs.discountPercentage ? (
                              <Badge className="bg-orange-100 text-orange-800">{fs.discountPercentage}% OFF</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-3 text-sm">{formatDate(fs.startTime)}</td>
                          <td className="p-3 text-sm">{formatDate(fs.endTime)}</td>
                          <td className="p-3">
                            {isActive ? (
                              <Badge className="bg-green-100 text-green-800">Active</Badge>
                            ) : isUpcoming ? (
                              <Badge className="bg-blue-100 text-blue-800">Upcoming</Badge>
                            ) : isEnded ? (
                              <Badge className="bg-gray-100 text-gray-800">Ended</Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-800">Inactive</Badge>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditFlashSale(fs)}>Edit</Button>
                              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteFlashSale(fs.id)}>Delete</Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Zap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No flash sales created</h3>
                  <p className="text-muted-foreground mb-4">Create time-limited flash sales to boost sales</p>
                  <Button onClick={() => setShowFlashSaleModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
                    Create First Flash Sale
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="campaigns">
            <Card>
              <CardHeader>
                <CardTitle>Email Campaigns</CardTitle>
                <CardDescription>Send promotional emails to customers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-slate-50">
                    <CardContent className="p-4 text-center">
                      <Users className="h-8 w-8 mx-auto text-emerald-600 mb-2" />
                      <p className="text-2xl font-bold">12,450</p>
                      <p className="text-sm text-muted-foreground">Total Subscribers</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-50">
                    <CardContent className="p-4 text-center">
                      <Mail className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                      <p className="text-2xl font-bold">48</p>
                      <p className="text-sm text-muted-foreground">Campaigns Sent</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-50">
                    <CardContent className="p-4 text-center">
                      <TrendingUp className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                      <p className="text-2xl font-bold">24.5%</p>
                      <p className="text-sm text-muted-foreground">Avg. Open Rate</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Campaign Subject</Label>
                    <Input placeholder="Enter email subject" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Email Content</Label>
                    <Textarea placeholder="Write your email content..." rows={6} className="mt-1.5" />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline">Preview</Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      <Send className="h-4 w-4 mr-2" /> Send Campaign
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Banner Modal */}
        <Dialog open={showBannerModal} onOpenChange={setShowBannerModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Banner</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Title</Label>
                <Input value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} className="mt-1.5" placeholder="Flash Sale!" />
              </div>
              <div>
                <Label>Subtitle</Label>
                <Input value={bannerForm.subtitle} onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })} className="mt-1.5" placeholder="Up to 70% off" />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input value={bannerForm.imageUrl} onChange={(e) => setBannerForm({ ...bannerForm, imageUrl: e.target.value })} className="mt-1.5" placeholder="https://..." />
              </div>
              <div>
                <Label>Link URL</Label>
                <Input value={bannerForm.linkUrl} onChange={(e) => setBannerForm({ ...bannerForm, linkUrl: e.target.value })} className="mt-1.5" placeholder="/products" />
              </div>
              <div>
                <Label>Position</Label>
                <Select value={bannerForm.position} onValueChange={(v) => setBannerForm({ ...bannerForm, position: v })}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hero">Hero Banner</SelectItem>
                    <SelectItem value="category">Category Section</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={bannerForm.isActive} onCheckedChange={(checked) => setBannerForm({ ...bannerForm, isActive: checked })} />
                <Label>Active</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowBannerModal(false)}>Cancel</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveBanner}>Save Banner</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Coupon Modal */}
        <Dialog open={showCouponModal} onOpenChange={setShowCouponModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Coupon</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Code</Label>
                  <Input value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} className="mt-1.5" placeholder="SAVE10" />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input value={couponForm.name} onChange={(e) => setCouponForm({ ...couponForm, name: e.target.value })} className="mt-1.5" placeholder="10% Off Sale" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={couponForm.type} onValueChange={(v) => setCouponForm({ ...couponForm, type: v })}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                      <SelectItem value="FIXED">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Discount Value</Label>
                  <Input type="number" value={couponForm.discountValue} onChange={(e) => setCouponForm({ ...couponForm, discountValue: parseFloat(e.target.value) })} className="mt-1.5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min Order Value</Label>
                  <Input type="number" value={couponForm.minOrderValue} onChange={(e) => setCouponForm({ ...couponForm, minOrderValue: parseFloat(e.target.value) })} className="mt-1.5" />
                </div>
                <div>
                  <Label>Max Uses</Label>
                  <Input type="number" value={couponForm.maxUses} onChange={(e) => setCouponForm({ ...couponForm, maxUses: parseInt(e.target.value) })} className="mt-1.5" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={couponForm.isActive} onCheckedChange={(checked) => setCouponForm({ ...couponForm, isActive: checked })} />
                <Label>Active</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowCouponModal(false)}>Cancel</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveCoupon}>Create Coupon</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Flash Sale Modal */}
        <Dialog open={showFlashSaleModal} onOpenChange={setShowFlashSaleModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingFlashSale ? 'Edit Flash Sale' : 'Create Flash Sale'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Name</Label>
                <Input 
                  value={flashSaleForm.name} 
                  onChange={(e) => setFlashSaleForm({ ...flashSaleForm, name: e.target.value })} 
                  className="mt-1.5" 
                  placeholder="Summer Sale 2024" 
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea 
                  value={flashSaleForm.description} 
                  onChange={(e) => setFlashSaleForm({ ...flashSaleForm, description: e.target.value })} 
                  className="mt-1.5" 
                  placeholder="Up to 50% off on selected items" 
                  rows={2}
                />
              </div>
              <div>
                <Label>Discount Percentage (%)</Label>
                <Input 
                  type="number" 
                  min="1" 
                  max="99"
                  value={flashSaleForm.discountPercentage} 
                  onChange={(e) => setFlashSaleForm({ ...flashSaleForm, discountPercentage: parseFloat(e.target.value) || 0 })} 
                  className="mt-1.5" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input 
                    type="datetime-local" 
                    value={flashSaleForm.startTime} 
                    onChange={(e) => setFlashSaleForm({ ...flashSaleForm, startTime: e.target.value })} 
                    className="mt-1.5" 
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input 
                    type="datetime-local" 
                    value={flashSaleForm.endTime} 
                    onChange={(e) => setFlashSaleForm({ ...flashSaleForm, endTime: e.target.value })} 
                    className="mt-1.5" 
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={flashSaleForm.isActive} 
                  onCheckedChange={(checked) => setFlashSaleForm({ ...flashSaleForm, isActive: checked })} 
                />
                <Label>Active</Label>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => {
                    setShowFlashSaleModal(false)
                    setEditingFlashSale(null)
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700" 
                  onClick={handleSaveFlashSale}
                >
                  {editingFlashSale ? 'Update Flash Sale' : 'Create Flash Sale'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ============================================
  // Admin Offers & Promotions
  // ============================================

  function AdminOffers() {
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('flash-sales')
    const [flashSales, setFlashSales] = useState<any[]>([])
    const [coupons, setCoupons] = useState<any[]>([])
    const [showFlashSaleModal, setShowFlashSaleModal] = useState(false)
    const [showCouponModal, setShowCouponModal] = useState(false)
    const [flashSaleForm, setFlashSaleForm] = useState({
      name: '',
      description: '',
      discountPercentage: 20,
      startTime: '',
      endTime: '',
      isActive: true
    })
    const [couponForm, setCouponForm] = useState({
      code: '',
      name: '',
      type: 'PERCENTAGE',
      discountValue: 10,
      minOrderValue: 0,
      maxUses: 100,
      isActive: true
    })

    const fetchData = async () => {
      setLoading(true)
      try {
        const [flashSalesRes, couponsRes] = await Promise.all([
          fetch('/api/flash-sale?admin=true'),
          fetch('/api/coupons')
        ])

        if (flashSalesRes.ok) {
          const data = await flashSalesRes.json()
          setFlashSales(data.flashSales || [])
        }

        if (couponsRes.ok) {
          const data = await couponsRes.json()
          setCoupons(data.coupons || [])
        }
      } catch (error) {
        console.error('Failed to fetch offers data:', error)
      }
      setLoading(false)
    }

    useEffect(() => {
      fetchData()
    }, [])

    const handleSaveFlashSale = async () => {
      try {
        const res = await fetch('/api/flash-sale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(flashSaleForm)
        })
        if (res.ok) {
          toast({ title: 'Flash Sale Created', description: 'Flash sale has been created successfully' })
          setShowFlashSaleModal(false)
          setFlashSaleForm({ name: '', description: '', discountPercentage: 20, startTime: '', endTime: '', isActive: true })
          fetchData()
        } else {
          const data = await res.json()
          toast({ title: 'Error', description: data.error || 'Failed to create flash sale', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to create flash sale', variant: 'destructive' })
      }
    }

    const handleSaveCoupon = async () => {
      try {
        const res = await fetch('/api/coupons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...couponForm, userId: user?.id })
        })
        if (res.ok) {
          toast({ title: 'Coupon Created', description: 'Coupon has been created successfully' })
          setShowCouponModal(false)
          setCouponForm({ code: '', name: '', type: 'PERCENTAGE', discountValue: 10, minOrderValue: 0, maxUses: 100, isActive: true })
          fetchData()
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to create coupon', variant: 'destructive' })
      }
    }

    const handleDeleteFlashSale = async (id: string) => {
      if (!confirm('Are you sure you want to delete this flash sale?')) return
      try {
        const res = await fetch(`/api/flash-sale?id=${id}`, { method: 'DELETE' })
        if (res.ok) {
          toast({ title: 'Flash Sale Deleted', description: 'Flash sale has been deleted' })
          fetchData()
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete flash sale', variant: 'destructive' })
      }
    }

    const handleToggleCoupon = async (id: string, isActive: boolean) => {
      try {
        const res = await fetch('/api/coupons', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, isActive: !isActive })
        })
        if (res.ok) {
          toast({ title: 'Coupon Updated', description: `Coupon ${!isActive ? 'activated' : 'deactivated'}` })
          fetchData()
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to update coupon', variant: 'destructive' })
      }
    }

    return (
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Offers & Promotions</h1>
            <p className="text-muted-foreground">Manage flash sales, coupons, and special promotions</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Zap className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Flash Sales</p>
                  <p className="text-xl font-bold">{flashSales.filter((fs: any) => fs.isActive).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Gift className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Coupons</p>
                  <p className="text-xl font-bold">{coupons.filter((c: any) => c.isActive).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Percent className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Offers</p>
                  <p className="text-xl font-bold">{flashSales.length + coupons.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Savings Given</p>
                  <p className="text-xl font-bold">PKR 0</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="flash-sales" className="gap-2"><Zap className="h-4 w-4" /> Flash Sales</TabsTrigger>
            <TabsTrigger value="coupons" className="gap-2"><Gift className="h-4 w-4" /> Coupons</TabsTrigger>
            <TabsTrigger value="special-offers" className="gap-2"><Star className="h-4 w-4" /> Special Offers</TabsTrigger>
            <TabsTrigger value="bundle-deals" className="gap-2"><Package className="h-4 w-4" /> Bundle Deals</TabsTrigger>
          </TabsList>

          {/* Flash Sales Tab */}
          <TabsContent value="flash-sales">
            <div className="flex items-center justify-end mb-4">
              <Button onClick={() => setShowFlashSaleModal(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <Plus className="h-4 w-4" /> Create Flash Sale
              </Button>
            </div>

            {flashSales.length > 0 ? (
              <div className="grid gap-4">
                {flashSales.map((fs: any) => {
                  const now = new Date()
                  const startTime = new Date(fs.startTime)
                  const endTime = new Date(fs.endTime)
                  const isActive = startTime <= now && endTime >= now && fs.isActive
                  const isUpcoming = startTime > now
                  const isEnded = endTime < now

                  return (
                    <Card key={fs.id} className={isEnded ? 'opacity-60' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-lg ${isActive ? 'bg-orange-100' : isUpcoming ? 'bg-blue-100' : 'bg-gray-100'}`}>
                              <Zap className={`h-6 w-6 ${isActive ? 'text-orange-600' : isUpcoming ? 'text-blue-600' : 'text-gray-600'}`} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{fs.name}</h3>
                              {fs.description && <p className="text-sm text-muted-foreground">{fs.description}</p>}
                              <div className="flex items-center gap-3 mt-2">
                                {fs.discountPercentage && (
                                  <Badge className="bg-orange-100 text-orange-800">{fs.discountPercentage}% OFF</Badge>
                                )}
                                <Badge className={isActive ? 'bg-green-100 text-green-800' : isUpcoming ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                                  {isActive ? 'Active Now' : isUpcoming ? 'Upcoming' : 'Ended'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> Start: {formatDate(fs.startTime)}</span>
                                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> End: {formatDate(fs.endTime)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">Edit</Button>
                            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteFlashSale(fs.id)}>Delete</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Zap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No flash sales created</h3>
                  <p className="text-muted-foreground mb-4">Create time-limited flash sales to boost sales</p>
                  <Button onClick={() => setShowFlashSaleModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
                    Create First Flash Sale
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Coupons Tab */}
          <TabsContent value="coupons">
            <div className="flex items-center justify-end mb-4">
              <Button onClick={() => setShowCouponModal(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <Plus className="h-4 w-4" /> Create Coupon
              </Button>
            </div>

            {coupons.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {coupons.map((coupon: any) => (
                  <Card key={coupon.id} className={!coupon.isActive ? 'opacity-60' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <code className="bg-slate-100 px-2 py-1 rounded text-sm font-mono font-bold">{coupon.code}</code>
                            <Badge className={coupon.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {coupon.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <h3 className="font-medium">{coupon.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {coupon.type === 'PERCENTAGE' ? `${coupon.discountValue}% off` : formatPrice(coupon.discountValue)} off
                            {coupon.minOrderValue > 0 && ` on orders above ${formatPrice(coupon.minOrderValue)}`}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>Used: {coupon.currentUses || 0}/{coupon.maxUses || '∞'}</span>
                            {coupon.validUntil && <span>• Expires: {formatDate(coupon.validUntil)}</span>}
                          </div>
                        </div>
                        <Switch
                          checked={coupon.isActive}
                          onCheckedChange={() => handleToggleCoupon(coupon.id, coupon.isActive)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Gift className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No coupons created</h3>
                  <p className="text-muted-foreground mb-4">Create discount coupons for your customers</p>
                  <Button onClick={() => setShowCouponModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
                    Create First Coupon
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Special Offers Tab */}
          <TabsContent value="special-offers">
            <Card>
              <CardHeader>
                <CardTitle>Special Offers</CardTitle>
                <CardDescription>Create product-specific offers and deals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Star className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium mb-2">Special Offers</h3>
                  <p className="text-muted-foreground mb-4">Create special offers for specific products or categories</p>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                    <Plus className="h-4 w-4" /> Create Special Offer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bundle Deals Tab */}
          <TabsContent value="bundle-deals">
            <Card>
              <CardHeader>
                <CardTitle>Bundle Deals</CardTitle>
                <CardDescription>Create bundle offers like "Buy 2 Get 1 Free"</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium mb-2">Bundle Deals</h3>
                  <p className="text-muted-foreground mb-4">Create bundle deals to increase average order value</p>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                    <Plus className="h-4 w-4" /> Create Bundle Deal
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Flash Sale Modal */}
        <Dialog open={showFlashSaleModal} onOpenChange={setShowFlashSaleModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Flash Sale</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Name</Label>
                <Input value={flashSaleForm.name} onChange={(e) => setFlashSaleForm({ ...flashSaleForm, name: e.target.value })} className="mt-1.5" placeholder="Summer Sale 2024" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={flashSaleForm.description} onChange={(e) => setFlashSaleForm({ ...flashSaleForm, description: e.target.value })} className="mt-1.5" placeholder="Up to 50% off on selected items" rows={2} />
              </div>
              <div>
                <Label>Discount Percentage (%)</Label>
                <Input type="number" min="1" max="99" value={flashSaleForm.discountPercentage} onChange={(e) => setFlashSaleForm({ ...flashSaleForm, discountPercentage: parseFloat(e.target.value) || 0 })} className="mt-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input type="datetime-local" value={flashSaleForm.startTime} onChange={(e) => setFlashSaleForm({ ...flashSaleForm, startTime: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input type="datetime-local" value={flashSaleForm.endTime} onChange={(e) => setFlashSaleForm({ ...flashSaleForm, endTime: e.target.value })} className="mt-1.5" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={flashSaleForm.isActive} onCheckedChange={(checked) => setFlashSaleForm({ ...flashSaleForm, isActive: checked })} />
                <Label>Active</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowFlashSaleModal(false)}>Cancel</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveFlashSale}>Create Flash Sale</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Coupon Modal */}
        <Dialog open={showCouponModal} onOpenChange={setShowCouponModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Coupon</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Code</Label>
                  <Input value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} className="mt-1.5" placeholder="SAVE10" />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input value={couponForm.name} onChange={(e) => setCouponForm({ ...couponForm, name: e.target.value })} className="mt-1.5" placeholder="10% Off Sale" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={couponForm.type} onValueChange={(v) => setCouponForm({ ...couponForm, type: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                      <SelectItem value="FIXED">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Discount Value</Label>
                  <Input type="number" value={couponForm.discountValue} onChange={(e) => setCouponForm({ ...couponForm, discountValue: parseFloat(e.target.value) })} className="mt-1.5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min Order Value</Label>
                  <Input type="number" value={couponForm.minOrderValue} onChange={(e) => setCouponForm({ ...couponForm, minOrderValue: parseFloat(e.target.value) })} className="mt-1.5" />
                </div>
                <div>
                  <Label>Max Uses</Label>
                  <Input type="number" value={couponForm.maxUses} onChange={(e) => setCouponForm({ ...couponForm, maxUses: parseInt(e.target.value) })} className="mt-1.5" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={couponForm.isActive} onCheckedChange={(checked) => setCouponForm({ ...couponForm, isActive: checked })} />
                <Label>Active</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowCouponModal(false)}>Cancel</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveCoupon}>Create Coupon</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ============================================
  // Admin Reports Dashboard
  // ============================================

  function AdminReports() {
    const [loading, setLoading] = useState(false)
    const [reportType, setReportType] = useState('sales')
    const [period, setPeriod] = useState('month')
    const [reportData, setReportData] = useState<any>(null)

    const fetchReport = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/reports?type=${reportType}&period=${period}`)
        if (res.ok) {
          const data = await res.json()
          setReportData(data)
        }
      } catch (error) {
        console.error('Failed to fetch report:', error)
      }
      setLoading(false)
    }

    useEffect(() => {
      fetchReport()
    }, [reportType, period])

    const exportReport = (format: 'csv' | 'excel') => {
      window.open(`/api/reports?type=${reportType}&period=${period}&format=${format}`, '_blank')
    }

    return (
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground">Sales, products, sellers, and financial reports</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportReport('csv')}>Export CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportReport('excel')}>Export Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Report Type Tabs */}
        <Tabs value={reportType} onValueChange={setReportType} className="space-y-6">
          <TabsList>
            <TabsTrigger value="sales">Sales Report</TabsTrigger>
            <TabsTrigger value="products">Product Performance</TabsTrigger>
            <TabsTrigger value="sellers">Seller Performance</TabsTrigger>
            <TabsTrigger value="financial">Financial Report</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
          </TabsList>

          <TabsContent value="sales">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : reportData ? (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold">{reportData.summary?.totalOrders || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold">{formatPrice(reportData.summary?.totalRevenue || 0)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Avg Order Value</p>
                      <p className="text-2xl font-bold">{formatPrice(reportData.summary?.avgOrderValue || 0)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Items Sold</p>
                      <p className="text-2xl font-bold">{reportData.summary?.totalQuantity || 0}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Products */}
                {reportData.topProducts && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Top Selling Products</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {reportData.topProducts.slice(0, 10).map((p: any, i: number) => (
                          <div key={p.productId} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground w-6">{i + 1}.</span>
                              <div>
                                <p className="font-medium text-sm">{p.productName}</p>
                                <p className="text-xs text-muted-foreground">{p.sku}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{formatPrice(p.revenue)}</p>
                              <p className="text-xs text-muted-foreground">{p.quantity} sold</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="products">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : reportData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Total Products</p>
                      <p className="text-2xl font-bold">{reportData.summary?.totalProducts || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Active Products</p>
                      <p className="text-2xl font-bold">{reportData.summary?.activeProducts || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Low Stock</p>
                      <p className="text-2xl font-bold text-orange-600">{reportData.summary?.lowStockCount || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Out of Stock</p>
                      <p className="text-2xl font-bold text-red-600">{reportData.summary?.outOfStockCount || 0}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="sellers">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : reportData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Total Sellers</p>
                      <p className="text-2xl font-bold">{reportData.summary?.totalSellers || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Active Sellers</p>
                      <p className="text-2xl font-bold">{reportData.summary?.activeSellers || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold">{formatPrice(reportData.summary?.totalRevenue || 0)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Total Commission</p>
                      <p className="text-2xl font-bold">{formatPrice(reportData.summary?.totalCommission || 0)}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="financial">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : reportData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold">{formatPrice(reportData.summary?.totalRevenue || 0)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Platform Profit</p>
                      <p className="text-2xl font-bold text-emerald-600">{formatPrice(reportData.summary?.platformProfit || 0)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Total Payouts</p>
                      <p className="text-2xl font-bold">{formatPrice(reportData.summary?.totalPayouts || 0)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Total Refunds</p>
                      <p className="text-2xl font-bold text-red-600">{formatPrice(reportData.summary?.totalRefunds || 0)}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="inventory">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : reportData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Total Products</p>
                      <p className="text-2xl font-bold">{reportData.summary?.totalProducts || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Total Stock</p>
                      <p className="text-2xl font-bold">{reportData.summary?.totalStock || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Low Stock Items</p>
                      <p className="text-2xl font-bold text-orange-600">{reportData.summary?.lowStockCount || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Out of Stock</p>
                      <p className="text-2xl font-bold text-red-600">{reportData.summary?.outOfStockCount || 0}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="customers">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : reportData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Total Customers</p>
                      <p className="text-2xl font-bold">{reportData.summary?.totalCustomers || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">New Customers</p>
                      <p className="text-2xl font-bold text-emerald-600">{reportData.summary?.newCustomers || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Active Customers</p>
                      <p className="text-2xl font-bold">{reportData.summary?.activeCustomers || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Avg Order Value</p>
                      <p className="text-2xl font-bold">{formatPrice(reportData.summary?.averageOrderValue || 0)}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // ============================================
  // Render
  // ============================================

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <main className="flex-1">
        {renderView()}
      </main>

      {/* Footer */}
      <Footer />

      {/* Auth Modal */}
      <AuthModal />
      
      {/* Toaster */}
      <Toaster />
    </div>
  )

  // ============================================
  // Header Component
  // ============================================

  function Header() {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setCurrentView('home')}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="text-white font-bold text-xl">L</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent hidden sm:inline">
                Luminvera
              </span>
            </div>

            {/* Search Bar - Desktop */}
            <div className="hidden md:flex flex-1 max-w-xl mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for products, brands and more..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    if (e.target.value) setCurrentView('products')
                  }}
                  className="pl-10 pr-4 h-10 bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              {isAuthenticated && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <Bell className="h-5 w-5" />
                      {unreadNotifications > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500">
                          {unreadNotifications}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Notifications</SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(100vh-100px)] mt-4">
                      <div className="space-y-3">
                        {notifications.map((n) => (
                          <div key={n.id} className={`p-3 rounded-lg ${n.read ? 'bg-slate-50' : 'bg-emerald-50 border border-emerald-100'}`}>
                            <p className="font-medium text-sm">{n.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatDate(n.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              )}

              {/* Cart */}
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setCurrentView('cart')}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-emerald-600">
                    {cartCount}
                  </Badge>
                )}
              </Button>

              {/* User Menu */}
              {isAuthenticated && user ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    className="hidden md:flex items-center gap-2"
                    onClick={() => {
                      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
                        setCurrentView('admin-dashboard')
                      } else if (user.role === 'SELLER') {
                        setCurrentView('seller-dashboard')
                      } else {
                        setCurrentView('user-dashboard')
                      }
                    }}
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-xs">
                        {user.firstName?.[0] || user.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden lg:inline text-sm">{user.firstName || 'Account'}</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                    <LogOut className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setShowAuthModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
                  Login
                </Button>
              )}

              {/* Mobile Menu */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (e.target.value) setCurrentView('products')
                }}
                className="pl-10 pr-4 h-10"
              />
            </div>
          </div>

          {/* Category Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-6 py-2 border-t overflow-x-auto">
            {['Electronics', 'Fashion', 'Home & Living', 'Beauty', 'Sports', 'Mobiles', 'Appliances'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCurrentView('products')}
                className="text-sm text-muted-foreground hover:text-emerald-600 transition-colors whitespace-nowrap"
              >
                {cat}
              </button>
            ))}
          </nav>
        </div>
      </header>
    )
  }

  // ============================================
  // Footer Component
  // ============================================

  function Footer() {
    return (
      <footer className="bg-slate-900 text-slate-300 mt-auto">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">L</span>
                </div>
                <span className="text-xl font-bold text-white">Luminvera</span>
              </div>
              <p className="text-sm text-slate-400">
                Pakistan's trusted multi-vendor marketplace. Quality products from verified sellers.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Shop</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-emerald-400">All Categories</a></li>
                <li><a href="#" className="hover:text-emerald-400">Flash Sales</a></li>
                <li><a href="#" className="hover:text-emerald-400">New Arrivals</a></li>
                <li><a href="#" className="hover:text-emerald-400">Best Sellers</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-emerald-400">Help Center</a></li>
                <li><a href="#" className="hover:text-emerald-400">Returns</a></li>
                <li><a href="#" className="hover:text-emerald-400">Shipping Info</a></li>
                <li><a href="#" className="hover:text-emerald-400">Contact Us</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Sell on Luminvera</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-emerald-400">Become a Seller</a></li>
                <li><a href="#" className="hover:text-emerald-400">Seller Guidelines</a></li>
                <li><a href="#" className="hover:text-emerald-400">Seller Dashboard</a></li>
                <li><a href="#" className="hover:text-emerald-400">Fee Structure</a></li>
              </ul>
            </div>
          </div>
          
          <Separator className="bg-slate-700 mb-6" />
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
            <p>© 2025 Luminvera. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms of Service</a>
              <a href="#" className="hover:text-white">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    )
  }

  // ============================================
  // Admin Theme Manager - CSS & Style Control
  // ============================================

  function AdminTheme() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [theme, setTheme] = useState({
      primaryColor: '#10b981',
      secondaryColor: '#6366f1',
      accentColor: '#f59e0b',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Inter',
      borderRadius: '8',
      darkMode: false,
      customCSS: ''
    })
    const [previewMode, setPreviewMode] = useState(false)

    useEffect(() => {
      fetchTheme()
    }, [])

    const fetchTheme = async () => {
      try {
        const res = await fetch('/api/admin/theme')
        if (res.ok) {
          const data = await res.json()
          if (data.theme) {
            setTheme(prev => ({ ...prev, ...data.theme }))
          }
        }
      } catch (error) {
        console.error('Failed to fetch theme:', error)
      }
      setLoading(false)
    }

    const handleSave = async () => {
      setSaving(true)
      try {
        const res = await fetch('/api/admin/theme', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme })
        })
        if (res.ok) {
          toast({ title: 'Theme Saved', description: 'Theme settings have been updated' })
        } else {
          toast({ title: 'Error', description: 'Failed to save theme', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to save theme', variant: 'destructive' })
      }
      setSaving(false)
    }

    const colorPresets = [
      { name: 'Emerald', primary: '#10b981', secondary: '#6366f1', accent: '#f59e0b' },
      { name: 'Blue', primary: '#3b82f6', secondary: '#8b5cf6', accent: '#ec4899' },
      { name: 'Purple', primary: '#8b5cf6', secondary: '#ec4899', accent: '#f59e0b' },
      { name: 'Rose', primary: '#f43f5e', secondary: '#8b5cf6', accent: '#06b6d4' },
      { name: 'Orange', primary: '#f97316', secondary: '#ef4444', accent: '#22c55e' },
    ]

    const fontOptions = ['Inter', 'Roboto', 'Open Sans', 'Poppins', 'Montserrat', 'Lato', 'Nunito']

    if (loading) {
      return (
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-96">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Theme & Style Manager</h1>
            <p className="text-muted-foreground">Customize colors, fonts, and CSS for your store</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
              {previewMode ? 'Edit Mode' : 'Preview Mode'}
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Theme
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Color Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" /> Color Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Color Presets */}
              <div>
                <Label className="text-sm font-medium">Quick Presets</Label>
                <div className="flex gap-2 mt-2">
                  {colorPresets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => setTheme({ ...theme, primaryColor: preset.primary, secondaryColor: preset.secondary, accentColor: preset.accent })}
                      className="w-8 h-8 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform"
                      style={{ backgroundColor: preset.primary }}
                      title={preset.name}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Primary Color</Label>
                  <div className="flex gap-2 mt-1.5">
                    <input
                      type="color"
                      value={theme.primaryColor}
                      onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <Input value={theme.primaryColor} onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })} className="flex-1" />
                  </div>
                </div>
                <div>
                  <Label>Secondary Color</Label>
                  <div className="flex gap-2 mt-1.5">
                    <input
                      type="color"
                      value={theme.secondaryColor}
                      onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <Input value={theme.secondaryColor} onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })} className="flex-1" />
                  </div>
                </div>
                <div>
                  <Label>Accent Color</Label>
                  <div className="flex gap-2 mt-1.5">
                    <input
                      type="color"
                      value={theme.accentColor}
                      onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <Input value={theme.accentColor} onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })} className="flex-1" />
                  </div>
                </div>
                <div>
                  <Label>Background Color</Label>
                  <div className="flex gap-2 mt-1.5">
                    <input
                      type="color"
                      value={theme.backgroundColor}
                      onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <Input value={theme.backgroundColor} onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })} className="flex-1" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Typography Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Typography</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Font Family</Label>
                <Select value={theme.fontFamily} onValueChange={(v) => setTheme({ ...theme, fontFamily: v })}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem key={font} value={font}>{font}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Border Radius: {theme.borderRadius}px</Label>
                <Slider
                  value={[parseInt(theme.borderRadius)]}
                  onValueChange={(v) => setTheme({ ...theme, borderRadius: v[0].toString() })}
                  min={0}
                  max={24}
                  step={2}
                  className="mt-2"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Dark Mode</Label>
                  <p className="text-xs text-muted-foreground">Enable dark mode as default</p>
                </div>
                <Switch checked={theme.darkMode} onCheckedChange={(checked) => setTheme({ ...theme, darkMode: checked })} />
              </div>
            </CardContent>
          </Card>

          {/* Custom CSS */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Custom CSS</CardTitle>
              <CardDescription>Add custom CSS to override any styles</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={theme.customCSS}
                onChange={(e) => setTheme({ ...theme, customCSS: e.target.value })}
                placeholder="/* Add your custom CSS here */
.example {
  color: red;
}"
                className="font-mono text-sm min-h-[200px]"
              />
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="rounded-lg p-6 border"
                style={{ 
                  backgroundColor: theme.backgroundColor,
                  fontFamily: theme.fontFamily,
                  borderRadius: `${theme.borderRadius}px`
                }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <Button style={{ backgroundColor: theme.primaryColor, borderRadius: `${theme.borderRadius}px` }}>
                    Primary Button
                  </Button>
                  <Button variant="outline" style={{ borderColor: theme.primaryColor, color: theme.primaryColor, borderRadius: `${theme.borderRadius}px` }}>
                    Secondary Button
                  </Button>
                  <Button style={{ backgroundColor: theme.accentColor, borderRadius: `${theme.borderRadius}px` }}>
                    Accent Button
                  </Button>
                </div>
                <div className="space-y-2">
                  <h2 style={{ color: theme.textColor }} className="text-xl font-bold">Sample Heading</h2>
                  <p style={{ color: theme.textColor }}>This is a sample paragraph to show how text will look with your theme settings.</p>
                  <div className="flex gap-2">
                    <Badge style={{ backgroundColor: theme.primaryColor }}>Primary Badge</Badge>
                    <Badge style={{ backgroundColor: theme.secondaryColor }}>Secondary Badge</Badge>
                    <Badge style={{ backgroundColor: theme.accentColor }}>Accent Badge</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ============================================
  // Admin SEO Manager
  // ============================================

  function AdminSEO() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [seo, setSeo] = useState({
      siteName: 'LUMINVERA',
      siteDescription: 'Pakistan\'s Premier Multi-Vendor Marketplace',
      defaultKeywords: 'ecommerce, pakistan, online shopping',
      ogImage: '',
      twitterCard: 'summary_large_image',
      googleAnalyticsId: '',
      robotsTxt: '',
      facebookPixel: ''
    })
    const [pageSeo, setPageSeo] = useState<any[]>([])

    useEffect(() => {
      fetchSEO()
    }, [])

    const fetchSEO = async () => {
      try {
        const res = await fetch('/api/admin/seo')
        if (res.ok) {
          const data = await res.json()
          if (data.seo) setSeo(data.seo)
          if (data.pageSeo) setPageSeo(data.pageSeo)
        }
      } catch (error) {
        console.error('Failed to fetch SEO:', error)
      }
      setLoading(false)
    }

    const handleSave = async () => {
      setSaving(true)
      try {
        const res = await fetch('/api/admin/seo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seo, pageSeo })
        })
        if (res.ok) {
          toast({ title: 'SEO Settings Saved', description: 'SEO configuration has been updated' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to save SEO settings', variant: 'destructive' })
      }
      setSaving(false)
    }

    if (loading) {
      return (
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-96">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">SEO Manager</h1>
            <p className="text-muted-foreground">Configure SEO settings for better search visibility</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save SEO Settings
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">General SEO</TabsTrigger>
            <TabsTrigger value="pages">Page SEO</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Site Meta Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Site Name</Label>
                      <Input value={seo.siteName} onChange={(e) => setSeo({ ...seo, siteName: e.target.value })} className="mt-1.5" />
                    </div>
                    <div>
                      <Label>Google Analytics ID</Label>
                      <Input value={seo.googleAnalyticsId} onChange={(e) => setSeo({ ...seo, googleAnalyticsId: e.target.value })} placeholder="G-XXXXXXXXXX" className="mt-1.5" />
                    </div>
                  </div>
                  <div>
                    <Label>Site Description ({seo.siteDescription.length}/160 characters)</Label>
                    <Textarea 
                      value={seo.siteDescription} 
                      onChange={(e) => setSeo({ ...seo, siteDescription: e.target.value })} 
                      className="mt-1.5"
                      maxLength={160}
                    />
                  </div>
                  <div>
                    <Label>Default Keywords</Label>
                    <Input value={seo.defaultKeywords} onChange={(e) => setSeo({ ...seo, defaultKeywords: e.target.value })} className="mt-1.5" placeholder="keyword1, keyword2, keyword3" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Social Media Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>OG Image URL</Label>
                    <Input value={seo.ogImage} onChange={(e) => setSeo({ ...seo, ogImage: e.target.value })} placeholder="https://..." className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Twitter Card Type</Label>
                    <Select value={seo.twitterCard} onValueChange={(v) => setSeo({ ...seo, twitterCard: v })}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="summary">Summary</SelectItem>
                        <SelectItem value="summary_large_image">Summary Large Image</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Facebook Pixel ID</Label>
                    <Input value={seo.facebookPixel} onChange={(e) => setSeo({ ...seo, facebookPixel: e.target.value })} placeholder="XXXXXXXXXXXXXXX" className="mt-1.5" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="pages">
            <Card>
              <CardHeader>
                <CardTitle>Page-Specific SEO</CardTitle>
                <CardDescription>Configure meta tags for individual pages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 text-sm font-medium">Page</th>
                        <th className="text-left p-3 text-sm font-medium">Meta Title</th>
                        <th className="text-left p-3 text-sm font-medium">Meta Description</th>
                        <th className="text-left p-3 text-sm font-medium">Index</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageSeo.map((page, index) => (
                        <tr key={page.id || index} className="border-b">
                          <td className="p-3 font-medium">{page.pagePath}</td>
                          <td className="p-3">
                            <Input 
                              value={page.metaTitle || ''} 
                              onChange={(e) => {
                                const updated = [...pageSeo]
                                updated[index].metaTitle = e.target.value
                                setPageSeo(updated)
                              }}
                              className="w-48"
                            />
                          </td>
                          <td className="p-3">
                            <Input 
                              value={page.metaDescription || ''} 
                              onChange={(e) => {
                                const updated = [...pageSeo]
                                updated[index].metaDescription = e.target.value
                                setPageSeo(updated)
                              }}
                              className="w-64"
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <Switch 
                                checked={!page.noIndex} 
                                onCheckedChange={(checked) => {
                                  const updated = [...pageSeo]
                                  updated[index].noIndex = !checked
                                  setPageSeo(updated)
                                }}
                              />
                              <span className="text-sm">{page.noIndex ? 'No Index' : 'Index'}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced">
            <Card>
              <CardHeader>
                <CardTitle>Robots.txt</CardTitle>
                <CardDescription>Configure how search engines crawl your site</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={seo.robotsTxt}
                  onChange={(e) => setSeo({ ...seo, robotsTxt: e.target.value })}
                  placeholder={`User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: https://yoursite.com/sitemap.xml`}
                  className="font-mono text-sm min-h-[200px]"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // ============================================
  // Admin Site Settings
  // ============================================

  function AdminSiteSettings() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [settings, setSettings] = useState({
      siteName: 'LUMINVERA',
      tagline: 'Pakistan\'s Premier Multi-Vendor Marketplace',
      logo: '',
      favicon: '',
      email: 'support@luminvera.pk',
      phone: '+92 300 1234567',
      address: 'Karachi, Pakistan',
      socialLinks: {
        facebook: '',
        instagram: '',
        twitter: '',
        youtube: ''
      }
    })

    useEffect(() => {
      fetchSettings()
    }, [])

    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/site-settings?admin=true')
        if (res.ok) {
          const data = await res.json()
          if (data.settings) setSettings(data.settings)
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error)
      }
      setLoading(false)
    }

    const handleSave = async () => {
      setSaving(true)
      try {
        const res = await fetch('/api/admin/site-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings)
        })
        if (res.ok) {
          toast({ title: 'Settings Saved', description: 'Site settings have been updated' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' })
      }
      setSaving(false)
    }

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setSettings({ ...settings, logo: reader.result as string })
        }
        reader.readAsDataURL(file)
      }
    }

    const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setSettings({ ...settings, favicon: reader.result as string })
        }
        reader.readAsDataURL(file)
      }
    }

    if (loading) {
      return (
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-96">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Site Settings</h1>
            <p className="text-muted-foreground">Configure your website name, logo, and branding</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        </div>

        <div className="grid gap-6">
          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle>Brand Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Site Name</Label>
                  <Input value={settings.siteName} onChange={(e) => setSettings({ ...settings, siteName: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label>Tagline</Label>
                  <Input value={settings.tagline} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} className="mt-1.5" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Logo</Label>
                  <div className="mt-1.5 flex items-center gap-4">
                    <div className="w-32 h-16 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border">
                      {settings.logo ? (
                        <img src={settings.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <Image className="h-8 w-8 text-slate-300" aria-hidden="true" alt="" />
                      )}
                    </div>
                    <div>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" />
                      <Button variant="outline" onClick={() => document.getElementById('logo-upload')?.click()}>
                        <Upload className="h-4 w-4 mr-2" /> Upload Logo
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG. Max 2MB</p>
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Favicon</Label>
                  <div className="mt-1.5 flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border">
                      {settings.favicon ? (
                        <img src={settings.favicon} alt="Favicon" className="w-8 h-8 object-contain" />
                      ) : (
                        <Image className="h-6 w-6 text-slate-300" aria-hidden="true" alt="" />
                      )}
                    </div>
                    <div>
                      <input type="file" accept="image/*" onChange={handleFaviconUpload} className="hidden" id="favicon-upload" />
                      <Button variant="outline" onClick={() => document.getElementById('favicon-upload')?.click()}>
                        <Upload className="h-4 w-4 mr-2" /> Upload Favicon
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">ICO, PNG. 32x32 or 64x64</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} className="mt-1.5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader>
              <CardTitle>Social Media Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Facebook</Label>
                  <Input value={settings.socialLinks.facebook} onChange={(e) => setSettings({ ...settings, socialLinks: { ...settings.socialLinks, facebook: e.target.value } })} placeholder="https://facebook.com/..." className="mt-1.5" />
                </div>
                <div>
                  <Label>Instagram</Label>
                  <Input value={settings.socialLinks.instagram} onChange={(e) => setSettings({ ...settings, socialLinks: { ...settings.socialLinks, instagram: e.target.value } })} placeholder="https://instagram.com/..." className="mt-1.5" />
                </div>
                <div>
                  <Label>Twitter</Label>
                  <Input value={settings.socialLinks.twitter} onChange={(e) => setSettings({ ...settings, socialLinks: { ...settings.socialLinks, twitter: e.target.value } })} placeholder="https://twitter.com/..." className="mt-1.5" />
                </div>
                <div>
                  <Label>YouTube</Label>
                  <Input value={settings.socialLinks.youtube} onChange={(e) => setSettings({ ...settings, socialLinks: { ...settings.socialLinks, youtube: e.target.value } })} placeholder="https://youtube.com/..." className="mt-1.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ============================================
  // Admin Database Manager
  // ============================================

  function AdminDatabase() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<any>(null)
    const [exporting, setExporting] = useState(false)
    const [selectedTable, setSelectedTable] = useState<string | null>(null)

    useEffect(() => {
      fetchStats()
    }, [])

    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/database')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch database stats:', error)
      }
      setLoading(false)
    }

    const handleExport = async (tables?: string[]) => {
      setExporting(true)
      try {
        const res = await fetch('/api/admin/database', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'backup', tables })
        })
        if (res.ok) {
          const data = await res.json()
          const blob = new Blob([JSON.stringify(data.backup, null, 2)], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `luminvera-backup-${new Date().toISOString().split('T')[0]}.json`
          a.click()
          URL.revokeObjectURL(url)
          toast({ title: 'Export Complete', description: 'Database backup downloaded' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to export database', variant: 'destructive' })
      }
      setExporting(false)
    }

    const handleClearTable = async (table: string) => {
      if (!confirm(`Are you sure you want to clear all data from ${table}? This cannot be undone!`)) return
      try {
        const res = await fetch(`/api/admin/database?table=${table}`, { method: 'DELETE' })
        if (res.ok) {
          toast({ title: 'Table Cleared', description: `${table} has been cleared` })
          fetchStats()
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to clear table', variant: 'destructive' })
      }
    }

    if (loading) {
      return (
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-96">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Database Manager</h1>
            <p className="text-muted-foreground">View database stats, backup, and manage data</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleExport()} disabled={exporting}>
              {exporting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Export All
            </Button>
            <Button onClick={fetchStats} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>

        {/* Database Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Database className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Tables</p>
                  <p className="text-xl font-bold">{stats?.tableCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Package className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Records</p>
                  <p className="text-xl font-bold">{stats?.totalRecords?.toLocaleString() || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Users</p>
                  <p className="text-xl font-bold">{stats?.users || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <ShoppingBag className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Orders</p>
                  <p className="text-xl font-bold">{stats?.orders || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tables List */}
        <Card>
          <CardHeader>
            <CardTitle>Database Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-medium">Table Name</th>
                    <th className="text-left p-3 text-sm font-medium">Records</th>
                    <th className="text-left p-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.tables?.map((table: any) => (
                    <tr key={table.name} className="border-b hover:bg-slate-50">
                      <td className="p-3 font-medium">{table.name}</td>
                      <td className="p-3">{table.count.toLocaleString()}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleExport([table.name])}>
                            <Download className="h-4 w-4 mr-1" /> Export
                          </Button>
                          {table.name !== 'User' && table.name !== 'Session' && (
                            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleClearTable(table.name)}>
                              <Trash2 className="h-4 w-4 mr-1" /> Clear
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================
  // Admin Activities / Audit Log
  // ============================================

  function AdminActivities() {
    const [loading, setLoading] = useState(true)
    const [activities, setActivities] = useState<any[]>([])
    const [filter, setFilter] = useState('all')

    useEffect(() => {
      fetchActivities()
    }, [filter])

    const fetchActivities = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/activities?type=${filter}`)
        if (res.ok) {
          const data = await res.json()
          setActivities(data.activities || [])
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error)
      }
      setLoading(false)
    }

    const getActionColor = (action: string) => {
      if (action.includes('delete') || action.includes('remove')) return 'bg-red-100 text-red-800'
      if (action.includes('create') || action.includes('add')) return 'bg-green-100 text-green-800'
      if (action.includes('update') || action.includes('edit')) return 'bg-blue-100 text-blue-800'
      return 'bg-gray-100 text-gray-800'
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Activity Log</h1>
            <p className="text-muted-foreground">Track all admin actions and system events</p>
          </div>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="user">User Actions</SelectItem>
                <SelectItem value="order">Order Actions</SelectItem>
                <SelectItem value="product">Product Actions</SelectItem>
                <SelectItem value="seller">Seller Actions</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchActivities}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : activities.length > 0 ? (
              <div className="divide-y">
                {activities.map((activity) => (
                  <div key={activity.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${getActionColor(activity.action)}`}>
                          <Activity className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{activity.action}</p>
                          <p className="text-sm text-muted-foreground">{activity.description || activity.entityType}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            By {activity.user?.firstName || 'System'} • {formatDate(activity.createdAt)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{activity.entityType}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No activities recorded yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================
  // Admin Reviews Manager
  // ============================================

  function AdminReviews() {
    const [loading, setLoading] = useState(true)
    const [reviews, setReviews] = useState<any[]>([])
    const [filter, setFilter] = useState('all')

    useEffect(() => {
      fetchReviews()
    }, [filter])

    const fetchReviews = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/reviews?status=${filter}`)
        if (res.ok) {
          const data = await res.json()
          setReviews(data.reviews || [])
        }
      } catch (error) {
        console.error('Failed to fetch reviews:', error)
      }
      setLoading(false)
    }

    const handleModerate = async (id: string, action: 'approve' | 'reject') => {
      try {
        const res = await fetch('/api/reviews', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, action })
        })
        if (res.ok) {
          toast({ title: `Review ${action}d`, description: `The review has been ${action}d` })
          fetchReviews()
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to moderate review', variant: 'destructive' })
      }
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Reviews Management</h1>
            <p className="text-muted-foreground">Moderate and manage product reviews</p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reviews</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : reviews.length > 0 ? (
              <div className="divide-y">
                {reviews.map((review) => (
                  <div key={review.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star key={star} className={`h-4 w-4 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                            ))}
                          </div>
                          <Badge variant={review.status === 'APPROVED' ? 'default' : review.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                            {review.status}
                          </Badge>
                        </div>
                        <p className="text-sm">{review.comment}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          By {review.user?.firstName || 'Anonymous'} • {formatDate(review.createdAt)}
                        </p>
                      </div>
                      {review.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleModerate(review.id, 'approve')}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleModerate(review.id, 'reject')}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Star className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No reviews found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================
  // Admin Payouts Manager
  // ============================================

  function AdminPayouts() {
    const [loading, setLoading] = useState(true)
    const [payouts, setPayouts] = useState<any[]>([])
    const [filter, setFilter] = useState('all')

    useEffect(() => {
      fetchPayouts()
    }, [filter])

    const fetchPayouts = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/payouts?status=${filter}`)
        if (res.ok) {
          const data = await res.json()
          setPayouts(data.payouts || [])
        }
      } catch (error) {
        console.error('Failed to fetch payouts:', error)
      }
      setLoading(false)
    }

    const handleUpdateStatus = async (id: string, status: string) => {
      try {
        const res = await fetch('/api/payouts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status })
        })
        if (res.ok) {
          toast({ title: 'Payout Updated', description: `Payout status changed to ${status}` })
          fetchPayouts()
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to update payout', variant: 'destructive' })
      }
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Payouts Management</h1>
            <p className="text-muted-foreground">Manage seller payouts and withdrawals</p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payouts</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PROCESSING">Processing</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : payouts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-4 font-medium">Seller</th>
                      <th className="text-left p-4 font-medium">Amount</th>
                      <th className="text-left p-4 font-medium">Method</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {payouts.map((payout) => (
                      <tr key={payout.id} className="hover:bg-slate-50">
                        <td className="p-4">{payout.seller?.storeName || 'Unknown'}</td>
                        <td className="p-4 font-medium">{formatPrice(payout.amount)}</td>
                        <td className="p-4">{payout.paymentMethod}</td>
                        <td className="p-4">
                          <Badge className={
                            payout.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            payout.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            payout.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {payout.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm">{formatDate(payout.createdAt)}</td>
                        <td className="p-4">
                          {payout.status === 'PENDING' && (
                            <div className="flex gap-1">
                              <Button size="sm" onClick={() => handleUpdateStatus(payout.id, 'PROCESSING')}>Process</Button>
                              <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(payout.id, 'COMPLETED')}>Complete</Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No payouts found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================
  // Admin Notifications Manager
  // ============================================

  function AdminNotifications() {
    const [loading, setLoading] = useState(true)
    const [notifications, setNotifications] = useState<any[]>([])
    const [showSendModal, setShowSendModal] = useState(false)
    const [notificationForm, setNotificationForm] = useState({
      title: '',
      message: '',
      type: 'INFO',
      target: 'all'
    })

    useEffect(() => {
      fetchNotifications()
    }, [])

    const fetchNotifications = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/notifications')
        if (res.ok) {
          const data = await res.json()
          setNotifications(data.notifications || [])
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      }
      setLoading(false)
    }

    const handleSend = async () => {
      try {
        const res = await fetch('/api/admin/bulk-operations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: 'send-notifications',
            data: notificationForm
          })
        })
        if (res.ok) {
          toast({ title: 'Notification Sent', description: 'Notification has been sent to all recipients' })
          setShowSendModal(false)
          setNotificationForm({ title: '', message: '', type: 'INFO', target: 'all' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to send notification', variant: 'destructive' })
      }
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Notifications Center</h1>
            <p className="text-muted-foreground">Manage and send notifications to users</p>
          </div>
          <Button onClick={() => setShowSendModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Send className="h-4 w-4 mr-2" /> Send Notification
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length > 0 ? (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div key={notification.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          notification.type === 'SUCCESS' ? 'bg-green-100' :
                          notification.type === 'WARNING' ? 'bg-yellow-100' :
                          notification.type === 'ERROR' ? 'bg-red-100' :
                          'bg-blue-100'
                        }`}>
                          <Bell className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{notification.title}</p>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(notification.createdAt)}</p>
                        </div>
                      </div>
                      {!notification.isRead && <Badge>New</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No notifications found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Send Notification Modal */}
        <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Notification</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Title</Label>
                <Input value={notificationForm.title} onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea value={notificationForm.message} onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })} className="mt-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={notificationForm.type} onValueChange={(v) => setNotificationForm({ ...notificationForm, type: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INFO">Information</SelectItem>
                      <SelectItem value="SUCCESS">Success</SelectItem>
                      <SelectItem value="WARNING">Warning</SelectItem>
                      <SelectItem value="ERROR">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Target</Label>
                  <Select value={notificationForm.target} onValueChange={(v) => setNotificationForm({ ...notificationForm, target: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="sellers">Sellers Only</SelectItem>
                      <SelectItem value="admins">Admins Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowSendModal(false)}>Cancel</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSend}>Send</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ============================================
  // Admin Banners Manager
  // ============================================

  function AdminBanners() {
    const [loading, setLoading] = useState(true)
    const [banners, setBanners] = useState<any[]>([])
    const [showModal, setShowModal] = useState(false)
    const [editingBanner, setEditingBanner] = useState<any>(null)
    const [bannerForm, setBannerForm] = useState({
      title: '',
      subtitle: '',
      imageUrl: '',
      linkUrl: '',
      position: 'hero',
      isActive: true
    })

    useEffect(() => {
      fetchBanners()
    }, [])

    const fetchBanners = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/banners')
        if (res.ok) {
          const data = await res.json()
          setBanners(data.banners || [])
        }
      } catch (error) {
        console.error('Failed to fetch banners:', error)
      }
      setLoading(false)
    }

    const handleSave = async () => {
      try {
        const method = editingBanner ? 'PUT' : 'POST'
        const body = editingBanner ? { ...bannerForm, id: editingBanner.id } : bannerForm
        const res = await fetch('/api/banners', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        if (res.ok) {
          toast({ title: editingBanner ? 'Banner Updated' : 'Banner Created', description: 'Banner has been saved' })
          setShowModal(false)
          setEditingBanner(null)
          setBannerForm({ title: '', subtitle: '', imageUrl: '', linkUrl: '', position: 'hero', isActive: true })
          fetchBanners()
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to save banner', variant: 'destructive' })
      }
    }

    const handleDelete = async (id: string) => {
      if (!confirm('Are you sure you want to delete this banner?')) return
      try {
        const res = await fetch(`/api/banners?id=${id}`, { method: 'DELETE' })
        if (res.ok) {
          toast({ title: 'Banner Deleted', description: 'Banner has been removed' })
          fetchBanners()
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete banner', variant: 'destructive' })
      }
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Banner Management</h1>
            <p className="text-muted-foreground">Create and manage promotional banners</p>
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" /> Create Banner
          </Button>
        </div>

        <div className="grid gap-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : banners.length > 0 ? (
            banners.map((banner) => (
              <Card key={banner.id}>
                <div className="flex">
                  <div className="w-48 h-32 bg-slate-100 flex-shrink-0 overflow-hidden rounded-l-lg">
                    {banner.imageUrl ? (
                      <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="h-8 w-8 text-slate-300" aria-hidden="true" alt="" />
                      </div>
                    )}
                  </div>
                  <CardContent className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{banner.title}</h3>
                        <p className="text-sm text-muted-foreground">{banner.subtitle}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{banner.position}</Badge>
                          <Badge className={banner.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {banner.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          setEditingBanner(banner)
                          setBannerForm({
                            title: banner.title,
                            subtitle: banner.subtitle || '',
                            imageUrl: banner.imageUrl || '',
                            linkUrl: banner.linkUrl || '',
                            position: banner.position,
                            isActive: banner.isActive
                          })
                          setShowModal(true)
                        }}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(banner.id)}>Delete</Button>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Image className="h-12 w-12 mx-auto text-muted-foreground mb-3" aria-hidden="true" alt="" />
                <p className="text-muted-foreground">No banners created yet</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBanner ? 'Edit Banner' : 'Create Banner'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Title</Label>
                <Input value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>Subtitle</Label>
                <Input value={bannerForm.subtitle} onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input value={bannerForm.imageUrl} onChange={(e) => setBannerForm({ ...bannerForm, imageUrl: e.target.value })} className="mt-1.5" placeholder="https://..." />
              </div>
              <div>
                <Label>Link URL</Label>
                <Input value={bannerForm.linkUrl} onChange={(e) => setBannerForm({ ...bannerForm, linkUrl: e.target.value })} className="mt-1.5" placeholder="/products" />
              </div>
              <div>
                <Label>Position</Label>
                <Select value={bannerForm.position} onValueChange={(v) => setBannerForm({ ...bannerForm, position: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hero">Hero Banner</SelectItem>
                    <SelectItem value="category">Category Section</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="sidebar">Sidebar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={bannerForm.isActive} onCheckedChange={(checked) => setBannerForm({ ...bannerForm, isActive: checked })} />
                <Label>Active</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setShowModal(false); setEditingBanner(null) }}>Cancel</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>Save Banner</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ============================================
  // Admin Categories Manager
  // ============================================

  function AdminCategories() {
    const [loading, setLoading] = useState(true)
    const [categories, setCategories] = useState<any[]>([])
    const [showModal, setShowModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<any>(null)
    const [saving, setSaving] = useState(false)
    const [categoryForm, setCategoryForm] = useState({
      name: '',
      description: '',
      imageUrl: '',
      iconUrl: '',
      parentId: '',
      sortOrder: 0,
      isActive: true,
      isFeatured: false,
      defaultCommission: 10
    })

    useEffect(() => {
      fetchCategories()
    }, [])

    const fetchCategories = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/categories')
        if (res.ok) {
          const data = await res.json()
          setCategories(data.categories || [])
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      }
      setLoading(false)
    }

    const handleSave = async () => {
      if (!categoryForm.name) {
        toast({ title: 'Error', description: 'Category name is required', variant: 'destructive' })
        return
      }
      setSaving(true)
      try {
        const res = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(categoryForm)
        })
        if (res.ok) {
          toast({ title: 'Category Created', description: 'Category has been added' })
          setShowModal(false)
          resetForm()
          fetchCategories()
        } else {
          const data = await res.json()
          toast({ title: 'Error', description: data.error || 'Failed to create category', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to create category', variant: 'destructive' })
      }
      setSaving(false)
    }

    const handleEdit = async () => {
      if (!selectedCategory) return
      setSaving(true)
      try {
        const res = await fetch('/api/admin/categories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoryId: selectedCategory.id, ...categoryForm })
        })
        if (res.ok) {
          toast({ title: 'Category Updated', description: 'Category has been updated' })
          setShowEditModal(false)
          setSelectedCategory(null)
          resetForm()
          fetchCategories()
        } else {
          const data = await res.json()
          toast({ title: 'Error', description: data.error || 'Failed to update category', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to update category', variant: 'destructive' })
      }
      setSaving(false)
    }

    const handleDelete = async (categoryId: string) => {
      if (!confirm('Are you sure you want to delete this category?')) return
      try {
        const res = await fetch(`/api/admin/categories?categoryId=${categoryId}`, { method: 'DELETE' })
        if (res.ok) {
          toast({ title: 'Category Deleted', description: 'Category has been removed' })
          fetchCategories()
        } else {
          const data = await res.json()
          toast({ title: 'Error', description: data.error || 'Failed to delete category', variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete category', variant: 'destructive' })
      }
    }

    const openEditModal = (category: any) => {
      setSelectedCategory(category)
      setCategoryForm({
        name: category.name || '',
        description: category.description || '',
        imageUrl: category.imageUrl || '',
        iconUrl: category.iconUrl || '',
        parentId: category.parentId || '',
        sortOrder: category.sortOrder || 0,
        isActive: category.isActive,
        isFeatured: category.isFeatured || false,
        defaultCommission: category.defaultCommission || 10
      })
      setShowEditModal(true)
    }

    const resetForm = () => {
      setCategoryForm({
        name: '',
        description: '',
        imageUrl: '',
        iconUrl: '',
        parentId: '',
        sortOrder: 0,
        isActive: true,
        isFeatured: false,
        defaultCommission: 10
      })
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Categories Management</h1>
            <p className="text-muted-foreground">Organize product categories</p>
          </div>
          <Button onClick={() => { resetForm(); setShowModal(true) }} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" /> Add Category
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : categories.length > 0 ? (
            categories.map((category) => (
              <Card key={category.id} className={!category.isActive ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                      {category.imageUrl ? (
                        <img src={category.imageUrl} alt={category.name} className="w-full h-full object-cover" />
                      ) : (
                        <Layers className="h-8 w-8 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{category.name}</h3>
                      <p className="text-sm text-muted-foreground">{category._count?.products || 0} products</p>
                    </div>
                    <Badge className={category.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" onClick={() => openEditModal(category)}>
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDelete(category.id)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No categories found</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Add Category Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Name *</Label>
                <Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} className="mt-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Image URL</Label>
                  <Input value={categoryForm.imageUrl} onChange={(e) => setCategoryForm({ ...categoryForm, imageUrl: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label>Icon URL</Label>
                  <Input value={categoryForm.iconUrl} onChange={(e) => setCategoryForm({ ...categoryForm, iconUrl: e.target.value })} className="mt-1.5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sort Order</Label>
                  <Input type="number" value={categoryForm.sortOrder} onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: parseInt(e.target.value) || 0 })} className="mt-1.5" />
                </div>
                <div>
                  <Label>Commission %</Label>
                  <Input type="number" value={categoryForm.defaultCommission} onChange={(e) => setCategoryForm({ ...categoryForm, defaultCommission: parseFloat(e.target.value) || 10 })} className="mt-1.5" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={categoryForm.isActive} onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })} />
                  Active
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={categoryForm.isFeatured} onChange={(e) => setCategoryForm({ ...categoryForm, isFeatured: e.target.checked })} />
                  Featured
                </label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={saving}>
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Category
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Category Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Name</Label>
                <Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} className="mt-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Image URL</Label>
                  <Input value={categoryForm.imageUrl} onChange={(e) => setCategoryForm({ ...categoryForm, imageUrl: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label>Commission %</Label>
                  <Input type="number" value={categoryForm.defaultCommission} onChange={(e) => setCategoryForm({ ...categoryForm, defaultCommission: parseFloat(e.target.value) || 10 })} className="mt-1.5" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={categoryForm.isActive} onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })} />
                  Active
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={categoryForm.isFeatured} onChange={(e) => setCategoryForm({ ...categoryForm, isFeatured: e.target.checked })} />
                  Featured
                </label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleEdit} disabled={saving}>
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ============================================
  // Admin Coupons Manager
  // ============================================

  function AdminCoupons() {
    const [loading, setLoading] = useState(true)
    const [coupons, setCoupons] = useState<any[]>([])
    const [showModal, setShowModal] = useState(false)
    const [couponForm, setCouponForm] = useState({
      code: '',
      name: '',
      type: 'PERCENTAGE',
      discountValue: 10,
      minOrderValue: 0,
      maxUses: 100,
      isActive: true
    })

    useEffect(() => {
      fetchCoupons()
    }, [])

    const fetchCoupons = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/coupons')
        if (res.ok) {
          const data = await res.json()
          setCoupons(data.coupons || [])
        }
      } catch (error) {
        console.error('Failed to fetch coupons:', error)
      }
      setLoading(false)
    }

    const handleSave = async () => {
      try {
        const res = await fetch('/api/coupons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...couponForm, userId: user?.id })
        })
        if (res.ok) {
          toast({ title: 'Coupon Created', description: 'Coupon has been added' })
          setShowModal(false)
          setCouponForm({ code: '', name: '', type: 'PERCENTAGE', discountValue: 10, minOrderValue: 0, maxUses: 100, isActive: true })
          fetchCoupons()
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to create coupon', variant: 'destructive' })
      }
    }

    const handleToggle = async (id: string, isActive: boolean) => {
      try {
        const res = await fetch('/api/coupons', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, isActive: !isActive })
        })
        if (res.ok) {
          toast({ title: 'Coupon Updated', description: `Coupon ${!isActive ? 'activated' : 'deactivated'}` })
          fetchCoupons()
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to update coupon', variant: 'destructive' })
      }
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Coupons Management</h1>
            <p className="text-muted-foreground">Create and manage discount coupons</p>
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" /> Create Coupon
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : coupons.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-4 font-medium">Code</th>
                      <th className="text-left p-4 font-medium">Name</th>
                      <th className="text-left p-4 font-medium">Discount</th>
                      <th className="text-left p-4 font-medium">Uses</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {coupons.map((coupon) => (
                      <tr key={coupon.id} className="hover:bg-slate-50">
                        <td className="p-4"><code className="bg-slate-100 px-2 py-1 rounded font-mono">{coupon.code}</code></td>
                        <td className="p-4">{coupon.name}</td>
                        <td className="p-4 font-medium">
                          {coupon.type === 'PERCENTAGE' ? `${coupon.discountValue}%` : formatPrice(coupon.discountValue)}
                        </td>
                        <td className="p-4">{coupon.currentUses || 0}/{coupon.maxUses || '∞'}</td>
                        <td className="p-4">
                          <Badge className={coupon.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {coupon.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Switch checked={coupon.isActive} onCheckedChange={() => handleToggle(coupon.id, coupon.isActive)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No coupons created yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Coupon</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Code</Label>
                  <Input value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} className="mt-1.5" placeholder="SAVE10" />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input value={couponForm.name} onChange={(e) => setCouponForm({ ...couponForm, name: e.target.value })} className="mt-1.5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={couponForm.type} onValueChange={(v) => setCouponForm({ ...couponForm, type: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                      <SelectItem value="FIXED">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Discount Value</Label>
                  <Input type="number" value={couponForm.discountValue} onChange={(e) => setCouponForm({ ...couponForm, discountValue: parseFloat(e.target.value) })} className="mt-1.5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min Order Value</Label>
                  <Input type="number" value={couponForm.minOrderValue} onChange={(e) => setCouponForm({ ...couponForm, minOrderValue: parseFloat(e.target.value) })} className="mt-1.5" />
                </div>
                <div>
                  <Label>Max Uses</Label>
                  <Input type="number" value={couponForm.maxUses} onChange={(e) => setCouponForm({ ...couponForm, maxUses: parseInt(e.target.value) })} className="mt-1.5" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={couponForm.isActive} onCheckedChange={(checked) => setCouponForm({ ...couponForm, isActive: checked })} />
                <Label>Active</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>Create Coupon</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ============================================
  // Admin Inventory Manager
  // ============================================

  function AdminInventory() {
    const [loading, setLoading] = useState(true)
    const [inventory, setInventory] = useState<any[]>([])
    const [filter, setFilter] = useState('all')

    useEffect(() => {
      fetchInventory()
    }, [filter])

    const fetchInventory = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/inventory?status=${filter}`)
        if (res.ok) {
          const data = await res.json()
          setInventory(data.products || [])
        }
      } catch (error) {
        console.error('Failed to fetch inventory:', error)
      }
      setLoading(false)
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Inventory Management</h1>
            <p className="text-muted-foreground">Track and manage product stock levels</p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : inventory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-4 font-medium">Product</th>
                      <th className="text-left p-4 font-medium">Seller</th>
                      <th className="text-left p-4 font-medium">Stock</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {inventory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-slate-100 rounded overflow-hidden">
                              {item.primaryImage ? (
                                <img src={item.primaryImage} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="h-6 w-6 m-auto text-slate-300" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">SKU: {item.sku || 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">{item.seller?.storeName || 'Unknown'}</td>
                        <td className="p-4">
                          <span className={`font-bold ${item.stock <= 0 ? 'text-red-600' : item.stock <= 10 ? 'text-orange-600' : 'text-green-600'}`}>
                            {item.stock}
                          </span>
                        </td>
                        <td className="p-4">
                          <Badge className={
                            item.stock <= 0 ? 'bg-red-100 text-red-800' :
                            item.stock <= 10 ? 'bg-orange-100 text-orange-800' :
                            'bg-green-100 text-green-800'
                          }>
                            {item.stock <= 0 ? 'Out of Stock' : item.stock <= 10 ? 'Low Stock' : 'In Stock'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Button variant="outline" size="sm">Update Stock</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No inventory items found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================
  // Admin Support Manager
  // ============================================

  function AdminSupport() {
    const [loading, setLoading] = useState(true)
    const [tickets, setTickets] = useState<any[]>([])
    const [filter, setFilter] = useState('all')
    const [selectedTicket, setSelectedTicket] = useState<any>(null)

    useEffect(() => {
      fetchTickets()
    }, [filter])

    const fetchTickets = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/support-tickets?status=${filter}`)
        if (res.ok) {
          const data = await res.json()
          setTickets(data.tickets || [])
        }
      } catch (error) {
        console.error('Failed to fetch tickets:', error)
      }
      setLoading(false)
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Support Center</h1>
            <p className="text-muted-foreground">Manage customer support tickets</p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tickets</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : tickets.length > 0 ? (
              <div className="divide-y">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="p-4 hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{ticket.subject}</h3>
                          <Badge className={
                            ticket.status === 'OPEN' ? 'bg-red-100 text-red-800' :
                            ticket.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                            ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {ticket.status}
                          </Badge>
                          <Badge variant="outline">{ticket.priority}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {ticket.user?.firstName} • {formatDate(ticket.createdAt)}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <HeadphonesIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No support tickets found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================
  // Admin Analytics Dashboard
  // ============================================

  function AdminAnalytics() {
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState('month')
    const [analytics, setAnalytics] = useState<any>(null)

    useEffect(() => {
      fetchAnalytics()
    }, [period])

    const fetchAnalytics = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/analytics?period=${period}`)
        if (res.ok) {
          const data = await res.json()
          setAnalytics(data)
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
      }
      setLoading(false)
    }

    if (loading) {
      return (
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-96">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Comprehensive business insights</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-emerald-600">{formatPrice(analytics?.revenue?.total || 0)}</p>
              <div className="flex items-center gap-1 mt-1 text-sm">
                {analytics?.revenue?.growth >= 0 ? (
                  <ArrowUp className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDown className="h-4 w-4 text-red-500" />
                )}
                <span className={analytics?.revenue?.growth >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {Math.abs(analytics?.revenue?.growth || 0)}%
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold">{analytics?.orders?.total || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">New Users</p>
              <p className="text-2xl font-bold">{analytics?.users?.new || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Active Sellers</p>
              <p className="text-2xl font-bold">{analytics?.sellers?.active || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Top Sellers & Products */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Sellers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.topSellers?.map((seller: any, index: number) => (
                  <div key={seller.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium">{index + 1}</span>
                      <div>
                        <p className="font-medium">{seller.storeName}</p>
                        <p className="text-sm text-muted-foreground">{seller.ordersCount} orders</p>
                      </div>
                    </div>
                    <p className="font-bold">{formatPrice(seller.revenue)}</p>
                  </div>
                )) || <p className="text-muted-foreground">No data available</p>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.topProducts?.map((product: any, index: number) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium">{index + 1}</span>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.salesCount} sold</p>
                      </div>
                    </div>
                    <p className="font-bold">{formatPrice(product.revenue)}</p>
                  </div>
                )) || <p className="text-muted-foreground">No data available</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ============================================
  // Admin Platform Services Component
  // ============================================

  function AdminPlatformServices() {
    const [loading, setLoading] = useState(true)
    const [services, setServices] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [enabledFilter, setEnabledFilter] = useState<string>('all')
    const [stats, setStats] = useState({ total: 0, active: 0 })

    const categories = [
      { value: 'all', label: 'All Categories' },
      { value: 'PAYMENT', label: 'Payment' },
      { value: 'SHIPPING', label: 'Shipping' },
      { value: 'COMMUNICATION', label: 'Communication' },
      { value: 'ANALYTICS', label: 'Analytics' },
      { value: 'SECURITY', label: 'Security' },
      { value: 'AI_ML', label: 'AI/ML' },
      { value: 'MARKETING', label: 'Marketing' },
      { value: 'STORAGE', label: 'Storage' },
      { value: 'VERIFICATION', label: 'Verification' },
      { value: 'NOTIFICATION', label: 'Notification' },
      { value: 'SOCIAL', label: 'Social' },
      { value: 'SEARCH', label: 'Search' },
      { value: 'CDN', label: 'CDN' },
      { value: 'FRAUD_DETECTION', label: 'Fraud Detection' },
      { value: 'LOYALTY', label: 'Loyalty' },
      { value: 'CACHE', label: 'Cache' },
      { value: 'SUPPORT', label: 'Support' },
    ]

    const fetchServices = useCallback(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('type', 'services')
        if (selectedCategory !== 'all') params.set('category', selectedCategory)
        if (enabledFilter !== 'all') params.set('enabled', enabledFilter)
        if (searchQuery) params.set('search', searchQuery)
        params.set('pageSize', '200')

        const res = await fetch(`/api/admin/platform?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setServices(data.data || [])
        }

        // Fetch stats
        const statsRes = await fetch('/api/admin/platform?type=stats')
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData.data?.services || { total: 0, active: 0 })
        }
      } catch (error) {
        console.error('Failed to fetch services:', error)
      }
      setLoading(false)
    }, [selectedCategory, enabledFilter, searchQuery])

    useEffect(() => {
      fetchServices()
    }, [selectedCategory, enabledFilter])

    const handleToggleService = async (serviceId: string, isEnabled: boolean) => {
      try {
        const res = await fetch('/api/admin/platform', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'toggle-service',
            id: serviceId,
            data: { isEnabled }
          })
        })
        if (res.ok) {
          toast({ title: 'Updated', description: `Service ${isEnabled ? 'enabled' : 'disabled'}` })
          setServices(services.map(s => s.id === serviceId ? { ...s, isEnabled } : s))
          setStats(prev => ({
            ...prev,
            active: isEnabled ? prev.active + 1 : prev.active - 1
          }))
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to update service', variant: 'destructive' })
      }
    }

    const getCategoryColor = (category: string) => {
      const colors: Record<string, string> = {
        'PAYMENT': 'bg-green-100 text-green-800',
        'SHIPPING': 'bg-blue-100 text-blue-800',
        'COMMUNICATION': 'bg-purple-100 text-purple-800',
        'ANALYTICS': 'bg-yellow-100 text-yellow-800',
        'SECURITY': 'bg-red-100 text-red-800',
        'AI_ML': 'bg-indigo-100 text-indigo-800',
        'MARKETING': 'bg-pink-100 text-pink-800',
        'STORAGE': 'bg-cyan-100 text-cyan-800',
        'VERIFICATION': 'bg-orange-100 text-orange-800',
        'NOTIFICATION': 'bg-teal-100 text-teal-800',
        'SOCIAL': 'bg-rose-100 text-rose-800',
        'SEARCH': 'bg-amber-100 text-amber-800',
        'CDN': 'bg-lime-100 text-lime-800',
        'FRAUD_DETECTION': 'bg-red-100 text-red-800',
        'LOYALTY': 'bg-violet-100 text-violet-800',
        'CACHE': 'bg-slate-100 text-slate-800',
        'SUPPORT': 'bg-emerald-100 text-emerald-800',
      }
      return colors[category] || 'bg-gray-100 text-gray-800'
    }

    const getStatusBadge = (status: string) => {
      switch (status) {
        case 'ACTIVE': return <Badge className="bg-green-500">Active</Badge>
        case 'INACTIVE': return <Badge variant="secondary">Inactive</Badge>
        case 'MAINTENANCE': return <Badge className="bg-yellow-500">Maintenance</Badge>
        default: return <Badge variant="outline">{status}</Badge>
      }
    }

    const filteredServices = services.filter(s => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          s.name.toLowerCase().includes(query) ||
          s.provider?.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query)
        )
      }
      return true
    })

    return (
      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" className="mb-4" onClick={() => setCurrentView('admin-dashboard')}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Platform Services</h1>
            <p className="text-muted-foreground">{stats.total} services • {stats.active} active</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <Database className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Services</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
              <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4 text-center">
              <XCircle className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <p className="text-2xl font-bold text-orange-600">{stats.total - stats.active}</p>
              <p className="text-sm text-muted-foreground">Disabled</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <Layers className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold text-purple-600">{categories.length - 1}</p>
              <p className="text-sm text-muted-foreground">Categories</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={enabledFilter} onValueChange={setEnabledFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="true">Enabled</SelectItem>
              <SelectItem value="false">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredServices.map((service) => (
              <Card key={service.id} className={`hover:shadow-md transition-shadow ${service.isEnabled ? 'border-emerald-200' : 'border-slate-200 opacity-75'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{service.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{service.provider}</p>
                    </div>
                    <Switch
                      checked={service.isEnabled}
                      onCheckedChange={(checked) => handleToggleService(service.id, checked)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className={getCategoryColor(service.category)}>
                      {service.category?.replace('_', '/')}
                    </Badge>
                    {getStatusBadge(service.status)}
                    {service.isPremium && (
                      <Badge className="bg-amber-100 text-amber-800">Premium</Badge>
                    )}
                  </div>
                  {service.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredServices.length === 0 && !loading && (
          <div className="text-center py-16">
            <Database className="h-24 w-24 mx-auto text-slate-200 mb-4" />
            <h3 className="text-xl font-medium mb-2">No services found</h3>
            <p className="text-muted-foreground">Try adjusting your filters</p>
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // Admin Platform Features Component
  // ============================================

  function AdminPlatformFeatures() {
    const [loading, setLoading] = useState(true)
    const [features, setFeatures] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [enabledFilter, setEnabledFilter] = useState<string>('all')
    const [stats, setStats] = useState({ total: 0, active: 0 })

    const categories = [
      { value: 'all', label: 'All Categories' },
      { value: 'UI', label: 'UI' },
      { value: 'Commerce', label: 'Commerce' },
      { value: 'Security', label: 'Security' },
      { value: 'Communication', label: 'Communication' },
      { value: 'Analytics', label: 'Analytics' },
    ]

    const fetchFeatures = useCallback(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('type', 'features')
        if (enabledFilter !== 'all') params.set('enabled', enabledFilter)
        if (searchQuery) params.set('search', searchQuery)
        params.set('pageSize', '100')

        const res = await fetch(`/api/admin/platform?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setFeatures(data.data || [])
        }

        const statsRes = await fetch('/api/admin/platform?type=stats')
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData.data?.features || { total: 0, active: 0 })
        }
      } catch (error) {
        console.error('Failed to fetch features:', error)
      }
      setLoading(false)
    }, [enabledFilter, searchQuery])

    useEffect(() => {
      fetchFeatures()
    }, [enabledFilter])

    const handleToggleFeature = async (featureId: string, isEnabled: boolean) => {
      try {
        const res = await fetch('/api/admin/platform', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'toggle-feature',
            id: featureId,
            data: { isEnabled }
          })
        })
        if (res.ok) {
          toast({ title: 'Updated', description: `Feature ${isEnabled ? 'enabled' : 'disabled'}` })
          setFeatures(features.map(f => f.id === featureId ? { ...f, isEnabled } : f))
          setStats(prev => ({
            ...prev,
            active: isEnabled ? prev.active + 1 : prev.active - 1
          }))
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to update feature', variant: 'destructive' })
      }
    }

    const getCategoryColor = (category: string) => {
      const colors: Record<string, string> = {
        'UI': 'bg-blue-100 text-blue-800',
        'Commerce': 'bg-emerald-100 text-emerald-800',
        'Security': 'bg-red-100 text-red-800',
        'Communication': 'bg-purple-100 text-purple-800',
        'Analytics': 'bg-yellow-100 text-yellow-800',
      }
      return colors[category] || 'bg-gray-100 text-gray-800'
    }

    const getTypeIcon = (type: string) => {
      switch (type) {
        case 'TOGGLE': return <Check className="h-4 w-4" />
        case 'PERCENTAGE': return <Percent className="h-4 w-4" />
        case 'SELECT': return <Layers className="h-4 w-4" />
        case 'MULTI_SELECT': return <Layers className="h-4 w-4" />
        default: return <Settings className="h-4 w-4" />
      }
    }

    const filteredFeatures = features.filter(f => {
      if (selectedCategory !== 'all' && f.category !== selectedCategory) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          f.name.toLowerCase().includes(query) ||
          f.key?.toLowerCase().includes(query) ||
          f.description?.toLowerCase().includes(query)
        )
      }
      return true
    })

    return (
      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" className="mb-4" onClick={() => setCurrentView('admin-dashboard')}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Platform Features</h1>
            <p className="text-muted-foreground">{stats.total} features • {stats.active} active</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <Zap className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Features</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
              <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Enabled</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4 text-center">
              <XCircle className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <p className="text-2xl font-bold text-orange-600">{stats.total - stats.active}</p>
              <p className="text-sm text-muted-foreground">Disabled</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <Layers className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold text-purple-600">{categories.length - 1}</p>
              <p className="text-sm text-muted-foreground">Categories</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search features..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={enabledFilter} onValueChange={setEnabledFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="true">Enabled</SelectItem>
              <SelectItem value="false">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFeatures.map((feature) => (
              <Card key={feature.id} className={`hover:shadow-md transition-shadow ${feature.isEnabled ? 'border-emerald-200' : 'border-slate-200 opacity-75'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{feature.name}</h3>
                        <div className="text-muted-foreground">{getTypeIcon(feature.type)}</div>
                      </div>
                      <code className="text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded">{feature.key}</code>
                    </div>
                    <Switch
                      checked={feature.isEnabled}
                      onCheckedChange={(checked) => handleToggleFeature(feature.id, checked)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className={getCategoryColor(feature.category)}>
                      {feature.category}
                    </Badge>
                    {feature.rolloutPercentage !== undefined && feature.rolloutPercentage > 0 && (
                      <Badge variant="outline">{feature.rolloutPercentage}% rollout</Badge>
                    )}
                  </div>
                  {feature.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{feature.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredFeatures.length === 0 && !loading && (
          <div className="text-center py-16">
            <Zap className="h-24 w-24 mx-auto text-slate-200 mb-4" />
            <h3 className="text-xl font-medium mb-2">No features found</h3>
            <p className="text-muted-foreground">Try adjusting your filters</p>
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // Admin Platform Tools Component
  // ============================================

  function AdminPlatformTools() {
    const [loading, setLoading] = useState(true)
    const [tools, setTools] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [stats, setStats] = useState({ total: 0 })

    const categories = [
      { value: 'all', label: 'All Categories' },
      { value: 'DATA_MANAGEMENT', label: 'Data Management' },
      { value: 'USER_MANAGEMENT', label: 'User Management' },
      { value: 'PRODUCT_MANAGEMENT', label: 'Product Management' },
      { value: 'ORDER_MANAGEMENT', label: 'Order Management' },
      { value: 'FINANCIAL', label: 'Financial' },
      { value: 'CONTENT', label: 'Content' },
      { value: 'SYSTEM', label: 'System' },
      { value: 'REPORTING', label: 'Reporting' },
      { value: 'COMMUNICATION', label: 'Communication' },
    ]

    const fetchTools = useCallback(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('type', 'tools')
        if (selectedCategory !== 'all') params.set('category', selectedCategory)
        if (searchQuery) params.set('search', searchQuery)
        params.set('pageSize', '100')

        const res = await fetch(`/api/admin/platform?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setTools(data.data || [])
        }

        const statsRes = await fetch('/api/admin/platform?type=stats')
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData.data?.tools || { total: 0 })
        }
      } catch (error) {
        console.error('Failed to fetch tools:', error)
      }
      setLoading(false)
    }, [selectedCategory, searchQuery])

    useEffect(() => {
      fetchTools()
    }, [selectedCategory])

    const getCategoryColor = (category: string) => {
      const colors: Record<string, string> = {
        'DATA_MANAGEMENT': 'bg-blue-100 text-blue-800',
        'USER_MANAGEMENT': 'bg-emerald-100 text-emerald-800',
        'PRODUCT_MANAGEMENT': 'bg-purple-100 text-purple-800',
        'ORDER_MANAGEMENT': 'bg-orange-100 text-orange-800',
        'FINANCIAL': 'bg-yellow-100 text-yellow-800',
        'CONTENT': 'bg-pink-100 text-pink-800',
        'SYSTEM': 'bg-red-100 text-red-800',
        'REPORTING': 'bg-cyan-100 text-cyan-800',
        'COMMUNICATION': 'bg-teal-100 text-teal-800',
      }
      return colors[category] || 'bg-gray-100 text-gray-800'
    }

    const filteredTools = tools.filter(t => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          t.name.toLowerCase().includes(query) ||
          t.slug?.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
        )
      }
      return true
    })

    return (
      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" className="mb-4" onClick={() => setCurrentView('admin-dashboard')}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Admin Tools</h1>
            <p className="text-muted-foreground">{stats.total} tools available</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <Settings className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Tools</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-600" />
              <p className="text-2xl font-bold text-red-600">{tools.filter(t => t.isDangerous).length}</p>
              <p className="text-sm text-muted-foreground">Dangerous</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4 text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-amber-600" />
              <p className="text-2xl font-bold text-amber-600">{tools.filter(t => t.requiresConfirmation).length}</p>
              <p className="text-sm text-muted-foreground">Requires Confirmation</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <Layers className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold text-purple-600">{categories.length - 1}</p>
              <p className="text-sm text-muted-foreground">Categories</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTools.map((tool) => (
              <Card key={tool.id} className={`hover:shadow-md transition-shadow ${tool.isDangerous ? 'border-red-200 bg-red-50/30' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{tool.name}</h3>
                        {tool.isDangerous && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <code className="text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded">{tool.slug}</code>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className={getCategoryColor(tool.category)}>
                      {tool.category?.replace('_', ' ')}
                    </Badge>
                    {tool.isDangerous && (
                      <Badge className="bg-red-100 text-red-800">Dangerous</Badge>
                    )}
                    {tool.requiresConfirmation && (
                      <Badge className="bg-amber-100 text-amber-800">Confirm Required</Badge>
                    )}
                    {tool._count?.executionLogs !== undefined && (
                      <Badge variant="outline">{tool._count.executionLogs} runs</Badge>
                    )}
                  </div>
                  {tool.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{tool.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredTools.length === 0 && !loading && (
          <div className="text-center py-16">
            <Settings className="h-24 w-24 mx-auto text-slate-200 mb-4" />
            <h3 className="text-xl font-medium mb-2">No tools found</h3>
            <p className="text-muted-foreground">Try adjusting your filters</p>
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // Admin Color Palette Component
  // ============================================

  function AdminColorPalette() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [palettes, setPalettes] = useState<any[]>([])
    const [selectedPalette, setSelectedPalette] = useState<any>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newPaletteName, setNewPaletteName] = useState('')

    const [colorForm, setColorForm] = useState({
      primary: '#10b981',
      primaryForeground: '#ffffff',
      primaryHover: '#059669',
      secondary: '#6b7280',
      secondaryForeground: '#ffffff',
      background: '#ffffff',
      foreground: '#0f172a',
      accent: '#f59e0b',
      accentForeground: '#ffffff',
      success: '#10b981',
      successForeground: '#ffffff',
      warning: '#f59e0b',
      warningForeground: '#ffffff',
      error: '#ef4444',
      errorForeground: '#ffffff',
      info: '#3b82f6',
      infoForeground: '#ffffff',
      muted: '#f1f5f9',
      mutedForeground: '#64748b',
      border: '#e2e8f0',
      ring: '#10b981',
    })

    const fetchPalettes = useCallback(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/platform?type=palettes')
        if (res.ok) {
          const data = await res.json()
          setPalettes(data.data || [])
          // Select active palette by default
          const active = (data.data || []).find((p: any) => p.isActive)
          if (active) {
            setSelectedPalette(active)
            setColorForm({
              primary: active.primary || '#10b981',
              primaryForeground: active.primaryForeground || '#ffffff',
              primaryHover: active.primaryHover || '#059669',
              secondary: active.secondary || '#6b7280',
              secondaryForeground: active.secondaryForeground || '#ffffff',
              background: active.background || '#ffffff',
              foreground: active.foreground || '#0f172a',
              accent: active.accent || '#f59e0b',
              accentForeground: active.accentForeground || '#ffffff',
              success: active.success || '#10b981',
              successForeground: active.successForeground || '#ffffff',
              warning: active.warning || '#f59e0b',
              warningForeground: active.warningForeground || '#ffffff',
              error: active.error || '#ef4444',
              errorForeground: active.errorForeground || '#ffffff',
              info: active.info || '#3b82f6',
              infoForeground: active.infoForeground || '#ffffff',
              muted: active.muted || '#f1f5f9',
              mutedForeground: active.mutedForeground || '#64748b',
              border: active.border || '#e2e8f0',
              ring: active.ring || '#10b981',
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch palettes:', error)
      }
      setLoading(false)
    }, [])

    useEffect(() => {
      fetchPalettes()
    }, [])

    const handleActivatePalette = async (paletteId: string) => {
      try {
        const res = await fetch('/api/admin/platform', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'activate-palette',
            id: paletteId,
          })
        })
        if (res.ok) {
          toast({ title: 'Activated', description: 'Color palette activated successfully' })
          setPalettes(palettes.map(p => ({ ...p, isActive: p.id === paletteId })))
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to activate palette', variant: 'destructive' })
      }
    }

    const handleSavePalette = async () => {
      if (!selectedPalette) return
      setSaving(true)
      try {
        const res = await fetch('/api/admin/platform', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'palette',
            id: selectedPalette.id,
            data: colorForm
          })
        })
        if (res.ok) {
          toast({ title: 'Saved', description: 'Color palette saved successfully' })
          fetchPalettes()
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to save palette', variant: 'destructive' })
      }
      setSaving(false)
    }

    const handleCreatePalette = async () => {
      if (!newPaletteName.trim()) {
        toast({ title: 'Error', description: 'Please enter a palette name', variant: 'destructive' })
        return
      }
      setSaving(true)
      try {
        const res = await fetch('/api/admin/platform', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'palette',
            data: {
              name: newPaletteName,
              slug: newPaletteName.toLowerCase().replace(/\s+/g, '-'),
              ...colorForm
            }
          })
        })
        if (res.ok) {
          toast({ title: 'Created', description: 'New color palette created' })
          setShowCreateModal(false)
          setNewPaletteName('')
          fetchPalettes()
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to create palette', variant: 'destructive' })
      }
      setSaving(false)
    }

    const handleDeletePalette = async (paletteId: string) => {
      const palette = palettes.find(p => p.id === paletteId)
      if (palette?.isDefault) {
        toast({ title: 'Error', description: 'Cannot delete default palette', variant: 'destructive' })
        return
      }
      if (!confirm('Are you sure you want to delete this palette?')) return

      try {
        const res = await fetch(`/api/admin/platform?type=palette&id=${paletteId}`, {
          method: 'DELETE'
        })
        if (res.ok) {
          toast({ title: 'Deleted', description: 'Color palette deleted' })
          fetchPalettes()
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete palette', variant: 'destructive' })
      }
    }

    const selectPaletteForEdit = (palette: any) => {
      setSelectedPalette(palette)
      setColorForm({
        primary: palette.primary || '#10b981',
        primaryForeground: palette.primaryForeground || '#ffffff',
        primaryHover: palette.primaryHover || '#059669',
        secondary: palette.secondary || '#6b7280',
        secondaryForeground: palette.secondaryForeground || '#ffffff',
        background: palette.background || '#ffffff',
        foreground: palette.foreground || '#0f172a',
        accent: palette.accent || '#f59e0b',
        accentForeground: palette.accentForeground || '#ffffff',
        success: palette.success || '#10b981',
        successForeground: palette.successForeground || '#ffffff',
        warning: palette.warning || '#f59e0b',
        warningForeground: palette.warningForeground || '#ffffff',
        error: palette.error || '#ef4444',
        errorForeground: palette.errorForeground || '#ffffff',
        info: palette.info || '#3b82f6',
        infoForeground: palette.infoForeground || '#ffffff',
        muted: palette.muted || '#f1f5f9',
        mutedForeground: palette.mutedForeground || '#64748b',
        border: palette.border || '#e2e8f0',
        ring: palette.ring || '#10b981',
      })
    }

    const ColorInput = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
      <div className="flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-lg border shadow-sm cursor-pointer"
          style={{ backgroundColor: value }}
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'color'
            input.value = value
            input.onchange = (e) => onChange((e.target as HTMLInputElement).value)
            input.click()
          }}
        />
        <div className="flex-1">
          <Label className="text-sm">{label}</Label>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 font-mono text-sm"
          />
        </div>
      </div>
    )

    return (
      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" className="mb-4" onClick={() => setCurrentView('admin-dashboard')}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Color Palettes</h1>
            <p className="text-muted-foreground">{palettes.length} palettes</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" /> Create Palette
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Palette List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Palettes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {palettes.map((palette) => (
                  <div 
                    key={palette.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedPalette?.id === palette.id 
                        ? 'border-emerald-500 bg-emerald-50' 
                        : 'hover:border-slate-300'
                    } ${palette.isActive ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}
                    onClick={() => selectPaletteForEdit(palette)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{palette.name}</span>
                      {palette.isActive && (
                        <Badge className="bg-emerald-500">Active</Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {[palette.primary, palette.secondary, palette.accent, palette.success, palette.warning, palette.error].map((color, i) => (
                        <div 
                          key={i}
                          className="w-6 h-6 rounded"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      {!palette.isActive && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleActivatePalette(palette.id)
                          }}
                        >
                          Activate
                        </Button>
                      )}
                      {!palette.isDefault && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-red-500 hover:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeletePalette(palette.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Editor */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Edit: {selectedPalette?.name || 'Select a palette'}</CardTitle>
                  <Button onClick={handleSavePalette} disabled={saving || !selectedPalette}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedPalette ? (
                  <div className="space-y-6">
                    {/* Primary Colors */}
                    <div>
                      <h4 className="font-medium mb-3">Primary Colors</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <ColorInput 
                          label="Primary" 
                          value={colorForm.primary} 
                          onChange={(v) => setColorForm({ ...colorForm, primary: v })} 
                        />
                        <ColorInput 
                          label="Primary Hover" 
                          value={colorForm.primaryHover} 
                          onChange={(v) => setColorForm({ ...colorForm, primaryHover: v })} 
                        />
                        <ColorInput 
                          label="Primary Text" 
                          value={colorForm.primaryForeground} 
                          onChange={(v) => setColorForm({ ...colorForm, primaryForeground: v })} 
                        />
                      </div>
                    </div>

                    {/* Background Colors */}
                    <div>
                      <h4 className="font-medium mb-3">Background Colors</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <ColorInput 
                          label="Background" 
                          value={colorForm.background} 
                          onChange={(v) => setColorForm({ ...colorForm, background: v })} 
                        />
                        <ColorInput 
                          label="Foreground" 
                          value={colorForm.foreground} 
                          onChange={(v) => setColorForm({ ...colorForm, foreground: v })} 
                        />
                        <ColorInput 
                          label="Muted" 
                          value={colorForm.muted} 
                          onChange={(v) => setColorForm({ ...colorForm, muted: v })} 
                        />
                      </div>
                    </div>

                    {/* Semantic Colors */}
                    <div>
                      <h4 className="font-medium mb-3">Semantic Colors</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <ColorInput 
                          label="Success" 
                          value={colorForm.success} 
                          onChange={(v) => setColorForm({ ...colorForm, success: v })} 
                        />
                        <ColorInput 
                          label="Warning" 
                          value={colorForm.warning} 
                          onChange={(v) => setColorForm({ ...colorForm, warning: v })} 
                        />
                        <ColorInput 
                          label="Error" 
                          value={colorForm.error} 
                          onChange={(v) => setColorForm({ ...colorForm, error: v })} 
                        />
                        <ColorInput 
                          label="Info" 
                          value={colorForm.info} 
                          onChange={(v) => setColorForm({ ...colorForm, info: v })} 
                        />
                        <ColorInput 
                          label="Accent" 
                          value={colorForm.accent} 
                          onChange={(v) => setColorForm({ ...colorForm, accent: v })} 
                        />
                      </div>
                    </div>

                    {/* Border & Ring */}
                    <div>
                      <h4 className="font-medium mb-3">Border & Focus</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <ColorInput 
                          label="Border" 
                          value={colorForm.border} 
                          onChange={(v) => setColorForm({ ...colorForm, border: v })} 
                        />
                        <ColorInput 
                          label="Ring (Focus)" 
                          value={colorForm.ring} 
                          onChange={(v) => setColorForm({ ...colorForm, ring: v })} 
                        />
                      </div>
                    </div>

                    {/* Live Preview */}
                    <div>
                      <h4 className="font-medium mb-3">Live Preview</h4>
                      <div 
                        className="rounded-xl p-6 border"
                        style={{ 
                          backgroundColor: colorForm.background,
                          borderColor: colorForm.border
                        }}
                      >
                        <h5 
                          className="text-xl font-bold mb-4"
                          style={{ color: colorForm.foreground }}
                        >
                          Preview Heading
                        </h5>
                        <p 
                          className="mb-4"
                          style={{ color: colorForm.mutedForeground }}
                        >
                          This is how your colors will look in the application.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button 
                            className="px-4 py-2 rounded-lg font-medium"
                            style={{ 
                              backgroundColor: colorForm.primary,
                              color: colorForm.primaryForeground
                            }}
                          >
                            Primary Button
                          </button>
                          <button 
                            className="px-4 py-2 rounded-lg font-medium border"
                            style={{ 
                              borderColor: colorForm.border,
                              color: colorForm.foreground
                            }}
                          >
                            Secondary Button
                          </button>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <span 
                            className="px-3 py-1 rounded-full text-sm"
                            style={{ backgroundColor: colorForm.success, color: colorForm.successForeground }}
                          >
                            Success
                          </span>
                          <span 
                            className="px-3 py-1 rounded-full text-sm"
                            style={{ backgroundColor: colorForm.warning, color: colorForm.warningForeground }}
                          >
                            Warning
                          </span>
                          <span 
                            className="px-3 py-1 rounded-full text-sm"
                            style={{ backgroundColor: colorForm.error, color: colorForm.errorForeground }}
                          >
                            Error
                          </span>
                          <span 
                            className="px-3 py-1 rounded-full text-sm"
                            style={{ backgroundColor: colorForm.info, color: colorForm.infoForeground }}
                          >
                            Info
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <Palette className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Select a palette to edit</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Palette Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Palette</DialogTitle>
              <DialogDescription>Enter a name for your new color palette</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>Palette Name</Label>
              <Input
                value={newPaletteName}
                onChange={(e) => setNewPaletteName(e.target.value)}
                placeholder="e.g., Dark Theme, Ocean Blue"
                className="mt-1.5"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button onClick={handleCreatePalette} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? 'Creating...' : 'Create Palette'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ============================================
  // Auth Modal Component
  // ============================================

  function AuthModal() {
    const [loginForm, setLoginForm] = useState({ email: '', password: '' })
    const [registerForm, setRegisterForm] = useState({ 
      email: '', password: '', confirmPassword: '',
      firstName: '', lastName: '', role: 'USER'
    })

    return (
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {authModalTab === 'login' && 'Welcome Back'}
              {authModalTab === 'register' && 'Create Account'}
            </DialogTitle>
            <DialogDescription>
              {authModalTab === 'login' && 'Login to your Luminvera account'}
              {authModalTab === 'register' && 'Join Pakistan\'s largest marketplace'}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={authModalTab} onValueChange={(v) => setAuthModalTab(v as any)}>
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">Login</TabsTrigger>
              <TabsTrigger value="register" className="flex-1">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={(e) => { e.preventDefault(); handleLogin(loginForm.email, loginForm.password) }} className="space-y-4 mt-4">
                <div>
                  <Label>Email</Label>
                  <Input 
                    type="email" 
                    placeholder="your@email.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="mt-1.5"
                    required
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input 
                    type="password" 
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="mt-1.5"
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Login</Button>
                <Button type="button" variant="link" className="w-full" onClick={() => setAuthModalTab('register')}>
                  Don't have an account? Register
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={(e) => { e.preventDefault(); handleRegister(registerForm) }} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input 
                      placeholder="John"
                      value={registerForm.firstName}
                      onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input 
                      placeholder="Doe"
                      value={registerForm.lastName}
                      onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input 
                    type="email" 
                    placeholder="your@email.com"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    className="mt-1.5"
                    required
                  />
                </div>
                <div>
                  <Label>Account Type</Label>
                  <Select 
                    value={registerForm.role}
                    onValueChange={(v) => setRegisterForm({ ...registerForm, role: v })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">Buyer Account</SelectItem>
                      <SelectItem value="SELLER">Seller Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Password</Label>
                  <Input 
                    type="password" 
                    placeholder="••••••••"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    className="mt-1.5"
                    required
                  />
                </div>
                <div>
                  <Label>Confirm Password</Label>
                  <Input 
                    type="password" 
                    placeholder="••••••••"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                    className="mt-1.5"
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Create Account</Button>
                <Button type="button" variant="link" className="w-full" onClick={() => setAuthModalTab('login')}>
                  Already have an account? Login
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    )
  }
}
