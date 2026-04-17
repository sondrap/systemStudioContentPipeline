import { auth } from '@mindstudio-ai/agent';
import { Users } from './tables/users';

export async function updateEditorialDirection(input: { direction: string }) {
  auth.requireRole('admin');

  const user = await Users.update(auth.userId!, {
    editorialDirection: input.direction.trim(),
  });

  return { editorialDirection: user.editorialDirection };
}
