-- Ticket pick-up times: when a ticket was ready for a person, when it was first taken, and how

-- AlterTable
ALTER TABLE `tickets` ADD COLUMN `ready_at` DATETIME(3) NULL,
    ADD COLUMN `first_assigned_at` DATETIME(3) NULL,
    ADD COLUMN `assigned_via` VARCHAR(10) NULL;
