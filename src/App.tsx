import React, { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './hooks/useLanguage';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { CartProvider, useCart } from './hooks/useCart';
import { Navbar } from './components/common/Navbar';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { HeroSlider } from './components/customer/HeroSlider';
import { AreaSelector } from './components/customer/AreaSelector';
import { MarketSelector } from './components/customer/MarketSelector';
import { ProductCard } from './components/customer/ProductCard';
import { RiderDashboard } from './components/rider/RiderDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ProductViewPage } from './pages/ProductViewPage';
import { CartPage } from './pages/CartPage';
import { OrdersPage } from './pages/OrdersPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import {
  seedFirestoreIfEmpty,
  subscribeToOrdersOnline,
  subscribeToRidersOnline,
  subscribeToProductsOnline,
  subscribeToMarketsOnline,
  createOrderOnline,
  updateOrderOnline,
  sendMessageOnOrderOnline,
  toggleRiderActiveOnline,
  recordRiderHandoverOnline,
  fetchCustomerByPhoneOnline,
  createRiderOnline,
  createProductOnline,
  updateProductOnline,
  deleteProductOnline,
  createMarketOnline,
  deleteMarketOnline,
} from './services/firestoreService';
import {
  SEED_MARKETS,
  SEED_PRODUCTS,
  SEED_CATEGORIES,
  SEED_ORDERS,
  SEED_RIDERS,
  SEED_UNIONS,
} from './data/seedData';
import {
  Market,
  Product,
  Order,
  DeliveryRiderAccount,
  CustomerAccount,
  OrderStatus,
  UnionArea,
  OrderMessage,
} from './types';
import { normalizePhone } from './lib/phone';
import { Search, MapPin, ArrowRight, ArrowLeft, ShoppingBag, Sparkles, Flame, X } from 'lucide-react';

type PageView = 'catalog' | 'product_view' | 'cart' | 'orders' | 'login' | 'profile';

