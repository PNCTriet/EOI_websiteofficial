/**
 * Nội dung trang cảm ơn khi link hợp lệ (signed URL từ NFC).
 * Mở rộng: có thể thêm block "Xác thực sản phẩm" với model 3D (model-viewer / Three.js)
 * tương tự Apple để khách xem mã/kiểm tra hàng chính hãng.
 */
export default function ProductThankYouContent() {
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

      {/* Mở rộng: Xác thực sản phẩm kiểu Apple – khi có file 3D có thể nhúng tại đây */}
      <section
        className="flex-shrink-0 w-full max-w-sm rounded-xl border border-gray-200 bg-gray-50/80 p-4 text-center"
        aria-label="Xác thực sản phẩm"
      >
        <p className="text-xs sm:text-sm text-gray-500 font-medium uppercase tracking-wider">
          Xác thực sản phẩm
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Bạn đã truy cập bằng link chính hãng từ NFC. Sau này có thể thêm mô hình 3D tại đây để xem chi tiết sản phẩm.
        </p>
      </section>
    </>
  );
}
