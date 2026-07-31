-- CreateTable
CREATE TABLE `admins` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admins_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenants` (
    `custom_features` JSON NULL,
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `company_name` VARCHAR(191) NULL,
    `plan` ENUM('FREE', 'STARTER', 'ADVANCED', 'PRO', 'ENTERPRISE') NOT NULL DEFAULT 'FREE',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `whatsapp_phone` VARCHAR(191) NULL,
    `session_status` ENUM('DISCONNECTED', 'CONNECTING', 'CONNECTED') NOT NULL DEFAULT 'DISCONNECTED',
    `webhook_url` TEXT NULL,
    `webhook_events` JSON NULL,
    `wallet_balance` DOUBLE NOT NULL DEFAULT 0,
    `deduct_balance` BOOLEAN NOT NULL DEFAULT true,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'SAR',
    `monthly_limit` INTEGER NOT NULL DEFAULT 20,
    `meta_enabled` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tenants_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `whatsapp_channels` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `provider_type` VARCHAR(191) NOT NULL DEFAULT 'BAILEYS',
    `phone_number` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DISCONNECTED',
    `meta_phone_number_id` VARCHAR(191) NULL,
    `meta_waba_id` VARCHAR(191) NULL,
    `meta_access_token` TEXT NULL,
    `meta_app_secret` TEXT NULL,
    `name` VARCHAR(191) NULL DEFAULT '',
    `display_phone_number` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `whatsapp_channels_tenant_id_fkey`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_keys` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `key_hash` VARCHAR(191) NOT NULL,
    `key_prefix` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `api_keys_tenant_id_fkey`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_logs` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `channel_id` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NOT NULL,
    `message_type` ENUM('OTP', 'CUSTOM', 'INTERACTIVE') NOT NULL DEFAULT 'OTP',
    `status` ENUM('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED') NOT NULL DEFAULT 'QUEUED',
    `error_message` TEXT NULL,
    `meta_message_id` VARCHAR(200) NULL,
    `delivery_status` VARCHAR(191) NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `message_logs_tenant_id_fkey`(`tenant_id`),
    INDEX `message_logs_channel_id_fkey`(`channel_id`),
    INDEX `message_logs_meta_message_id_idx`(`meta_message_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usage_records` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `month` DATE NOT NULL,
    `messages_sent` INTEGER NOT NULL DEFAULT 0,
    `messages_failed` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `usage_records_tenant_id_month_key`(`tenant_id`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_templates` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `media_mime` VARCHAR(191) NULL,
    `media_path` VARCHAR(191) NULL,

    INDEX `message_templates_tenant_id_fkey`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaigns` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `channel_id` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `message` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `campaign_type` VARCHAR(191) NOT NULL DEFAULT 'BAILEYS',
    `meta_category` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `media_mime` VARCHAR(191) NULL,
    `media_path` VARCHAR(191) NULL,
    `template_id` VARCHAR(191) NULL,
    `buttons` TEXT NULL,
    `interactive_type` VARCHAR(191) NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `total_cost` DOUBLE NOT NULL DEFAULT 0,
    `total_messages` INTEGER NOT NULL DEFAULT 0,

    INDEX `campaigns_tenant_id_fkey`(`tenant_id`),
    INDEX `campaigns_channel_id_fkey`(`channel_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_targets` (
    `id` VARCHAR(191) NOT NULL,
    `campaign_id` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `error` TEXT NULL,
    `variables` TEXT NULL,

    INDEX `campaign_targets_campaign_id_fkey`(`campaign_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `button_interactions` (
    `id` VARCHAR(191) NOT NULL,
    `campaign_id` VARCHAR(191) NOT NULL,
    `campaign_target_id` VARCHAR(191) NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `button_id` VARCHAR(191) NOT NULL,
    `button_text` TEXT NOT NULL,
    `interaction_type` VARCHAR(191) NOT NULL DEFAULT 'BUTTON',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `button_interactions_campaign_id_fkey`(`campaign_id`),
    INDEX `button_interactions_campaign_target_id_fkey`(`campaign_target_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` VARCHAR(191) NOT NULL,
    `invoice_number` INTEGER NOT NULL AUTO_INCREMENT,
    `tenant_id` VARCHAR(191) NOT NULL,
    `amount` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'UNPAID',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `billing_cycle` VARCHAR(191) NOT NULL DEFAULT 'Monthly',
    `due_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `items` JSON NULL,
    `tax_rate` DOUBLE NULL DEFAULT 15.0,
    `tax_amount` VARCHAR(191) NULL,
    `buyer_details` JSON NULL,
    `seller_details` JSON NULL,

    UNIQUE INDEX `invoices_invoice_number_key`(`invoice_number`),
    INDEX `invoices_tenant_id_fkey`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auto_responders` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `keyword` TEXT NOT NULL,
    `match_type` VARCHAR(191) NOT NULL DEFAULT 'EXACT',
    `response_type` VARCHAR(191) NOT NULL DEFAULT 'TEXT',
    `message` TEXT NULL,
    `media_path` TEXT NULL,
    `media_url` TEXT NULL,
    `media_mime` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `location_address` VARCHAR(191) NULL,
    `location_name` VARCHAR(191) NULL,
    `end_date` DATETIME(3) NULL,
    `start_date` DATETIME(3) NULL,
    `campaign_id` VARCHAR(191) NULL,
    `channel_id` VARCHAR(191) NULL,
    `meta_template_name` VARCHAR(191) NULL,
    `meta_template_lang` VARCHAR(191) NULL DEFAULT 'ar',

    INDEX `auto_responders_tenant_id_fkey`(`tenant_id`),
    INDEX `auto_responders_campaign_id_fkey`(`campaign_id`),
    INDEX `auto_responders_channel_id_fkey`(`channel_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plan_settings` (
    `feature_flags` JSON NULL,
    `id` VARCHAR(191) NOT NULL,
    `plan_code` ENUM('FREE', 'STARTER', 'ADVANCED', 'PRO', 'ENTERPRISE') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `name_ar` VARCHAR(191) NULL,
    `name_en` VARCHAR(191) NULL,
    `price` DOUBLE NOT NULL,
    `limit` INTEGER NOT NULL,
    `features` TEXT NOT NULL,
    `features_ar` TEXT NULL,
    `features_en` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_popular` BOOLEAN NOT NULL DEFAULT false,
    `button_text_ar` VARCHAR(191) NULL,
    `button_text_en` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `plan_settings_plan_code_key`(`plan_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_threads` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `channel_id` VARCHAR(191) NOT NULL,
    `contact_phone` VARCHAR(191) NOT NULL,
    `contact_name` VARCHAR(191) NULL,
    `last_message_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `unread_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `chat_threads_tenant_id_fkey`(`tenant_id`),
    UNIQUE INDEX `chat_threads_tenant_id_channel_id_contact_phone_key`(`tenant_id`, `channel_id`, `contact_phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_messages` (
    `id` VARCHAR(191) NOT NULL,
    `thread_id` VARCHAR(191) NOT NULL,
    `direction` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'TEXT',
    `content` TEXT NULL,
    `has_media` BOOLEAN NOT NULL DEFAULT false,
    `media_url` TEXT NULL,
    `media_mime` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `meta_message_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chat_messages_thread_id_fkey`(`thread_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'GLOBAL',
    `data` JSON NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `whatsapp_channels` ADD CONSTRAINT `whatsapp_channels_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_logs` ADD CONSTRAINT `message_logs_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_logs` ADD CONSTRAINT `message_logs_channel_id_fkey` FOREIGN KEY (`channel_id`) REFERENCES `whatsapp_channels`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usage_records` ADD CONSTRAINT `usage_records_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_templates` ADD CONSTRAINT `message_templates_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_channel_id_fkey` FOREIGN KEY (`channel_id`) REFERENCES `whatsapp_channels`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_targets` ADD CONSTRAINT `campaign_targets_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `button_interactions` ADD CONSTRAINT `button_interactions_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `button_interactions` ADD CONSTRAINT `button_interactions_campaign_target_id_fkey` FOREIGN KEY (`campaign_target_id`) REFERENCES `campaign_targets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auto_responders` ADD CONSTRAINT `auto_responders_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auto_responders` ADD CONSTRAINT `auto_responders_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auto_responders` ADD CONSTRAINT `auto_responders_channel_id_fkey` FOREIGN KEY (`channel_id`) REFERENCES `whatsapp_channels`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_threads` ADD CONSTRAINT `chat_threads_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_threads` ADD CONSTRAINT `chat_threads_channel_id_fkey` FOREIGN KEY (`channel_id`) REFERENCES `whatsapp_channels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_thread_id_fkey` FOREIGN KEY (`thread_id`) REFERENCES `chat_threads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

