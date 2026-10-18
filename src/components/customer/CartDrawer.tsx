import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { useCart } from '../../hooks/useCart';
import { Shop } from '../../types';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Store } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout: () => void;
  currentShop?: Shop;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onProceedToCheckout,
  currentShop,
}) => {
  const { language, t, formatBDT } = useLanguage();
  const { items, subtotal, updateQuantity, removeFromCart, clearCart } = useCart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 bg-emerald-800 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5 text-amber-300" />
              <h2 className="text-base font-bold">{t('cart')}</h2>
              <span className="text-xs bg-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                {items.length} পণ্য
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-emerald-200 hover:text-white p-1 rounded-lg text-lg"
            >
              ✕
            </button>
          </div>

          {/* Shop Source Tag */}
          {currentShop && items.length > 0 && (
            <div className="bg-emerald-50 px-5 py-2.5 border-b border-emerald-100 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 truncate">
                <Store className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-slate-600 truncate">দোকান:</span>
                <span className="font-bold text-emerald-900 truncate">
                  {language === 'bn' ? currentShop.nameBn : currentShop.nameEn}
                </span>
              </div>
              <button
                onClick={clearCart}
                className="text-rose-600 hover:text-rose-700 font-semibold flex items-center space-x-1 shrink-0 ml-2"
                title="কার্ট খালি করুন"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>খালি</span>
              </button>
            </div>
          )}

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <ShoppingCart className="w-16 h-16 mx-auto mb-3 stroke-1 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">আপনার কার্ট খালি রয়েছে</p>
                <p className="text-xs text-slate-400 mt-1">পছন্দের দোকান থেকে পণ্য যোগ করুন</p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center space-x-3 p-3 rounded-xl border border-slate-100 bg-slate-50/70"
                >
                  <img
                    src={item.product.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=150&q=80'}
                    alt={item.product.nameEn}
                    className="w-12 h-12 rounded-lg object-cover bg-white border border-slate-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {language === 'bn' ? item.product.nameBn : item.product.nameEn}
                    </h4>
                    <span className="text-xs font-bold text-emerald-700">
                      {formatBDT(item.product.price * item.quantity)}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1.5">
                      ({formatBDT(item.product.price)} x {item.quantity} {item.product.unit})
                    </span>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-lg p-0.5 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-bold text-slate-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      disabled={item.quantity >= item.product.stock}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-slate-300 hover:text-rose-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer Checkout Summary */}
          {items.length > 0 && (
            <div className="p-5 border-t border-slate-200 bg-white">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-slate-500">{t('subtotal')}</span>
                <span className="font-bold text-slate-900 text-base">{formatBDT(subtotal)}</span>
              </div>
              <p className="text-[11px] text-emerald-700 mb-4 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                💡 {t('baseFeeExpl')}
              </p>

              <button
                onClick={() => {
                  onClose();
                  onProceedToCheckout();
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition-colors flex items-center justify-center space-x-2 shadow-md shadow-emerald-700/20"
              >
                <span>চেকআউট করুন</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
