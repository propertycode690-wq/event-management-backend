-- ============================================================================
-- Phase 6 Migration: Club Claims Relationships & Audit Trail
-- Target Database: MySQL 8.x / MariaDB
-- Description:
--   1. Adds relational identifiers to `ClubClaim` (`userId`, `clubId`).
--   2. Adds audit fields for administrative review (`reviewedBy`, `reviewedAt`).
--   3. Proposes unique constraint / index for active pending claims.
-- Note: Review only. Do NOT run against production without staging verification.
-- ============================================================================

-- 1. Add relationship columns and review audit trail to ClubClaim table
ALTER TABLE `ClubClaim`
  ADD COLUMN `userId` VARCHAR(191) DEFAULT NULL,
  ADD COLUMN `clubId` VARCHAR(191) DEFAULT NULL,
  ADD COLUMN `reviewedBy` VARCHAR(191) DEFAULT NULL,
  ADD COLUMN `reviewedAt` DATETIME DEFAULT NULL;

-- 2. Add foreign key index support for ClubClaim
ALTER TABLE `ClubClaim`
  ADD INDEX `idx_clubclaim_user` (`userId`),
  ADD INDEX `idx_clubclaim_club` (`clubId`),
  ADD INDEX `idx_clubclaim_status` (`claimStatus`);
