'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { useRef, useState, type FormEvent } from 'react';
import { ApiError, api } from '@/lib/api-client';
import type { Photo } from '@/lib/types';
import { useToast } from '@/components/Toast';
import { Empty, ErrorBox, FormError, PageHeader, Spinner } from '@/components/ui';

const MAX_MB = 10;
const ACCEPT = 'image/jpeg,image/png,image/webp';

export default function PhotosPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<unknown>(null);
  const photos = useQuery({ queryKey: ['photos'], queryFn: () => api.get<Photo[]>('/photos') });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/photos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['photos'] });
      toast('ok', 'Foto excluída');
    },
    onError: () => toast('erro', 'Não foi possível excluir a foto'),
  });

  const rename = useMutation({
    mutationFn: ({ id, alt }: { id: number; alt: string }) => api.patch(`/photos/${id}`, { alt }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['photos'] });
      toast('ok', 'Descrição salva');
    },
    onError: () => toast('erro', 'Não foi possível salvar a descrição'),
  });

  // Envia uma por vez: mostra o andamento e uma foto ruim não derruba as outras.
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const files = Array.from(input.current?.files ?? []);
    if (files.length === 0) return;
    const alt = String(new FormData(form).get('alt') ?? '').trim();
    setUploadError(null);
    let sent = 0;
    for (const [i, file] of files.entries()) {
      setProgress(`Enviando ${i + 1} de ${files.length}...`);
      if (file.size > MAX_MB * 1024 * 1024) {
        setUploadError(new ApiError(413, 'PAYLOAD_TOO_LARGE', `${file.name}: passa de ${MAX_MB} MB`));
        continue;
      }
      const body = new FormData();
      body.set('file', file);
      if (alt) body.set('alt', alt);
      try {
        await api.upload('/photos', body);
        sent++;
      } catch (err) {
        setUploadError(err instanceof ApiError ? new ApiError(err.status, err.code, `${file.name}: ${err.message}`) : err);
      }
    }
    setProgress(null);
    form.reset();
    if (sent > 0) {
      qc.invalidateQueries({ queryKey: ['photos'] });
      toast('ok', sent === 1 ? 'Foto publicada no site' : `${sent} fotos publicadas no site`);
    }
  }

  return (
    <>
      <PageHeader title="Fotos do site" subtitle="As fotos enviadas aparecem na seção “Vida na Arena” da página inicial." />

      <form onSubmit={onSubmit} className="card mb-6 space-y-4 p-5">
        <div>
          <label htmlFor="files" className="label">Fotos (JPEG, PNG ou WebP, até {MAX_MB} MB cada)</label>
          <input ref={input} id="files" type="file" accept={ACCEPT} multiple required className="input" />
        </div>
        <div>
          <label htmlFor="alt" className="label">Descrição (opcional, para leitores de tela)</label>
          <input id="alt" name="alt" maxLength={160} className="input" placeholder="Ex.: Treino das 19h na quadra 2" />
          <p className="mt-1 text-xs text-slate-500">Vale para todas as fotos deste envio. Dá para ajustar uma a uma depois.</p>
        </div>
        <FormError error={uploadError} />
        <button className="btn-primary" disabled={progress !== null}>{progress ?? 'Enviar fotos'}</button>
      </form>

      {photos.isPending ? (
        <Spinner />
      ) : photos.isError ? (
        <ErrorBox error={photos.error} onRetry={() => photos.refetch()} />
      ) : photos.data.length === 0 ? (
        <div className="card"><Empty>Nenhuma foto ainda. Envie a primeira acima.</Empty></div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {photos.data.map((p) => (
            <li key={p.id} className="card overflow-hidden">
              <div className="relative aspect-square bg-mar-50">
                <Image src={p.url} alt={p.alt} fill unoptimized sizes="(min-width: 768px) 25vw, 50vw" className="object-cover" />
              </div>
              <div className="space-y-2 p-3">
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    rename.mutate({ id: p.id, alt: String(new FormData(e.currentTarget).get('alt') ?? '') });
                  }}
                >
                  <input name="alt" defaultValue={p.alt} maxLength={160} aria-label="Descrição da foto" placeholder="Descrição" className="input py-1.5 text-sm" />
                  <button className="btn-ghost py-1" disabled={rename.isPending}>Salvar</button>
                </form>
                <button
                  className="btn-ghost w-full py-1 text-red-700"
                  disabled={remove.isPending}
                  onClick={() => confirm('Excluir esta foto? Ela sai do site.') && remove.mutate(p.id)}
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
