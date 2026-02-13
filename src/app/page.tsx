import CountdownAndForm from "@/components/CountdownAndForm";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 bg-gradient-to-b from-gray-50 to-gray-100/80 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col items-center justify-center w-full max-w-2xl gap-6 sm:gap-8">
        {/* Logo video */}
        <div className="w-64 h-64 sm:w-80 sm:h-80 flex-shrink-0 rounded-2xl overflow-hidden bg-white/60 shadow-sm border border-gray-100">
          <video
            src="/logo-animation.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-contain"
            aria-hidden
          />
        </div>
        {/* Countdown + Email form */}
        <CountdownAndForm />
      </div>
    </main>
  );
}
