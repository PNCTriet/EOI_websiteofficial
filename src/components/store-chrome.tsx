"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Search, ShoppingBag, User } from "lucide-react";
import { EoiLogo } from "@/components/eoi-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useCart } from "@/components/cart/cart-context";
import { useTranslations } from "@/components/locale-provider";

function NavIcon({
  href,
  active,
  icon: Icon,
  label,
  showBadge,
  badgeCount,
}: {
  href: string;
  active: boolean;
  icon: typeof House;
  label: string;
  showBadge?: boolean;
  badgeCount?: number;
}) {
  const color = active ? "text-eoi-pink" : "text-[#BBBBBB]";
  const count = badgeCount ?? 0;
  return (
    <Link
      href={href}
      className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 ${color}`}
    >
      <span className="relative inline-flex">
        <Icon size={22} strokeWidth={1.8} aria-hidden />
        {showBadge && count > 0 ? (
          <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-eoi-pink px-1 text-[10px] font-medium text-white font-dm">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </span>
      <span className="font-dm text-[10px] font-medium leading-tight">{label}</span>
    </Link>
  );
}

export default function StoreChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations();
  const { itemCount, mounted: cartMounted } = useCart();
  const cartCount = cartMounted ? itemCount : 0;
  const isHome = pathname === "/";
  const isSearch = pathname === "/search";
  const isCart = pathname === "/cart";
  const isAccount = pathname === "/account";

  return (
    <div className="min-h-dvh bg-eoi-bg pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-40 border-b-[1.5px] border-eoi-bg bg-white px-5 py-3 md:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link
            href="/"
            className="flex min-h-[44px] min-w-[44px] items-center"
            aria-label={t("nav.home")}
          >
            <EoiLogo heightClass="h-[5.25rem]" priority />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link
              href="/search"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-eoi-ink"
              aria-label={t("nav.search")}
            >
              <Search size={22} strokeWidth={1.8} />
            </Link>
            <Link
              href="/cart"
              className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-eoi-ink"
              aria-label={t("nav.cart")}
            >
              <ShoppingBag size={22} strokeWidth={1.8} />
              {cartCount > 0 ? (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-eoi-pink px-1 text-[10px] font-medium text-white font-dm">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl">{children}</main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t-[1.5px] border-eoi-bg bg-white px-2 pt-1 md:hidden"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        aria-label={t("store.mainNavAria")}
      >
        <div className="mx-auto flex max-w-md items-center justify-around py-1">
          <NavIcon href="/" active={isHome} icon={House} label={t("nav.home")} />
          <NavIcon
            href="/search"
            active={isSearch}
            icon={Search}
            label={t("store.bottomSearch")}
          />
          <NavIcon
            href="/cart"
            active={isCart}
            icon={ShoppingBag}
            label={t("store.bottomCart")}
            showBadge
            badgeCount={cartCount}
          />
          <NavIcon
            href="/account"
            active={isAccount}
            icon={User}
            label={t("nav.account")}
          />
        </div>
      </nav>
    </div>
  );
}
