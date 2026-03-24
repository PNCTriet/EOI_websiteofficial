"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "eoi_cart_v1";

export type CartLine = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
  colorIndex: number;
  colorHex: string;
};

type CartContextValue = {
  items: CartLine[];
  mounted: boolean;
  itemCount: number;
  subtotal: number;
  addItem: (input: {
    productId: string;
    name: string;
    price: number;
    imageUrl: string | null;
    colorIndex: number;
    colorHex: string;
    quantity?: number;
  }) => void;
  setLineQuantity: (
    productId: string,
    colorIndex: number,
    quantity: number
  ) => void;
  removeLine: (productId: string, colorIndex: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const syncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          setItems(parsed as CartLine[]);
        }
      }
    } catch {
      /* ignore */
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, mounted]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setIsAuthenticated(Boolean(data.user));
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evt, session) => {
      setIsAuthenticated(Boolean(session?.user));
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!mounted || !isAuthenticated) return;
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(() => {
      void fetch("/api/cart/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((x) => ({
            productId: x.productId,
            quantity: x.quantity,
            colorIndex: x.colorIndex,
            colorHex: x.colorHex,
          })),
        }),
      });
    }, 300);
    return () => {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, [items, mounted, isAuthenticated]);

  const addItem = useCallback(
    (input: {
      productId: string;
      name: string;
      price: number;
      imageUrl: string | null;
      colorIndex: number;
      colorHex: string;
      quantity?: number;
    }) => {
      const q = input.quantity ?? 1;
      setItems((prev) => {
        const i = prev.findIndex(
          (x) =>
            x.productId === input.productId && x.colorIndex === input.colorIndex
        );
        if (i >= 0) {
          const next = [...prev];
          next[i] = {
            ...next[i],
            quantity: next[i].quantity + q,
          };
          return next;
        }
        return [
          ...prev,
          {
            productId: input.productId,
            name: input.name,
            price: input.price,
            quantity: q,
            imageUrl: input.imageUrl,
            colorIndex: input.colorIndex,
            colorHex: input.colorHex,
          },
        ];
      });
    },
    []
  );

  const setLineQuantity = useCallback(
    (productId: string, colorIndex: number, quantity: number) => {
      setItems((prev) => {
        if (quantity < 1) {
          return prev.filter(
            (x) => !(x.productId === productId && x.colorIndex === colorIndex)
          );
        }
        return prev.map((x) =>
          x.productId === productId && x.colorIndex === colorIndex
            ? { ...x, quantity }
            : x
        );
      });
    },
    []
  );

  const removeLine = useCallback((productId: string, colorIndex: number) => {
    setItems((prev) =>
      prev.filter(
        (x) => !(x.productId === productId && x.colorIndex === colorIndex)
      )
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = useMemo(
    () => items.reduce((s, x) => s + x.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((s, x) => s + x.price * x.quantity, 0),
    [items]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      mounted,
      itemCount,
      subtotal,
      addItem,
      setLineQuantity,
      removeLine,
      clearCart,
    }),
    [
      items,
      mounted,
      itemCount,
      subtotal,
      addItem,
      setLineQuantity,
      removeLine,
      clearCart,
    ]
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
