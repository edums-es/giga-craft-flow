// Configurações públicas da Giga (editáveis no painel futuramente).
export const SITE = {
  nome: "Giga Personalizados",
  tagline: "Personaliza momentos. Fortalece marcas. Cria conexões.",
  whatsappNumero: "5511999999999", // TODO: substituir pelo número real no painel
  instagram: "@gigapersonalizados",
  email: "contato@gigapersonalizados.com.br",
  cidade: "São Paulo — SP",
};

export function whatsappLink(mensagem: string): string {
  const encoded = encodeURIComponent(mensagem);
  return `https://wa.me/${SITE.whatsappNumero}?text=${encoded}`;
}

export function novoCodigoOrcamento(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `GIGA-${n}`;
}
