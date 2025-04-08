-- CreateTable
CREATE TABLE `InviteCode` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `maxUses` INTEGER NOT NULL DEFAULT 10,
    `currentUses` INTEGER NOT NULL DEFAULT 0,
    `resetDate` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `isExpired` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InviteCode_code_key`(`code`),
    INDEX `InviteCode_code_idx`(`code`),
    INDEX `InviteCode_customerId_idx`(`customerId`),
    INDEX `InviteCode_expiresAt_idx`(`expiresAt`),
    INDEX `InviteCode_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `InviteCode` ADD CONSTRAINT `InviteCode_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
