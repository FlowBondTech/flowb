-- Dev-themed dance move challenges for ETHDenver
INSERT INTO challenges (title, description, challenge_type, difficulty, category, target_value, target_unit, xp_reward, points_reward, is_active, is_repeatable, starts_at, ends_at) VALUES
  ('The Git Push', 'Push it forward with both hands out at a DANZ event. Photo proof required.', 'EVENT', 'EASY', 'COMMUNITY', 1, 'proofs', 100, 25, true, true, '2026-02-23T00:00:00Z', '2026-03-02T23:59:59Z'),
  ('Merge Conflict', 'Sync your moves with a partner - try to match each other. Photo proof of duo required.', 'EVENT', 'MEDIUM', 'SOCIAL', 1, 'proofs', 200, 50, true, true, '2026-02-23T00:00:00Z', '2026-03-02T23:59:59Z'),
  ('Deploy to Prod', 'Victory celebration dance when something goes right! Capture the moment.', 'EVENT', 'EASY', 'COMMUNITY', 1, 'proofs', 100, 25, true, true, '2026-02-23T00:00:00Z', '2026-03-02T23:59:59Z'),
  ('Hotfix', 'Quick spin move - no time to think, just do it! Video or photo proof.', 'EVENT', 'HARD', 'MASTERY', 1, 'proofs', 300, 75, true, true, '2026-02-23T00:00:00Z', '2026-03-02T23:59:59Z'),
  ('404 Not Found', 'Freeze! Hold an unexpected pose for 5 seconds. Photo of the freeze.', 'EVENT', 'MEDIUM', 'COMMUNITY', 1, 'proofs', 200, 50, true, true, '2026-02-23T00:00:00Z', '2026-03-02T23:59:59Z'),
  ('Stack Overflow', 'Tower move - build from the floor up, getting higher with each beat.', 'EVENT', 'HARD', 'MASTERY', 1, 'proofs', 300, 75, true, true, '2026-02-23T00:00:00Z', '2026-03-02T23:59:59Z'),
  ('Rebase & Chill', 'Smooth rolling wave motion from head to toe. Chill vibes only.', 'EVENT', 'MEDIUM', 'MASTERY', 1, 'proofs', 200, 50, true, true, '2026-02-23T00:00:00Z', '2026-03-02T23:59:59Z'),
  ('The Fork Bomb', 'Rapid-fire moves that multiply! Start small, go explosive.', 'EVENT', 'EXTREME', 'MASTERY', 1, 'proofs', 500, 100, true, false, '2026-02-23T00:00:00Z', '2026-03-02T23:59:59Z'),
  ('ETHDenver Check-in Champion', 'Check in to 3 different ETHDenver events.', 'EVENT', 'MEDIUM', 'EXPLORATION', 3, 'checkins', 250, 50, true, false, '2026-02-23T00:00:00Z', '2026-03-02T23:59:59Z'),
  ('Dance Floor Legend', 'Submit dance proofs at 5 different events.', 'SPECIAL', 'HARD', 'MASTERY', 5, 'proofs', 1000, 200, true, false, '2026-02-23T00:00:00Z', '2026-03-02T23:59:59Z');
