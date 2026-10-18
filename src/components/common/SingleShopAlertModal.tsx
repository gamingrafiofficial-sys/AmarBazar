import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { useCart } from '../../hooks/useCart';
import { AlertTriangle, ShoppingCart, RefreshCw } from 'lucide-react';

export const SingleShopAlertModal: React.FC = () => {
  const { t, language } = useLanguage();
  const {
    differentShopModalOpen,
    pendingItem,
    confirmClearAndAdd,
    cancelAddDifferentShop,
  } = useCart();

  if (!differentShopModalOpen || !pendingItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
          {t('singleShopWarningTitle')}
        </h3>

        <p className="text-sm text-slate-600 text-center mb-5 leading-relaxed">
          {t('singleShopWarningText')}
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6 text-xs flex items-center space-x-3">
          <ShoppingCart className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="truncate">
            <span className="text-slate-500 block">নতুন যোগ করতে চাওয়া পণ্য:</span>
            <span className="font-semibold text-slate-800 truncate block">
              {language === 'bn' ? pendingItem.product.nameBn : pendingItem.product.nameEn}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={confirmClearAndAdd}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t('clearCartAndAdd')}</span>
          </button>
          <button
            onClick={cancelAddDifferentShop}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors"
          >
            {t('keepCurrentCart')}
          </button>
        </div>
      </div>
    </div>
  );
};
