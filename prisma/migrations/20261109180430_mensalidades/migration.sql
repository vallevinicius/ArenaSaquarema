-- AlterTable
ALTER TABLE `users` ADD COLUMN `membershipPlanId` INTEGER NULL;

-- CreateTable
CREATE TABLE `membership_plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(60) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `chargeable` BOOLEAN NOT NULL DEFAULT true,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `membership_plans_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `membership_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `planId` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `method` ENUM('DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO') NOT NULL,
    `paidOn` DATE NOT NULL,
    `periodStart` DATE NOT NULL,
    `periodEnd` DATE NOT NULL,
    `note` VARCHAR(200) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdById` INTEGER NOT NULL,
    `voidedAt` DATETIME(3) NULL,
    `voidedById` INTEGER NULL,
    `voidReason` VARCHAR(200) NULL,

    INDEX `membership_payments_userId_periodEnd_idx`(`userId`, `periodEnd`),
    INDEX `membership_payments_paidOn_idx`(`paidOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `users_membershipPlanId_idx` ON `users`(`membershipPlanId`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_membershipPlanId_fkey` FOREIGN KEY (`membershipPlanId`) REFERENCES `membership_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `membership_payments` ADD CONSTRAINT `membership_payments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `membership_payments` ADD CONSTRAINT `membership_payments_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `membership_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `membership_payments` ADD CONSTRAINT `membership_payments_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `membership_payments` ADD CONSTRAINT `membership_payments_voidedById_fkey` FOREIGN KEY (`voidedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Planos iniciais (os dois do site + parceiros). Parceiros não são cobrados pela arena (chargeable = false).
INSERT INTO `membership_plans` (`name`, `price`, `chargeable`, `active`, `createdAt`, `updatedAt`) VALUES
  ('2x na semana', 130.00, true, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('5x na semana', 150.00, true, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('Wellhub', 0.00, false, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('TotalPass', 0.00, false, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
