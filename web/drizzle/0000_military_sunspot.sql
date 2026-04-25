CREATE TABLE `Character` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`name` text NOT NULL,
	`persona` text,
	`voiceName` text,
	`prompt` text,
	`imageUrl` text,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Character_projectId_name_unique` ON `Character` (`projectId`,`name`);--> statement-breakpoint
CREATE TABLE `Cover` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`ratio` text NOT NULL,
	`prompt` text,
	`imageUrl` text,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Cover_projectId_ratio_unique` ON `Cover` (`projectId`,`ratio`);--> statement-breakpoint
CREATE TABLE `InboxMessage` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`mediaType` text NOT NULL,
	`targetType` text NOT NULL,
	`referenceKeyword` text,
	`index` integer,
	`meta` text,
	`timestamp` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Project` (
	`id` text PRIMARY KEY NOT NULL,
	`projectName` text NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
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
CREATE TABLE `Scene` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`sceneIndex` integer NOT NULL,
	`speaker` text,
	`dialogue` text,
	`actionHint` text,
	`locationPrompt` text,
	`startLayoutPrompt` text,
	`endLayoutPrompt` text,
	`imagePrompt` text,
	`videoPrompt` text,
	`startImagePrompt` text,
	`locationImage` text,
	`imageAsset` text,
	`startImageAsset` text,
	`videoAsset` text,
	`audioAsset` text,
	`imageRef` text,
	`startImageRef` text,
	`charactersInScene` text,
	`duration` real,
	`videoTrimStart` real,
	`videoTrimEnd` real,
	`audioDelay` real,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Scene_projectId_sceneIndex_unique` ON `Scene` (`projectId`,`sceneIndex`);--> statement-breakpoint
CREATE TABLE `SystemState` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
