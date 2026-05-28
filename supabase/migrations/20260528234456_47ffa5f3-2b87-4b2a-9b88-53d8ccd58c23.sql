CREATE TABLE public.mer_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mer_key text,
  client_name text NOT NULL,
  client_type text,
  bookkeeper text,
  status text,
  bank_transactions text,
  uncategorized_transactions integer,
  transactions_without_payees integer,
  undeposited_funds numeric,
  unapplied_payments integer,
  statement_request_status text,
  last_reconciled_date text,
  prev_month_notes_approved boolean,
  financials_sent_to_client boolean,
  books_closed_in_qb boolean,
  month text,
  submitted_by text,
  action text,
  source text,
  timestamp timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mer_history TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mer_history TO authenticated;
GRANT ALL ON public.mer_history TO service_role;

CREATE INDEX idx_mer_history_client_name ON public.mer_history (client_name);
CREATE INDEX idx_mer_history_timestamp ON public.mer_history (timestamp DESC);