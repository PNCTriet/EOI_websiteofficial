import Image from "next/image";
import { brandAssets } from "@/lib/brand-assets";

type EoiLogoProps = {
  className?: string;
  /** Chiều cao logo (Tailwind `h-*`, ví dụ `h-7`, `h-12`) */
  heightClass?: string;
  /** Ưu tiên tải sớm (header) */
  priority?: boolean;
};

/**
 * Logo thương hiệu — dùng `logo-transparent.png` cho nền sáng hoặc sidebar tối (màu brand).
 */
export function EoiLogo({
  className = "",
  heightClass = "h-7",
  priority = false,
}: EoiLogoProps) {
  return (
    <Image
      src={brandAssets.logoTransparent}
      alt="eoi"
      width={200}
      height={64}
      priority={priority}
      unoptimized
      className={`w-auto object-contain object-left ${heightClass} ${className}`}
    />
  );
}
