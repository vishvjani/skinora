# NEXAURA — Backend

AI-powered cosmetics e-commerce backend built with FastAPI, Supabase (PostgreSQL),
ChromaDB, Sentence Transformers, XGBoost, and Valkey cache.

---

## Project Structure

```
backend/
├── app/
│   ├── main.py               ← FastAPI app + lifespan + CORS
│   ├── api/                  ← All route handlers
│   │   ├── products.py       ← GET /api/products, /trending, /categories
│   │   ├── search.py         ← GET /api/search (semantic + keyword fallback)
│   │   ├── recommendations.py← GET /api/recommendations/similar, /for-you
│   │   ├── cart.py           ← CRUD /api/cart (auth required)
│   │   ├── wishlist.py       ← CRUD /api/wishlist (auth required)
│   │   ├── orders.py         ← POST/GET /api/orders (auth required)
│   │   ├── events.py         ← POST /api/events (event tracking)
│   │   ├── pricing.py        ← GET /api/pricing/{id} (dynamic price)
│   │   ├── coupons.py        ← POST /api/coupons/validate
│   │   ├── experiments.py    ← GET /api/ab-test (A/B assignment)
│   │   ├── analytics.py      ← GET /api/analytics/summary
│   │   └── users.py          ← GET/PATCH /api/users/me + addresses
│   ├── models/               ← SQLAlchemy ORM models (all 14 tables)
│   ├── schemas/              ← Pydantic v2 request/response schemas
│   ├── database/             ← Async engine + session factory
│   ├── auth/                 ← Clerk JWT verification
│   ├── cache/                ← Valkey/Redis helpers + TTL constants
│   └── ml/
│       ├── embeddings.py     ← SentenceTransformer + ChromaDB service
│       ├── recommendation.py ← 4-strategy recommendation engine
│       └── pricing.py        ← XGBoost dynamic pricing engine
├── data/
│   ├── schema.sql            ← Supabase table definitions + RLS
│   ├── seed.sql              ← 350 products INSERT statements
│   ├── seed_coupons.sql
│   ├── seed_competitors.sql
│   ├── seed_events.sql       ← 3000 synthetic user events (ML warm-start)
│   ├── seed_ab.sql
│   ├── nexaura_products.json ← Processed product data (used by ML)
│   ├── chroma/               ← ChromaDB vector index (auto-created)
│   └── models/               ← XGBoost model files (auto-created)
├── scripts/
│   ├── process_dataset.py    ← Reads CSV → generates seed files
│   ├── seed_db.py            ← Async DB seeder (reads JSON → PG)
│   └── train_and_index.py    ← ML bootstrap: ChromaDB index + XGBoost train
├── requirements.txt
├── .env.example
└── README.md
```

---

## Quick Setup (Step by Step)

### 1 — Prerequisites

```bash
python --version   # 3.11+ recommended
pip --version
```

Optional but recommended:
```bash
pip install virtualenv
python -m virtualenv .venv
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate
```

---

### 2 — Install Dependencies

```bash
pip install -r requirements.txt
```

> PyTorch installs a large package (~700MB). For CPU-only (no GPU):
> ```bash
> pip install torch --index-url https://download.pytorch.org/whl/cpu
> pip install -r requirements.txt
> ```

---

### 3 — Set Up Supabase

