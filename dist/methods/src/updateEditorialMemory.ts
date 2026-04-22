import { auth } from '@mindstudio-ai/agent';
import { EditorialMemories } from './tables/editorialMemory';

// Update or delete an editorial memory. Used when Sondra wants to retire a
// pattern that turned out to be wrong or too noisy, or edit the pattern
// text itself to be more accurate.
//
// Deletion is a hard delete — if we kept inactive rows around, the active
// list stays small but the table grows indefinitely. For a Tier 1 system
// keeping a small curated memory, hard delete is simpler.
export async function updateEditorialMemory(input: {
  id: string;
  pattern?: string;
  active?: boolean;
  delete?: boolean;
}) {
  auth.requireRole('admin');

  if (input.delete) {
    const { deleted } = await EditorialMemories.remove(input.id);
    return { deleted };
  }

  const updates: any = {};
  if (input.pattern !== undefined) updates.pattern = input.pattern;
  if (input.active !== undefined) updates.active = input.active;

  const updated = await EditorialMemories.update(input.id, updates);
  return { memory: updated };
}
