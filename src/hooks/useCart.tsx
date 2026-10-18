import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem } from '../types';

interface CartContextType {
  items: CartItem[];
  shopId: string | null;
  addToCart: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
  differentShopModalOpen: boolean;
  pendingItem: { product: Product; quantity: number } | null;
  confirmClearAndAdd: () => void;
  cancelAddDifferentShop: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('amarbazaar_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [shopId, setShopId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('amarbazaar_cart_shop') || null;
    } catch {
      return null;
    }
  });

  const [differentShopModalOpen, setDifferentShopModalOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState<{ product: Product; quantity: number } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('amarbazaar_cart', JSON.stringify(items));
      if (items.length === 0) {
        setShopId(null);
        localStorage.removeItem('amarbazaar_cart_shop');
      } else if (shopId) {
        localStorage.setItem('amarbazaar_cart_shop', shopId);
      }
    } catch {}
  }, [items, shopId]);

  const addToCart = (product: Product, quantity: number = 1) => {
    if (items.length > 0 && shopId && shopId !== product.shopId) {
      // Trigger Single-Shop Rule Modal
      setPendingItem({ product, quantity });
      setDifferentShopModalOpen(true);
      return;
    }

    setShopId(product.shopId);
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: Math.min(product.stock, i.quantity + quantity) }
            : i
        );
      }
      return [...prev, { product, quantity: Math.min(product.stock, quantity) }];
    });
  };

  const confirmClearAndAdd = () => {
    if (pendingItem) {
      setShopId(pendingItem.product.shopId);
      setItems([{ product: pendingItem.product, quantity: pendingItem.quantity }]);
    }
    setPendingItem(null);
    setDifferentShopModalOpen(false);
  };

  const cancelAddDifferentShop = () => {
    setPendingItem(null);
    setDifferentShopModalOpen(false);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.product.id === productId) {
          return { ...i, quantity: Math.min(i.product.stock, quantity) };
        }
        return i;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.product.id !== productId);
      if (next.length === 0) {
        setShopId(null);
      }
      return next;
    });
  };

  const clearCart = () => {
    setItems([]);
    setShopId(null);
    localStorage.removeItem('amarbazaar_cart');
    localStorage.removeItem('amarbazaar_cart_shop');
  };

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        shopId,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        subtotal,
        itemCount,
        differentShopModalOpen,
        pendingItem,
        confirmClearAndAdd,
        cancelAddDifferentShop,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
