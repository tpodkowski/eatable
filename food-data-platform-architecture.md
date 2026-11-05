# Food Data Platform
## Architecture & Technical Design Document

**Status:** Proposed  
**Version:** 1.0  
**Date:** 2026-11-04  
**Scope:** Backend architecture, product catalog, data ingestion and enrichment  
**Target:** Food tracking / calorie counting application (Fitatu / Yazio category)

---

# 1. Executive Summary

The application requires a reliable food product catalog that allows users to:

- Search for food products.
- Scan product barcodes (EAN / GTIN).
- Retrieve nutritional information.
- Add products to their personal catalog.
- Create custom food products without barcodes.
- Contribute products to a shared catalog.
- Use historical nutritional data without being affected by future product changes.

The platform will combine external food databases, user-generated content and an internally maintained product catalog.

The architecture will follow a simplified Medallion Architecture:

**Bronze → Silver → Gold → Serving Layer**

The system will separate data ingestion, transformation, product domain logic and application-facing APIs.

The primary architectural objective is to make product lookup fast and independent of external API availability or rate limits.

# 2. Goals and Non-Goals

## 2.1 Goals

1. Build a unified food product catalog.
2. Support barcode-based product identification.
3. Integrate multiple external data providers.
4. Minimize external API calls through local persistence and caching.
5. Support user-created private products.
6. Support community contributions to the global catalog.
7. Preserve data provenance and source information.
8. Allow reprocessing of raw data without fetching it again.
9. Keep historical food entries immutable with respect to nutritional changes.
10. Make the system extensible for additional providers.

## 2.2 Non-Goals

The initial implementation will not include:

- A distributed big-data processing platform.
- Kafka or Spark.
- Elasticsearch / OpenSearch.
- Real-time synchronization of every external catalog.
- Automatic acceptance of all user contributions into the global catalog.
- A complex data warehouse.
- Full nutritional analysis of arbitrary recipes.

These capabilities can be considered in future iterations.

# 3. Architectural Decisions

## ADR-001: Separate Global and Personal Product Catalogs

**Status:** Accepted

### Context

Products can originate from external providers, user contributions or individual user entries.

These products have different visibility, ownership and validation requirements.

### Decision

Separate the global product catalog from personal user products.

The system will support:

- Global products: accessible to all users.
- Personal products: accessible only to their owner.
- Community contributions: products submitted for inclusion in the global catalog.

A user should also be able to customize the display name of a global product without modifying the shared product itself.

### Consequences

- Product ownership is explicit.
- Private data cannot accidentally leak into the global catalog.
- Global catalog moderation can evolve independently.
- Product deduplication is easier to manage.

---

## ADR-002: Adopt a Simplified Medallion Architecture

**Status:** Accepted

### Context

External providers expose different data formats, quality levels and schemas.

The application requires a consistent internal product model.

### Decision

Implement three logical data layers:

**Bronze**
- Original provider payloads.
- Immutable historical records.
- Ingestion metadata.
- Provider response information.

**Silver**
- Validated data.
- Normalized product information.
- Standardized nutritional values.
- Deduplicated records.

**Gold**
- Application-ready product entities.
- Selected nutritional values.
- Product search data.
- Barcode lookup models.

### Consequences

- External provider formats are isolated from application logic.
- Transformation logic can be changed independently.
- Raw data can be reprocessed.
- Additional providers can be introduced without modifying the application-facing contract.

---

## ADR-003: PostgreSQL as Primary Storage

**Status:** Accepted

### Decision

Use PostgreSQL as the primary persistence layer.

Use:
- JSONB for raw provider payloads.
- Relational tables for normalized and application data.
- B-tree indexes for barcode lookup.
- Full-text search and pg_trgm for product search.

Do not introduce a separate data warehouse initially.

S3-compatible object storage can be introduced later if raw data volume becomes significant.

---

## ADR-004: Redis for Queues and Caching

**Status:** Accepted

### Decision

Use Redis for:

- BullMQ job queues.
- Product lookup caching.
- Search result caching.
- Distributed rate limiting.
- Distributed locks where required.

Logical separation between queue and cache responsibilities is required.

Separate Redis instances can be introduced when operational requirements justify them.

