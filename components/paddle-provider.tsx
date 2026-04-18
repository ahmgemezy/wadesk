"use client";

import { useEffect } from "react";
import { initPaddle } from "@/lib/paddle";

export function PaddleProvider() {
  useEffect(() => {
    initPaddle().catch((err: unknown) => {
      console.error("[PaddleProvider] Failed to initialize Paddle:", err);
    });
  }, []);

  return null;
}
