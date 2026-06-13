import { z } from 'zod';

export const trustTierSchema = z.enum(['platform', 'verified', 'community', 'user']);
export const entityStatusSchema = z.enum(['active', 'hidden', 'draft', 'discontinued']);
export const readinessStatusSchema = z.enum([
  'draft','imported','calculator_ready','price_checked','spreadsheet_tested','approved',
]);
export const visibilitySchema = z.enum(['private', 'org_shared', 'public']);
export const archetypeFamilySchema = z.enum([
  'fence','gate','pool-fence','balustrade','screen','enclosure','shower','other',
]);
export const reportStatusSchema = z.enum(['open', 'reviewing', 'resolved', 'dismissed']);

export const supplierSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  logoUrl: z.string().url().optional(),
  brandColour: z.string().optional(),
  contactEmail: z.string().email().optional(),
  trustTier: trustTierSchema,
  authoredBy: z.string().uuid().optional(),
  orgId: z.string().uuid().optional(),
  status: entityStatusSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const systemArchetypeSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  family: archetypeFamilySchema,
  geometryModule: z.string().min(1),
  variableSchema: z.record(z.string(), z.unknown()),
  ruleTemplateIds: z.array(z.string()),
  description: z.string().optional(),
  status: z.enum(['active', 'hidden', 'draft']),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const systemInstanceSchema = z.object({
  id: z.string().uuid(),
  supplierId: z.string().uuid(),
  archetypeId: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  status: entityStatusSchema,
  readinessStatus: readinessStatusSchema,
  trustTier: trustTierSchema,
  visibility: visibilitySchema,
  authoredBy: z.string().uuid().optional(),
  orgId: z.string().uuid().optional(),
  approvedBy: z.string().uuid().optional(),
  approvedAt: z.string().optional(),
  readinessNotes: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});