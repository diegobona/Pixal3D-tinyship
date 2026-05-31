CREATE TABLE "pixal3d_generation" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"input_image_url" text NOT NULL,
	"prompt" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"status" text NOT NULL,
	"provider_task_id" text NOT NULL,
	"credit_cost" integer DEFAULT 0 NOT NULL,
	"resolution" integer NOT NULL,
	"texture_size" integer NOT NULL,
	"consume_transaction_id" text,
	"refunded" boolean DEFAULT false NOT NULL,
	"result" jsonb,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "pixal3d_generation" ADD CONSTRAINT "pixal3d_generation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pixal3d_generation_user_created_idx" ON "pixal3d_generation" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "pixal3d_generation_provider_task_idx" ON "pixal3d_generation" USING btree ("provider_task_id");
