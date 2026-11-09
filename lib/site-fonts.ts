import { Big_Shoulders, Figtree } from 'next/font/google';

// Fontes da parte "de cara para o aluno" (site público e área do aluno). Self-hosted pelo next/font.
export const display = Big_Shoulders({ subsets: ['latin'], variable: '--font-display' });
export const body = Figtree({ subsets: ['latin'], display: 'swap' });
