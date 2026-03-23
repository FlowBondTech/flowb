-- Migration: Fix admin_points_overview view to include missing fields
-- Date: 2025-11-20
-- Description: Add id and other missing fields from point_actions table to admin_points_overview view
-- Note: Must DROP first because PostgreSQL won't allow column reordering with CREATE OR REPLACE

DROP VIEW IF EXISTS admin_points_overview;

CREATE VIEW admin_points_overview AS
SELECT
  pa.id,
  pa.action_key,
  pa.action_name,
  pa.description,
  pa.points_value,
  pa.category,
  pa.is_active,
  pa.requires_verification,
  pa.max_per_day,
  pa.max_per_week,
  pa.max_per_month,
  pa.created_at,
  pa.updated_at,
  COUNT(pt.id) as total_transactions,
  COUNT(DISTINCT pt.user_id) as unique_users,
  SUM(pt.points_amount) as total_points_awarded,
  AVG(pt.points_amount) as avg_points_per_transaction,
  MAX(pt.created_at) as last_awarded_at
FROM point_actions pa
LEFT JOIN point_transactions pt ON pa.action_key = pt.action_key
  AND pt.status = 'completed'
GROUP BY pa.id, pa.action_key, pa.action_name, pa.description, pa.points_value, pa.category,
         pa.is_active, pa.requires_verification, pa.max_per_day, pa.max_per_week, pa.max_per_month,
         pa.created_at, pa.updated_at;
