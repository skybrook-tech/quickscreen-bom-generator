export type TrustTier = 'platform' | 'verified' | 'community' | 'user';
export type EntityStatus = 'active' | 'hidden' | 'draft' | 'discontinued';
export type ReadinessStatus =
  | 'draft' | 'imported' | 'calculator_ready'
  | 'price_checked' | 'spreadsheet_tested' | 'approved';
export type Visibility = 'private' | 'org_shared' | 'public';
export type ArchetypeFamily =
  | 'fence' | 'gate' | 'pool-fence' | 'balustrade'
  | 'screen' | 'enclosure' | 'shower' | 'other';
export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export interface Supplier {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string;
  brandColour?: string;
  contactEmail?: string;
  trustTier: TrustTier;
  authoredBy?: string;
  orgId?: string;
  status: EntityStatus;
  metadata?: Record<string, unknown>;
  customBrandingLogo?: string;
  customBrandingBanner?: string;
  customBrandingStyles?: Record<string, string>;
  installs_enabled?: boolean;
  postcodes_serviced?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SystemArchetype {
  id: string;
  slug: string;
  name: string;
  family: ArchetypeFamily;
  geometryModule: string;
  variableSchema: Record<string, unknown>;
  ruleTemplateIds: string[];
  description?: string;
  status: 'active' | 'hidden' | 'draft';
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SystemInstance {
  id: string;
  supplierId?: string | null;
  archetypeId: string;
  slug: string;
  name: string;
  description?: string;
  status: EntityStatus;
  readinessStatus: ReadinessStatus;
  trustTier: TrustTier;
  visibility: Visibility;
  authoredBy?: string;
  orgId?: string;
  approvedBy?: string;
  approvedAt?: string;
  readinessNotes?: string;
  metadata?: Record<string, unknown>;
  calculatorClonedFrom?: string;
  aiVettingStatus?: 'pending' | 'passed' | 'failed' | 'skipped';
  aiVettingNotes?: string;
  isPublicLibrary?: boolean;
  isNewProduct?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SystemInstanceGrant {
  id: string;
  systemInstanceId: string;
  orgId: string;
  grantedBy?: string;
  grantedAt: string;
}

export interface SystemInstanceReport {
  id: string;
  systemInstanceId: string;
  reportedBy?: string;
  reason: string;
  details?: string;
  status: ReportStatus;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  createdAt: string;
}