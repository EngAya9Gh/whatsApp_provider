-- TikTok channels: the access token lasts one day and is renewed with the refresh token (one year)

-- AlterTable
ALTER TABLE `whatsapp_channels` ADD COLUMN `refresh_token` TEXT NULL,
    ADD COLUMN `token_expires_at` DATETIME(3) NULL;
