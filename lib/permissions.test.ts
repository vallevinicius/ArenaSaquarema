import { describe, expect, it } from 'vitest';
import {
  AREAS,
  PERMISSION_INFO,
  PERMISSION_KEYS,
  canAccessPath,
  firstAllowedPath,
  hasAny,
  parsePermissions,
  resolvePermissions,
} from './permissions';

const staff = (...permissions: (typeof PERMISSION_KEYS)[number][]) => ({ role: 'OPERADOR' as const, permissions });
const admin = { role: 'ADMIN' as const, permissions: [...PERMISSION_KEYS] };

describe('catálogo', () => {
  it('toda permissão tem rótulo e descrição em pt-BR', () => {
    for (const k of PERMISSION_KEYS) {
      expect(PERMISSION_INFO[k].label.length).toBeGreaterThan(2);
      expect(PERMISSION_INFO[k].description.length).toBeGreaterThan(5);
    }
  });
  it('toda permissão (exceto as sem tela própria) abre alguma área, e nenhuma área exige permissão inexistente', () => {
    const used = new Set(AREAS.map((a) => a.need));
    for (const a of AREAS) expect(a.need === 'ADMIN' || PERMISSION_KEYS.includes(a.need)).toBe(true);
    // Estas só liberam ações dentro de telas de outras áreas.
    const semTela = new Set(['CANCELAR_COMANDA', 'PLANOS_DAY_USE']);
    for (const k of PERMISSION_KEYS) expect(used.has(k) || semTela.has(k)).toBe(true);
  });
  it('usuários e perfis são só do ADMIN (nenhum perfil consegue se promover)', () => {
    expect(AREAS.find((a) => a.to === '/usuarios')?.need).toBe('ADMIN');
    expect(AREAS.find((a) => a.to === '/perfis')?.need).toBe('ADMIN');
    expect(AREAS.find((a) => a.to === '/parceiros')?.need).toBe('ADMIN'); // check-ins de parceiros: nomes só para o admin
    expect(PERMISSION_KEYS).not.toContain('USUARIOS');
    expect(PERMISSION_KEYS).not.toContain('PERFIS');
  });
});

describe('resolvePermissions', () => {
  it('ADMIN tem todas, ignorando perfil', () => expect(resolvePermissions('ADMIN', ['COMANDAS'])).toEqual([...PERMISSION_KEYS]));
  it('ALUNO não tem nenhuma, mesmo que alguém grave perfil nele', () => expect(resolvePermissions('ALUNO', ['COMANDAS'])).toEqual([]));
  it('equipe usa as do perfil, na ordem do catálogo', () => expect(resolvePermissions('OPERADOR', ['CLIENTES', 'COMANDAS'])).toEqual(['COMANDAS', 'CLIENTES']));
  it('equipe sem perfil não tem acesso (deny by default)', () => {
    expect(resolvePermissions('OPERADOR', null)).toEqual([]);
    expect(resolvePermissions('OPERADOR', undefined)).toEqual([]);
  });
});

describe('parsePermissions', () => {
  it('ignora chaves desconhecidas e lixo', () => {
    expect(parsePermissions(['COMANDAS', 'VIRAR_ADMIN', 42, null, 'BAR'])).toEqual(['COMANDAS', 'BAR']);
  });
  it.each([null, undefined, 'COMANDAS', 5, {}, { COMANDAS: true }])('JSON que não é lista (%j) vira []', (v) => expect(parsePermissions(v)).toEqual([]));
});

describe('hasAny', () => {
  it('ADMIN sempre passa', () => expect(hasAny(admin, ['ESTOQUE'])).toBe(true));
  it('equipe passa se tem ao menos UMA das exigidas', () => {
    expect(hasAny(staff('COMANDAS'), ['CLIENTES', 'COMANDAS'])).toBe(true);
    expect(hasAny(staff('BAR'), ['CLIENTES', 'COMANDAS'])).toBe(false);
  });
  it('lista exigida vazia nunca libera equipe', () => expect(hasAny(staff('COMANDAS'), [])).toBe(false));
});

describe('canAccessPath / firstAllowedPath', () => {
  it('só abre as áreas do perfil (inclusive subcaminhos)', () => {
    const u = staff('COMANDAS');
    expect(canAccessPath(u, '/comandas')).toBe(true);
    expect(canAccessPath(u, '/comandas/12')).toBe(true);
    expect(canAccessPath(u, '/estoque')).toBe(false);
    expect(canAccessPath(u, '/dashboard')).toBe(false);
  });
  it('/usuarios e /perfis: só ADMIN', () => {
    const u = staff(...PERMISSION_KEYS);
    expect(canAccessPath(u, '/usuarios')).toBe(false);
    expect(canAccessPath(u, '/perfis')).toBe(false);
    expect(canAccessPath(admin, '/perfis')).toBe(true);
  });
  it('prefixo parecido não vaza acesso (/comandas-x não é /comandas)', () => expect(canAccessPath(staff(), '/estoquex')).toBe(true)); // fora do mapa = sem exigência
  it('/painel não exige permissão (é quem redireciona)', () => expect(canAccessPath(staff(), '/painel')).toBe(true));
  it('destino do login: primeira área liberada, ou null se o perfil está vazio', () => {
    expect(firstAllowedPath(admin)).toBe('/dashboard');
    expect(firstAllowedPath(staff('CLIENTES', 'DAY_USE'))).toBe('/clientes');
    expect(firstAllowedPath(staff())).toBeNull();
  });
});
