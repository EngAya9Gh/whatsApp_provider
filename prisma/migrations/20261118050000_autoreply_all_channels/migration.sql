-- Keyword auto-replies that answer on every Live Chat channel (widget, Instagram, Messenger, other numbers)

-- AlterTable
ALTER TABLE `auto_responders` ADD COLUMN `all_channels` BOOLEAN NOT NULL DEFAULT false;
