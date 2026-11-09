import { ImageResponse } from 'next/og';

export const alt = 'Arena Saquarema: futevôlei em Saquarema, RJ';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Imagem que aparece ao compartilhar o link (WhatsApp, Instagram, Google). Cores da identidade: areia, azul e sol.
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#f7ecd2', padding: 72, position: 'relative' }}>
        <div style={{ position: 'absolute', top: -140, right: -140, width: 520, height: 520, borderRadius: 999, background: '#facc15', display: 'flex' }} />
        <div style={{ display: 'flex', flexDirection: 'column', color: '#0a2c63', fontWeight: 900, letterSpacing: 6, fontSize: 40 }}>
          <span>ARENA</span>
          <span style={{ color: '#1640c9', fontSize: 30 }}>SAQUAREMA</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', color: '#0a2c63', fontSize: 120, fontWeight: 900, lineHeight: 0.95 }}>
          <span>PÉ NA AREIA,</span>
          <span>BOLA NO AR.</span>
        </div>
        <div style={{ display: 'flex', color: '#0a2c63', fontSize: 34, fontWeight: 600 }}>Aulas de futevôlei em Saquarema, RJ · 18h às 22h</div>
      </div>
    ),
    size,
  );
}
