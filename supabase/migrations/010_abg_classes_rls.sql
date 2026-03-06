-- ============================================
-- Migration: 010_abg_classes_rls.sql
-- RLS policies for abg_classes table
-- ============================================

ALTER TABLE abg_classes ENABLE ROW LEVEL SECURITY;

-- Anyone can read active classes (for form dropdowns)
CREATE POLICY "Anyone can read active classes" ON abg_classes
  FOR SELECT USING (is_active = true);

-- Service role has full access (used by API routes)
CREATE POLICY "Service role full access to abg_classes" ON abg_classes
  FOR ALL USING (auth.role() = 'service_role');
