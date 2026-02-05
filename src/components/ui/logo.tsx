"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Logo() {
  return (
    <Link
      href="#"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
    >
      <div className="h-5 w-6 shrink-0 rounded bg-black" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium whitespace-pre"
      >
        PlayStar
      </motion.span>
    </Link>
  );
}
