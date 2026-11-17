-- Team tasks (follow-ups with a due time and a person in charge)

-- CreateTable
CREATE TABLE `tasks` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `notes` TEXT NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'OPEN',
    `due_at` DATETIME(3) NULL,
    `assignee_id` VARCHAR(64) NULL,
    `created_by` VARCHAR(64) NOT NULL,
    `thread_id` VARCHAR(64) NULL,
    `contact_name` VARCHAR(191) NULL,
    `contact_phone` VARCHAR(32) NULL,
    `completed_at` DATETIME(3) NULL,
    `completed_by` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tasks_tenant_status_due_idx`(`tenant_id`, `status`, `due_at`),
    INDEX `tasks_tenant_assignee_idx`(`tenant_id`, `assignee_id`),
    INDEX `tasks_thread_id_idx`(`thread_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

