import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const SIZES = ["d1", "d2", "d3", "t1", "t2", "t3", "m1", "m2", "m3"];

const COLOURS = [
  "paper",
  "surface",
  "sunken",
  "pressed",
  "band",
  "band-2",
  "signal",
  "signal-lift",
  "signal-deep",
  "edge",
  "rule",
  "ink",
  "ink-1",
  "ink-2",
  "ink-3",
  "plate",
  "rule-1",
  "rule-2",
  "rule-3",
  "text-hi",
  "text-mid",
  "text-lo",
  "accent",
  "accent-2",
  "ok",
  "warn",
  "crit",
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: SIZES }],
      "text-color": [{ text: COLOURS }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function scrollToElement(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function openMailto() {
  window.location.href = "mailto:sumitgundawar3@gmail.com";
}
