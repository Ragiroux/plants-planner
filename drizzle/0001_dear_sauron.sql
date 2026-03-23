ALTER TABLE "user_plants" DROP CONSTRAINT "user_plants_user_id_plant_id_garden_id_unique";--> statement-breakpoint
ALTER TABLE "user_plants" ADD COLUMN "repiquage_at" date;--> statement-breakpoint
ALTER TABLE "user_plants" ADD COLUMN "transplant_at" date;