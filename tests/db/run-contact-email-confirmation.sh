#!/usr/bin/env bash
# Applies the contact email confirmation migration to a throwaway Postgres (Docker) with
# Supabase stubs, then runs its SQL test. Nothing touches the real project.
set -euo pipefail
cd "$(dirname "$0")/../.."
name="avante-migration-test-$$"
docker run -d --rm --name "$name" -e POSTGRES_PASSWORD=test postgres:15-alpine >/dev/null
trap 'docker stop "$name" >/dev/null' EXIT
until docker exec "$name" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
sleep 1
run() { docker exec -i "$name" psql -v ON_ERROR_STOP=1 -q -U postgres -d postgres; }
run < tests/db/supabase-stubs.sql
run < supabase/migrations/20261030120000_contact_email_confirmation.sql
# Applying it twice must also work (if not exists / or replace)
run < supabase/migrations/20261030120000_contact_email_confirmation.sql
run < tests/db/contact-email-confirmation.test.sql