PostgreSQL remains the source of truth.

---

## ADR-005: Background Ingestion and Enrichment

**Status:** Accepted

### Context

External APIs may be slow, rate-limited or temporarily unavailable.

User-facing requests must not depend on external provider response times.

### Decision

All external data retrieval will happen through background workers or controlled provider lookup operations.

The system will support:

- Scheduled imports.
- On-demand barcode enrichment.
- Retry with exponential backoff.
- Provider-specific rate limiting.
- Checkpointing and pagination.
- Idempotent processing.
- Dead-letter queues.

A request for a missing product must never result in uncontrolled parallel requests to external providers.

---

## ADR-006: Preserve Data Provenance

**Status:** Accepted

### Decision

Every imported or contributed product must retain information about its origin.

Where possible, provenance must be tracked at the field level.

Examples:
- Product name from Open Food Facts.
- Nutrition values from a verified package label.
- Product image from an external provider.

The system must retain:
- Provider identifier.
- External record identifier.
- Original payload reference.
- Fetch timestamp.
- Transformation version.
- Data verification status.

The selected Gold representation must be reproducible from available source records and transformation rules.

---

## ADR-007: Immutable Nutritional Snapshots

**Status:** Accepted

### Context

Nutritional information can change over time.

Historical food entries must remain accurate according to the data used when the user recorded the meal.

### Decision

Every food entry must contain a snapshot of relevant product information and nutritional values.

Historical entries must not rely exclusively on the current product record.

### Consequences

- Product updates do not alter historical calorie calculations.
- Users can view historical meals consistently.
- Product references remain useful for navigation and analytics.

---

## ADR-008: Lazy Import as Initial Catalog Acquisition Strategy

**Status:** Proposed

### Context

Importing entire external catalogs creates additional storage, synchronization and licensing complexity.

### Decision

Start with on-demand product enrichment.

When a barcode is not present locally:
1. Check available external providers.
2. Retrieve product information.
3. Store the original response in Bronze.
4. Normalize the information.
5. Create or update the Gold product.
6. Return the product to the application.

The ingestion architecture must allow future bulk imports without changing the product domain model.

### Future Option

Introduce bulk catalog synchronization if external API limits, product coverage or application traffic justify it.

---

# 4. High-Level Architecture

```text
                    EXTERNAL PROVIDERS
                  ┌─────────────────────┐
                  │ Open Food Facts     │
                  │ USDA FoodData       │
                  │ Future providers    │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │   INGESTION LAYER   │
                  │                     │
                  │ Provider adapters   │
                  │ Rate limiter        │
                  │ Retry / checkpoints │
                  │ BullMQ workers      │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │       BRONZE        │
                  │ Original JSON       │
                  │ Source metadata     │
                  │ Ingestion history   │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │       SILVER        │
                  │ Validation          │
                  │ Normalization       │
                  │ Deduplication       │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │        GOLD         │
                  │ Global products     │
                  │ Nutritional data    │
                  │ Product search      │
                  └──────────┬──────────┘
                             │
              ┌──────────────┴──────────────┐
              │                            │
              ▼                            ▼
       ┌──────────────┐             ┌──────────────┐
       │ PostgreSQL   │             │    Redis     │
       │ Source truth │             │ Cache / Jobs │
       └──────┬───────┘             └──────┬───────┘
              └──────────────┬─────────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │   PRODUCT SERVICE  │
                  │ Barcode lookup     │
                  │ Product search     │
                  │ Product creation   │
                  │ User catalog       │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │    APPLICATION API  │
                  │ Mobile / Web / MCP  │
                  └─────────────────────┘
```

# 5. Technology Stack

| Component | Technology |
|---|---|
| Runtime | Node.js |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Validation | Zod |
| Queue | BullMQ |
| Queue backend | Redis |
| Cache | Redis |
| Search | PostgreSQL FTS + pg_trgm |
| Raw storage | PostgreSQL JSONB |
| Future raw storage | AWS S3 |
| Monitoring | Sentry + OpenTelemetry |
| Deployment | Docker |

The architecture should initially be implemented as a modular monolith with separate worker processes.

There is no need to introduce microservices at this stage.

