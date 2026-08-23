# REST API Reference

All requests to `/api/*` (except auth registration/login and public health endpoints) require an active authenticated session via Supabase cookies.

---

## 1. Brand Operations

### Create Brand & Initiate Scrape
- **Endpoint**: `POST /api/brands`
- **Body**:
  ```json
  {
    "name": "Acme Corp",
    "website_url": "https://acme.com",
    "raw_description": "Cloud cost optimization platform for Kubernetes"
  }
  ```
- **Response** `(200 OK)`:
  ```json
  {
    "id": "uuid",
    "status": "ready",
    "context": {
      "industry": "Cloud Infrastructure",
      "tagline": "Save up to 40% on cluster costs",
      "target_audience": "DevOps and Platform Engineers",
      "value_props": ["Automated rightsizing", "Instant spot instance migration"],
      "products": ["KubeOptimizer", "CostLens"],
      "tone_keywords": ["Technical", "Authoritative", "Data-driven"]
    }
  }
  ```

### Discover Competitors
- **Endpoint**: `POST /api/brands/:id/discover-competitors`
- **Description**: Uses Bright Data SERP API on Google queries to find and rank competitor domains.
- **Response** `(200 OK)`:
  ```json
  {
    "discovered_count": 5,
    "competitors": [
      {
        "id": "uuid",
        "name": "Cast AI",
        "domain": "cast.ai",
        "discovery_score": 95,
        "status": "discovered"
      }
    ]
  }
  ```

### Execute Gap Analysis
- **Endpoint**: `POST /api/brands/:id/analyze-gaps`
- **Description**: Compares brand context with competitor intelligence and generates opportunity vectors.
- **Response** `(200 OK)`:
  ```json
  {
    "report_id": "uuid",
    "findings": {
      "gaps": ["Lack of real-world Kubernetes benchmark comparisons"],
      "topics": ["How to cut EKS costs in 15 minutes", "Spot vs On-Demand Guide"],
      "formats": ["Long-form deep dive article", "LinkedIn carousel breakdown"],
      "competitor_insights": [...]
    }
  }
  ```

### Generate Content (Blog or Social Post)
- **Endpoint**: `POST /api/brands/:id/generate-content`
- **Body**:
  ```json
  {
    "topic": "Kubernetes FinOps Best Practices",
    "content_type": "article",     // "article" | "post"
    "platform": "blog"             // "blog" | "linkedin" | "twitter" | "instagram"
  }
  ```
- **Response** `(200 OK)`:
  ```json
  {
    "id": "uuid",
    "title": "Mastering Kubernetes FinOps: 5 Proven Strategies to Cut Cloud Spend",
    "body": "# Mastering Kubernetes FinOps\n\n...",
    "image_url": "https://image.pollinations.ai/prompt/...",
    "status": "draft"
  }
  ```

---

## 2. Competitor Operations

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/competitors/:id` | Retrieve competitor metadata and social handles |
| `PATCH` | `/api/competitors/:id` | Update competitor status (`approved`, `rejected`) |
| `POST` | `/api/competitors/:id/find-handles` | Scrape social handles (LinkedIn, X, etc.) |
| `POST` | `/api/competitors/:id/scrape-content` | Scrape social posts from LinkedIn / Twitter datasets |
| `POST` | `/api/competitors/:id/scrape-blog` | Scrape competitor blog listings and full article text |

---

## 3. Content, Intelligence & Publishing

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/intelligence` | Query paginated list of all scraped competitor posts & blogs |
| `GET` | `/api/generated-content` | List all AI drafts by brand and status |
| `PATCH` | `/api/generated-content/:id` | Edit content notes or update status (`approved`, `rejected`) |
| `POST` | `/api/publish` | Queue approved post to publishing network (Buffer / local queue) |

---

## 4. System & Automation

### Weekly Refresh Job (n8n Webhook Target)
- **Endpoint**: `POST /api/jobs/weekly`
- **Header**: `x-webhook-secret: <N8N_WEBHOOK_SECRET>`
- **Description**: Iterates through all ready brands, executes handle discovery, scrapes content and blogs, performs gap analysis, and generates new weekly drafts.

### Self-Healing Telemetry
- **Endpoint**: `GET /api/self-healing`
- **Description**: Returns recent scraper recovery logs, reasons, strategies, and counts of items recovered.
