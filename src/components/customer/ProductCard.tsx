import React from 'react';
import { Product } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { useCart } from '../../hooks/useCart';
import { Plus, Minus, ShoppingBag } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onSelectProduct?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelectProduct }) => {
  const { language, formatBDT } = useLanguage();
  const { items, addToCart, updateQuantity } = useCart();

  const cartItem = items.find((i) => i.product.id === product.id);
  const currentQuantity = cartItem?.quantity || 0;
  const isOutOfStock = product.stock <= 0 || !product.isAvailable;

  const unitLabelsBn: Record<string, string> = {
    kg: 'কেজি',
    gm: 'গ্রাম',
    liter: 'লিটার',
    litre: 'লিটার',
    ml: 'মি.লি',
    piece: 'পিস',
    dozen: 'ডজন',
    pack: 'প্যাক',
    bottle: 'বোতল',
    cylinder: 'সিলিন্ডার',
    bundle: 'আটি',
  };

  return (
    <div
      onClick={() => onSelectProduct?.(product)}
      className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
    >
      <div>
        {/* Product Image */}
        <div className="h-28 sm:h-36 w-full bg-slate-50 overflow-hidden relative border-b border-slate-100">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.nameEn}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <ShoppingBag className="w-8 h-8" />
            </div>
          )}

          {/* Unit Badge */}
          <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md">
            {language === 'bn' ? unitLabelsBn[product.unit] || product.unit : product.unit}
          </span>

          {isOutOfStock && (
            <span className="absolute top-2 right-2 bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
              মজুদ শেষ
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-2.5 sm:p-3">
          <h4 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1 leading-snug group-hover:text-emerald-700 transition-colors">
            {language === 'bn' ? product.nameBn : product.nameEn}
          </h4>
          <p className="text-[10px] sm:text-xs text-slate-400 line-clamp-1 mt-0.5">
            {language === 'bn' ? product.descriptionBn : product.descriptionEn}
          </p>
        </div>
      </div>

      {/* Footer: Price & Add to Cart */}
      <div
        className="p-2.5 sm:p-3 pt-0 flex items-center justify-between gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <span className="text-sm sm:text-base font-black text-emerald-800 block">
            {formatBDT(product.price)}
          </span>
        </div>

        {isOutOfStock ? (
          <span className="text-[10px] font-semibold text-slate-400 px-2 py-1 bg-slate-100 rounded-lg">
            শেষ
          </span>
        ) : currentQuantity > 0 ? (
          <div className="flex items-center space-x-1 bg-emerald-50 border border-emerald-300 rounded-xl p-0.5 sm:p-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateQuantity(product.id, currentQuantity - 1);
              }}
              className="w-5 sm:w-6 h-5 sm:h-6 rounded-lg bg-white text-emerald-800 hover:bg-emerald-100 flex items-center justify-center font-bold shadow-2xs"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-4 sm:w-5 text-center font-bold text-xs text-emerald-900">
              {currentQuantity}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateQuantity(product.id, currentQuantity + 1);
              }}
              disabled={currentQuantity >= product.stock}
              className="w-5 sm:w-6 h-5 sm:h-6 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40 flex items-center justify-center font-bold shadow-2xs"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToCart(product, 1);
            }}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-xl transition-all shadow-2xs flex items-center space-x-1 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>যোগ</span>
          </button>
        )}
      </div>
    </div>
  );
};
