-- kind: 'expense' (normal) or 'repayment' (created by Mark paid). Replaces
-- the client-side description heuristic so localization can't corrupt totals.
ALTER TABLE expenses ADD COLUMN kind TEXT NOT NULL DEFAULT 'expense';
-- category: one of 8 fixed client-defined ids (food, drinks, transport,
-- lodging, activities, groceries, shopping, other). Null = uncategorized.
ALTER TABLE expenses ADD COLUMN category TEXT;
