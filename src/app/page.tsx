import CountdownAndForm from "@/components/CountdownAndForm";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-white px-4 py-8 sm:px-6 sm:py-12">
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-2xl gap-8 sm:gap-10">
        {/* Eyebrow Badge */}
        <div className="px-4 py-1.5 rounded-full bg-gray-100 border border-gray-200">
          <span className="text-xs sm:text-sm text-gray-600 tracking-widest uppercase font-medium">
            ✦ 3D STORE AT PACIFIC PLACE SAIGON IS COMING! ✦
          </span>
        </div>

        {/* Logo video - Glass frame effect */}
        <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-3xl overflow-hidden bg-white/40 backdrop-blur-md border border-white/60 shadow-lg">
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
        <header className="text-center space-y-3 sm:space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 tracking-tight">
            EOI LINH TINH
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-lg mx-auto font-normal leading-relaxed">
            &ldquo;From my bedroom to your hands.&rdquo;
          </p>
        </header>

        {/* Countdown + Instagram */}
        <CountdownAndForm />
      </div>
    </main>
  );
}
