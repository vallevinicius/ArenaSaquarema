'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
};

const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-3xl' };

/**
 * <dialog> nativo com showModal(): top layer, foco preso e Esc de graça.
 * closedby="any" dá light-dismiss; fallback manual para Safari (sem suporte a closedby).
 */
export function Modal({ open, onClose, title, children, size = 'md' }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d || 'closedBy' in HTMLDialogElement.prototype) return;
    const onClick = (e: MouseEvent) => {
      if (e.target !== d) return;
      const r = d.getBoundingClientRect();
      const inside = r.top <= e.clientY && e.clientY <= r.bottom && r.left <= e.clientX && e.clientX <= r.right;
      if (!inside) d.close();
    };
    d.addEventListener('click', onClick);
    return () => d.removeEventListener('click', onClick);
  }, []);

  return (
    <dialog
      ref={ref}
      closedby="any"
      aria-labelledby={titleId}
      onClose={onClose}
      className={`m-auto w-[calc(100%-2rem)] ${widths[size]} rounded-2xl bg-white p-0 shadow-2xl`}
    >
      {open && (
        <div>
          <header className="flex items-center justify-between border-b-4 border-sol-400 bg-mar-800 px-5 py-4 text-white">
            <h2 id={titleId} className="text-lg font-bold">
              {title}
            </h2>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="rounded-md p-1 text-mar-100 hover:bg-mar-700 hover:text-white"
              aria-label="Fechar"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>
          <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}
