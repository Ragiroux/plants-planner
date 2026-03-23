CREATE TYPE "public"."climate_zone" AS ENUM('zone_3_4', 'zone_5_6');--> statement-breakpoint
CREATE TYPE "public"."companion_relationship" AS ENUM('beneficial', 'antagonistic');--> statement-breakpoint
CREATE TYPE "public"."step_type" AS ENUM('semis_interieur', 'semis_exterieur', 'repiquage', 'transplantation', 'entretien', 'arrosage', 'fertilisation', 'recolte');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companion_plants" (
	"id" serial PRIMARY KEY NOT NULL,
	"plant_a_id" integer NOT NULL,
	"plant_b_id" integer NOT NULL,
	"relationship" "companion_relationship" NOT NULL,
	"reason" text,
	CONSTRAINT "companion_plants_plant_a_id_plant_b_id_unique" UNIQUE("plant_a_id","plant_b_id"),
	CONSTRAINT "plant_a_lt_plant_b" CHECK ("companion_plants"."plant_a_id" < "companion_plants"."plant_b_id")
);
--> statement-breakpoint
CREATE TABLE "gardens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text DEFAULT 'Mon potager' NOT NULL,
	"length_m" real,
	"width_m" real,
	"layout_json" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"sent_at" timestamp NOT NULL,
	"status" text NOT NULL,
	"error_message" text,
	"message_preview" text
);
--> statement-breakpoint
CREATE TABLE "observations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"plant_id" integer,
	"garden_id" integer,
	"week_number" integer NOT NULL,
	"year" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plant_calendars" (
	"id" serial PRIMARY KEY NOT NULL,
	"plant_id" integer NOT NULL,
	"zone" "climate_zone" NOT NULL,
	"indoor_sow_start" integer,
	"indoor_sow_end" integer,
	"transplant_start" integer,
	"transplant_end" integer,
	"outdoor_sow_start" integer,
	"outdoor_sow_end" integer,
	"garden_transplant_start" integer,
	"garden_transplant_end" integer,
	"harvest_start" integer,
	"harvest_end" integer,
	"luminosity" text,
	"depth_mm" integer,
	"germination_temp_min" integer,
	"germination_temp_max" integer,
	"height_cm" integer,
	"days_to_maturity_min" integer,
	"days_to_maturity_max" integer,
	"sowing_method" text,
	CONSTRAINT "plant_calendars_plant_id_zone_unique" UNIQUE("plant_id","zone")
);
--> statement-breakpoint
CREATE TABLE "plant_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_plant_id" integer NOT NULL,
	"step_type" "step_type" NOT NULL,
	"completed_at" timestamp NOT NULL,
	"notes" text,
	"next_action_date" date
);
--> statement-breakpoint
CREATE TABLE "plants" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"spacing_cm" integer,
	"row_spacing_cm" integer,
	"soil_types" text[],
	"sun_exposure" text,
	"watering_freq" text,
	"frost_tolerance" text,
	"ideal_temp_min" integer,
	"ideal_temp_max" integer,
	"days_indoor_to_repiquage" integer,
	"days_repiquage_to_transplant" integer,
	"days_transplant_to_harvest" integer,
	CONSTRAINT "plants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_plants" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"garden_id" integer NOT NULL,
	"plant_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"planted_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_plants_user_id_plant_id_garden_id_unique" UNIQUE("user_id","plant_id","garden_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text,
	"image" text,
	"climate_zone" "climate_zone",
	"slack_webhook" text,
	"location_city" text,
	"location_lat" real,
	"location_lon" real,
	"soil_type" text,
	"unit_preference" text DEFAULT 'meters' NOT NULL,
	"emailVerified" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companion_plants" ADD CONSTRAINT "companion_plants_plant_a_id_plants_id_fk" FOREIGN KEY ("plant_a_id") REFERENCES "public"."plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companion_plants" ADD CONSTRAINT "companion_plants_plant_b_id_plants_id_fk" FOREIGN KEY ("plant_b_id") REFERENCES "public"."plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gardens" ADD CONSTRAINT "gardens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_garden_id_gardens_id_fk" FOREIGN KEY ("garden_id") REFERENCES "public"."gardens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_calendars" ADD CONSTRAINT "plant_calendars_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_steps" ADD CONSTRAINT "plant_steps_user_plant_id_user_plants_id_fk" FOREIGN KEY ("user_plant_id") REFERENCES "public"."user_plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_plants" ADD CONSTRAINT "user_plants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_plants" ADD CONSTRAINT "user_plants_garden_id_gardens_id_fk" FOREIGN KEY ("garden_id") REFERENCES "public"."gardens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_plants" ADD CONSTRAINT "user_plants_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "observations_user_plant_year_idx" ON "observations" USING btree ("user_id","plant_id","year");