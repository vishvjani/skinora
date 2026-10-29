-- Coupons
INSERT INTO coupons (code, discount_type, discount_value, min_order_value, max_uses, is_active, expires_at) VALUES
  ('NEXAURA10', 'percent', 10, 499, 1000, true, '2027-12-31'),
  ('NEXAURA20', 'percent', 20, 999, 500, true, '2027-06-30'),
  ('FLAT100', 'flat', 100, 799, 200, true, '2026-12-31'),
  ('FLAT200', 'flat', 200, 1499, 100, true, '2026-12-31'),
  ('WELCOME15', 'percent', 15, 299, 5000, true, '2027-12-31'),
  ('BEAUTY30', 'percent', 30, 1999, 250, true, '2027-03-31'),
  ('SKINLOVE', 'percent', 25, 799, 300, true, '2027-06-30'),
  ('LIPS50', 'flat', 50, 199, 999, true, '2026-12-31');