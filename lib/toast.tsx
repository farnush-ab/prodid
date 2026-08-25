"use client";

/* ---------------- toast ---------------- */
import { useEffect, useState } from "react";
import { Icon } from "./icons";

let listeners: Array<(msg: string | null) => void> = [];
let timer: ReturnType<typeof setTimeout> | undefined;

export function toast(msg: string) {
  listeners.forEach((l) => l(msg));
  clearTimeout(timer);
  timer = setTimeout(() => listeners.forEach((l) => l(null)), 2200);
}

export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const listener = (m: string | null) => setMsg(m);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  return (
    <div className={`toast${msg ? " show" : ""}`}>
      <Icon name="check" />
      <span>{msg}</span>
    </div>
  );
}
