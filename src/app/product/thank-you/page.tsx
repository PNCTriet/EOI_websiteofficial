import { verifyProductSignature } from "@/lib/product-auth";
import MouseLogoTrail from "@/components/MouseLogoTrail";
import ProductThankYouContent from "./ProductThankYouContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cảm ơn bạn | EOI",
  description: "Cảm ơn bạn đã chọn sản phẩm chính hãng EOI.",
  robots: "noindex, nofollow",
};

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ProductThankYouPage({ searchParams }: Props) {
  const params = await searchParams;
  const p = typeof params.p === "string" ? params.p : "";
  const sig = typeof params.sig === "string" ? params.sig : null;

  let valid = false;
  try {
    valid = verifyProductSignature(p, sig);
  } catch {
    valid = false;
  }

  if (!valid) {
    return (
      <main className="relative flex h-dvh min-h-screen flex-col items-center justify-center overflow-hidden bg-white px-3 py-4">
        <div className="text-center text-gray-500 text-sm">
          <p>Liên kết không hợp lệ hoặc đã hết hạn.</p>
          <p className="mt-2">Vui lòng quét NFC trên sản phẩm chính hãng EOI.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex h-dvh min-h-screen flex-col items-center justify-center overflow-hidden bg-white px-3 py-4 sm:px-6 sm:py-6">
      <MouseLogoTrail />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-3 sm:gap-5 md:gap-6 w-full max-w-2xl">
        <ProductThankYouContent productId={p} />
      </div>
    </main>
  );
}
