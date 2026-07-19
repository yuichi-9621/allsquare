-- Optional per-member payment destination (Venmo handle, PayPal.Me link,
-- $cashtag, any URL, or plain text like a phone number). Free text; the web
-- client decides how to render it on settle rows.
ALTER TABLE members ADD COLUMN payment_handle TEXT;
