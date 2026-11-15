ALTER TYPE "public"."transaction_type" ADD VALUE 'saving_deposit';--> statement-breakpoint
ALTER TYPE "public"."transaction_type" ADD VALUE 'saving_withdrawal';--> statement-breakpoint
CREATE TABLE "savings_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"color" text NOT NULL,
	"target_amount" bigint,
	"deadline" date,
	"initial_amount" bigint DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "savings_goals_amounts" CHECK (("savings_goals"."target_amount" is null or "savings_goals"."target_amount" > 0) and "savings_goals"."initial_amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_shape";--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "goal_id" uuid;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "savings_goals_user_id_idx" ON "savings_goals" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_goal_id_savings_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."savings_goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_goal_idx" ON "transactions" USING btree ("goal_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_shape" CHECK (("transactions"."type"::text = 'transfer' and "transactions"."to_account_id" is not null and "transactions"."category_id" is null and "transactions"."goal_id" is null and "transactions"."to_account_id" <> "transactions"."account_id")
        or ("transactions"."type"::text in ('income', 'expense') and "transactions"."to_account_id" is null and "transactions"."category_id" is not null and "transactions"."goal_id" is null)
        or ("transactions"."type"::text in ('saving_deposit', 'saving_withdrawal') and "transactions"."to_account_id" is null and "transactions"."category_id" is null and "transactions"."goal_id" is not null));