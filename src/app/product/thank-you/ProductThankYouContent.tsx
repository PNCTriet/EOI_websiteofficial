import ProductModelViewer3MF from "@/components/ProductModelViewer3MF";

/**
 * Nội dung trang cảm ơn khi link hợp lệ (signed URL từ NFC).
 * Có thể gắn file .3mf theo productId: đặt file tại public/models/{productId}.3mf
 */
type Props = { productId: string };

export default function ProductThankYouContent({ productId }: Props) {
  const modelUrl = `/models/${encodeURIComponent(productId)}.3mf`;

  return (
    <>
      {/* Logo video - giống trang chủ */}
      <div className="flex-shrink-0 w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 bg-transparent">
        <video
          src="/logo-animation.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-contain"
          aria-hidden="true"
        />
      </div>

      {/* Lời cảm ơn */}
      <header className="text-center space-y-1 sm:space-y-2 flex-shrink-0">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 tracking-tight">
          Cảm ơn bạn đã mua hàng tại EOI
        </h1>
        <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto font-normal leading-snug">
          Sản phẩm của bạn được gắn NFC để đánh dấu hàng chính hãng. Giữ link này để xác thực sau.
        </p>
      </header>

      {/* Mô hình 3D sản phẩm (.3mf) — file tại public/models/{productId}.3mf */}
      <section className="flex-shrink-0 w-full max-w-sm" aria-label="Xác thực sản phẩm">
        <p className="text-xs sm:text-sm text-gray-500 font-medium uppercase tracking-wider text-center mb-2">
          Xem mô hình 3D
        </p>
        <ProductModelViewer3MF modelUrl={modelUrl} className="w-full" />
      </section>
    </>
  );
}
