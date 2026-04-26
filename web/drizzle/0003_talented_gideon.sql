CREATE TABLE `FsAsset` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`thumbnail` text,
	`data` text DEFAULT '{}' NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `FsAsset_projectId_type_name_unique` ON `FsAsset` (`projectId`,`type`,`name`);