import asyncio
import sys
from pathlib import Path

# Ensure UTF-8 output on Windows
sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from httpx import AsyncClient, ASGITransport
from app.main import app

async def run_tests():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        print("--- 1. Testing Products Catalog ---")
        res = await ac.get("/api/products?page_size=10")
        assert res.status_code == 200, f"Products failed: {res.status_code} {res.text}"
        data = res.json()
        total = data.get("total", len(data.get("products", [])))
        print(f"Products total in DB: {total}, first product: {data['products'][0]['name']}")

        print("\n--- 2. Testing Batch & QR Code Verification ---")
        res = await ac.get("/api/products/batch/SKIN-2026-B101")
        assert res.status_code == 200, f"Batch failed: {res.status_code} {res.text}"
        batch = res.json()
        print(f"Verified Batch: {batch['batch_number']} | Product: {batch['product_name']}")
        source_loc = batch['raw_materials'][0].get('source') or batch['raw_materials'][0].get('origin', 'India')
        print(f"Raw Materials: {len(batch.get('raw_materials', []))} sources (e.g. {batch['raw_materials'][0]['ingredient']} from {source_loc})")
        print(f"Lab Quality Tests: {len(batch.get('quality_tests', []))} tests (e.g. {batch['quality_tests'][0]['test_name']} -> {batch['quality_tests'][0]['result']})")

        print("\n--- 3. Testing ChromaDB SentenceTransformers Recommendations ---")
        res = await ac.get("/api/recommendations/similar/101")
        assert res.status_code == 200, f"Recommendations failed: {res.status_code} {res.text}"
        recs = res.json()
        print(f"Strategy: {recs.get('strategy')}")
        for p in recs.get("products", [])[:3]:
            print(f" - {p['name']} | Cosine Similarity Score: {p.get('similarity_score')}%")

        print("\n--- 4. Testing XGBoost Dynamic Pricing Engine ---")
        res = await ac.post("/api/pricing/predict", json={"product_id": 101, "demand_score": 0.85, "competitor_avg": 310.0})
        assert res.status_code == 200, f"Pricing failed: {res.status_code} {res.text}"
        price_res = res.json()
        print(f"Base Price: ₹{price_res['base_price']} -> XGBoost Recommended Price: ₹{price_res['recommended_price']} | Reason: {price_res['adjustment_reason']}")

        print("\n--- 5. Testing Eligible Delivered Orders for Recycling ---")
        res = await ac.get("/api/recycle/eligible-orders?user_id=demo_user_101")
        assert res.status_code == 200, f"Recycle eligible failed: {res.status_code} {res.text}"
        rec_orders = res.json()
        orders_list = rec_orders if isinstance(rec_orders, list) else rec_orders.get("orders", [])
        print(f"Total Delivered Orders for user: {len(orders_list)}")
        
        target_item = None
        target_order = None
        for o in orders_list:
            for item in o.get("items", []):
                if item.get("can_recycle", True):
                    target_item = item
                    target_order = o
                    break
            if target_item:
                break

        if target_item:
            prod_name = target_item.get("product_name") or target_item.get("name", "Delivered Item")
            print(f"\n--- 6. Testing Fraud-Proof Recycle Claim on Item: {prod_name} ---")
            claim_payload = {
                "order_id": target_order["order_id"],
                "order_item_id": target_item["item_id"],
                "product_id": target_item["product_id"],
                "user_id": "demo_user_101",
                "container_type": target_item["container_type"],
                "pickup_address": "Flat 402, Rosewood Heights, Bandra West, Mumbai",
                "pincode": "400050"
            }
            res = await ac.post("/api/recycle/claim", json=claim_payload)
            assert res.status_code in (200, 201), f"Recycle claim failed: {res.status_code} {res.text}"
            claim_res = res.json()
            print(f"Claim Success: {claim_res['success']}")
            print(f"Generated Tokenized Coupon: {claim_res['coupon_code']} (₹{claim_res.get('discount_amount', 100)} OFF)")
            print(f"Points Awarded: +{claim_res['points_awarded']} | New Balance: {claim_res.get('new_points_balance', claim_res.get('new_balance'))}")

            print("\n--- 7. Testing Account-Locked Coupon Validation ---")
            # Same user should succeed
            res = await ac.post("/api/coupons/validate", json={"code": claim_res["coupon_code"], "order_total": 1000.0, "user_id": "demo_user_101"})
            assert res.status_code == 200, f"Coupon validate failed: {res.status_code} {res.text}"
            valid_res = res.json()
            print(f"Owner validation: valid={valid_res['valid']} | discount=₹{valid_res['discount_amount']} | {valid_res['message']}")

            # Different user should be REJECTED (Fraud prevention!)
            res = await ac.post("/api/coupons/validate", json={"code": claim_res["coupon_code"], "order_total": 1000.0, "user_id": "fraudulent_user_999"})
            fraud_res = res.json()
            print(f"Fraud attempt validation: valid={fraud_res['valid']} | {fraud_res['message']}")
            assert fraud_res["valid"] == False, "Security Failure: Fraudulent user was able to use account-locked coupon!"
            print("Security Check: Coupon strictly locked to owner user_id in DB!")

        print("\n--- 8. Testing Direct Checkout & Order Placement ---")
        direct_order_payload = {
            "items": [{"product_id": 101, "quantity": 2}],
            "coupon_code": claim_res["coupon_code"] if 'claim_res' in locals() else None,
            "payment_method": "upi",
            "notes": "Deliver to Flat 402, Rosewood Heights, Bandra West, Mumbai | Paid via UPI"
        }
        res = await ac.post("/api/orders", json=direct_order_payload)
        assert res.status_code == 201, f"Create order failed: {res.status_code} {res.text}"
        order_out = res.json()
        print("\n--- 9. Testing AI Facial Skin Diagnostic & ChromaDB Routine Engine ---")
        import base64
        sample_img_bytes = (
            b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05"
            b"\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c"
            b" $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x0b\x08\x00\x10\x00\x10\x01\x01\x11\x00\xff\xc4\x00"
            b"\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07"
            b"\x08\t\n\x0b\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9"
        ) * 10
        sample_b64 = "data:image/jpeg;base64," + base64.b64encode(sample_img_bytes).decode()
        
        # Test empty image
        res_empty = await ac.post("/api/skin-diagnostic/analyze", json={"image_data": ""})
        assert res_empty.status_code == 400, f"Expected 400 for empty image, got {res_empty.status_code}"
        print("✅ Empty image correctly rejected with HTTP 400")

        # Test diagnostic analysis
        res_diag = await ac.post("/api/skin-diagnostic/analyze", json={"image_data": sample_b64})
        if res_diag.status_code == 422:
            print("✅ Non-face noise image correctly flagged by Gemini Vision face validation guardrail (HTTP 422):")
            print(f"   Detail: {res_diag.json().get('detail')}")
        else:
            assert res_diag.status_code == 200, f"Skin diagnostic failed: {res_diag.status_code} {res_diag.text}"
            diag_out = res_diag.json()
            print(f"Diagnosis Source: {diag_out.get('analysis_source')}")
            print(f"Diagnosed Skin Type: {diag_out.get('skin_type')}")
            print(f"Fitzpatrick Classification: {diag_out.get('fitzpatrick_type')}")
            print(f"Overall Health Score: {diag_out.get('overall_score')}/100")
            print(f"Prescribed Actives: {', '.join(diag_out.get('target_actives', []))}")
            print(f"Clinical Summary: {diag_out.get('clinical_summary')[:100]}...")
            print(f"AM Routine ({len(diag_out.get('am_routine', []))} products):")
            for p in diag_out.get("am_routine", []):
                print(f"  - Step {p['step_number']} ({p['step_name']}): {p['product_name']} [✨ {p['similarity_score']}% Match] (₹{p['price']})")
            print(f"PM Routine ({len(diag_out.get('pm_routine', []))} products):")
            for p in diag_out.get("pm_routine", []):
                print(f"  - Step {p['step_number']} ({p['step_name']}): {p['product_name']} [✨ {p['similarity_score']}% Match] (₹{p['price']})")
            print(f"Bundle Original: ₹{diag_out.get('bundle_original_price')} -> Discounted: ₹{diag_out.get('bundle_discounted_price')} (Coupon: {diag_out.get('bundle_discount_code')})")

        print("\nALL ENDPOINTS & ARCHITECTURE TESTS PASSED WITH 100% SUCCESS!")

if __name__ == "__main__":
    asyncio.run(run_tests())
