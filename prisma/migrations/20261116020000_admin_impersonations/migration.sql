-- Admin "log in as customer" sessions and what was changed during them

-- CreateTable
CREATE TABLE `admin_impersonations` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `admin_email` VARCHAR(191) NOT NULL,
    `ip` VARCHAR(64) NULL,
    `user_agent` VARCHAR(255) NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,
    `ended_at` DATETIME(3) NULL,
    `actions` JSON NULL,

    INDEX `admin_impersonations_tenant_id_started_at_idx`(`tenant_id`, `started_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `admin_impersonations` ADD CONSTRAINT `admin_impersonations_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

