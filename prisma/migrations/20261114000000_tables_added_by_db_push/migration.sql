-- Tables and columns that production received through `prisma db push` but no migration ever created.
-- Without this file a new database built with `prisma migrate deploy` (new server, staging, CI) had no
-- tickets, ticket categories or quick replies, and the next migration failed.
-- Production deploys with `db push`, so this file changes nothing there. If production ever switches to
-- `migrate deploy`, mark the existing migrations as applied first (see prisma/README.md).

-- AlterTable
ALTER TABLE `chat_messages` ADD COLUMN `ticket_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `chat_threads` ADD COLUMN `crm_client_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `crm_api_token` TEXT NULL,
    ADD COLUMN `crm_base_url` TEXT NULL;

-- AlterTable
ALTER TABLE `whatsapp_channels` ADD COLUMN `auto_create_tickets` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `coex_history_months` INTEGER NULL,
    ADD COLUMN `coex_onboarded_at` DATETIME(3) NULL,
    ADD COLUMN `coex_sync` JSON NULL,
    ADD COLUMN `is_coexistence` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `tickets` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `channel_id` VARCHAR(191) NOT NULL,
    `thread_id` VARCHAR(191) NOT NULL,
    `ticket_number` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
    `priority` VARCHAR(191) NOT NULL DEFAULT 'NORMAL',
    `assigned_to_id` VARCHAR(191) NULL,
    `subject` TEXT NULL,
    `category_id` VARCHAR(191) NULL,
    `rating` INTEGER NULL,
    `summary` TEXT NULL,
    `crm_ticket_id` VARCHAR(191) NULL,
    `crm_client_id` VARCHAR(191) NULL,
    `crm_contact_id` VARCHAR(191) NULL,
    `resolved_at` DATETIME(3) NULL,
    `first_response_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tickets_tenant_id_fkey`(`tenant_id`),
    INDEX `tickets_thread_id_fkey`(`thread_id`),
    INDEX `tickets_assigned_to_id_fkey`(`assigned_to_id`),
    INDEX `tickets_category_id_fkey`(`category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_categories` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ticket_categories_tenant_id_fkey`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quick_replies` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `shortcut` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `quick_replies_tenant_id_fkey`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `chat_messages_ticket_id_fkey` ON `chat_messages`(`ticket_id`);

-- AddForeignKey
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_channel_id_fkey` FOREIGN KEY (`channel_id`) REFERENCES `whatsapp_channels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_assigned_to_id_fkey` FOREIGN KEY (`assigned_to_id`) REFERENCES `sub_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `ticket_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_categories` ADD CONSTRAINT `ticket_categories_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quick_replies` ADD CONSTRAINT `quick_replies_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

