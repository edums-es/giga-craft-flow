export function normalizePhone(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

export function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function sameCustomerContact(
  left: { whatsapp?: string | null; email?: string | null },
  right: { whatsapp?: string | null; email?: string | null },
) {
  const leftPhone = normalizePhone(left.whatsapp);
  const rightPhone = normalizePhone(right.whatsapp);
  if (leftPhone && rightPhone && leftPhone === rightPhone) return true;

  const leftEmail = normalizeEmail(left.email);
  const rightEmail = normalizeEmail(right.email);
  return Boolean(leftEmail && rightEmail && leftEmail === rightEmail);
}
