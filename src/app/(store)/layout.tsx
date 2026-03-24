import { CartProvider } from "@/components/cart/cart-context";
import StoreChrome from "@/components/store-chrome";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <StoreChrome>{children}</StoreChrome>
    </CartProvider>
  );
}
