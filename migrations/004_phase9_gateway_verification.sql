-- ============================================================================
-- Phase 9 Migration: Payment Gateway Verification, Idempotency & Audit Fields
-- Target Database: MySQL 8.x / MariaDB
-- Description:
--   1. Adds external payment gateway identifiers to `FinancialTransaction`.
--   2. Adds webhook event ID and verification audit fields for deduplication.
--   3. Adds index on gatewayPaymentId and webhookEventId for fast idempotency lookups.
-- Note: Review only. Do NOT run against production without staging verification.
-- ============================================================================

-- 1. Add gateway tracking and verification columns to FinancialTransaction
ALTER TABLE `FinancialTransaction`
  ADD COLUMN `gatewayName` VARCHAR(50) DEFAULT 'CLOVER',
  ADD COLUMN `gatewayPaymentId` VARCHAR(100) DEFAULT NULL,
  ADD COLUMN `gatewayStatus` VARCHAR(50) DEFAULT 'PENDING',
  ADD COLUMN `isVerified` TINYINT(1) DEFAULT 0,
  ADD COLUMN `webhookEventId` VARCHAR(100) DEFAULT NULL,
  ADD COLUMN `rawGatewayResponse` TEXT DEFAULT NULL;

-- 2. Add performance, audit, and deduplication indexes
ALTER TABLE `FinancialTransaction`
  ADD INDEX `idx_gateway_payment_id` (`gatewayPaymentId`),
  ADD INDEX `idx_gateway_webhook_id` (`webhookEventId`),
  ADD INDEX `idx_financial_category_period` (`category`, `period`);
