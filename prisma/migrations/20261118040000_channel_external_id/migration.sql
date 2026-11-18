-- Instagram and Messenger channels: the Facebook Page id / Instagram account id that webhooks are routed by

-- AlterTable
ALTER TABLE `whatsapp_channels` ADD COLUMN `external_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `whatsapp_channels_provider_external_idx` ON `whatsapp_channels`(`provider_type`, `external_id`);
