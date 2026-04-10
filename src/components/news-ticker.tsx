"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import type { TickerItem } from "@/lib/data/ticker";

type Props = {
  items: TickerItem[];
  enabled: boolean;
};

export function NewsTicker({ items, enabled }: Props) {
  const pathname = usePathname();
  if (!enabled || pathname?.startsWith("/admin") || items.length === 0) {
    return null;
  }

  const line = items.map((i) => i.message).join("  ·  ");

  return (
    <div className="border-b border-amber-500/20 bg-[#0a1628] py-2 text-center text-sm text-amber-100/95">
      <motion.div
        className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {items.map((item) => (
          <span key={item.id}>
            {item.href ? (
              <Link href={item.href} className="font-medium underline-offset-2 hover:text-white hover:underline">
                {item.message}
              </Link>
            ) : (
              item.message
            )}
          </span>
        ))}
      </motion.div>
      {items.length > 1 && (
        <p className="sr-only" aria-live="polite">
          {line}
        </p>
      )}
    </div>
  );
}
