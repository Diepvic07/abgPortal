-- ============================================
-- Migration: 007_add_birth_year.sql
-- Add birth_year column to members table
-- ============================================

ALTER TABLE members ADD COLUMN IF NOT EXISTS birth_year TEXT;
