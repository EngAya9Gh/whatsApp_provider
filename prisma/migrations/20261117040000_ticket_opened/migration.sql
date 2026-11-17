-- First time a team member opened a ticket's conversation (opening time in the ticket reports)

-- AlterTable
ALTER TABLE `tickets` ADD COLUMN `first_opened_at` DATETIME(3) NULL,
    ADD COLUMN `first_opened_by_id` VARCHAR(191) NULL;
