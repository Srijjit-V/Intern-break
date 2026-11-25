CREATE TABLE `earn_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`account_id` varchar(36) NOT NULL,
	`room_code` varchar(64) NOT NULL,
	`kind` varchar(16) NOT NULL,
	`amount` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `earn_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `earn_log_account_kind_time` ON `earn_log` (`account_id`,`kind`,`created_at`);