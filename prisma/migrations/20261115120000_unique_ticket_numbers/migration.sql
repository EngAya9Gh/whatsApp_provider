-- Ticket numbers used to be "count of tickets + 1". Two tickets created at the same moment, or a ticket
-- created after others were deleted (removing a number deletes its tickets), got a number already in use.
-- 1) Every repeated number keeps its oldest ticket; the later ones get new numbers after the tenant's
--    highest number, in creation order. 2) The database then refuses repeated numbers.
-- Works on MySQL 5.7 and 8 (no window functions; helper tables because temporary tables cannot be
-- read twice in one query).

CREATE TABLE `_ticket_number_fix` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`),
    INDEX `_ticket_number_fix_order_idx` (`tenant_id`, `created_at`, `id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `_ticket_number_fix` (`id`, `tenant_id`, `created_at`)
SELECT t.`id`, t.`tenant_id`, t.`created_at`
FROM `tickets` t
WHERE EXISTS (
    SELECT 1 FROM `tickets` o
    WHERE o.`tenant_id` = t.`tenant_id`
      AND o.`ticket_number` = t.`ticket_number`
      AND (o.`created_at` < t.`created_at` OR (o.`created_at` = t.`created_at` AND o.`id` < t.`id`))
);

CREATE TABLE `_ticket_number_max` (
    `tenant_id` VARCHAR(191) NOT NULL,
    `max_no` INT UNSIGNED NOT NULL,
    PRIMARY KEY (`tenant_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `_ticket_number_max` (`tenant_id`, `max_no`)
SELECT `tenant_id`,
       MAX(CASE WHEN `ticket_number` REGEXP '^#TK-[0-9]{1,9}$' THEN CAST(SUBSTRING(`ticket_number`, 5) AS UNSIGNED) ELSE 0 END)
FROM `tickets`
WHERE `tenant_id` IN (SELECT DISTINCT `tenant_id` FROM `_ticket_number_fix`)
GROUP BY `tenant_id`;

-- Position of each ticket to renumber inside its tenant (1, 2, 3… in creation order)
CREATE TABLE `_ticket_number_rank` (
    `id` VARCHAR(191) NOT NULL,
    `seq` INT UNSIGNED NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `_ticket_number_rank` (`id`, `seq`)
SELECT a.`id`, COUNT(*)
FROM `_ticket_number_fix` a
JOIN `_ticket_number_fix` b
  ON b.`tenant_id` = a.`tenant_id`
 AND (b.`created_at` < a.`created_at` OR (b.`created_at` = a.`created_at` AND b.`id` <= a.`id`))
GROUP BY a.`id`;

UPDATE `tickets` t
JOIN `_ticket_number_fix` f ON f.`id` = t.`id`
JOIN `_ticket_number_rank` r ON r.`id` = t.`id`
JOIN `_ticket_number_max` m ON m.`tenant_id` = f.`tenant_id`
SET t.`ticket_number` = CONCAT('#TK-', LPAD(m.`max_no` + r.`seq`, GREATEST(4, LENGTH(m.`max_no` + r.`seq`)), '0'));

DROP TABLE `_ticket_number_rank`;
DROP TABLE `_ticket_number_max`;
DROP TABLE `_ticket_number_fix`;

-- CreateIndex
CREATE UNIQUE INDEX `tickets_tenant_id_ticket_number_key` ON `tickets`(`tenant_id`, `ticket_number`);

-- Each Meta number now has its own "open tickets" switch (Ticket settings page). Until now that switch
-- had no effect while the account-wide setting was on, so every Meta number keeps opening tickets.
ALTER TABLE `whatsapp_channels` ALTER COLUMN `auto_create_tickets` SET DEFAULT true;
UPDATE `whatsapp_channels` SET `auto_create_tickets` = true WHERE `provider_type` = 'META_CLOUD';
