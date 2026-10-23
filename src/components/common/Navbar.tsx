import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import {
  ShoppingCart,
  ShieldAlert,
  Bike,
  Globe,
  LogOut,
  LogIn,
  Store,
  MapPin,
  ChevronDown,
} from 'lucide-react';

import { CustomerAccount } from '../../types';

interface NavbarProps {
  onOpenCart: () => void;
  onOpenLogin: () => void;
  onOpenProfile: () => void;
  onGoHome: () => void;
  selectedAreaName: string;
  onOpenAreaSelector: () => void;
  loggedInCustomer?: CustomerAccount | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCart,
  onOpenLogin,
  onOpenProfile,
  onGoHome,
  selectedAreaName,
  onOpenAreaSelector,
  loggedInCustomer,
  onLogout,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { role, setRole, logOut } = useAuth();
  const { itemCount } = useCart();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      logOut();
      setRole('customer');
      onGoHome();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo & Area Selector */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div
              className="flex items-center space-x-2 cursor-pointer group"
              onClick={onGoHome}
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-black text-sm sm:text-base shadow-md group-hover:bg-emerald-800 transition-colors">
                {language === 'bn' ? 'আ' : 'AB'}
              </div>
              <div className="hidden xs:block">
                <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-1 leading-tight">
                  {t('appName')}
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                    BD
                  </span>
                </span>
              </div>
            </div>

            {/* Tap-able Area Badge (Responsive) */}
            <button
              onClick={onOpenAreaSelector}
              className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-800 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="max-w-[100px] sm:max-w-[150px] truncate text-[11px] sm:text-xs">
                {selectedAreaName}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-1.5 sm:space-x-3">
            {/* Language Toggle */}
            <button
              onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
              className="flex items-center space-x-1 text-xs text-slate-600 hover:text-emerald-700 font-bold px-2 py-1 rounded-lg border border-slate-200 transition-colors"
              title="Toggle Language"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'EN' : 'বাং'}</span>
            </button>

            {/* Cart Button (Desktop header) */}
            <button
              onClick={onOpenCart}
              className="hidden md:flex relative p-2 sm:px-3 sm:py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold items-center space-x-1.5 transition-colors shadow-xs"
              aria-label="Cart"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="text-xs">{t('cart')}</span>
              {itemCount > 0 && (
                <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full ml-1">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Auth / Profile / Account */}
            {role === 'customer' ? (
              loggedInCustomer ? (
                /* WHEN CUSTOMER IS LOGGED IN: SHOW PROFILE BUTTON */
                <button
                  onClick={onOpenProfile}
                  className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl flex items-center space-x-1.5 transition-all shadow-2xs group"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-black">
                    {loggedInCustomer.name ? loggedInCustomer.name.slice(0, 1) : 'গ'}
                  </div>
                  <span className="hidden sm:inline max-w-[100px] truncate">{loggedInCustomer.name}</span>
                  <span className="text-[11px] font-bold text-emerald-800">
                    {language === 'bn' ? 'প্রোফাইল' : 'Profile'}
                  </span>
                </button>
              ) : (
                /* WHEN GUEST: SHOW LOGIN BUTTON */
                <button
                  onClick={onOpenLogin}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center space-x-1.5 transition-all shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">{language === 'bn' ? 'লগইন' : 'Login'}</span>
                </button>
              )
            ) : (
              <div className="flex items-center space-x-1 sm:space-x-2">
                <button
                  onClick={() => setRole('customer')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-2 sm:px-2.5 py-1.5 rounded-xl flex items-center gap-1"
                  title="Switch to customer catalog"
                >
                  <Store className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="hidden sm:inline">শপ ভিউ</span>
                </button>

                <div className="flex items-center space-x-1 bg-emerald-50 border border-emerald-200 text-emerald-900 px-2.5 py-1.5 rounded-xl text-xs font-bold">
                  {role === 'admin' ? (
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <Bike className="w-3.5 h-3.5 text-emerald-700" />
                  )}
                  <span>{role === 'admin' ? 'এডমিন' : 'রাইডার'}</span>
                </div>

                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
