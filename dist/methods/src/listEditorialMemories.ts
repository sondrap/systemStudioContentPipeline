import { auth } from '@mindstudio-ai/agent';
import { EditorialMemories } from './tables/editorialMemory';

// List editorial memories (Tier 1 pattern learning). Used by the Settings
// page so Sondra can see what the system has learned from her corrections.
//
// Returns the full set — active and inactive — so the UI can display both
// groups. The cap is high because this is for the curation screen, not a
// prompt digest where we'd truncate.
export async function listEditorialMemories(input?: { onlyActive?: boolean }) {
  auth.requireRole('admin');

  const memories = input?.onlyActive
    ? await EditorialMemories.filter(m => m.active === true).sortBy(m => m.created_at).reverse()
    : await EditorialMemories.sortBy(m => m.created_at).reverse();

  return { memories };
}
