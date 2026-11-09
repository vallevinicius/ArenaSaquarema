-- AlterTable
ALTER TABLE `users` ADD COLUMN `profileId` INTEGER NULL;

-- CreateTable
CREATE TABLE `profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(60) NOT NULL,
    `description` VARCHAR(160) NULL,
    `permissions` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `profiles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `users_profileId_idx` ON `users`(`profileId`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Perfil padrão para quem já era OPERADOR: mantém o que o caixa fazia antes (comandas, clientes e day use).
INSERT INTO `profiles` (`name`, `description`, `permissions`, `createdAt`, `updatedAt`)
VALUES ('Operador', 'Caixa: comandas, clientes e day use', JSON_ARRAY('COMANDAS', 'CLIENTES', 'DAY_USE'), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

UPDATE `users` SET `profileId` = (SELECT `id` FROM `profiles` WHERE `name` = 'Operador') WHERE `role` = 'OPERADOR';
