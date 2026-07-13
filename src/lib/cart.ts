// Carrinho de orçamento — persiste no localStorage do cliente.
import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import type { PricingInput } from "./pricing";

export interface CartItem {
  id: string;
  slug: string;
  nome: string;
  config: PricingInput;
  precoUnitario: number;
  precoTotal: number;
  prazoDiasUteis: number;
  adicionais: { nome: string; valor: number }[];
  resumo: string;
  observacao?: string;
}

const KEY = "giga-cart-v1";

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

function write(items: CartItem[]) {
  window.localStorage.setItem(KEY, JSON.stringify(items));
  emit();
}

export function addToCart(item: Omit<CartItem, "id">) {
  const items = read();
  items.push({ ...item, id: crypto.randomUUID() });
  write(items);
}

export function removeFromCart(id: string) {
  write(read().filter((i) => i.id !== id));
}

export function clearCart() {
  write([]);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart(): CartItem[] {
  const items = useSyncExternalStore(
    subscribe,
    () => JSON.stringify(read()),
    () => "[]",
  );
  return JSON.parse(items) as CartItem[];
}

export function useCartCount(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const update = () => setN(read().length);
    update();
    return subscribe(update);
  }, []);
  return n;
}

export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

export const useCartActions = () => ({
  add: useCallback(addToCart, []),
  remove: useCallback(removeFromCart, []),
  clear: useCallback(clearCart, []),
});
