-- ============================================
-- Migration: 009_abg_classes.sql
-- Canonical ABG class list + normalization
-- ============================================

-- Create canonical class list table
CREATE TABLE abg_classes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_abg_classes_order ON abg_classes(display_order);
CREATE INDEX idx_abg_classes_active ON abg_classes(is_active);

-- Seed canonical classes (based on known ABG class names)
INSERT INTO abg_classes (name, display_order) VALUES
  ('Open 1', 10),
  ('Open 2', 20),
  ('Open 3', 30),
  ('Open 4', 40),
  ('Open 5', 50),
  ('Open 6', 60),
  ('Open 7', 70),
  ('Open 8', 80),
  ('Open 9', 90),
  ('Open Special', 95),
  ('Edu 1', 100),
  ('Edu 2', 110),
  ('Edu 3', 120),
  ('Edu 4', 130),
  ('Edu 5', 140),
  ('Edu Special', 145),
  ('Future Leaders 1', 200),
  ('Future Leaders 2', 210),
  ('Summer School 2022', 300),
  ('Summer School 2023', 310),
  ('ABG Team', 900),
  ('Admin', 910);

-- Normalize existing member abg_class values
-- Fix known duplicates/aliases
UPDATE members SET abg_class = 'Open 8' WHERE LOWER(TRIM(abg_class)) IN ('open8');
UPDATE members SET abg_class = 'Open 9' WHERE LOWER(TRIM(abg_class)) IN ('open 09', 'open09');
UPDATE members SET abg_class = 'Edu 1' WHERE LOWER(TRIM(abg_class)) IN ('abg edu 1');
UPDATE members SET abg_class = 'Future Leaders 1' WHERE LOWER(TRIM(abg_class)) IN ('future leaders 01');
UPDATE members SET abg_class = 'Khóa 1-5' WHERE LOWER(TRIM(abg_class)) IN ('khóa 1-5', 'khoa 1-5');

-- Add Khóa 1-5 to canonical list
INSERT INTO abg_classes (name, display_order) VALUES ('Khóa 1-5', 5)
ON CONFLICT (name) DO NOTHING;