// Helper function to reliably deduplicate orders by ID and sort newest first
const dedupeOrders = (orderList: Order[]): Order[] => {
  if (!Array.isArray(orderList)) return [];
  const map = new Map<string, Order>();
  for (const o of orderList) {
    if (o && o.id) {
      if (!map.has(o.id)) {
        map.set(o.id, o);
      } else {
        const existing = map.get(o.id)!;
        const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const incomingTime = new Date(o.updatedAt || o.createdAt || 0).getTime();
        if (incomingTime >= existingTime) {
          map.set(o.id, o);
        }
      }
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

function MarketplaceMain() {
  const { language } = useLanguage();
  const { role, setRole } = useAuth();
  const { items } = useCart();

  // Dynamic Markets / Areas (Admin Controlled, Default Kaliganj & Kapasia in Gazipur)
  const [markets, setMarkets] = useState<Market[]>(SEED_MARKETS);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('kaliganj');

  // Dynamic Unions (Admin & Customer controlled)
  const [unions, setUnions] = useState<UnionArea[]>(SEED_UNIONS);
  const [selectedUnionId, setSelectedUnionId] = useState<string>('all');

  // Products (Admin-controlled only)
  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Orders & Riders
  const [orders, setOrders] = useState<Order[]>(() => dedupeOrders(SEED_ORDERS));
  const [registeredRiders, setRegisteredRiders] = useState<DeliveryRiderAccount[]>(SEED_RIDERS);
  const [activeRider, setActiveRider] = useState<DeliveryRiderAccount | null>(() => {
    try {
      const saved = localStorage.getItem('amar_active_rider');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  // Page Routing State (Full-page views: Catalog, ProductView, Cart, Orders, Login, Profile)
  const [currentPage, setCurrentPageState] = useState<PageView>(() => {
    try {
      const savedPage = localStorage.getItem('amar_current_page') as PageView;
      if (savedPage && ['catalog', 'product_view', 'cart', 'orders', 'login', 'profile'].includes(savedPage)) {
        return savedPage;
      }
    } catch {}
    return 'catalog';
  });

  const setCurrentPage = (page: PageView) => {
    setCurrentPageState(page);
    try {
      localStorage.setItem('amar_current_page', page);
    } catch {}
  };

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Real-time Firebase Firestore Online Synchronization
  useEffect(() => {
    // 1. Seed online database if empty
    seedFirestoreIfEmpty();

    // 2. Real-time live subscriptions from Firestore
    const unsubOrders = subscribeToOrdersOnline((liveOrders) => {
      if (liveOrders.length > 0) {
        setOrders((prev) => dedupeOrders([...liveOrders, ...prev]));
      }
    });

    const unsubRiders = subscribeToRidersOnline((liveRiders) => {
      if (liveRiders.length > 0) {
        setRegisteredRiders(liveRiders);
      }
    });

    const unsubProducts = subscribeToProductsOnline((liveProducts) => {
      if (liveProducts.length > 0) {
        setProducts(liveProducts);
      }
    });

    const unsubMarkets = subscribeToMarketsOnline((liveMarkets) => {
      if (liveMarkets.length > 0) {
        setMarkets(liveMarkets);
      }
    });

    return () => {
      unsubOrders();
      unsubRiders();
      unsubProducts();
      unsubMarkets();
    };
  }, []);

  // Logged-in Customer Profile (Online from Firebase)
  const [loggedInCustomer, setLoggedInCustomer] = useState<CustomerAccount | null>(() => {
    try {
      const saved = localStorage.getItem('amar_active_customer');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Keep customer data refreshed directly from Firebase Firestore
  useEffect(() => {
    if (loggedInCustomer?.phone) {
      fetchCustomerByPhoneOnline(loggedInCustomer.phone).then((freshCust) => {
        if (freshCust) {
          setLoggedInCustomer(freshCust);
          try {
            localStorage.setItem('amar_active_customer', JSON.stringify(freshCust));
          } catch {}
        }
      });
    }
  }, [loggedInCustomer?.phone]);

  // Area Selection Modal
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);

  // Active Market & Selected Union
  const currentArea = markets.find((m) => m.id === selectedAreaId) || markets[0];
  const selectedUnionObj = unions.find((u) => u.id === selectedUnionId);
  const selectedAreaBadgeText =
    selectedUnionId !== 'all' && selectedUnionObj
      ? `${currentArea.nameBn} • ${selectedUnionObj.nameBn}`
      : currentArea.nameBn;

  // Filtered Products for selected Area (Supports specific market or 'all' / 'সকল এরিয়া')
  const areaProducts = products.filter(
    (p) =>
      !p.marketId ||
      p.marketId === selectedAreaId ||
      p.marketId === 'all' ||
      p.area === 'সকল এরিয়া' ||
      p.area === 'All Areas'
  );

  const filteredProducts = areaProducts.filter((p) => {
    // Hide private products from regular customers and riders
    if (role !== 'admin' && p.isPrivate) {
      return false;
    }
    const matchCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchSearch =
      p.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nameBn.includes(searchQuery);
    return matchCategory && matchSearch;
  });

  // Handlers
  // Explicit User Logout (Clears customer, rider, and admin session permanently until next explicit login)
  const handleLogout = () => {
    try {
      localStorage.removeItem('amar_auth_role');
      localStorage.removeItem('amar_active_customer');
      localStorage.removeItem('amar_active_rider');
      localStorage.setItem('amar_current_page', 'catalog');
    } catch {}
    setLoggedInCustomer(null);
    setActiveRider(null);
    setRole('customer');
    setCurrentPage('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderSuccess = async (newOrder: Order) => {
    // Optimistically update orders with deduplication immediately
    setOrders((prev) => dedupeOrders([newOrder, ...prev]));
    setCurrentPage('orders');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      await createOrderOnline(newOrder);
    } catch (e) {
      console.warn('Firestore order write error:', e);
    }
  };

  const handleCancelOrder = async (orderId: string, reason: string) => {
    try {
      await updateOrderOnline(orderId, {
        orderStatus: 'cancelled',
        cancellationReason: reason,
      });
      await fetch('/api/orders/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          targetStatus: 'cancelled',
          role: 'customer',
          reason,
        }),
      });
    } catch {}

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, orderStatus: 'cancelled', cancellationReason: reason, updatedAt: new Date().toISOString() }
          : o
      )
    );
  };

  // Rider Accepts Order
  const handleRiderAcceptOrder = async (orderId: string, rider: DeliveryRiderAccount) => {
    try {
      await updateOrderOnline(orderId, {
        riderId: rider.id,
        riderName: rider.name,
        riderPhone: rider.phone,
        acceptedAt: new Date().toISOString(),
        orderStatus: 'rider_assigned',
      });
      await fetch('/api/orders/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          riderId: rider.id,
          riderName: rider.name,
          riderPhone: rider.phone,
        }),
      });
    } catch {}

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              riderId: rider.id,
              riderName: rider.name,
              riderPhone: rider.phone,
              acceptedAt: new Date().toISOString(),
              orderStatus: 'rider_assigned',
              updatedAt: new Date().toISOString(),
            }
          : o
      )
    );
  };

  // State Transition (e.g. picked up, delivered)
  const handleTransitionOrder = async (orderId: string, targetStatus: OrderStatus, reason?: string) => {
    try {
      await updateOrderOnline(orderId, {
        orderStatus: targetStatus,
        paymentStatus: targetStatus === 'delivered' ? 'collected' : undefined,
        ...(reason ? { failureReason: reason } : {}),
      });
      await fetch('/api/orders/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          targetStatus,
          role: 'rider',
          reason,
        }),
      });
    } catch {}

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              orderStatus: targetStatus,
              paymentStatus: targetStatus === 'delivered' ? 'collected' : o.paymentStatus,
              updatedAt: new Date().toISOString(),
            }
          : o
      )
    );
  };

  // Admin Assigns Rider
  const handleAdminAssignRider = async (orderId: string, riderId: string) => {
    const selectedRider = registeredRiders.find((r) => r.id === riderId);
    try {
      await updateOrderOnline(orderId, {
        riderId,
        riderName: selectedRider?.name,
        riderPhone: selectedRider?.phone,
        orderStatus: 'rider_assigned',
      });
      await fetch('/api/admin/assign-rider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          riderId,
          riderName: selectedRider?.name,
          riderPhone: selectedRider?.phone,
        }),
      });
    } catch {}

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              riderId,
              riderName: selectedRider?.name,
              riderPhone: selectedRider?.phone,
              orderStatus: 'rider_assigned',
              updatedAt: new Date().toISOString(),
            }
          : o
      )
    );
  };

  // Order Messaging: Send message on an order (Customer, Rider, or Admin)
  const handleSendMessage = async (
    orderId: string,
    text: string,
    senderRole?: 'admin' | 'rider' | 'customer',
    senderName?: string,
    senderPhone?: string
  ) => {
    const roleToSend =
      senderRole ||
      (role === 'admin' ? 'admin' : role === 'rider' ? 'rider' : 'customer');
    const nameToSend =
      senderName ||
      (roleToSend === 'admin'
        ? 'এডমিন'
        : roleToSend === 'rider'
        ? activeRider?.name || 'রাইডার'
        : loggedInCustomer?.name || 'গ্রাহক');
    const phoneToSend =
      senderPhone ||
      (roleToSend === 'rider' ? activeRider?.phone : loggedInCustomer?.phone);

    const tempMessage: OrderMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderId,
      senderRole: roleToSend,
      senderName: nameToSend,
      senderPhone: phoneToSend,
      text,
      createdAt: new Date().toISOString(),
    };

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, messages: [...(o.messages || []), tempMessage] }
          : o
      )
    );

    try {
      await sendMessageOnOrderOnline(orderId, tempMessage);
      const res = await fetch(`/api/orders/${orderId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderRole: roleToSend,
          senderName: nameToSend,
          senderPhone: phoneToSend,
          text,
        }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  messages: [
                    ...(o.messages || []).filter((m) => m.id !== tempMessage.id),
                    data.message,
                  ],
                }
              : o
          )
        );
      }
    } catch (err) {
      console.warn('Network error sending message:', err);
    }
  };

  // Order Note: Add or update order note
  const handleUpdateOrderNote = async (orderId: string, newNotes: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, notes: newNotes } : o))
    );

    try {
      await updateOrderOnline(orderId, { notes: newNotes });
      await fetch(`/api/orders/${orderId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: newNotes }),
      });
    } catch (err) {
      console.warn('Network error updating note:', err);
    }
  };

  // Admin Adds Area
  const handleAddMarket = async (newMarket: Omit<Market, 'id'>) => {
    const id = newMarket.nameEn.toLowerCase().replace(/[^a-z0-9]/g, '-') || `area-${Date.now()}`;
    const market: Market = {
      ...newMarket,
      id,
    };
    setMarkets((prev) => [...prev.filter((m) => m.id !== market.id), market]);
    try {
      await createMarketOnline(market);
    } catch (err) {
      console.warn('Error saving market to Firestore:', err);
    }
  };

  // Admin Deletes Area
  const handleDeleteMarket = async (marketId: string) => {
    setMarkets((prev) => {
      const next = prev.filter((m) => m.id !== marketId);
      if (selectedAreaId === marketId && next.length > 0) {
        setSelectedAreaId(next[0].id);
      }
      return next;
    });
    try {
      await deleteMarketOnline(marketId);
    } catch (err) {
      console.warn('Error deleting market from Firestore:', err);
    }
  };

  // Admin Registers New Delivery Rider (Persists to Firestore + Server + Local Storage)
  const handleRegisterRider = async (newRiderData: Omit<DeliveryRiderAccount, 'id' | 'createdAt'>) => {
    const normPhone = normalizePhone(newRiderData.phone);
    const riderId = `rider-${normPhone}`;
    const rider: DeliveryRiderAccount = {
      ...newRiderData,
      id: riderId,
      phone: normPhone,
      password: (newRiderData.password || '123').trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOnline: true,
      isActive: true,
    };

    // 1. Optimistic UI update
    setRegisteredRiders((prev) => [
      rider,
      ...prev.filter((r) => normalizePhone(r.phone) !== normPhone && r.id !== riderId),
    ]);

    // 2. Persist to localStorage immediately
    try {
      const current = JSON.parse(localStorage.getItem('amar_registered_riders') || '[]');
      const updated = [rider, ...current.filter((r: any) => normalizePhone(r.phone) !== normPhone)];
      localStorage.setItem('amar_registered_riders', JSON.stringify(updated));
    } catch {}

    // 3. Persist to Firebase Firestore (Online Database)
    try {
      await createRiderOnline(rider);
    } catch (err) {
      console.warn('Error saving rider to Firestore:', err);
    }

    // 4. Persist to server API
    try {
      await fetch('/api/admin/riders/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rider),
      });
    } catch (err) {
      console.warn('Network error registering rider on server:', err);
    }
  };

  // Admin Updates Rider Assigned Unions
  const handleUpdateRiderUnions = async (riderId: string, assignedUnionIds: string[]) => {
    setRegisteredRiders((prev) =>
      prev.map((r) => (r.id === riderId ? { ...r, assignedUnionIds } : r))
    );
    if (activeRider && activeRider.id === riderId) {
      setActiveRider((prev) => (prev ? { ...prev, assignedUnionIds } : null));
    }

    try {
      await fetch('/api/admin/riders/update-unions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderId, assignedUnionIds }),
      });
    } catch (err) {
      console.warn('Error syncing updated unions to server:', err);
    }
  };

  // Admin / Rider Records COD Handover (Settles cash in hand)
  const handleRecordHandover = async (riderId: string, amount: number, notes?: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.riderId === riderId && o.paymentStatus === 'collected'
          ? { ...o, paymentStatus: 'deposited' }
          : o
      )
    );

    try {
      await recordRiderHandoverOnline(riderId, amount, notes);
      await fetch('/api/admin/record-handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderId, amount, notes }),
      });
    } catch (err) {
      console.warn('Network error recording handover:', err);
    }
  };

  // Admin Toggles Rider Active Status (Deactivate / Reactivate for Balance Settlement)
  const handleToggleRiderActive = async (riderId: string, isActive: boolean, reason?: string) => {
    setRegisteredRiders((prev) =>
      prev.map((r) =>
        r.id === riderId
          ? { ...r, isActive, isDeactivated: !isActive, deactivatedReason: isActive ? undefined : reason }
          : r
      )
    );

    if (activeRider && activeRider.id === riderId) {
      const updated = {
        ...activeRider,
        isActive,
        isDeactivated: !isActive,
        deactivatedReason: isActive ? undefined : reason,
      };
      setActiveRider(updated);
      try {
        localStorage.setItem('amar_active_rider', JSON.stringify(updated));
      } catch {}
    }

    try {
      await toggleRiderActiveOnline(riderId, !isActive, reason);
      await fetch('/api/admin/riders/toggle-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderId, isActive, reason }),
      });
    } catch (err) {
      console.warn('Error syncing rider active state to server:', err);
    }
  };

  // Admin Adds New Product
  const handleAddProduct = async (newProdData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const p: Product = {
      ...newProdData,
      id: `prod-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // Optimistic UI update
    setProducts((prev) => [p, ...prev.filter((prod) => prod.id !== p.id)]);

    // Persist to Firebase Firestore
    try {
      await createProductOnline(p);
    } catch (err) {
      console.warn('Error saving product to Firestore:', err);
    }

    // Persist to backend server and Cloud SQL
    try {
      await fetch('/api/products/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      });
    } catch (err) {
      console.warn('Error syncing product to server:', err);
    }
  };

  // Admin Deletes Product
  const handleDeleteProduct = async (prodId: string) => {
    // Optimistic UI update
    setProducts((prev) => prev.filter((p) => p.id !== prodId));

    // Persist deletion to Firebase Firestore
    try {
      await deleteProductOnline(prodId);
    } catch (err) {
      console.warn('Error deleting product from Firestore:', err);
    }

    // Persist deletion to backend server and Cloud SQL
    try {
      await fetch(`/api/products/${prodId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Error deleting product from server:', err);
    }
  };

  // Admin Updates Product (Edit fields such as price, stock, name, category, etc.)
  const handleUpdateProduct = async (prodId: string, updates: Partial<Product>) => {
    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) =>
        p.id === prodId
          ? { ...p, ...updates, updatedAt: new Date().toISOString() }
          : p
      )
    );

    // Persist updates to Firebase Firestore
    try {
      await updateProductOnline(prodId, updates);
    } catch (err) {
      console.warn('Error updating product in Firestore:', err);
    }

    // Persist updates to backend server and Cloud SQL
    try {
      await fetch(`/api/products/${prodId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.warn('Error syncing product update to server:', err);
    }
  };

  // Admin Toggles Product Private Visibility
  const handleToggleProductPrivate = async (prodId: string, isPrivate: boolean) => {
    await handleUpdateProduct(prodId, { isPrivate });
  };

  // Open Product View Page
  const handleOpenProductView = (product: Product) => {
    setSelectedProduct(product);
    setCurrentPage('product_view');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col pb-16 md:pb-0">
      {/* 1. FRESH MOBILE-FIRST NAVBAR */}
      <Navbar
        onOpenCart={() => {
          if (role !== 'customer') setRole('customer');
          setCurrentPage('cart');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenLogin={() => {
          if (role !== 'customer') setRole('customer');
          setCurrentPage('login');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenProfile={() => {
          if (role !== 'customer') setRole('customer');
          setCurrentPage('profile');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onGoHome={() => {
          setRole('customer');
          setCurrentPage('catalog');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        selectedAreaName={selectedAreaBadgeText}
        onOpenAreaSelector={() => setIsAreaModalOpen(true)}
        loggedInCustomer={loggedInCustomer}
        onLogout={handleLogout}
      />

      {/* 2. ROLE ROUTING & PAGE VIEWS */}
      <main className="flex-1">
        {/* VIEW 1: CUSTOMER EXPERIENCES */}
        {role === 'customer' && (
          <div>
            {/* PAGE 1: CATALOG (HOME) */}
            {currentPage === 'catalog' && (
              <div>
                {/* 2.1 SLIDEBAR (Image Carousel right under Navbar) */}
                <HeroSlider />

                {/* 2.2 AREA SELECTION (Right below Slidebar, Admin-Added Dynamic Areas & Unions) */}
                <AreaSelector
                  markets={markets}
                  selectedAreaId={selectedAreaId}
                  onSelectArea={(id) => {
                    setSelectedAreaId(id);
                    setSelectedUnionId('all');
                  }}
                  unions={unions}
                  selectedUnionId={selectedUnionId}
                  onSelectUnion={(uId) => setSelectedUnionId(uId)}
                />

                {/* 2.3 PRODUCT LIST FOR SELECTED AREA */}
                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 space-y-4">
                  {/* Category Chips & Search Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
                    {/* Category Filter Pills */}
                    <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                      {SEED_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                            selectedCategory === cat.id
                              ? 'bg-emerald-700 text-white shadow-2xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {language === 'bn' ? cat.nameBn : cat.nameEn}
                        </button>
                      ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative max-w-full sm:max-w-xs w-full">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={language === 'bn' ? 'পণ্য খুঁজুন...' : 'Search products...'}
                        className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-600 bg-slate-50/50"
                      />
                    </div>
                  </div>

                  {/* 2.3.1 SEARCH RESULTS VIEW (When searching) */}
                  {searchQuery.trim().length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <Search className="w-4 h-4 text-emerald-700" />
                          <h2 className="text-sm sm:text-base font-bold text-slate-900">
                            {language === 'bn'
                              ? `অনুসন্ধানের ফলাফল: "${searchQuery}"`
                              : `Search Results for "${searchQuery}"`}
                          </h2>
                          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                            {filteredProducts.length} {language === 'bn' ? 'টি পণ্য' : 'items'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-bold bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-xl transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>{language === 'bn' ? 'মুছে ফেলুন' : 'Clear'}</span>
                        </button>
                      </div>

                      {filteredProducts.length === 0 ? (
                        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-400 text-xs">
                          {language === 'bn'
                            ? `"${searchQuery}" নামে কোনো পণ্য পাওয়া যায়নি। অন্য নামে খুঁজে দেখুন।`
                            : `No products matching "${searchQuery}". Please try another keyword.`}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-4">
                          {filteredProducts.map((product) => (
                            <ProductCard
                              key={product.id}
                              product={product}
                              onSelectProduct={handleOpenProductView}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2.3.2 SINGLE CATEGORY VIEW (When customer clicks "View All" on any category or selects a category tab) */}
                  {!searchQuery.trim() && selectedCategory !== 'all' && (
                    <div className="space-y-4">
                      {/* Back button and Category Details Header */}
                      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory('all');
                              window.scrollTo({ top: 300, behavior: 'smooth' });
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl border border-slate-200 transition-colors shadow-2xs shrink-0 cursor-pointer"
                            title="Back to All Categories"
                          >
                            <ArrowLeft className="w-4 h-4 text-emerald-700" />
                            <span>{language === 'bn' ? 'সকল ক্যাটাগরিতে ফিরে যান' : 'Back to Categories'}</span>
                          </button>

                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-base sm:text-lg font-black text-slate-900">
                                {selectedCategory === 'daily_products'
                                  ? 'Daily Products'
                                  : selectedCategory === 'personal_care'
                                  ? 'Personal Care'
                                  : selectedCategory === 'fuel_energy'
                                  ? 'Fuel & Energy'
                                  : selectedCategory}
                              </h2>
                              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                                {filteredProducts.length} {language === 'bn' ? 'টি পণ্য' : 'products'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {selectedCategory === 'daily_products'
                                ? 'চাল, ডাল, তেল, চিনি, বিস্কুট, আটা ও প্রতিদিনের মুদি বাজার সামগ্রী'
                                : selectedCategory === 'personal_care'
                                ? 'সাবান, শ্যাম্পু, টুথপেস্ট ও প্রসাধন সামগ্রী'
                                : selectedCategory === 'fuel_energy'
                                ? '১২ কেজি এলপিজি গ্যাস সিলিন্ডার ও জ্বালানি'
                                : 'এই ক্যাটাগরির সকল পণ্য'}
                            </p>
                          </div>
                        </div>

                        <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
                          📍 {currentArea?.nameBn || currentArea?.nameEn}
                        </span>
                      </div>

                      {/* Complete Products Grid for this category */}
                      {filteredProducts.length === 0 ? (
                        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-400 text-xs">
                          {language === 'bn'
                            ? 'এই ক্যাটাগরিতে কোনো পণ্য পাওয়া যায়নি।'
                            : 'No products found in this category.'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-4">
                          {filteredProducts.map((product) => (
                            <ProductCard
                              key={product.id}
                              product={product}
                              onSelectProduct={handleOpenProductView}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2.3.3 HOME DEFAULT: 3 SEPARATE CATEGORY SECTIONS (Showing 6 products each with "View All" action) */}
                  {!searchQuery.trim() && selectedCategory === 'all' && (
                    <div className="space-y-6">
                      {[
                        {
                          id: 'daily_products',
                          name: 'Daily Products',
                          subtitleBn: 'চাল, ডাল, সয়াবিন তেল, চিনি, আটা ও চা বিস্কুট',
                          subtitleEn: 'Rice, lentils, cooking oil, flour & daily groceries',
                          icon: ShoppingBag,
                          color: 'bg-emerald-100 text-emerald-800',
                          badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                        },
                        {
                          id: 'personal_care',
                          name: 'Personal Care',
                          subtitleBn: 'সাবান, শ্যাম্পু, টুথপেস্ট ও ব্যক্তিগত যত্ন সামগ্রী',
                          subtitleEn: 'Soaps, shampoos, toothpastes & hygiene products',
                          icon: Sparkles,
                          color: 'bg-purple-100 text-purple-800',
                          badge: 'bg-purple-50 text-purple-800 border-purple-200',
                        },
                        {
                          id: 'fuel_energy',
                          name: 'Fuel & Energy',
                          subtitleBn: '১২ কেজি এলপিজি গ্যাস সিলিন্ডার (বসুন্ধরা, ওমেরা, যমুনা ইত্যাদি)',
                          subtitleEn: '12KG LPG gas cylinders with fast door-to-door delivery',
                          icon: Flame,
                          color: 'bg-amber-100 text-amber-900',
                          badge: 'bg-amber-50 text-amber-900 border-amber-200',
                        },
                      ].map((catSection) => {
                        const catProducts = areaProducts.filter(
                          (p) => p.categoryId === catSection.id && !p.isPrivate
                        );
                        // Show top 6 products on Home
                        const previewProducts = catProducts.slice(0, 6);

                        return (
                          <section
                            key={catSection.id}
                            className="bg-white rounded-3xl border border-slate-200/90 p-3.5 sm:p-5 shadow-xs space-y-3.5"
                          >
                            {/* Section Header */}
                            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${catSection.color}`}
                                >
                                  <catSection.icon className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                                      {catSection.name}
                                    </h3>
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${catSection.badge}`}
                                    >
                                      {catProducts.length} {language === 'bn' ? 'টি পণ্য' : 'items'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 hidden sm:block">
                                    {language === 'bn' ? catSection.subtitleBn : catSection.subtitleEn}
                                  </p>
                                </div>
                              </div>

                              {/* "View All" Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCategory(catSection.id);
                                  window.scrollTo({ top: 320, behavior: 'smooth' });
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-emerald-200 transition-colors shadow-2xs shrink-0 cursor-pointer"
                              >
                                <span>{language === 'bn' ? 'সবগুলো দেখুন' : 'View All'}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-emerald-700" />
                              </button>
                            </div>

                            {/* Products Grid (6 Items) */}
                            {previewProducts.length === 0 ? (
                              <div className="py-6 text-center text-slate-400 text-xs">
                                {language === 'bn'
                                  ? 'এই ক্যাটাগরিতে পণ্য পাওয়া যায়নি।'
                                  : 'No products in this category.'}
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-4">
                                {previewProducts.map((product) => (
                                  <ProductCard
                                    key={product.id}
                                    product={product}
                                    onSelectProduct={handleOpenProductView}
                                  />
                                ))}
                              </div>
                            )}

                            {/* Bottom "View all N products" button if there are more than 6 products */}
                            {catProducts.length > 6 && (
                              <div className="pt-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCategory(catSection.id);
                                    window.scrollTo({ top: 320, behavior: 'smooth' });
                                  }}
                                  className="w-full sm:w-auto text-xs font-bold text-slate-700 hover:text-emerald-800 bg-slate-50 hover:bg-emerald-50 py-2 px-4 rounded-xl border border-slate-200 hover:border-emerald-200 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <span>
                                    {language === 'bn'
                                      ? `${catSection.name} এর বাকি ${catProducts.length - 6}টি সহ মোট ${catProducts.length}টি পণ্য দেখুন`
                                      : `View all ${catProducts.length} products in ${catSection.name}`}
                                  </span>
                                  <ArrowRight className="w-3.5 h-3.5 text-emerald-700" />
                                </button>
                              </div>
                            )}
                          </section>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PAGE 2: PRODUCT VIEW PAGE (Detailed view + Related Products) */}
            {currentPage === 'product_view' && selectedProduct && (
              <ProductViewPage
                product={selectedProduct}
                allProducts={products}
                onBack={() => setCurrentPage('catalog')}
                onSelectProduct={(p) => {
                  setSelectedProduct(p);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onNavigateToCart={() => {
                  setCurrentPage('cart');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {/* PAGE 3: DEDICATED CART PAGE (No popup modal) */}
            {currentPage === 'cart' && (
              <CartPage
                currentArea={currentArea}
                customerProfile={loggedInCustomer}
                markets={markets}
                unions={unions}
                initialUnionId={selectedUnionId}
                onRequireLogin={() => {
                  setCurrentPage('login');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onContinueShopping={() => {
                  setCurrentPage('catalog');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onOrderSuccess={handleOrderSuccess}
              />
            )}

            {/* PAGE 4: ORDERS PAGE (Live Tracking & Official Cash Memo Receipts) */}
            {currentPage === 'orders' && (
              <OrdersPage
                orders={orders}
                onBackToShop={() => {
                  setCurrentPage('catalog');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onCancelOrder={handleCancelOrder}
                onSendMessage={handleSendMessage}
                onUpdateOrderNote={handleUpdateOrderNote}
              />
            )}

            {/* PAGE 5: DEDICATED LOGIN / REGISTRATION PAGE (No popup modal) */}
            {currentPage === 'login' && (
              <LoginPage
                registeredRiders={registeredRiders}
                onBackToShop={() => {
                  setCurrentPage('catalog');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onAdminLoginSuccess={() => {
                  try {
                    localStorage.setItem('amar_auth_role', 'admin');
                  } catch {}
                  setRole('admin');
                  setCurrentPage('catalog');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onRiderLoginSuccess={(rider) => {
                  const updatedRider = { ...rider, isOnline: true };
                  try {
                    localStorage.setItem('amar_active_rider', JSON.stringify(updatedRider));
                    localStorage.setItem('amar_auth_role', 'rider');
                  } catch {}
                  setActiveRider(updatedRider);
                  setRole('rider');
                  setCurrentPage('catalog');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onCustomerLoginSuccess={(customer) => {
                  try {
                    localStorage.setItem('amar_active_customer', JSON.stringify(customer));
                    localStorage.setItem('amar_auth_role', 'customer');
                  } catch {}
                  setLoggedInCustomer(customer);
                  setRole('customer');
                  if (items.length > 0) {
                    setCurrentPage('cart');
                  } else {
                    setCurrentPage('profile');
                  }
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {/* PAGE 6: DEDICATED CUSTOMER PROFILE & ORDER TRACKING PAGE */}
            {currentPage === 'profile' && (
              loggedInCustomer ? (
                <ProfilePage
                  customer={loggedInCustomer}
                  orders={orders}
                  onLogout={handleLogout}
                  onBackToShop={() => {
                    setCurrentPage('catalog');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onViewOrderMemo={(order) => {
                    setCurrentPage('orders');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onCancelOrder={handleCancelOrder}
                  onSendMessage={handleSendMessage}
                  onUpdateOrderNote={handleUpdateOrderNote}
                />
              ) : (
                <LoginPage
                  registeredRiders={registeredRiders}
                  onBackToShop={() => {
                    setCurrentPage('catalog');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onAdminLoginSuccess={() => {
                    try {
                      localStorage.setItem('amar_auth_role', 'admin');
                    } catch {}
                    setRole('admin');
                    setCurrentPage('catalog');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onRiderLoginSuccess={(rider) => {
                    const updatedRider = { ...rider, isOnline: true };
                    try {
                      localStorage.setItem('amar_active_rider', JSON.stringify(updatedRider));
                      localStorage.setItem('amar_auth_role', 'rider');
                    } catch {}
                    setActiveRider(updatedRider);
                    setRole('rider');
                    setCurrentPage('catalog');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onCustomerLoginSuccess={(customer) => {
                    try {
                      localStorage.setItem('amar_active_customer', JSON.stringify(customer));
                      localStorage.setItem('amar_auth_role', 'customer');
                    } catch {}
                    setLoggedInCustomer(customer);
                    setRole('customer');
                    if (items.length > 0) {
                      setCurrentPage('cart');
                    } else {
                      setCurrentPage('profile');
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              )
            )}
          </div>
        )}

        {/* VIEW 2: DELIVERY MAN (Rider Dashboard) */}
        {role === 'rider' && activeRider && (
          <RiderDashboard
            rider={activeRider}
            allOrders={orders}
            onAcceptOrder={handleRiderAcceptOrder}
            onTransitionOrder={handleTransitionOrder}
            onToggleOnline={(online) => {
              const updated = { ...activeRider, isOnline: online };
              setActiveRider(updated);
              try {
                localStorage.setItem('amar_active_rider', JSON.stringify(updated));
              } catch {}
            }}
            onRecordHandover={handleRecordHandover}
            onSendMessage={handleSendMessage}
            onUpdateOrderNote={handleUpdateOrderNote}
            onLogout={handleLogout}
          />
        )}

        {/* VIEW 3: ADMIN DASHBOARD */}
        {role === 'admin' && (
          <AdminDashboard
            orders={orders}
            products={products}
            markets={markets}
            categories={SEED_CATEGORIES}
            registeredRiders={registeredRiders}
            unions={unions}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onToggleProductPrivate={handleToggleProductPrivate}
            onDeleteProduct={handleDeleteProduct}
            onAddMarket={handleAddMarket}
            onDeleteMarket={handleDeleteMarket}
            onRegisterRider={handleRegisterRider}
            onAssignRider={handleAdminAssignRider}
            onUpdateRiderUnions={handleUpdateRiderUnions}
            onToggleRiderActive={handleToggleRiderActive}
            onRecordHandover={handleRecordHandover}
            onSendMessage={handleSendMessage}
            onUpdateOrderNote={handleUpdateOrderNote}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* 3. MOBILE BOTTOM NAVIGATION */}
      <MobileBottomNav
        currentTab={currentPage}
        onSelectTab={(tab) => {
          if (role !== 'customer') setRole('customer');
          setCurrentPage(tab as PageView);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAreaSelector={() => setIsAreaModalOpen(true)}
        onOpenCart={() => {
          if (role !== 'customer') setRole('customer');
          setCurrentPage('cart');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenLogin={() => {
          if (role !== 'customer') setRole('customer');
          setCurrentPage('login');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenProfile={() => {
          if (role !== 'customer') setRole('customer');
          setCurrentPage('profile');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        loggedInCustomer={loggedInCustomer}
      />

      {/* Global Area & Union Selector Dialog */}
      <MarketSelector
        markets={markets}
        selectedMarketId={selectedAreaId}
        onSelectMarket={(id) => {
          setSelectedAreaId(id);
        }}
        unions={unions}
        selectedUnionId={selectedUnionId}
        onSelectUnion={(uId) => {
          setSelectedUnionId(uId);
        }}
        isOpen={isAreaModalOpen}
        onClose={() => setIsAreaModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CartProvider>
          <MarketplaceMain />
        </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
