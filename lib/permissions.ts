// Catálogo de permissões por área. SEM imports de servidor: o front (menu, guards) e o
// back (route()) usam exatamente a mesma lista.
//
// ADMIN = acesso total e é o único que gerencia usuários e perfis (por isso essas duas
// áreas não existem aqui: nenhum perfil pode ser promovido a administrador por dentro).

export const PERMISSION_KEYS = [
  'DASHBOARD',
  'COMANDAS',
  'CANCELAR_COMANDA',
  'CLIENTES',
  'DAY_USE',
  'PLANOS_DAY_USE',
  'BAR',
  'ESTOQUE',
  'ALUNOS',
  'PRESENCAS',
  'FOTOS',
] as const;
export type Permission = (typeof PERMISSION_KEYS)[number];
export type PermissionRole = 'ADMIN' | 'OPERADOR' | 'ALUNO';

export const PERMISSION_INFO: Record<Permission, { label: string; description: string }> = {
  DASHBOARD: { label: 'Dashboard', description: 'Ver faturamento e indicadores' },
  COMANDAS: { label: 'Comandas', description: 'Abrir comandas, lançar itens e fechar' },
  CANCELAR_COMANDA: { label: 'Cancelar comandas', description: 'Cancelar uma comanda aberta (estorna o estoque)' },
  CLIENTES: { label: 'Clientes', description: 'Cadastrar e editar clientes' },
  DAY_USE: { label: 'Day Use (caixa do dia)', description: 'Abrir o caixa, lançar pagamentos e fechar o dia' },
  PLANOS_DAY_USE: { label: 'Planos de day use', description: 'Criar e editar os planos e seus preços' },
  BAR: { label: 'Bar / Produtos', description: 'Cadastrar e editar produtos e preços' },
  ESTOQUE: { label: 'Estoque', description: 'Ver e lançar entradas, saídas e ajustes' },
  ALUNOS: { label: 'Alunos', description: 'Cadastrar alunos, resetar senha e ver a presença' },
  PRESENCAS: { label: 'Presenças', description: 'Ver e remover check-ins dos alunos' },
  FOTOS: { label: 'Fotos do site', description: 'Enviar e excluir as fotos da galeria' },
};

const isPermission = (v: unknown): v is Permission => typeof v === 'string' && (PERMISSION_KEYS as readonly string[]).includes(v);

/** Lê o JSON do perfil ignorando chaves desconhecidas (ex.: permissão removida numa versão futura). */
export const parsePermissions = (raw: unknown): Permission[] =>
  Array.isArray(raw) ? PERMISSION_KEYS.filter((k) => raw.includes(k)) : [];

/** Permissões efetivas: ADMIN tem todas, ALUNO nenhuma, equipe a do seu perfil (sem perfil = nenhuma). */
export function resolvePermissions(role: PermissionRole, profilePermissions: unknown): Permission[] {
  if (role === 'ADMIN') return [...PERMISSION_KEYS];
  if (role === 'ALUNO') return [];
  return parsePermissions(profilePermissions);
}

export const hasAny = (user: { role: PermissionRole; permissions: readonly Permission[] }, needed: readonly Permission[]) =>
  user.role === 'ADMIN' || needed.some((p) => user.permissions.includes(p));

/** Telas da equipe em ordem de menu: caminho -> permissão exigida ('ADMIN' = só administrador). */
export const AREAS: ReadonlyArray<{ to: string; need: Permission | 'ADMIN' }> = [
  { to: '/dashboard', need: 'DASHBOARD' },
  { to: '/comandas', need: 'COMANDAS' },
  { to: '/clientes', need: 'CLIENTES' },
  { to: '/produtos', need: 'BAR' },
  { to: '/estoque', need: 'ESTOQUE' },
  { to: '/day-use', need: 'DAY_USE' },
  { to: '/alunos', need: 'ALUNOS' },
  { to: '/presencas', need: 'PRESENCAS' },
  { to: '/fotos', need: 'FOTOS' },
  { to: '/perfis', need: 'ADMIN' },
  { to: '/usuarios', need: 'ADMIN' },
];

type Actor = { role: PermissionRole; permissions: readonly Permission[] };
const allowed = (user: Actor, need: Permission | 'ADMIN') => (need === 'ADMIN' ? user.role === 'ADMIN' : hasAny(user, [need]));

/** Pode abrir essa página? Caminho fora do mapa (ex.: /painel) não exige permissão específica. */
export function canAccessPath(user: Actor, pathname: string): boolean {
  const area = AREAS.find((a) => pathname === a.to || pathname.startsWith(`${a.to}/`));
  return area ? allowed(user, area.need) : true;
}

/** Primeira tela liberada para o usuário (destino do login). null = perfil sem nenhuma área. */
export const firstAllowedPath = (user: Actor): string | null => AREAS.find((a) => allowed(user, a.need))?.to ?? null;
