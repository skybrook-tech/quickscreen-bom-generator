-- 003_create_quotes.sql
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_ref TEXT,
  fence_config JSONB NOT NULL,
  gates JSONB DEFAULT '[]'::JSONB,
  bom JSONB NOT NULL,
  contact JSONB DEFAULT '{}'::JSONB,
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Users see all quotes in their org (staff need to see each other's quotes)
CREATE POLICY "Users can view org quotes" ON quotes
  FOR SELECT USING (org_id = public.user_org_id());

-- Users can only insert/update/delete their own quotes
CREATE POLICY "Users can insert own quotes" ON quotes
  FOR INSERT WITH CHECK (
    org_id = public.user_org_id() AND user_id = auth.uid()
  );

CREATE POLICY "Users can update own quotes" ON quotes
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own quotes" ON quotes
  FOR DELETE USING (user_id = auth.uid());

CREATE INDEX idx_quotes_org ON quotes(org_id);
CREATE INDEX idx_quotes_user ON quotes(user_id);
CREATE INDEX idx_quotes_created ON quotes(created_at DESC);
