CREATE TABLE "space_monitor" (
	"model_id" text PRIMARY KEY NOT NULL,
	"active_target" jsonb NOT NULL,
	"previous_target" jsonb,
	"last_checked_at" timestamp with time zone,
	"next_check_at" timestamp with time zone NOT NULL,
	"last_result" jsonb,
	"history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lease_token" text,
	"lease_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "space_monitor_model_id_check" CHECK ("model_id" in ('pixal3d', 'trellis', 'hunyuan3d')),
	CONSTRAINT "space_monitor_history_check" CHECK (jsonb_typeof("history") = 'array'),
	CONSTRAINT "space_monitor_lease_check" CHECK (("lease_token" is null) = ("lease_until" is null))
);
