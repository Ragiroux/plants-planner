CREATE TABLE "varieties" (
	"id" serial PRIMARY KEY NOT NULL,
	"plant_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "varieties_plant_id_name_unique" UNIQUE("plant_id","name")
);
--> statement-breakpoint
ALTER TABLE "user_plants" ADD COLUMN "variety_id" integer;--> statement-breakpoint
ALTER TABLE "varieties" ADD CONSTRAINT "varieties_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_plants" ADD CONSTRAINT "user_plants_variety_id_varieties_id_fk" FOREIGN KEY ("variety_id") REFERENCES "public"."varieties"("id") ON DELETE set null ON UPDATE no action;