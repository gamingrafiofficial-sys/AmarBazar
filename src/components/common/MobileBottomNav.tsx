import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import {
  Home,
  MapPin,
  Package,
  ShoppingCart,
  User,
  ShieldAlert,
  Bike,
  Store,
} from 'lucide-react';

import { CustomerAccount } from '../../types';

interface MobileBottomNavProps {
  currentTab: string;
  onSelectTab: (tab: 'catalog' | 'orders') => void;
  onOpenAreaSelector: () => void;
  onOpenCart: () => void;
  onOpenLogin: () => void;
  onOpenProfile?: () => void;
  loggedInCustomer?: CustomerAccount | null;
  riderTab?: 'overview' | 'orders' | 'outlets' | 'profile';
  onSelectRiderTab?: (tab: 'overview' | 'orders' | 'outlets' | 'profile') => void;
  incomingOrdersCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenAreaSelector,
  onOpenCart,
  onOpenLogin,
  onOpenProfile,
  loggedInCustomer,
  riderTab = 'overview',
  onSelectRiderTab,
  incomingOrdersCount = 0,
}) => {
  const { language } = useLanguage();
  const { role } = useAuth();
  const { itemCount } = useCart();

  const handleAccountClick = () => {
    if (role === 'customer' && loggedInCustomer && onOpenProfile) {
      onOpenProfile();
    } else {
      onOpenLogin();
    }
  };

  // RIDER SPECIFIC BOTTOM NAVIGATION (যখন রাইডার লগইন থাকবে)
  if (role === 'rider') {
    return (
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-2xl safe-area-bottom">
        <div className="flex items-center justify-around">
          {/* 1. HOME: Rider Overview */}
          <button
            type="button"
            onClick={() => onSelectRiderTab?.('overview')}
            className={`flex flex-col items-center py-1 px-3 rounded-xl transition-colors cursor-pointer ${
              riderTab === 'overview'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">
              {language === 'bn' ? 'হোম' : 'Home'}
            </span>
          </button>

          {/* 2. AREA: Rider Union Outlets */}
          <button
            type="button"
            onClick={() => onSelectRiderTab?.('outlets')}
            className={`flex flex-col items-center py-1 px-3 rounded-xl transition-colors cursor-pointer ${
              riderTab === 'outlets'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Store className="w-5 h-5 text-emerald-600" />
            <span className="text-[10px] mt-0.5">
              {language === 'bn' ? 'এরিয়া' : 'Area'}
            </span>
          </button>

          {/* 3. CENTER BUTTON: Rider Orders Fast Shortcut */}
          <button
            type="button"
            onClick={() => onSelectRiderTab?.('orders')}
            className={`relative -mt-4 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-transform active:scale-95 cursor-pointer ${
              riderTab === 'orders'
                ? 'bg-emerald-900 shadow-emerald-950/40 ring-2 ring-emerald-500 ring-offset-2'
                : 'bg-emerald-700 shadow-emerald-700/30'
            }`}
            aria-label="Rider Orders"
          >
            <Bike className="w-6 h-6" />
            {incomingOrdersCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-white animate-pulse">
                {incomingOrdersCount}
              </span>
            )}
          </button>

          {/* 4. ORDERS: Incoming & Active Orders */}
          <button
            type="button"
            onClick={() => onSelectRiderTab?.('orders')}
            className={`relative flex flex-col items-center py-1 px-3 rounded-xl transition-colors cursor-pointer ${
              riderTab === 'orders'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Package className="w-5 h-5" />
            {incomingOrdersCount > 0 && (
              <span className="absolute top-0 right-1 bg-rose-500 text-white font-black text-[9px] px-1.5 rounded-full animate-pulse">
                {incomingOrdersCount}
              </span>
            )}
            <span className="text-[10px] mt-0.5">
              {language === 'bn' ? 'অর্ডার' : 'Orders'}
            </span>
          </button>

          {/* 5. ACCOUNT: Rider Profile Page */}
          <button
            type="button"
            onClick={() => onSelectRiderTab?.('profile')}
            className={`flex flex-col items-center py-1 px-3 rounded-xl transition-colors cursor-pointer ${
              riderTab === 'profile'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">
              {language === 'bn' ? 'প্রোফাইল' : 'Profile'}
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-2xl safe-area-bottom">
      <div className="flex items-center justify-around">
        {/* Home / Catalog */}
        <button
          onClick={() => onSelectTab('catalog')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-colors ${
            currentTab === 'catalog' && role === 'customer'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">
            {language === 'bn' ? 'হোম' : 'Home'}
          </span>
        </button>

        {/* Area */}
        <button
          onClick={onOpenAreaSelector}
          className="flex flex-col items-center py-1 px-2.5 text-slate-500 hover:text-slate-900 rounded-xl transition-colors"
        >
          <MapPin className="w-5 h-5 text-emerald-600" />
          <span className="text-[10px] mt-0.5">
            {language === 'bn' ? 'এরিয়া' : 'Area'}
          </span>
        </button>

        {/* Floating Cart Button in Center */}
        <button
          onClick={onOpenCart}
          className={`relative -mt-4 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-transform active:scale-95 ${
            currentTab === 'cart'
              ? 'bg-emerald-900 shadow-emerald-950/40 ring-2 ring-emerald-500 ring-offset-2'
              : 'bg-emerald-700 shadow-emerald-700/30'
          }`}
          aria-label="Cart"
        >
          <ShoppingCart className="w-5 h-5" />
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-white">
              {itemCount}
            </span>
          )}
        </button>

        {/* My Orders */}
        <button
          onClick={() => onSelectTab('orders')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-colors ${
            currentTab === 'orders' && role === 'customer'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">
            {language === 'bn' ? 'অর্ডার' : 'Orders'}
          </span>
        </button>

        {/* Account: Profile if logged in, Login if guest, or Admin/Rider */}
        <button
          onClick={handleAccountClick}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-colors ${
            currentTab === 'login' || currentTab === 'profile' || role !== 'customer'
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          {role === 'admin' ? (
            <ShieldAlert className="w-5 h-5 text-amber-600" />
          ) : loggedInCustomer ? (
            <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-black">
              {loggedInCustomer.name ? loggedInCustomer.name.slice(0, 1) : 'গ'}
            </div>
          ) : (
            <User className="w-5 h-5" />
          )}
          <span className="text-[10px] mt-0.5">
            {role === 'admin'
              ? 'এডমিন'
              : loggedInCustomer
              ? language === 'bn'
                ? 'প্রোফাইল'
                : 'Profile'
              : language === 'bn'
              ? 'লগইন'
              : 'Login'}
          </span>
        </button>
      </div>
    </div>
  );
};
