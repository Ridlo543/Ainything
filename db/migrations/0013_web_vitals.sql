-- Web Vitals performance events table.
-- Stores Core Web Vitals (LCP, FID, INP, CLS, TTFB) reported from the browser.
-- Scoped by restaurant_id (nullable — platform pages have no restaurant context).
-- Retention policy: delete rows older than 90 days via a periodic job or manual purge.

CREATE TABLE IF NOT EXISTS web_vitals (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
	name text NOT NULL CHECK (name IN ('LCP', 'FID', 'INP', 'CLS', 'TTFB')),
	value numeric(12, 4) NOT NULL,
	rating text NOT NULL CHECK (rating IN ('good', 'needs-improvement', 'poor')),
	path text NOT NULL DEFAULT '',
	reported_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS web_vitals_restaurant_id_idx
	ON web_vitals (restaurant_id)
	WHERE restaurant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS web_vitals_reported_at_idx
	ON web_vitals (reported_at DESC);

CREATE INDEX IF NOT EXISTS web_vitals_name_rating_idx
	ON web_vitals (name, rating);

-- lingua_app INSERT permission (SELECT is not needed for this write-only endpoint).
GRANT INSERT ON web_vitals TO lingua_app;
GRANT SELECT ON web_vitals TO lingua_app;
