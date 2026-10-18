import React, { useState } from 'react';
import { Product } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { useCart } from '../hooks/useCart';
import {
  ArrowLeft,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle,
  Truck,
  ShieldCheck,
  ChevronRight,
  Share2,
} from 'lucide-react';

interface ProductViewPageProps {
  product: Product;
  allProducts: Product[];
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
  onNavigateToCart: () => void;
}

export const ProductViewPage: React.FC<ProductViewPageProps> = ({
  product,
  allProducts,
  onBack,
  onSelectProduct,
  onNavigateToCart,
}) => {
  const { language, formatBDT } = useLanguage();
  const { items, addToCart, updateQuantity } = useCart();

  const cartItem = items.find((i) => i.product.id === product.id);
  const currentQuantity = cartItem?.quantity || 0;
  const [localQuantity, setLocalQuantity] = useState(currentQuantity > 0 ? currentQuantity : 1);
  const [showAddedNotice, setShowAddedNotice] = useState(false);

  const isOutOfStock = product.stock <= 0 || !product.isAvailable;

  const unitLabelsBn: Record<string, string> = {
    kg: 'কেজি',
    gm: 'গ্রাম',
    litre: 'লিটার',
    ml: 'মি.লি',
    piece: 'পিস / টি',
    dozen: 'ডজন',
    pack: 'প্যাকেট',
    bundle: 'আটি',
  };

  // Find related products (same category or area, excluding current product)
  const relatedProducts = allProducts
    .filter((p) => p.id !== product.id && (p.categoryId === product.categoryId || p.marketId === product.marketId))
    .slice(0, 4);

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product, localQuantity);
    setShowAddedNotice(true);
    setTimeout(() => setShowAddedNotice(false), 2500);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    addToCart(product, localQuantity);
    onNavigateToCart();
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 animate-in fade-in duration-200">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/80">
        <button
          onClick={onBack}
          className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{language === 'bn' ? 'হোমপেজে ফিরে যান' : 'Back to Shop'}</span>
        </button>

        <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-400">
          <span>{language === 'bn' ? 'হোম' : 'Home'}</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="capitalize">{product.categoryId}</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-800 font-semibold truncate max-w-[200px]">
            {language === 'bn' ? product.nameBn : product.nameEn}
          </span>
        </div>
      </div>

      {/* Main Product Details Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-8 shadow-xs mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 items-start">
          {/* Large Product Image */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 aspect-square max-h-[420px] w-full flex items-center justify-center">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.nameEn}
                className="w-full h-full object-cover"
              />
            ) : (
              <ShoppingBag className="w-20 h-20 text-slate-300 stroke-1" />
            )}

            {/* Badges */}
            <span className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-xs text-white text-xs font-bold px-3 py-1 rounded-lg">
              প্রতি {language === 'bn' ? unitLabelsBn[product.unit] || product.unit : product.unit}
            </span>

            {isOutOfStock ? (
              <span className="absolute top-3 right-3 bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-lg shadow-sm">
                মজুদ শেষ
              </span>
            ) : (
              <span className="absolute top-3 right-3 bg-emerald-600 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-sm">
                মজুদ: {product.stock}
              </span>
            )}
          </div>

          {/* Product Info & Purchase Actions */}
          <div className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
                  {product.categoryId}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  এরিয়া: {product.marketId}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {language === 'bn' ? product.nameBn : product.nameEn}
              </h1>

              {language === 'bn' && product.nameEn && (
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  {product.nameEn}
                </p>
              )}

              {/* Price Tag */}
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-800">
                  {formatBDT(product.price)}
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  / {language === 'bn' ? unitLabelsBn[product.unit] || product.unit : product.unit}
                </span>
              </div>

              {/* Description */}
              <div className="mt-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {language === 'bn' ? 'পণ্যের বিবরণ' : 'Product Description'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {language === 'bn'
                    ? product.descriptionBn || 'তাজা ও খাঁটি পণ্য, সরাসরি বিশ্বস্ত সোর্স থেকে সংগৃহীত।'
                    : product.descriptionEn || 'Fresh and quality assured local market item.'}
                </p>
              </div>

              {/* Delivery Guarantee Highlights */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center space-x-2 text-slate-600 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                  <Truck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>৩০-৪০ মিনিটে দ্রুত হোম ডেলিভারি</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-600 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>ক্যাশ অন ডেলিভারি (পণ্য দেখে মূল্য দিন)</span>
                </div>
              </div>
            </div>

            {/* Purchase Control Section */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              {showAddedNotice && (
                <div className="mb-3 p-2.5 bg-emerald-100 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-between animate-in fade-in duration-150">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-700" />
                    <span>পণ্যটি কার্টে সফলভাবে যোগ করা হয়েছে!</span>
                  </span>
                  <button
                    onClick={onNavigateToCart}
                    className="text-emerald-800 underline hover:text-emerald-950 font-bold"
                  >
                    কার্ট দেখুন
                  </button>
                </div>
              )}

              {/* Quantity Stepper & Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Quantity Control */}
                <div className="flex items-center justify-between sm:justify-start space-x-3 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 px-3">
                  <span className="text-xs text-slate-500 font-semibold sm:hidden">পরিমাণ:</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setLocalQuantity((q) => Math.max(1, q - 1))}
                      disabled={localQuantity <= 1 || isOutOfStock}
                      className="w-8 h-8 rounded-xl bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center font-bold shadow-2xs border border-slate-200"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-bold text-sm text-slate-900">
                      {localQuantity}
                    </span>
                    <button
                      onClick={() => setLocalQuantity((q) => Math.min(product.stock, q + 1))}
                      disabled={localQuantity >= product.stock || isOutOfStock}
                      className="w-8 h-8 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40 flex items-center justify-center font-bold shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white font-bold py-3.5 px-6 rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-700/20 active:scale-98"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{language === 'bn' ? 'কার্টে যোগ করুন' : 'Add to Cart'}</span>
                </button>

                {/* Buy Now / Checkout direct */}
                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className="bg-amber-400 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-extrabold py-3.5 px-6 rounded-2xl text-xs sm:text-sm transition-all shadow-sm active:scale-98"
                >
                  {language === 'bn' ? 'এখনই কিনুন' : 'Buy Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RELATED PRODUCTS SECTION */}
      {relatedProducts.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-4 rounded-sm bg-emerald-700 inline-block"></span>
              <span>{language === 'bn' ? 'সম্পর্কিত অন্যান্য পণ্য (Related Products)' : 'Related Products'}</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {relatedProducts.map((relProduct) => (
              <div
                key={relProduct.id}
                onClick={() => {
                  onSelectProduct(relProduct);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="h-28 sm:h-36 rounded-xl bg-slate-50 overflow-hidden mb-2 relative">
                    <img
                      src={relProduct.imageUrl}
                      alt={relProduct.nameEn}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2 left-2 bg-slate-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                      {relProduct.unit}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                    {language === 'bn' ? relProduct.nameBn : relProduct.nameEn}
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                    {relProduct.descriptionBn}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between">
                  <span className="font-black text-xs sm:text-sm text-emerald-800">
                    {formatBDT(relProduct.price)}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                    দেখুন
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
