-- AlterTable
ALTER TABLE `campaign_targets` ADD COLUMN `queued_at` DATETIME(3) NULL,
    ADD COLUMN `sent_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `campaigns` ADD COLUMN `completed_at` DATETIME(3) NULL,
    ADD COLUMN `launched_at` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `campaign_targets_campaign_status_idx` ON `campaign_targets`(`campaign_id`, `status`);

-- CreateIndex
CREATE INDEX `campaigns_status_idx` ON `campaigns`(`status`);

