import { SITE } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-nude/50">
      <div className="container-giga grid gap-10 py-14 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl text-foreground">{SITE.nome}</p>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">{SITE.tagline}</p>
        </div>
        <div className="text-sm text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">Contato</p>
          <p>WhatsApp: +55 {SITE.whatsappNumero.slice(2, 4)} {SITE.whatsappNumero.slice(4)}</p>
          <p>Instagram: {SITE.instagram}</p>
          <p>E-mail: {SITE.email}</p>
        </div>
        <div className="text-sm text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">Atendimento</p>
          <p>{SITE.cidade}</p>
          <p>Segunda a sábado</p>
          <p>Envios para todo o Brasil</p>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="container-giga py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {SITE.nome}. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
