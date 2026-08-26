ALTER TABLE `applications` ADD `session_token_hash` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `public_reference` text;--> statement-breakpoint
CREATE UNIQUE INDEX `applications_public_reference` ON `applications` (`public_reference`);