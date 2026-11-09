import { IdParam, body, json, registry, secured, withErrors } from '../../docs/registry';
import { CreateStudentInput, ListStudentsQuery, StudentDTO, StudentListDTO, UpdateStudentInput } from './students.schemas';

const tags = ['Alunos'];
registry.registerPath({
  method: 'get',
  path: '/api/students',
  tags,
  summary: 'Listar alunos com taxa de presença do mês (ADMIN)',
  security: secured,
  request: { query: ListStudentsQuery },
  responses: { 200: json(StudentListDTO), ...withErrors() },
});
registry.registerPath({
  method: 'post',
  path: '/api/students',
  tags,
  summary: 'Cadastrar aluno só com e-mail (ADMIN). Senha padrão mudar123; no 1º login o aluno confirma um código enviado por e-mail.',
  security: secured,
  request: body(CreateStudentInput),
  responses: { 201: json(StudentDTO, 'Criado'), ...withErrors({ 409: 'E-mail já cadastrado' }) },
});
registry.registerPath({
  method: 'patch',
  path: '/api/students/{id}',
  tags,
  summary: 'Editar nome, ativar/desativar ou resetar a senha do aluno (ADMIN). Revoga sessões.',
  security: secured,
  request: { params: IdParam, ...body(UpdateStudentInput) },
  responses: { 200: json(StudentDTO), ...withErrors({ 404: 'Não encontrado' }) },
});
