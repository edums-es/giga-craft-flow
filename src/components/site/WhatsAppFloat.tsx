import { MessageCircle } from "lucide-react";
import { SITE, whatsappLink } from "@/lib/site-config";

export function WhatsAppFloat() {
  return (
    <a
      href={whatsappLink(`Olá, ${SITE.nome}! Gostaria de tirar uma dúvida.`)}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition hover:scale-105"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
