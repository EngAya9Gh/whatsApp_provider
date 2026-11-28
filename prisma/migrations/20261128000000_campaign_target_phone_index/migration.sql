-- A customer's reply is matched to the campaign that messaged them by phone (meta.webhook.worker.js)

-- CreateIndex
CREATE INDEX `campaign_targets_phone_idx` ON `campaign_targets`(`phone`);
