CREATE TYPE "public"."sowing_type" AS ENUM('indoor', 'outdoor');--> statement-breakpoint
ALTER TABLE "plants" ADD COLUMN "default_indoor_to_transplant" integer;--> statement-breakpoint
ALTER TABLE "user_plants" ADD COLUMN "sowing_type" "sowing_type";