"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export type AppView = "markets" | "copper" | "checklist";

export default function ViewTabs({
  active,
  onSelect,
}: {
  active: AppView;
  onSelect?: (view: "markets" | "copper") => void;
}) {
  const router = useRouter();

  function openView(view: "markets" | "copper") {
    if (onSelect) {
      onSelect(view);
      return;
    }
    router.push(view === "copper" ? "/?view=copper" : "/");
  }

  return (
    <div className="tabs">
      <button
        type="button"
        className={active === "markets" ? "tab active" : "tab"}
        onClick={() => openView("markets")}
      >
        <svg viewBox="0 0 16 16" className="tab-icon" aria-hidden="true">
          <path d="M1 12.5 5.2 7.8 8 10.2 15 2.5" />
          <path d="M10.5 2.5H15V7" />
        </svg>
        Markets
      </button>
      <button
        type="button"
        className={active === "copper" ? "tab active" : "tab"}
        onClick={() => openView("copper")}
      >
        <svg viewBox="0 0 16 16" className="tab-icon" aria-hidden="true">
          <circle cx="8" cy="8" r="5.2" />
          <path d="M8 4.8v6.4M5.6 6.4h4.8M5.6 9.6h4.8" />
        </svg>
        Copper
      </button>
      <Link
        href="/checklist"
        className={active === "checklist" ? "tab active" : "tab"}
      >
        <svg viewBox="0 0 16 16" className="tab-icon" aria-hidden="true">
          <rect x="2" y="2.2" width="12" height="11.6" rx="1.2" />
          <path d="M5 8.1 7 10.1 11.2 5.6" />
        </svg>
        Checklist
      </Link>
    </div>
  );
}