# 6. Data Model

The following model represents the initial logical schema.

## 6.1 Product

Represents a product independently of its external sources.

```typescript
interface Product {
  id: string;
  name: string;
  brand?: string;
  category?: string;

  productType: "packaged" | "generic" | "recipe";

  visibility: "global" | "private";

  ownerId?: string;

  status: "active" | "pending" | "rejected" | "archived";

  createdAt: Date;
  updatedAt: Date;
}
```

## 6.2 ProductBarcode

A product may have multiple barcode identifiers.

```typescript
interface ProductBarcode {
  id: string;
  productId: string;

  gtin: string;
  isPrimary: boolean;

  packageQuantity?: number;
  packageUnit?: "g" | "kg" | "ml" | "l" | "pcs";
}
```

GTIN should be stored as a string, never as a numeric database type.

Validation must support the relevant GTIN formats:
- GTIN-8
- GTIN-12
- GTIN-13
- GTIN-14

Validate check digits and normalize the lookup representation consistently.

## 6.3 ProductNutrition

```typescript
interface ProductNutrition {
  id: string;
  productId: string;

  basis: "100g" | "100ml";

  energyKcal: number;
  protein: number;
  carbohydrates: number;
  sugars?: number;
  fat: number;
  saturatedFat?: number;
  fiber?: number;
  salt?: number;

  version: number;
  createdAt: Date;
}
```

Nutritional values should use PostgreSQL NUMERIC rather than floating-point types.

The application should define one canonical unit convention for every nutrient.

## 6.4 ProductSource

Tracks the origin of product information.

```typescript
interface ProductSource {
  id: string;
  productId: string;

  provider: string;
  externalId?: string;

  rawRecordId?: string;

  fetchedAt: Date;
  sourceUrl?: string;

  confidence?: number;
}
```

A more detailed implementation should introduce field-level provenance, for example:

```text
product_field_sources
  id
  product_id
  field_name
  source_id
  verification_status
  selected_value
```

The actual schema should avoid duplicating entire product records for each source.

## 6.5 Personal Products

```typescript
interface UserProduct {
  id: string;
  userId: string;
  productId: string;

  customName?: string;
  createdAt: Date;
}
```

Private products should have an explicit ownership constraint.

## 6.6 Community Contributions

```typescript
interface ProductContribution {
  id: string;
  userId: string;

  productId?: string;

  status:
    | "pending"
    | "approved"
    | "rejected";

  submittedAt: Date;
  reviewedAt?: Date;
}
```

A contribution must not automatically overwrite an existing global product.

## 6.7 Bronze Storage

```typescript
interface RawProductRecord {
  id: string;

  provider: string;
  externalId?: string;

  payload: unknown;

  fetchedAt: Date;
  checksum: string;

  schemaVersion: number;
  ingestionRunId: string;
}
```

Raw records should be append-only.

## 6.8 Food Entry Snapshot

```typescript
interface FoodEntry {
  id: string;
  userId: string;

  productId?: string;

  productNameSnapshot: string;

  quantity: number;
  unit: "g" | "ml" | "serving";

  nutritionSnapshot: {
    energyKcal: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber?: number;
    salt?: number;
  };

  consumedAt: Date;
  createdAt: Date;
}
```

The snapshot is the authoritative source for historical calculations.

# 7. Data Ingestion Pipeline

## 7.1 Provider Adapter Contract

Every provider must implement a common interface.

```typescript
interface FoodDataProvider<TRaw> {
  readonly providerId: string;

  fetchByBarcode(
    gtin: string
  ): Promise<TRaw | null>;

  normalize(
    raw: TRaw
  ): NormalizedProduct;

  getRateLimit(): RateLimitConfig;
}
```

Provider-specific pagination and bulk import capabilities should be implemented through optional provider-specific interfaces rather than forcing every provider to implement identical functionality.

## 7.2 Ingestion Flow

```text
Trigger
  |
  ▼
Create ingestion job
  |
  ▼
Check existing job / lock
  |
  ▼
Apply provider rate limit
  |
  ▼
Fetch external record
  |
  ▼
Persist RAW payload
  |
  ▼
Validate and normalize
  |
  ▼
Resolve product identity
  |
  ▼
Transform into Gold
  |
  ▼
Invalidate relevant cache
  |
  ▼
Mark job completed
```

