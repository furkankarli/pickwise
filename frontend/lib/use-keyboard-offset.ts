"use client";

import { useEffect } from "react";

/** Keeps fixed chat input above the mobile virtual keyboard via --keyboard-offset. */
export function useKeyboardOffset() {
  useEffect(() => {
    const viewport = window.visualViewport;

    if (!viewport) {
      return;
    }

    const update = () => {
      const offset = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop
      );
      document.documentElement.style.setProperty(
        "--keyboard-offset",
        `${offset}px`
      );
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      document.documentElement.style.removeProperty("--keyboard-offset");
    };
  }, []);
}
