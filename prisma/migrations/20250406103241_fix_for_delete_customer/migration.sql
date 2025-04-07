/*
  Warnings:

  - Added the required column `balanceAtTransaction` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Customer` ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Transaction` ADD COLUMN `balanceAtTransaction` INTEGER NOT NULL,
    ADD COLUMN `orderId` VARCHAR(191) NULL;