## 7.3 Reliability Requirements

- Exponential backoff.
- Respect Retry-After headers.
- Provider-specific concurrency limits.
- Shared rate limiting per API credential.
- Idempotent jobs.
- Dead-letter queue.
- Pagination checkpoints.
- Request timeouts.
- Provider health monitoring.
- Deduplication of concurrent requests for the same barcode.

A failed transformation must not require another external API request if the RAW payload was successfully persisted.

# 8. Product Lookup Flow

Barcode lookup is one of the most important application operations.

```text
GET /products/barcode/:gtin
              |
              ▼
       Validate GTIN
              |
              ▼
       Check Redis cache
              |
        ┌─────┴─────┐
        │           │
       HIT         MISS
        │           │
        │           ▼
        │     Query PostgreSQL
        │           │
        │      ┌────┴────┐
        │      │         │
        │    FOUND     NOT FOUND
        │      │         │
        │      │         ▼
        │      │    Enqueue enrichment
        │      │         │
        │      │         ▼
        │      │    Provider lookup
        │      │
        └──────┴─────────┘
              |
              ▼
          Return result
```

The endpoint must not wait indefinitely for an external provider.

Recommended behavior:

- Local hit: return immediately.
- External provider responds quickly: persist and return the product.
- External provider is slow or unavailable: return an appropriate pending/not-found response and process enrichment asynchronously.
- Concurrent scans of the same missing GTIN: reuse one enrichment job.

Suggested API response:

```typescript
type BarcodeLookupResponse =
  | {
      status: "found";
      product: ProductDto;
    }
  | {
      status: "pending";
      gtin: string;
      jobId: string;
    }
  | {
      status: "not_found";
      gtin: string;
    };
```

The application should distinguish between a definitive not-found result and a temporary provider failure.

# 9. Search Architecture

Initial search implementation should use PostgreSQL.

Required search capabilities:

- Product name.
- Brand.
- Barcode.
- Partial text.
- Typo tolerance.
- Category filtering.

Use:
- B-tree indexes for GTIN.
- GIN indexes for full-text search.
- pg_trgm for approximate text matching.

Redis may cache popular search queries.

Search-as-you-type must not invoke external providers.

# 10. External Data Providers

## 10.1 Open Food Facts

Primary candidate for packaged food products and barcode coverage.

Potential data:
- Product name.
- Brand.
- Barcode.
- Nutritional information.
- Ingredients.
- Allergens.
- Product categories.
- Package images.

Integration modes:
- API lookup for initial MVP.
- Bulk data import in a future iteration.

Important considerations:
- API rate limits.
- Data completeness and quality.
- ODbL licensing.
- Attribution requirements.
- Share-alike implications.

Official documentation: https://openfoodfacts.github.io/openfoodfacts-server/api/

## 10.2 USDA FoodData Central

Secondary provider, especially for generic foods and additional nutritional data.

Potential data:
- Nutritional composition.
- Food descriptions.
- Food identifiers.
- Generic food entries.

Official documentation: https://fdc.nal.usda.gov/api-guide.html

License: CC0.

## 10.3 GS1

Potential future integration for product identification and verified product information.

Availability and commercial access must be evaluated separately.

## 10.4 Provider Integration Rules

- Provider data must never be exposed directly as the application's domain model.
- Each provider must have an independent adapter.
- All external responses must be validated.
- Original responses should be retained.
- Provider-specific rate limits must be respected.
- Licensing requirements must be reviewed before combining datasets.

# 11. Product Data Quality and Conflict Resolution

Multiple sources may provide conflicting values.

The platform needs a field-level selection strategy.

Possible inputs:
- Provider data.
- User-submitted information.
- Verified package label.
- Manually corrected information.

The system should distinguish:
- Imported.
- User-submitted.
- Verified.
- Automatically normalized.
- Disputed.

The initial implementation should use deterministic field-selection rules rather than an opaque scoring algorithm.

Every selected value should retain its provenance.

Manual verification should have priority over unverified imported data, subject to validation.

