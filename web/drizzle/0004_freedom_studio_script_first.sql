DROP TABLE IF EXISTS `FsAsset`;
--> statement-breakpoint
DROP INDEX IF EXISTS `FsAsset_projectId_type_name_unique`;
--> statement-breakpoint
CREATE TABLE `FsScript` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`synopsis` text DEFAULT '' NOT NULL,
	`genre` text DEFAULT '' NOT NULL,
	`episodeCount` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `FsAsset` (
	`id` text PRIMARY KEY NOT NULL,
	`scriptId` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`thumbnail` text,
	`data` text DEFAULT '{}' NOT NULL,
	`source` text DEFAULT 'ai_extracted' NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `FsAsset_scriptId_type_name_unique` ON `FsAsset` (`scriptId`,`type`,`name`);
