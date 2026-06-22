import { z } from 'zod';

export const tableCodeSchema = z.string().trim().min(1).max(60);
