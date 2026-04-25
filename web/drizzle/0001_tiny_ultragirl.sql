PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_InboxMessage` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`mediaType` text NOT NULL,
	`targetType` text NOT NULL,
	`referenceKeyword` text,
	`index` integer,
	`meta` text,
	`timestamp` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_InboxMessage`("id", "url", "mediaType", "targetType", "referenceKeyword", "index", "meta", "timestamp") SELECT "id", "url", "mediaType", "targetType", "referenceKeyword", "index", "meta", "timestamp" FROM `InboxMessage`;--> statement-breakpoint
DROP TABLE `InboxMessage`;--> statement-breakpoint
ALTER TABLE `__new_InboxMessage` RENAME TO `InboxMessage`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_Project` (
	`id` text PRIMARY KEY NOT NULL,
	`projectName` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`currentPhase` integer DEFAULT 1 NOT NULL,
	`artStyle` text,
	`flowUrl` text,
	`theme` text,
	`aiProvider` text,
	`useHitlMode` integer DEFAULT true NOT NULL,
	`writerStep` integer DEFAULT 1 NOT NULL,
	`creativeMode` text,
	`rawScript` text,
	`scriptIteration` integer DEFAULT 0 NOT NULL,
	`userDirection` text,
	`publishInfo` text,
	`inspirations` text,
	`scriptReview` text,
	`locationPrompt` text,
	`locationImage` text,
	`activeSceneIndex` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_Project`("id", "projectName", "createdAt", "updatedAt", "currentPhase", "artStyle", "flowUrl", "theme", "aiProvider", "useHitlMode", "writerStep", "creativeMode", "rawScript", "scriptIteration", "userDirection", "publishInfo", "inspirations", "scriptReview", "locationPrompt", "locationImage", "activeSceneIndex") SELECT "id", "projectName", "createdAt", "updatedAt", "currentPhase", "artStyle", "flowUrl", "theme", "aiProvider", "useHitlMode", "writerStep", "creativeMode", "rawScript", "scriptIteration", "userDirection", "publishInfo", "inspirations", "scriptReview", "locationPrompt", "locationImage", "activeSceneIndex" FROM `Project`;--> statement-breakpoint
DROP TABLE `Project`;--> statement-breakpoint
ALTER TABLE `__new_Project` RENAME TO `Project`;