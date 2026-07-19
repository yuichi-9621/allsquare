-- Receipt line items as JSON: [{ name, amountMinor, memberIds[] }].
-- Display/editing data only; settlement stays driven by expense_shares.
ALTER TABLE expenses ADD COLUMN items TEXT;
