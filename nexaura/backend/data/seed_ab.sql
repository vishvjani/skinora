-- A/B Tests
INSERT INTO ab_tests (id, name, description, variant_a, variant_b, start_date, end_date, is_active) VALUES
  (1, 'pricing_experiment_1', 'Test +10% price lift on skincare serums',
   'control', 'price_plus_10', NOW(), NOW() + INTERVAL '30 days', true),
  (2, 'checkout_flow_test', 'Single page vs multi-step checkout',
   'multi_step', 'single_page', NOW(), NOW() + INTERVAL '14 days', true),
  (3, 'recommendation_algo', 'Content-based vs trending recommendations on homepage',
   'content_based', 'trending', NOW(), NOW() + INTERVAL '21 days', true)
ON CONFLICT (id) DO NOTHING;
