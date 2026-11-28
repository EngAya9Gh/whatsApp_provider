-- Indexes for the paths every incoming message takes:
-- a customer's reply is matched to the campaign that messaged them by phone (meta.webhook.worker.js),
-- and every Meta webhook finds its WhatsApp number by phone_number_id (meta.controller.js)

-- CreateIndex
CREATE INDEX `campaign_targets_phone_idx` ON `campaign_targets`(`phone`);

-- CreateIndex
CREATE INDEX `whatsapp_channels_meta_phone_number_id_idx` ON `whatsapp_channels`(`meta_phone_number_id`);
