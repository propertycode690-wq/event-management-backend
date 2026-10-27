-- ============================================================================
-- Phase 7 Migration: Order Fulfillment & Payout Status Persistence
-- Target Database: MySQL 8.x / MariaDB
-- Description:
--   1. Adds fulfillment tracking columns to `Order` (`fulfillmentStatus`, `trackingNumber`, `carrier`).
--   2. Adds payout tracking column to `Order` (`payoutStatus`).
--   3. Adds ownership/scoping columns to `Order` (`customerEmail`, `clubId`).
-- Note: Review only. Do NOT run against production without staging verification.
-- ============================================================================

-- 1. Add fulfillment, payout, and scoping columns to Order table
ALTER TABLE `Order`
  ADD COLUMN `customerEmail` VARCHAR(191) DEFAULT NULL,
  ADD COLUMN `fulfillmentStatus` VARCHAR(50) DEFAULT 'Processing',
  ADD COLUMN `trackingNumber` VARCHAR(191) DEFAULT 'Pending Dispatch',
  ADD COLUMN `carrier` VARCHAR(100) DEFAULT 'UPS Ground',
  ADD COLUMN `payoutStatus` VARCHAR(50) DEFAULT 'Pending',
  ADD COLUMN `clubId` VARCHAR(191) DEFAULT NULL;

-- 2. Add performance and scoping indexes to Order table
ALTER TABLE `Order`
  ADD INDEX `idx_order_customer_email` (`customerEmail`),
  ADD INDEX `idx_order_club` (`clubId`),
  ADD INDEX `idx_order_fulfillment` (`fulfillmentStatus`),
  ADD INDEX `idx_order_payout` (`payoutStatus`);
