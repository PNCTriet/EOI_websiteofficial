"use client";

import { useEffect } from "react";
import { onCLS, onINP, onLCP, onTTFB, onFCP } from "web-vitals";

async function postMetric(payload: Record<string, unknown>) {
  try {
    await fetch("/api/telemetry/web-vitals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // avoid breaking UI
  }
}

export function WebVitalsClient() {
  useEffect(() => {
    // Keep it lightweight: start once per page load.
    const init = async () => {
      onCLS((v) => {
        postMetric({ name: "CLS", value: v, during: "onCLS" });
      });
      onLCP((v) => {
        postMetric({ name: "LCP", value: v, during: "onLCP" });
      });
      onTTFB((v) => {
        postMetric({ name: "TTFB", value: v, during: "onTTFB" });
      });
      onFCP((v) => {
        postMetric({ name: "FCP", value: v, during: "onFCP" });
      });
      onINP((v) => {
        postMetric({ name: "INP", value: v, during: "onINP" });
      });
    };
    void init();
  }, []);

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <></>;
}

