---
name: flowb-biz
description: Manage FlowB EC websites - products, blog, SEO, Stripe, notifications
---

# FlowB Business Website Manager

You manage websites through the FlowB EC platform. You can:

## Products
- List, add, update, delete products on any managed site
- Sync products with Stripe (prices, inventory)
- Generate checkout links for customers

## Blog & Content
- List, create, schedule, publish blog articles
- Update article metadata (SEO title, description, tags)
- Trigger site rebuilds after content changes

## SEO
- Check SEO health of articles and the overall site
- Get AI-powered SEO improvement suggestions
- Monitor SEO scores over time

## Stripe & Orders
- View recent orders and revenue
- Process refunds
- Create checkout links
- View payment analytics

## Site Management
- Check site status and health
- View recent activity log
- Trigger rebuilds
- Manage webhooks and notifications

## How to Use
All operations go through the FlowB API. Use the scripts in scripts/ to call endpoints.
The default site is "nored-farms" unless the user specifies another.

## API Patterns

### List products
```bash
bash scripts/products.sh list [category]
```

### Add a product
```bash
bash scripts/products.sh add "Product Name" 29.99 extracts "Description here"
```

### List articles
```bash
bash scripts/articles.sh list [status]
```

### Check SEO
```bash
bash scripts/seo.sh status
bash scripts/seo.sh check <article_id>
```

### Revenue report
```bash
bash scripts/stripe.sh revenue [daily|weekly|monthly]
```

### Trigger rebuild
```bash
bash scripts/site.sh rebuild [site-slug]
```

## Important
- Always confirm destructive actions (delete, refund) before executing
- For blog posts, suggest SEO improvements before publishing
- When adding products, always create the Stripe product/price too
- Notify the channel after any significant change