# 12. Cache Strategy

PostgreSQL remains authoritative.

Redis should cache:
- Product details by product ID.
- Product lookup by GTIN.
- Popular search results.
- Frequently accessed nutritional data.

Suggested initial TTLs:

| Cache type | TTL |
|---|---:|
| Product details | 24 hours |
| Barcode lookup | 24 hours |
| Search results | 5 minutes |
| Negative lookup | 5 minutes |

These values are starting points, not fixed requirements.

Cache invalidation should happen after successful Gold updates.

Use cache-aside rather than treating Redis as persistent storage.

For frequently accessed products, consider stale-while-revalidate.

# 13. Security and Data Ownership

- All personal products must be scoped by user ID.
- Global products must not be modifiable by arbitrary users.
- Contributions must pass validation.
- User-generated content must be treated as untrusted.
- Barcode uniqueness must be enforced at the database level for global catalog records.
- Authorization must be enforced in application services, not only in API controllers.
- External provider credentials must be stored securely.

# 14. Observability

Track the following metrics:

**Ingestion**
- Requests per provider.
- Rate-limit responses.
- Error rates.
- Retry counts.
- Processing duration.
- Queue depth.
- Dead-letter count.

**Catalog**
- Number of global products.
- Number of private products.
- Number of products with barcodes.
- Percentage of products with complete nutritional data.
- Duplicate barcode attempts.
- Contribution approval rate.

**Serving**
- Barcode lookup latency.
- Product search latency.
- Redis hit ratio.
- PostgreSQL query duration.
- External enrichment duration.

# 15. Implementation Plan

Development should be incremental.

## Phase 1 — Product Domain Foundation

Tasks:
- [ ] Define Product domain model.
- [ ] Define ProductBarcode model.
- [ ] Define ProductNutrition model.
- [ ] Define ProductSource model.
- [ ] Define UserProduct model.
- [ ] Define FoodEntry snapshot model.
- [ ] Create initial PostgreSQL migrations.
- [ ] Implement GTIN validation.
- [ ] Implement repository interfaces.
- [ ] Add database-level constraints and indexes.

**Acceptance criteria:**
- Products can be created and retrieved.
- Global and private products are separated.
- Barcode uniqueness is enforced.
- Nutritional values use canonical units.
- Historical entries store immutable nutritional snapshots.

## Phase 2 — Provider Integration

Tasks:
- [ ] Implement Open Food Facts adapter.
- [ ] Implement provider response validation.
- [ ] Implement provider rate limiter.
- [ ] Implement RAW payload storage.
- [ ] Implement Bronze ingestion metadata.
- [ ] Implement provider error handling.
- [ ] Add integration tests.

**Acceptance criteria:**
- A product can be retrieved by GTIN from Open Food Facts.
- Original responses are stored.
- Provider failures do not corrupt local data.
- API rate limits are respected.

## Phase 3 — Transformation Pipeline

Tasks:
- [ ] Implement Bronze → Silver transformation.
- [ ] Implement normalized product schema.
- [ ] Implement Silver → Gold transformation.
- [ ] Implement product identity resolution.
- [ ] Implement source provenance.
- [ ] Implement transformation versioning.
- [ ] Add reprocessing support.

**Acceptance criteria:**
- External payloads are converted to the internal model.
- Transformation can be repeated without external API calls.
- Data source information is retained.
- Invalid records are isolated.

## Phase 4 — Product Serving API

Tasks:
- [ ] Implement barcode lookup endpoint.
- [ ] Implement product detail endpoint.
- [ ] Implement product search endpoint.
- [ ] Implement Redis cache.
- [ ] Implement cache invalidation.
- [ ] Implement negative caching.
- [ ] Add API tests.

**Acceptance criteria:**
- Existing products are returned without external API calls.
- Cache misses query PostgreSQL.
- Search works locally.
- Product updates invalidate relevant cache entries.

## Phase 5 — Background Enrichment

Tasks:
- [ ] Configure BullMQ.
- [ ] Implement enrichment queue.
- [ ] Implement barcode-based enrichment jobs.
- [ ] Add job deduplication.
- [ ] Add retry policies.
- [ ] Add dead-letter queue.
- [ ] Implement provider concurrency limits.
- [ ] Add job status tracking.

