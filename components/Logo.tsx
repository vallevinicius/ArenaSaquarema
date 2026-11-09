import Image from 'next/image';

/** Emblema da Arena sobre um disco branco: o aro preto da logo some em fundo azul sem ele. */
export function Emblem({ size = 44, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full bg-white shadow-lg ring-2 ring-sol-400/70 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image src="/logo.png" alt="Arena Saquarema" width={size} height={size} priority className="size-[92%]" />
    </span>
  );
}

export function Logo({ light = true, size = 44 }: { light?: boolean; size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <Emblem size={size} />
      <div className="leading-tight">
        <p className={`text-lg font-black tracking-tight ${light ? 'text-white' : 'text-mar-900'}`}>ARENA</p>
        <p className="text-xs font-bold tracking-[0.25em] text-sol-400">SAQUAREMA</p>
      </div>
    </div>
  );
}
