import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Loader2, Save, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import logo from "@/assets/giga-logo.asset.json";
import { AdminShell } from "@/components/admin/AdminShell";
import { readableError } from "@/lib/readable-error";
import { looseSupabase as db } from "@/lib/supabase-loose";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  head: () => ({
    meta: [{ title: "Configuracoes - Painel Giga" }, { name: "robots", content: "noindex" }],
  }),
  component: ConfigPage,
});

interface Config {
  id: number;
  nome: string;
  whatsapp: string;
  instagram: string | null;
  email: string | null;
  cidade: string | null;
  logo_url: string | null;
}

function ConfigPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Config | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingLogo, setProcessingLogo] = useState(false);

  const { data, error: loadError } = useQuery({
    queryKey: ["site_config"],
    queryFn: async () => {
      const { data, error } = await db.from("site_config").select("*").eq("id", 1).single();
      if (error) throw error;
      return data as Config;
    },
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) return;
      setError(null);
      const { error } = await db
        .from("site_config")
        .update({
          nome: form.nome,
          whatsapp: form.whatsapp,
          instagram: form.instagram || null,
          email: form.email || null,
          cidade: form.cidade || null,
          logo_url: form.logo_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site_config"] }),
    onError: (err) => setError(readableError(err, "Nao foi possivel salvar as configuracoes.")),
  });

  const handleLogo = async (file: File | undefined) => {
    if (!file || !form) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Envie uma imagem PNG, JPG ou WEBP.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("A logo precisa ter ate 4 MB.");
      return;
    }

    try {
      setProcessingLogo(true);
      const dataUrl = await imageFileToDataUrl(file);
      setForm({ ...form, logo_url: dataUrl });
    } catch (err) {
      setError(readableError(err, "Nao consegui preparar essa imagem."));
    } finally {
      setProcessingLogo(false);
    }
  };

  if (!form) {
    return (
      <AdminShell title="Configuracoes">
        {loadError ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Nao consegui carregar as configuracoes.
            <p className="mt-2 text-xs opacity-80">{readableError(loadError)}</p>
          </div>
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        )}
      </AdminShell>
    );
  }

  const previewLogo = form.logo_url || logo.url;

  return (
    <AdminShell
      title="Configuracoes"
      subtitle="Dados da Giga usados na vitrine e nos PDFs"
      actions={
        <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-gold">
          {save.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar
        </button>
      }
    >
      {error && (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid max-w-5xl gap-6 lg:grid-cols-[360px_1fr]">
        <section className="card-elegant h-fit space-y-4 p-6">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-accent" />
            <h2 className="font-display text-xl">Logo da Giga</h2>
          </div>
          <div className="rounded-xl border border-border bg-white p-5">
            <img
              src={previewLogo}
              alt="Logo da Giga"
              className="mx-auto h-28 w-full object-contain"
            />
          </div>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-secondary px-4 py-2 text-sm hover:border-accent">
            {processingLogo ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Subir logo
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => handleLogo(event.target.files?.[0])}
            />
          </label>
          {form.logo_url && (
            <button
              type="button"
              onClick={() => setForm({ ...form, logo_url: null })}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:border-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Remover logo enviada
            </button>
          )}
          <p className="text-xs text-muted-foreground">
            A imagem sera otimizada para o PDF. Depois de subir, clique em Salvar.
          </p>
        </section>

        <section className="card-elegant space-y-4 p-6">
          <Field
            label="Nome da empresa"
            value={form.nome}
            onChange={(nome) => setForm({ ...form, nome })}
          />
          <Field
            label="WhatsApp (apenas numeros com DDI, ex: 5511999999999)"
            value={form.whatsapp}
            onChange={(whatsapp) => setForm({ ...form, whatsapp })}
          />
          <Field
            label="Instagram"
            value={form.instagram ?? ""}
            onChange={(instagram) => setForm({ ...form, instagram })}
          />
          <Field
            label="E-mail"
            value={form.email ?? ""}
            onChange={(email) => setForm({ ...form, email })}
          />
          <Field
            label="Cidade"
            value={form.cidade ?? ""}
            onChange={(cidade) => setForm({ ...form, cidade })}
          />
        </section>
      </div>
    </AdminShell>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-accent"
      />
    </div>
  );
}

async function imageFileToDataUrl(file: File) {
  const bitmap = await createImageBitmap(file);
  const maxWidth = 900;
  const maxHeight = 360;
  const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Nao foi possivel processar a imagem.");
  context.clearRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL("image/png");
}
