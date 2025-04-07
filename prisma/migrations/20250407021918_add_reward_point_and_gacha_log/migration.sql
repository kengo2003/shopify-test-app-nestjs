/*
  Warnings:

  - You are about to drop the column `pointsBalance` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the `Transaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Transaction` DROP FOREIGN KEY `Transaction_customerId_fkey`;

-- AlterTable
ALTER TABLE `Customer` DROP COLUMN `pointsBalance`,
    ADD COLUMN `gachaPoints` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `rewardPoints` INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE `Transaction`;

-- CreateTable
CREATE TABLE `GachaPointTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `description` VARCHAR(191) NULL,
    `orderId` VARCHAR(191) NULL,
    `balanceAtTransaction` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GachaPointTransaction_customerId_idx`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RewardPointTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `description` VARCHAR(191) NULL,
    `gachaResultId` VARCHAR(191) NULL,
    `balanceAtTransaction` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RewardPointTransaction_customerId_idx`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GachaResult` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `gachaId` VARCHAR(191) NOT NULL,
    `cardId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('PENDING', 'REDEEM_SELECTED', 'SHIPPING_SELECTED', 'REDEEMED', 'FULFILLING', 'SHIPPED', 'DELIVERED', 'RETURNED', 'AUTO_REDEEMED') NOT NULL DEFAULT 'PENDING',
    `selectionDeadline` DATETIME(3) NOT NULL,
    `selectedAt` DATETIME(3) NULL,
    `redeemedAt` DATETIME(3) NULL,
    `shippedAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `rewardPointTransactionId` VARCHAR(191) NULL,
    `trackingNumber` VARCHAR(191) NULL,
    `shippingAddress` VARCHAR(191) NULL,

    INDEX `GachaResult_customerId_idx`(`customerId`),
    INDEX `GachaResult_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GachaPointTransaction` ADD CONSTRAINT `GachaPointTransaction_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RewardPointTransaction` ADD CONSTRAINT `RewardPointTransaction_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
