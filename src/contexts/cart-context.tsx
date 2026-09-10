'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ShopSize } from '@/lib/shop-products';

export type CartLine = {
  slug: string;
  size: ShopSize;
  quantity: number;
};

type CartContextType = {
  lines: CartLine[];
  addToCart: (slug: string, size: ShopSize, quantity?: number) => void;
  updateQuantity: (slug: string, size: ShopSize, quantity: number) => void;
  removeFromCart: (slug: string, size: ShopSize) => void;
  clearCart: () => void;
  itemCount: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

/** Scoped to the shop only — the rest of the app has no reason to read a
 *  cart, so this isn't in the root layout alongside the post/auth contexts. */
const STORAGE_KEY = 'bholo:shop:cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  // Guards the very first write: without it, the initial empty state (before
  // localStorage has been read) would overwrite whatever was actually saved
  // from a previous visit, the instant this mounts.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      // Private mode, or corrupted JSON — an empty cart is the safe default.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage full or unavailable — losing persistence isn't worth
      // breaking the cart interaction that was about to happen.
    }
  }, [lines, hydrated]);

  const addToCart = (slug: string, size: ShopSize, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.slug === slug && l.size === size);
      if (existing) {
        return prev.map((l) =>
          l.slug === slug && l.size === size ? { ...l, quantity: l.quantity + quantity } : l
        );
      }
      return [...prev, { slug, size, quantity }];
    });
  };

  const updateQuantity = (slug: string, size: ShopSize, quantity: number) => {
    setLines((prev) => {
      if (quantity <= 0) return prev.filter((l) => !(l.slug === slug && l.size === size));
      return prev.map((l) => (l.slug === slug && l.size === size ? { ...l, quantity } : l));
    });
  };

  const removeFromCart = (slug: string, size: ShopSize) => {
    setLines((prev) => prev.filter((l) => !(l.slug === slug && l.size === size)));
  };

  const clearCart = () => setLines([]);

  const itemCount = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines]);

  return (
    <CartContext.Provider
      value={{ lines, addToCart, updateQuantity, removeFromCart, clearCart, itemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
