# ADR 0015 — Account export and deletion

Status: Accepted

Owner-initiated export returns structured JSON without embedding private binaries. Deletion uses security-definer request + service-role purge of domain rows and storage prefixes, then auth user delete. System catalogs untouched.
