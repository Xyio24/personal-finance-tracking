CREATE TYPE "public"."debt_direction" AS ENUM('payable', 'receivable');--> statement-breakpoint
ALTER TYPE "public"."transaction_type" ADD VALUE 'debt_borrow';--> statement-breakpoint
ALTER TYPE "public"."transaction_type" ADD VALUE 'debt_lend';--> statement-breakpoint
ALTER TYPE "public"."transaction_type" ADD VALUE 'debt_repay';--> statement-breakpoint
ALTER TYPE "public"."transaction_type" ADD VALUE 'debt_collect';--> statement-breakpoint
CREATE TABLE "debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"direction" "debt_direction" NOT NULL,
	"person" text NOT NULL,
	"amount" bigint NOT NULL,
	"date" date NOT NULL,
	"due_date" date,
	"note" text,
	"written_off_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "debts_amount_positive" CHECK ("debts"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_shape";--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "debt_id" uuid;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "debts_user_id_idx" ON "debts" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_debt_idx" ON "transactions" USING btree ("debt_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_shape" CHECK (("transactions"."type"::text = 'transfer' and "transactions"."to_account_id" is not null and "transactions"."category_id" is null and "transactions"."goal_id" is null and "transactions"."debt_id" is null and "transactions"."to_account_id" <> "transactions"."account_id")
        or ("transactions"."type"::text in ('income', 'expense') and "transactions"."category_id" is not null and "transactions"."to_account_id" is null and "transactions"."goal_id" is null and "transactions"."debt_id" is null)
        or ("transactions"."type"::text in ('saving_deposit', 'saving_withdrawal') and "transactions"."goal_id" is not null and "transactions"."to_account_id" is null and "transactions"."category_id" is null and "transactions"."debt_id" is null)
        or ("transactions"."type"::text in ('debt_borrow', 'debt_lend', 'debt_repay', 'debt_collect') and "transactions"."debt_id" is not null and "transactions"."to_account_id" is null and "transactions"."category_id" is null and "transactions"."goal_id" is null));