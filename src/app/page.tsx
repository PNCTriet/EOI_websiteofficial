import CountdownAndForm from "@/components/CountdownAndForm";
import MouseLogoTrail from "@/components/MouseLogoTrail";

export default function Home() {
  return (
    <main className="relative flex h-dvh min-h-screen flex-col items-center justify-center overflow-hidden bg-white px-3 py-4 sm:px-6 sm:py-6">
      <MouseLogoTrail />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-3 sm:gap-5 md:gap-6 w-full max-w-2xl">
        {/* Logo video - no frame, no shadow, matches background */}
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

        {/* Headline & Subtitle */}
        <header className="text-center space-y-1 sm:space-y-2 flex-shrink-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 tracking-tight">
            EOI LINH TINH
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto font-normal leading-snug">
            &ldquo;From my bedroom to your hands.&rdquo;
          </p>
        </header>

        {/* Countdown + Instagram */}
        <CountdownAndForm />
      </div>
    </main>
  );
}
