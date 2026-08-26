CREATE TABLE `risk_group_rates` (
	`risk_group` text PRIMARY KEY NOT NULL,
	`deposit_bps` integer NOT NULL,
	`interest_bps` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `risk_group_rates` (`risk_group`, `deposit_bps`, `interest_bps`)
SELECT `risk_group`, `deposit_bps`, `interest_bps`
FROM `phone_pricing`
GROUP BY `risk_group`;
--> statement-breakpoint
DROP TABLE `phone_pricing`;
