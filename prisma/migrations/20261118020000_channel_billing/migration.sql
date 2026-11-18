-- One wallet, spend per channel: the channel of each wallet movement, and the monthly fee state of channels
-- sold per channel (website widget, Instagram, Messenger)

-- AlterTable
ALTER TABLE `wallet_transactions` ADD COLUMN `channel_kind` VARCHAR(20) NULL,
    ADD COLUMN `channel_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `whatsapp_channels` ADD COLUMN `paid_until` DATETIME(3) NULL,
    ADD COLUMN `billing_state` VARCHAR(12) NULL;
