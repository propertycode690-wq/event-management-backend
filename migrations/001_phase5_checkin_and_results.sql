-- ============================================================================
-- Phase 5 Migration: Event Attendance, Entry Payment & Competition Results
-- Target Database: MySQL 8.x / MariaDB
-- Description:
--   1. Adds check-in status and timestamp columns to `EventEntry`.
--   2. Creates dedicated `CompetitionResult` table for official hunt standings.
-- Note: Review only. Do NOT run against production without staging verification.
-- ============================================================================

-- 1. Add checkInStatus and checkedInAt columns to EventEntry table
ALTER TABLE `EventEntry`
  ADD COLUMN `checkInStatus` VARCHAR(50) DEFAULT 'Not Arrived',
  ADD COLUMN `checkedInAt` DATETIME DEFAULT NULL;

-- 2. Create CompetitionResult table
CREATE TABLE IF NOT EXISTS `CompetitionResult` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `eventId` VARCHAR(191) DEFAULT NULL,
  `eventName` VARCHAR(191) NOT NULL,
  `club` VARCHAR(191) DEFAULT NULL,
  `state` VARCHAR(191) DEFAULT NULL,
  `stateCode` VARCHAR(10) DEFAULT NULL,
  `placement` VARCHAR(50) DEFAULT NULL,
  `place` INT DEFAULT 1,
  `winnerDog` VARCHAR(191) NOT NULL,
  `winnerDogReg` VARCHAR(191) DEFAULT NULL,
  `breed` VARCHAR(191) DEFAULT 'Coonhound',
  `owner` VARCHAR(191) DEFAULT NULL,
  `participant` VARCHAR(191) NOT NULL,
  `score` VARCHAR(50) DEFAULT '0 Pts',
  `date` VARCHAR(50) DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT 'Published',
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_results_event` (`eventId`),
  INDEX `idx_results_state` (`stateCode`),
  INDEX `idx_results_club` (`club`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
