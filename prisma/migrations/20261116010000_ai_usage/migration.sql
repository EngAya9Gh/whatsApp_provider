-- Gemini usage per request (tokens), for per-account AI usage and the shared GEMINI_API_KEY

-- CreateTable
CREATE TABLE `ai_usage` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `feature` VARCHAR(40) NOT NULL,
    `model` VARCHAR(80) NOT NULL,
    `shared_key` BOOLEAN NOT NULL DEFAULT false,
    `input_tokens` INTEGER NOT NULL DEFAULT 0,
    `output_tokens` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_usage_tenant_id_created_at_idx`(`tenant_id`, `created_at`),
    INDEX `ai_usage_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_usage` ADD CONSTRAINT `ai_usage_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

