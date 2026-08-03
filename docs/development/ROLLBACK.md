# Rollback

Prefer forward fixes. Application rollback: redeploy previous build SHA. Database: avoid down migrations; restore only when necessary with data-loss warning. Feature flags can disable barcode/OCR/camera/export/deletion without bypassing RLS.