**Acceptance criteria:**
- Multiple requests for the same missing barcode do not trigger uncontrolled duplicate API calls.
- Failed jobs can be retried.
- External API availability does not affect existing product lookup.

## Phase 6 — Personal Catalog and Contributions

Tasks:
- [ ] Implement personal product creation.
- [ ] Implement product ownership.
- [ ] Implement custom product names.
- [ ] Implement product contribution submission.
- [ ] Implement moderation workflow.
- [ ] Implement global catalog promotion.
- [ ] Add authorization tests.

**Acceptance criteria:**
- Users can create private products.
- Private products are not visible to other users.
- Contributions do not overwrite global products automatically.
- Approved products can become globally accessible.

## Phase 7 — Production Hardening

Tasks:
- [ ] Add ingestion monitoring.
- [ ] Add queue monitoring.
- [ ] Add provider health monitoring.
- [ ] Add performance tests.
- [ ] Review external data licensing.
- [ ] Review backup and recovery strategy.
- [ ] Document operational procedures.

# 16. Suggested Initial Project Structure

```text
src/
├── modules/
│   ├── products/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── api/
│   │
│   ├── nutrition/
│   │   ├── domain/
│   │   ├── application/
│   │   └── infrastructure/
│   │
│   ├── ingestion/
│   │   ├── providers/
│   │   │   ├── open-food-facts/
│   │   │   └── usda/
│   │   ├── bronze/
│   │   ├── silver/
│   │   ├── gold/
│   │   └── workers/
│   │
│   ├── contributions/
│   │   ├── domain/
│   │   ├── application/
│   │   └── api/
│   │
│   └── food-entries/
│       ├── domain/
│       ├── application/
│       └── infrastructure/
│
├── infrastructure/
│   ├── database/
│   ├── redis/
│   ├── queues/
│   └── monitoring/
│
├── workers/
│   ├── ingestion.worker.ts
│   └── transformation.worker.ts
│
└── shared/
    ├── types/
    ├── validation/
    └── utils/
```

# 17. Open Architectural Questions

These decisions should be resolved before or during the relevant implementation phases.

1. Should the global catalog contain only products with verified barcodes?
2. Should generic foods (e.g. raw rice, chicken breast, banana) live in the same catalog or a separate food entity type?
3. What is the policy for conflicting nutritional values?
4. Should users be able to share their private products?
5. Should community contributions require manual moderation?
6. What is the long-term data licensing strategy for commercial use?
7. At what scale should bulk Open Food Facts import be introduced?
8. Should product images be stored locally or referenced from providers?
9. Should product packaging variants be represented as separate products or as package variants?
10. Should historical product versions be visible to users?

# 18. Initial Technical Priorities

The recommended development order is:

1. Product domain and database schema.
2. Barcode lookup.
3. Open Food Facts integration.
4. Bronze storage.
5. Normalization and Gold projection.
6. Redis caching.
7. Background enrichment.
8. Personal products.
9. Community contributions.
10. Bulk ingestion and advanced catalog management.

The first usable milestone should support:

- Scanning a barcode.
- Looking up a product locally.
- Importing a missing product from Open Food Facts.
- Displaying nutritional information.
- Adding a custom product.
- Saving a food entry with a nutritional snapshot.

Everything else can be built incrementally.

---

# 19. Definition of Done — Initial MVP

The initial Food Data Platform MVP is considered complete when:

- [ ] A global product can be stored and retrieved by GTIN.
- [ ] An external product can be imported.
- [ ] Raw external data is preserved.
- [ ] Product data is normalized into the internal model.
- [ ] A product can be retrieved without calling external APIs after import.
- [ ] Redis caching works.
- [ ] Repeated concurrent lookups do not cause uncontrolled provider requests.
- [ ] Users can create private products.
- [ ] Historical food entries preserve their nutritional snapshots.
- [ ] Product ownership and access control are tested.
- [ ] External data provenance is retained.

**Final architectural principle:**

The external provider is a data source, not a dependency of the application runtime.

The internal catalog is the source of truth for application reads. External providers enrich the catalog, while user contributions extend it over time.
