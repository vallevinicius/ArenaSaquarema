import { describe, expect, it } from 'vitest';
import { CreateStudentInput, ListStudentsQuery, UpdateStudentInput } from './students.schemas';

describe('telefone', () => {
  const phone = (v: string) => CreateStudentInput.safeParse({ email: 'a@x.com', phone: v });
  it('normaliza para só dígitos, com ou sem 55', () => {
    expect(phone('(22) 99999-1234').data?.phone).toBe('22999991234');
    expect(phone('+55 22 99999-1234').data?.phone).toBe('22999991234');
    expect(phone('(22) 3333-4444').data?.phone).toBe('2233334444');
  });
  it('recusa curto, longo e texto', () => {
    expect(phone('1234').success).toBe(false);
    expect(phone('123456789012345').success).toBe(false);
    expect(phone('abc').success).toBe(false);
  });
  it('vazio apaga (vira null) na edição; null também', () => {
    expect(UpdateStudentInput.parse({ phone: '' }).phone).toBeNull();
    expect(UpdateStudentInput.parse({ phone: null }).phone).toBeNull();
  });
});

describe('nível', () => {
  it('aceita só os 4 níveis; null remove na edição', () => {
    expect(CreateStudentInput.safeParse({ email: 'a@x.com', level: 'AVANCADO' }).success).toBe(true);
    expect(CreateStudentInput.safeParse({ email: 'a@x.com', level: 'MESTRE' }).success).toBe(false);
    expect(UpdateStudentInput.parse({ level: null }).level).toBeNull();
  });
  it('filtro aceita nível ou NONE e recusa o resto', () => {
    expect(ListStudentsQuery.safeParse({ level: 'NONE' }).success).toBe(true);
    expect(ListStudentsQuery.safeParse({ level: 'INICIANTE_A' }).success).toBe(true);
    expect(ListStudentsQuery.safeParse({ level: "x' OR 1=1" }).success).toBe(false);
  });
});
