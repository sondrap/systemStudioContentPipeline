import { db } from '@mindstudio-ai/agent';

interface User {
  email: string;
  roles: string[];
  displayName?: string;
}

export const Users = db.defineTable<User>('users');
