"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { EoiLogo } from "@/components/eoi-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslations } from "@/components/locale-provider";
import { createClient } from "@/lib/supabase/client";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const NAV: { href: string; labelKey: string; icon: typeof LayoutDashboard }[] =
    [
      { href: "/admin", labelKey: "admin.dashboard.title", icon: LayoutDashboard },
      { href: "/admin/products", labelKey: "admin.products.title", icon: Package },
      { href: "/admin/orders", labelKey: "admin.orders.title", icon: ShoppingCart },
      { href: "/admin/customers", labelKey: "admin.customers.title", icon: Users },
    ];

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function navLinkClass(href: string) {
    const active =
      href === "/admin"
        ? pathname === "/admin"
        : pathname.startsWith(href);
    if (active) {
      return "flex min-h-[44px] items-center gap-3 border-l-[3px] border-eoi-pink bg-white/10 px-4 py-2.5 font-dm text-sm font-medium text-white";
    }
    return "flex min-h-[44px] items-center gap-3 border-l-[3px] border-transparent px-4 py-2.5 font-dm text-sm font-medium text-[#666666] hover:text-white";
  }

  const sidebar = (
    <aside className="flex h-full w-[240px] flex-col bg-eoi-ink">
      <div className="border-b border-white/10 px-4 py-5">
        <EoiLogo heightClass="h-8" />
        <p className="mt-1 font-dm text-[10px] font-medium uppercase tracking-wider text-[#666666]">
          Admin
        </p>
        <div className="mt-3">
          <LanguageSwitcher variant="onDark" />
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 py-4">
        {NAV.map(({ href, labelKey, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMenuOpen(false)}
            className={navLinkClass(href)}
          >
            <Icon size={22} strokeWidth={1.8} aria-hidden />
            {t(labelKey)}
          </Link>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          disabled={loggingOut}
          onClick={handleLogout}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 font-dm text-sm font-medium text-[#666666] hover:bg-white/5 hover:text-white disabled:opacity-50"
        >
          <LogOut size={22} strokeWidth={1.8} />
          {t("nav.logout")}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-dvh bg-eoi-bg">
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-eoi-border bg-eoi-ink px-4 py-3 md:hidden">
        <EoiLogo heightClass="h-7" />
        <div className="flex items-center gap-2">
          <LanguageSwitcher variant="onDark" />
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-white"
            aria-label={menuOpen ? t("admin.shell.closeMenu") : t("admin.shell.openMenu")}
          >
            {menuOpen ? (
              <X size={22} strokeWidth={1.8} />
            ) : (
              <Menu size={22} strokeWidth={1.8} />
            )}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label={t("admin.shell.closeOverlay")}
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative z-10 h-full shadow-xl">{sidebar}</div>
        </div>
      ) : null}

      <div className="flex min-h-dvh">
        <div className="hidden md:block">{sidebar}</div>
        <div className="min-h-dvh flex-1 md:ml-[240px]">{children}</div>
      </div>
    </div>
  );
}
