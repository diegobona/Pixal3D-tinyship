CREATE TABLE "pain_point_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"pain_point" text NOT NULL,
	"selected_pain_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"other_text" text,
	"user_id" text,
	"user_email" text,
	"page_url" text,
	"referrer" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pain_point_feedback" ADD CONSTRAINT "pain_point_feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pain_point_feedback_created_idx" ON "pain_point_feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pain_point_feedback_pain_point_idx" ON "pain_point_feedback" USING btree ("pain_point");--> statement-breakpoint
CREATE INDEX "pain_point_feedback_user_idx" ON "pain_point_feedback" USING btree ("user_id");
