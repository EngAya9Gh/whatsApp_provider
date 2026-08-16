-- Migration: add_sub_users
-- Run this on the production database when prisma migrate is not available locally

-- Create sub_users table
CREATE TABLE IF NOT EXISTS `sub_users` (
  `id`            VARCHAR(191)  NOT NULL,
  `tenant_id`     VARCHAR(191)  NOT NULL,
  `channel_id`    VARCHAR(191)  NULL,
  `name`          VARCHAR(191)  NOT NULL,
  `email`         VARCHAR(191)  NOT NULL,
  `password_hash` VARCHAR(191)  NOT NULL,
  `role`          ENUM('ADMIN','MANAGER','AGENT') NOT NULL DEFAULT 'AGENT',
  `permissions`   JSON          NULL,
  `is_active`     BOOLEAN       NOT NULL DEFAULT true,
  `last_login_at` DATETIME(3)   NULL,
  `created_at`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`    DATETIME(3)   NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `sub_users_email_key` (`email`),
  INDEX `sub_users_tenant_id_fkey` (`tenant_id`),
  INDEX `sub_users_channel_id_fkey` (`channel_id`),

  CONSTRAINT `sub_users_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `sub_users_channel_id_fkey`
    FOREIGN KEY (`channel_id`) REFERENCES `whatsapp_channels` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
