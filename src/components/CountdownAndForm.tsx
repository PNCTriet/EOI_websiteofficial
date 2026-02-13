"use client";

import { useState, useEffect } from "react";

const TARGET_DATE = new Date("2026-03-20T00:00:00");

function getTimeLeft() {
  const now = new Date();
  const diff = TARGET_DATE.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

const boxes = [
  { key: "days" as const, label: "Ngày", colorClass: "text-pink-500 border-pink-500" },
  { key: "hours" as const, label: "Giờ", colorClass: "text-blue-600 border-blue-600" },
  { key: "minutes" as const, label: "Phút", colorClass: "text-yellow-500 border-yellow-400" },
  { key: "seconds" as const, label: "Giây", colorClass: "text-pink-500/80 border-pink-400" },
];

export default function CountdownAndForm() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  }

  return (
    <section className="w-full max-w-lg mx-auto flex flex-col items-center gap-8 sm:gap-10">
      {/* Countdown */}
      <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
        {boxes.map(({ key, label, colorClass }) => (
          <div
            key={key}
            className={`flex flex-col items-center justify-center min-w-[4.5rem] sm:min-w-[5rem] py-4 px-3 sm:py-5 sm:px-4 rounded-xl border-2 bg-white/80 shadow-sm ${colorClass}`}
          >
            <span className="text-2xl sm:text-3xl font-bold tabular-nums">
              {String(timeLeft[key]).padStart(2, "0")}
            </span>
            <span className="text-xs sm:text-sm font-medium mt-1">{label}</span>
          </div>
        ))}
      </div>

      {/* Email form */}
      {/* <form onSubmit={handleSubmit} className="w-full flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Nhập email của bạn..."
          className="flex-1 min-w-0 px-4 py-3 rounded-full border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          required
          disabled={submitted}
        />
        <button
          type="submit"
          disabled={submitted}
          className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {submitted ? "Đã đăng ký!" : "Thông báo cho tôi"}
        </button>
      </form> */}
    </section>
  );
}
