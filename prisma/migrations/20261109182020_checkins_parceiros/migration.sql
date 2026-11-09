-- CreateTable
CREATE TABLE `partner_check_ins` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `platform` ENUM('WELLHUB', 'TOTALPASS') NOT NULL,
    `externalId` VARCHAR(255) NULL,
    `personName` VARCHAR(120) NOT NULL,
    `personCode` VARCHAR(60) NULL,
    `checkedInAt` DATETIME(3) NOT NULL,
    `day` DATE NOT NULL,
    `status` ENUM('PENDENTE', 'VALIDADO', 'EXPIRADO') NOT NULL DEFAULT 'VALIDADO',
    `source` ENUM('MANUAL', 'API') NOT NULL,
    `validationToken` VARCHAR(255) NULL,
    `validatedAt` DATETIME(3) NULL,
    `note` VARCHAR(200) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdById` INTEGER NULL,

    INDEX `partner_check_ins_day_platform_idx`(`day`, `platform`),
    UNIQUE INDEX `partner_check_ins_platform_externalId_key`(`platform`, `externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `partner_check_ins` ADD CONSTRAINT `partner_check_ins_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
