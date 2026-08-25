CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`first_name` text,
	`last_name` text,
	`mobile` text,
	`id_number` text,
	`dob` text,
	`identity_accepted_at` text,
	`risk_group` text,
	`monthly_income_cents` integer,
	`phone_id` integer,
	`consent_at` text,
	`cash_price_cents` integer,
	`deposit_bps` integer,
	`interest_bps` integer,
	`deposit_cents` integer,
	`principal_cents` integer,
	`loan_amount_cents` integer,
	`daily_cents` integer,
	`total_payable_cents` integer,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`phone_id`) REFERENCES `phones`(`phone_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `applications_id_number_submitted` ON `applications` (`id_number`) WHERE "applications"."status" = 'submitted';--> statement-breakpoint
CREATE INDEX `applications_status` ON `applications` (`status`);--> statement-breakpoint
CREATE TABLE `phone_pricing` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phone_id` integer NOT NULL,
	`risk_group` text NOT NULL,
	`deposit_bps` integer NOT NULL,
	`interest_bps` integer NOT NULL,
	FOREIGN KEY (`phone_id`) REFERENCES `phones`(`phone_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `phone_pricing_phone_group` ON `phone_pricing` (`phone_id`,`risk_group`);--> statement-breakpoint
CREATE TABLE `phones` (
	`phone_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sku` text NOT NULL,
	`brand` text NOT NULL,
	`model` text NOT NULL,
	`colour` text NOT NULL,
	`storage_gb` integer NOT NULL,
	`cash_price_cents` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `phones_sku_unique` ON `phones` (`sku`);