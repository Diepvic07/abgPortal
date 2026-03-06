-- ============================================
-- Migration: 011_contact_requests_source.sql
-- Add source tracking to contact_requests for AI match vs direct search
-- ============================================

ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct' CHECK (source IN ('direct', 'ai_match'));
ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS connection_request_id TEXT REFERENCES connection_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contact_req_source ON contact_requests(source);
CREATE INDEX IF NOT EXISTS idx_contact_req_conn_req ON contact_requests(connection_request_id);
