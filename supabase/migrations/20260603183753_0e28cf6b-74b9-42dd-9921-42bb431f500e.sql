CREATE TABLE public.bookkeeper_performance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  bookkeeper text NOT NULL,
  total_clients int NOT NULL DEFAULT 0,
  compliant int NOT NULL DEFAULT 0,
  non_compliant int NOT NULL DEFAULT 0,
  on_hold int NOT NULL DEFAULT 0,
  pending_mer int NOT NULL DEFAULT 0,
  avg_completion_pct numeric NOT NULL DEFAULT 0,
  outstanding_statements int NOT NULL DEFAULT 0,
  uncategorized_total int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, bookkeeper)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookkeeper_performance TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookkeeper_performance TO authenticated;
GRANT ALL ON public.bookkeeper_performance TO service_role;

ALTER TABLE public.bookkeeper_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read bookkeeper performance"
  ON public.bookkeeper_performance FOR SELECT
  USING (true);

CREATE POLICY "anyone can insert bookkeeper performance"
  ON public.bookkeeper_performance FOR INSERT
  WITH CHECK (true);

CREATE POLICY "anyone can update bookkeeper performance"
  ON public.bookkeeper_performance FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE INDEX idx_bookkeeper_performance_bk_date
  ON public.bookkeeper_performance (bookkeeper, date DESC);