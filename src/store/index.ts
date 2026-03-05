import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Seller, Product, Cart, CartItem, Order, Address, Notification, AdminDashboardStats, SellerDashboardStats } from '@/types'

// ============================================
// Auth Store
// ============================================

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  logout: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'luminvera-auth',
      partialize: (state) => ({ token: state.token }),
    }
  )
)

// ============================================
// Cart Store
// ============================================

interface CartState {
  cart: Cart | null
  items: CartItem[]
  isLoading: boolean
  
  setCart: (cart: Cart | null) => void
  setItems: (items: CartItem[]) => void
  addItem: (item: CartItem) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  setLoading: (loading: boolean) => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cart: null,
      items: [],
      isLoading: false,
      
      setCart: (cart) => set({ cart, items: cart?.items || [] }),
      setItems: (items) => set({ items }),
      addItem: (item) => set((state) => {
        const existingIndex = state.items.findIndex(
          (i) => i.productId === item.productId && i.variantId === item.variantId
        )
        if (existingIndex >= 0) {
          const newItems = [...state.items]
          newItems[existingIndex] = {
            ...newItems[existingIndex],
            quantity: newItems[existingIndex].quantity + item.quantity,
            totalPrice: (newItems[existingIndex].quantity + item.quantity) * item.unitPrice
          }
          return { items: newItems }
        }
        return { items: [...state.items, item] }
      }),
      removeItem: (itemId) => set((state) => ({
        items: state.items.filter((i) => i.id !== itemId)
      })),
      updateQuantity: (itemId, quantity) => set((state) => ({
        items: state.items.map((i) => 
          i.id === itemId 
            ? { ...i, quantity, totalPrice: quantity * i.unitPrice }
            : i
        )
      })),
      clearCart: () => set({ cart: null, items: [] }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'luminvera-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
)

// ============================================
// UI Store
// ============================================

type ViewType = 'home' | 'products' | 'product-detail' | 'cart' | 'checkout' | 
  'user-dashboard' | 'user-orders' | 'user-profile' | 'user-wishlist' |
  'seller-dashboard' | 'seller-products' | 'seller-orders' | 'seller-finances' |
  'admin-dashboard' | 'admin-users' | 'admin-sellers' | 'admin-products' | 
  'admin-orders' | 'admin-settings'

interface UIState {
  currentView: ViewType
  selectedProductId: string | null
  searchQuery: string
  selectedCategory: string | null
  showAuthModal: boolean
  authModalTab: 'login' | 'register' | 'forgot-password'
  sidebarOpen: boolean
  mobileMenuOpen: boolean
  notifications: Notification[]
  
  setCurrentView: (view: ViewType) => void
  setSelectedProduct: (productId: string | null) => void
  setSearchQuery: (query: string) => void
  setSelectedCategory: (categoryId: string | null) => void
  setShowAuthModal: (show: boolean) => void
  setAuthModalTab: (tab: 'login' | 'register' | 'forgot-password') => void
  setSidebarOpen: (open: boolean) => void
  setMobileMenuOpen: (open: boolean) => void
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  markNotificationRead: (notificationId: string) => void
}

export const useUIStore = create<UIState>()((set) => ({
  currentView: 'home',
  selectedProductId: null,
  searchQuery: '',
  selectedCategory: null,
  showAuthModal: false,
  authModalTab: 'login',
  sidebarOpen: true,
  mobileMenuOpen: false,
  notifications: [],
  
  setCurrentView: (view) => set({ currentView: view }),
  setSelectedProduct: (productId) => set({ selectedProductId: productId }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (categoryId) => set({ selectedCategory: categoryId }),
  setShowAuthModal: (show) => set({ showAuthModal: show }),
  setAuthModalTab: (tab) => set({ authModalTab: tab }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  setNotifications: (notifications) => set({ notifications }),
  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications]
  })),
  markNotificationRead: (notificationId) => set((state) => ({
    notifications: state.notifications.map((n) =>
      n.id === notificationId ? { ...n, read: true } : n
    )
  })),
}))

// ============================================
// Data Store (for cached data)
// ============================================

interface DataState {
  products: Product[]
  featuredProducts: Product[]
  categories: { id: string; name: string; slug: string; imageUrl: string | null; productCount?: number }[]
  userAddresses: Address[]
  userOrders: Order[]
  userWishlist: Product[]
  sellerProducts: Product[]
  sellerOrders: Order[]
  sellerStats: SellerDashboardStats | null
  adminStats: AdminDashboardStats | null
  
  setProducts: (products: Product[]) => void
  setFeaturedProducts: (products: Product[]) => void
  setCategories: (categories: { id: string; name: string; slug: string; imageUrl: string | null; productCount?: number }[]) => void
  setUserAddresses: (addresses: Address[]) => void
  setUserOrders: (orders: Order[]) => void
  setUserWishlist: (products: Product[]) => void
  setSellerProducts: (products: Product[]) => void
  setSellerOrders: (orders: Order[]) => void
  setSellerStats: (stats: SellerDashboardStats | null) => void
  setAdminStats: (stats: AdminDashboardStats | null) => void
}

export const useDataStore = create<DataState>()((set) => ({
  products: [],
  featuredProducts: [],
  categories: [],
  userAddresses: [],
  userOrders: [],
  userWishlist: [],
  sellerProducts: [],
  sellerOrders: [],
  sellerStats: null,
  adminStats: null,
  
  setProducts: (products) => set({ products }),
  setFeaturedProducts: (products) => set({ featuredProducts: products }),
  setCategories: (categories) => set({ categories }),
  setUserAddresses: (addresses) => set({ userAddresses: addresses }),
  setUserOrders: (orders) => set({ userOrders: orders }),
  setUserWishlist: (products) => set({ userWishlist: products }),
  setSellerProducts: (products) => set({ sellerProducts: products }),
  setSellerOrders: (orders) => set({ sellerOrders: orders }),
  setSellerStats: (stats) => set({ sellerStats: stats }),
  setAdminStats: (stats) => set({ adminStats: stats }),
}))
