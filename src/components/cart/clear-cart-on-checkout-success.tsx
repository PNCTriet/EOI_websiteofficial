"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart/cart-context";

/** Run once on the payment success page so localStorage + DB cart match a completed order. */
export function ClearCartOnCheckoutSuccess() {
  const { clearCart } = useCart();
  useEffect(() => {
    clearCart();
  }, [clearCart]);
  return null;
}
