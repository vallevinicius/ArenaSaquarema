import { NextResponse } from 'next/server';

// Rota de API inexistente responde JSON (não a página HTML de 404 do Next).
const notFound = () =>
  NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada' } }, { status: 404 });

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
