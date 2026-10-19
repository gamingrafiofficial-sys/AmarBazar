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
} from './types';
import { Search, MapPin } from 'lucide-react';

type PageView = 'catalog' | 'product_view' | 'cart' | 'orders' | 'login' | 'profile';

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
  const [orders, setOrders] = useState<Order[]>(SEED_ORDERS);
  const [registeredRiders, setRegisteredRiders] = useState<DeliveryRiderAccount[]>(SEED_RIDERS);
  const [activeRider, setActiveRider] = useState<DeliveryRiderAccount | null>(SEED_RIDERS[0]);

  // Page Routing State (Full-page views: Catalog, ProductView, Cart, Orders, Login)
  const [currentPage, setCurrentPage] = useState<PageView>('catalog');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Sync riders and orders from server on initialization
  useEffect(() => {
    const syncWithServer = async () => {
      try {
        const ridersRes = await fetch('/api/admin/riders');
        if (ridersRes.ok) {
          const rData = await ridersRes.json();
          if (Array.isArray(rData.riders) && rData.riders.length > 0) {
            setRegisteredRiders(rData.riders);
          }
        }
      } catch (e) {
        console.warn('Could not sync riders from server:', e);
      }

      try {
        const ordersRes = await fetch('/api/orders');
        if (ordersRes.ok) {
          const oData = await ordersRes.json();
          if (Array.isArray(oData.orders) && oData.orders.length > 0) {
            setOrders(oData.orders);
          }
        }
      } catch (e) {
        console.warn('Could not sync orders from server:', e);
      }
    };
    syncWithServer();
  }, []);

  // Logged-in Customer Profile (Persistent)
  const [loggedInCustomer, setLoggedInCustomer] = useState<CustomerAccount | null>(() => {
    try {
      const saved = localStorage.getItem('amar_active_customer');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Area Selection Modal
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);

  // Active Market & Selected Union
  const currentArea = markets.find((m) => m.id === selectedAreaId) || markets[0];
  const selectedUnionObj = unions.find((u) => u.id === selectedUnionId);
  const selectedAreaBadgeText =
    selectedUnionId !== 'all' && selectedUnionObj
      ? `${currentArea.nameBn} • ${selectedUnionObj.nameBn}`
      : currentArea.nameBn;

  // Filtered Products for selected Area
  const areaProducts = products.filter(
    (p) => !p.marketId || p.marketId === selectedAreaId || p.marketId === 'all'
  );

  const filteredProducts = areaProducts.filter((p) => {
    const matchCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchSearch =
      p.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nameBn.includes(searchQuery);
    return matchCategory && matchSearch;
  });

  // Handlers
  const handleOrderSuccess = (newOrder: Order) => {
    setOrders((prev) => [newOrder, ...prev]);
    setCurrentPage('orders');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelOrder = async (orderId: string, reason: string) => {
    try {
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

  // Admin Adds Area
  const handleAddMarket = (newMarket: Omit<Market, 'id'>) => {
    const id = newMarket.nameEn.toLowerCase().replace(/[^a-z0-9]/g, '-') || `area-${Date.now()}`;
    const market: Market = {
      ...newMarket,
      id,
    };
    setMarkets((prev) => [...prev, market]);
  };

  // Admin Deletes Area
  const handleDeleteMarket = (marketId: string) => {
    setMarkets((prev) => {
      const next = prev.filter((m) => m.id !== marketId);
      if (selectedAreaId === marketId && next.length > 0) {
        setSelectedAreaId(next[0].id);
      }
      return next;
    });
  };

  // Admin Registers New Delivery Rider
  const handleRegisterRider = async (newRiderData: Omit<DeliveryRiderAccount, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/admin/riders/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRiderData),
      });
      const data = await res.json();
      if (res.ok && data.rider) {
        setRegisteredRiders((prev) => [
          data.rider,
          ...prev.filter((r) => r.phone !== data.rider.phone && r.id !== data.rider.id),
        ]);
        try {
          const current = JSON.parse(localStorage.getItem('amar_registered_riders') || '[]');
          const updated = [data.rider, ...current.filter((r: any) => r.phone !== data.rider.phone)];
          localStorage.setItem('amar_registered_riders', JSON.stringify(updated));
        } catch {}
        return;
      }
    } catch (err) {
      console.warn('Network error registering rider on server:', err);
    }

    // Local fallback
    const rider: DeliveryRiderAccount = {
      ...newRiderData,
      id: `rider-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
    };
    setRegisteredRiders((prev) => [rider, ...prev]);
    try {
      const current = JSON.parse(localStorage.getItem('amar_registered_riders') || '[]');
      localStorage.setItem('amar_registered_riders', JSON.stringify([rider, ...current]));
    } catch {}
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

  // Admin Adds New Product
  const handleAddProduct = (newProdData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const p: Product = {
      ...newProdData,
      id: `prod-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProducts((prev) => [p, ...prev]);
  };

  // Admin Deletes Product
  const handleDeleteProduct = (prodId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== prodId));
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

                  {/* Section Title */}
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-700" />
                      <span>{language === 'bn' ? currentArea?.nameBn : currentArea?.nameEn} এরিয়ার প্রোডাক্টসমূহ</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        ({filteredProducts.length})
                      </span>
                    </h2>
                  </div>

                  {/* Products Grid - Clicking any opens Product View Page */}
                  {filteredProducts.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-400 text-xs">
                      এই এরিয়া বা ক্যাটাগরিতে কোনো পণ্য পাওয়া যায়নি। এডমিন ড্যাশবোর্ড থেকে নতুন পণ্য যুক্ত করা যাবে।
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-4">
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
                  setRole('admin');
                  setCurrentPage('catalog');
                }}
                onRiderLoginSuccess={(rider) => {
                  setActiveRider({ ...rider, isOnline: true });
                  setRole('rider');
                  setCurrentPage('catalog');
                }}
                onCustomerLoginSuccess={(customer) => {
                  setLoggedInCustomer(customer);
                  try {
                    localStorage.setItem('amar_active_customer', JSON.stringify(customer));
                  } catch {}
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
                  onLogout={() => {
                    setLoggedInCustomer(null);
                    try {
                      localStorage.removeItem('amar_active_customer');
                    } catch {}
                    setCurrentPage('catalog');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onBackToShop={() => {
                    setCurrentPage('catalog');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onViewOrderMemo={(order) => {
                    setCurrentPage('orders');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onCancelOrder={handleCancelOrder}
                />
              ) : (
                <LoginPage
                  registeredRiders={registeredRiders}
                  onBackToShop={() => {
                    setCurrentPage('catalog');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onAdminLoginSuccess={() => {
                    setRole('admin');
                    setCurrentPage('catalog');
                  }}
                  onRiderLoginSuccess={(rider) => {
                    setActiveRider({ ...rider, isOnline: true });
                    setRole('rider');
                    setCurrentPage('catalog');
                  }}
                  onCustomerLoginSuccess={(customer) => {
                    setLoggedInCustomer(customer);
                    try {
                      localStorage.setItem('amar_active_customer', JSON.stringify(customer));
                    } catch {}
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
            onToggleOnline={(online) =>
              setActiveRider({ ...activeRider, isOnline: online })
            }
            onRecordHandover={async (id) => {
              setOrders((prev) =>
                prev.map((o) => (o.riderId === id ? { ...o, paymentStatus: 'deposited' } : o))
              );
            }}
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
            onDeleteProduct={handleDeleteProduct}
            onAddMarket={handleAddMarket}
            onDeleteMarket={handleDeleteMarket}
            onRegisterRider={handleRegisterRider}
            onAssignRider={handleAdminAssignRider}
            onUpdateRiderUnions={handleUpdateRiderUnions}
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
