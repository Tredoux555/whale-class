# 🧠 Montessori Brain - Quick Reference

## Status: LIVE ✅

**Deployed:** Jan 20, 2025

## Database (Supabase)
- `sensitive_periods` - 11 rows
- `montessori_works` - 30 rows (gateway works)
- `work_prerequisites` - prerequisite mappings
- `work_sensitive_periods` - period-to-work mappings

## API Endpoints

```bash
# List all works
GET /api/brain/works
GET /api/brain/works?area=sensorial
GET /api/brain/works?gateway_only=true

# Get recommendations for a child
GET /api/brain/recommend?child_age=4&limit=5

# Works child is ready for (checks prerequisites)
GET /api/brain/available?child_age=3.5

# Full work details
GET /api/brain/work/{work_id}

# Sensitive periods
GET /api/brain/sensitive-periods
GET /api/brain/sensitive-periods?age=4

# Claude-generated explanation (POST)
POST /api/brain/explain
Body: { "work_id": "uuid", "child_name": "Emma", "child_age": 4 }
```

## Test Query (Supabase)
```sql
SELECT * FROM get_recommended_works(4.0, '{}', 5);
```

## Next Steps
- [ ] Wire into weekly planning UI
- [ ] Seed remaining 240+ works from DIVE_2
- [ ] Add to parent reports
