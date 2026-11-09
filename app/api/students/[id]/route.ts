import { IdParam } from '@/server/docs/registry';
import { route } from '@/server/lib/route';
import { UpdateStudentInput } from '@/server/modules/students/students.schemas';
import * as service from '@/server/modules/students/students.service';

export const PATCH = route({ permissions: ['ALUNOS'], params: IdParam, body: UpdateStudentInput }, ({ params, body }) =>
  service.update(params.id, body),
);
