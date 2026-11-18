-- Settings of a channel kind (the website chat widget: title, colour, welcome message, allowed domains…)

-- AlterTable
ALTER TABLE `whatsapp_channels` ADD COLUMN `settings` JSON NULL;