1. Go to [supabase.com](https://supabase.com) → New Project
2. In the SQL Editor, run **`data/schema.sql`** — creates all tables, indexes, RLS policies
3. Then run these seed files **in order**:
   ```
   data/seed.sql              ← categories + 350 products
   data/seed_coupons.sql      ← 8 coupon codes
   data/seed_competitors.sql  ← competitor price rows
   data/seed_events.sql       ← 3000 synthetic user events
   data/seed_ab.sql           ← 3 A/B experiments
   ```
4. Copy the **Connection string (URI)** from Settings → Database → Connection string
   - Use the **Transaction pooler** URL (port 6543) for async/asyncpg

---

### 4 — Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Supabase connection (Transaction pooler URL)
DATABASE_URL=postgresql+asyncpg://postgres.XXXX:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

# Clerk — go to clerk.com → your app → API Keys
CLERK_JWKS_URL=https://YOUR_CLERK_APP.clerk.accounts.dev/.well-known/jwks.json
CLERK_ISSUER=https://YOUR_CLERK_APP.clerk.accounts.dev

# Valkey/Redis — run locally or use Upstash free tier
VALKEY_URL=redis://localhost:6379/0

# ChromaDB storage path
CHROMA_PERSIST_DIR=./data/chroma

# Sentence Transformer model name
EMBEDDING_MODEL=all-MiniLM-L6-v2
```

---

### 5 — Bootstrap ML (Run Once)

This does 3 things: indexes all 350 products into ChromaDB, trains the XGBoost pricing model, and smoke-tests both.

```bash
cd nexaura/backend
python scripts/train_and_index.py
```

Expected output:
```
✅ Indexed 350 products into ChromaDB
✅ Pricing model saved to data/models/pricing_model.json
✅ All ML components ready.
```

> Takes ~2–5 minutes on first run (downloads sentence-transformer model ~90MB).
> Subsequent runs are instant — model is cached.

---

### 6 — Start the Backend

```bash
cd nexaura/backend
uvicorn app.main:app --reload --port 8000
```

Open **http://localhost:8000/docs** for the interactive Swagger UI.

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/products` | No | List products (filter, sort, paginate) |
| GET | `/api/products/trending` | No | Top products by reviews |
| GET | `/api/products/categories` | No | All categories |
| GET | `/api/products/{id}` | No | Product detail |
| GET | `/api/products/slug/{slug}` | No | Product by slug |
| GET | `/api/search?q=...` | No | Semantic search (ChromaDB → FTS fallback) |
| GET | `/api/recommendations/similar/{id}` | No | Vector-similar products |
| GET | `/api/recommendations/for-you` | Optional | Personalised feed |
| GET | `/api/cart` | ✅ | Get cart |
| POST | `/api/cart` | ✅ | Add to cart |
| PUT | `/api/cart/{item_id}` | ✅ | Update quantity |
| DELETE | `/api/cart/{item_id}` | ✅ | Remove item |
| DELETE | `/api/cart` | ✅ | Clear cart |
| GET | `/api/wishlist` | ✅ | Get wishlist |
| POST | `/api/wishlist/{product_id}` | ✅ | Add to wishlist |
| DELETE | `/api/wishlist/{product_id}` | ✅ | Remove from wishlist |
| POST | `/api/orders` | ✅ | Place order |
| GET | `/api/orders` | ✅ | List user orders |
| GET | `/api/orders/{id}` | ✅ | Order detail |
| PATCH | `/api/orders/{id}/cancel` | ✅ | Cancel order |
| POST | `/api/events` | Optional | Track user event |
| GET | `/api/pricing/{product_id}` | No | Dynamic price recommendation |
| POST | `/api/coupons/validate` | No | Validate coupon |
| GET | `/api/coupons` | No | List active coupons |
| GET | `/api/ab-test/{name}/assign` | ✅ | Get A/B variant |
| POST | `/api/ab-test/convert` | ✅ | Record conversion |
| GET | `/api/analytics/summary` | No | Dashboard stats |
| GET | `/api/users/me` | ✅ | Get profile |
| PATCH | `/api/users/me` | ✅ | Update profile |
| GET | `/api/users/me/addresses` | ✅ | List addresses |
| POST | `/api/users/me/addresses` | ✅ | Add address |
| DELETE | `/api/users/me/addresses/{id}` | ✅ | Delete address |
| GET | `/health` | No | Health check |

---

## ML Architecture

### Semantic Search Flow
```
User query ("hydrating face serum")
       ↓
SentenceTransformer (all-MiniLM-L6-v2)
       ↓
Query embedding [384-dim vector]
       ↓
ChromaDB cosine similarity
       ↓
Top-20 product IDs
       ↓
PostgreSQL fetch (price, stock, rating)
       ↓
JSON response + Valkey cache (5 min TTL)
```

### Recommendation Strategies (in priority order)
1. **vector_similarity** — ChromaDB cosine distance on product embeddings
2. **collaborative_proxy** — co-view analysis from `user_events` table
3. **subcategory_popular** — same subcategory, sorted by rating
4. **top_rated_fallback** — site-wide popular products

### Dynamic Pricing Pipeline
```
Product base price
       +
Demand score (weighted event count, last 7 days)
       +
Stock level
       +
Competitor avg price (from competitor_prices table)
       ↓
XGBoost Regressor
       ↓
Price multiplier (capped 0.80x – 1.30x)
       ↓
Business guard (min/max)
       ↓
Recommended price + reason string
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `categories` | 6 product categories |
| `products` | 350 cosmetic products with embeddings metadata |
| `users` | Clerk user mirror (id = Clerk user_id) |
| `addresses` | Delivery addresses per user |
| `cart` | Active cart items |
| `wishlist` | Saved products |
| `orders` | Order headers |
| `order_items` | Line items per order |
| `coupons` | Discount codes |
| `competitor_prices` | External price tracking |
| `user_events` | All interactions (view/click/cart/purchase) |
| `ab_tests` | Experiment definitions |
| `ab_assignments` | User → variant mapping |
| `ab_conversions` | Conversion events per experiment |
| `reviews` | Product reviews |

---

## Caching Strategy (Valkey)

| Data | TTL |
|------|-----|
| Trending products | 5 min |
| Search results | 5 min |
| Similar products | 10 min |
| Categories | 1 hour |
| Product detail | 15 min |
| Pricing recommendation | 3 min |
| Personalised recs | 10 min |

---

## Development Tips

**Re-run dataset processor** (if CSV changes):
```bash
python scripts/process_dataset.py
```

**Re-index ChromaDB** (if products change):
```bash
python scripts/train_and_index.py
```

**Retrain pricing model only**:
```bash
python -m app.ml.pricing
```

**Re-seed database**:
```bash
python scripts/seed_db.py
```

**Run with auto-reload** (development):
```bash
uvicorn app.main:app --reload --port 8000 --log-level info
```

**Production** (gunicorn + uvicorn workers):
```bash
gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 4 --bind 0.0.0.0:8000
```

---

## Deployment

| Service | Provider Options |
|---------|-----------------|
| FastAPI | Railway, Render, AWS EC2, Fly.io |
| PostgreSQL | Supabase (already set up) |
| Vector DB | ChromaDB on same server (persistent dir) |
| Cache | Upstash Valkey (free tier available) |
| ML Models | Bundle in Docker image or S3 |

**Docker** (when ready):
```bash
docker build -t nexaura-backend .
docker run -p 8000:8000 --env-file .env nexaura-backend
```
