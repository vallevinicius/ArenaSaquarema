import { route } from '@/server/lib/route';
import { CreateStudentInput, ListStudentsQuery } from '@/server/modules/students/students.schemas';
import * as service from '@/server/modules/students/students.service';

export const GET = route({ permissions: ['ALUNOS'], query: ListStudentsQuery }, ({ query }) => service.list(query));
export const POST = route({ permissions: ['ALUNOS'], body: CreateStudentInput, status: 201 }, ({ body }) => service.create(body));
