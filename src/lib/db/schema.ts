import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  integer,
  serial,
  real,
  date,
  index,
  unique,
  check,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const climateZoneEnum = pgEnum("climate_zone", ["zone_3_4", "zone_5_6"]);

export const companionRelationshipEnum = pgEnum("companion_relationship", [
  "beneficial",
  "antagonistic",
]);

export const sowingTypeEnum = pgEnum("sowing_type", ["indoor", "outdoor"]);

export const stepTypeEnum = pgEnum("step_type", [
  "semis_interieur",
  "semis_exterieur",
  "repiquage",
  "transplantation",
  "entretien",
  "arrosage",
  "fertilisation",
  "recolte",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").unique(),
  image: text("image"),
  climate_zone: climateZoneEnum("climate_zone"),
  slack_webhook: text("slack_webhook"),
  location_city: text("location_city"),
  location_lat: real("location_lat"),
  location_lon: real("location_lon"),
  soil_type: text("soil_type"),
  unit_preference: text("unit_preference").default("meters").notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey().notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })]
);

export const gardens = pgTable("gardens", {
  id: serial("id").primaryKey(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").default("Mon potager").notNull(),
  length_m: real("length_m"),
  width_m: real("width_m"),
  layout_json: text("layout_json"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const plants = pgTable("plants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  spacing_cm: integer("spacing_cm"),
  row_spacing_cm: integer("row_spacing_cm"),
  soil_types: text("soil_types").array(),
  sun_exposure: text("sun_exposure"),
  watering_freq: text("watering_freq"),
  frost_tolerance: text("frost_tolerance"),
  ideal_temp_min: integer("ideal_temp_min"),
  ideal_temp_max: integer("ideal_temp_max"),
  days_indoor_to_repiquage: integer("days_indoor_to_repiquage"),
  days_repiquage_to_transplant: integer("days_repiquage_to_transplant"),
  days_transplant_to_harvest: integer("days_transplant_to_harvest"),
  default_indoor_to_transplant: integer("default_indoor_to_transplant"),
});

export const plant_calendars = pgTable(
  "plant_calendars",
  {
    id: serial("id").primaryKey(),
    plant_id: integer("plant_id")
      .notNull()
      .references(() => plants.id, { onDelete: "cascade" }),
    zone: climateZoneEnum("zone").notNull(),
    indoor_sow_start: integer("indoor_sow_start"),
    indoor_sow_end: integer("indoor_sow_end"),
    transplant_start: integer("transplant_start"),
    transplant_end: integer("transplant_end"),
    outdoor_sow_start: integer("outdoor_sow_start"),
    outdoor_sow_end: integer("outdoor_sow_end"),
    garden_transplant_start: integer("garden_transplant_start"),
    garden_transplant_end: integer("garden_transplant_end"),
    harvest_start: integer("harvest_start"),
    harvest_end: integer("harvest_end"),
    luminosity: text("luminosity"),
    depth_mm: integer("depth_mm"),
    germination_temp_min: integer("germination_temp_min"),
    germination_temp_max: integer("germination_temp_max"),
    height_cm: integer("height_cm"),
    days_to_maturity_min: integer("days_to_maturity_min"),
    days_to_maturity_max: integer("days_to_maturity_max"),
    sowing_method: text("sowing_method"),
  },
  (table) => [unique().on(table.plant_id, table.zone)]
);

export const companion_plants = pgTable(
  "companion_plants",
  {
    id: serial("id").primaryKey(),
    plant_a_id: integer("plant_a_id")
      .notNull()
      .references(() => plants.id, { onDelete: "cascade" }),
    plant_b_id: integer("plant_b_id")
      .notNull()
      .references(() => plants.id, { onDelete: "cascade" }),
    relationship: companionRelationshipEnum("relationship").notNull(),
    reason: text("reason"),
  },
  (table) => [
    unique().on(table.plant_a_id, table.plant_b_id),
    check("plant_a_lt_plant_b", sql`${table.plant_a_id} < ${table.plant_b_id}`),
  ]
);

export const user_plants = pgTable(
  "user_plants",
  {
    id: serial("id").primaryKey(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    garden_id: integer("garden_id")
      .notNull()
      .references(() => gardens.id, { onDelete: "cascade" }),
    plant_id: integer("plant_id")
      .notNull()
      .references(() => plants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").default(1).notNull(),
    planted_date: date("planted_date"),
    sowing_type: sowingTypeEnum("sowing_type"),
    repiquage_at: date("repiquage_at"),
    transplant_at: date("transplant_at"),
    notes: text("notes"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  }
);

export const plant_steps = pgTable("plant_steps", {
  id: serial("id").primaryKey(),
  user_plant_id: integer("user_plant_id")
    .notNull()
    .references(() => user_plants.id, { onDelete: "cascade" }),
  step_type: stepTypeEnum("step_type").notNull(),
  completed_at: timestamp("completed_at").notNull(),
  notes: text("notes"),
  next_action_date: date("next_action_date"),
});

export const observations = pgTable(
  "observations",
  {
    id: serial("id").primaryKey(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plant_id: integer("plant_id").references(() => plants.id, {
      onDelete: "set null",
    }),
    garden_id: integer("garden_id").references(() => gardens.id, {
      onDelete: "set null",
    }),
    week_number: integer("week_number").notNull(),
    year: integer("year").notNull(),
    content: text("content").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("observations_user_plant_year_idx").on(
      table.user_id,
      table.plant_id,
      table.year
    ),
  ]
);

export const notification_logs = pgTable("notification_logs", {
  id: serial("id").primaryKey(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sent_at: timestamp("sent_at").notNull(),
  status: text("status").notNull(),
  error_message: text("error_message"),
  message_preview: text("message_preview"),
});

export const chat_messages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});
