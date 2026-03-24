import { NextResponse } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  type Locale,
} from "@/i18n/config";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function POST(request: Request) {
  let locale: Locale = DEFAULT_LOCALE;
  try {
    const body = (await request.json()) as { locale?: string };
    if (isLocale(body.locale)) locale = body.locale;
  } catch {
    // ignore invalid body
  }

  const res = NextResponse.json({ ok: true, locale });
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });
  return res;
}
