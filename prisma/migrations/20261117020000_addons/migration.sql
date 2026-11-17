-- Plan limits for team members and numbers (null = no limit), and add-on purchases

-- AlterTable
ALTER TABLE `plan_settings` ADD COLUMN `max_numbers` INTEGER NULL,
    ADD COLUMN `max_users` INTEGER NULL;

-- CreateTable
CREATE TABLE `addon_purchases` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(10) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unit_price` DOUBLE NOT NULL,
    `invoice_id` VARCHAR(191) NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'PENDING',
    `activated_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `addon_purchases_invoice_id_key`(`invoice_id`),
    INDEX `addon_purchases_tenant_status_idx`(`tenant_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `addon_purchases` ADD CONSTRAINT `addon_purchases_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

