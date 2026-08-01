"""Billing migration structure — Phase 4 Step 1.

These are STATIC checks over the migration files. They do not connect to a
database, and they are not a substitute for applying the migrations; they exist
because the properties they assert are the ones that make a migration safe to
run against production at 2am, and every one of them has a documented failure
behind it somewhere in this repo's history.

A note on why there is no parser here. `sqlglot` was tried and rejected: it
fails to parse migrations 0001, 0004, 0006 and 0007 — which are applied and
working — because it does not handle plpgsql bodies or several Postgres DDL
forms. A validator that rejects known-good input cannot tell you anything about
new input. Real syntax verification happens when the migration is applied to a
Postgres, and nowhere else.

Runnable without pytest:  python -m tests.test_billing_schema
(from backend/, with the project venv active)
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

MIGRATIONS = Path(__file__).resolve().parents[2] / "supabase" / "migrations"

#: The migrations this phase added.
BILLING = [
    "0022_billing_subscription_state.sql",
    "0023_billing_events.sql",
    "0024_billing_payments.sql",
    "0025_billing_invoices.sql",
    "0026_billing_reconciliation.sql",
]

#: Tables and functions that must already exist for these to apply. Every one is
#: created by an earlier, applied migration.
REQUIRED_OBJECTS = {
    "public.organizations": "0008",
    "public.recruiters": "0001",
    "public.subscriptions": "0008",
    "public.set_updated_at": "0001",
    "public.is_org_member": "0008",
}


def _read(name: str) -> str:
    return (MIGRATIONS / name).read_text(encoding="utf-8")


def _strip_comments(sql: str) -> str:
    """Line comments only. Constraint names and DDL keywords appear inside the
    prose of these files, and matching them there would be meaningless."""
    return re.sub(r"^\s*--.*$", "", sql, flags=re.MULTILINE)


# ── checks ──────────────────────────────────────────────────────────────────
def check_files_exist() -> list[str]:
    return [f"missing migration {name}" for name in BILLING if not (MIGRATIONS / name).exists()]


def check_no_gaps_or_duplicates() -> list[str]:
    """A gap or a duplicated number means two developers numbered blind, and the
    one applied second silently never runs."""
    numbers = sorted(int(p.name[:4]) for p in MIGRATIONS.glob("*.sql"))
    failures = []
    if len(numbers) != len(set(numbers)):
        failures.append("duplicate migration numbers")
    expected = list(range(numbers[0], numbers[-1] + 1))
    if numbers != expected:
        failures.append(f"gap in migration sequence: {sorted(set(expected) - set(numbers))}")
    return failures


def check_nothing_destructive() -> list[str]:
    """Additive only.

    `drop trigger` and `drop policy` are permitted and are the idempotency
    idiom in this repo — both are immediately recreated. Dropping a TABLE,
    COLUMN, CONSTRAINT or the data itself is not, and no billing migration has
    any reason to.
    """
    banned = [
        (r"\bdrop\s+table\b", "drop table"),
        (r"\bdrop\s+column\b", "drop column"),
        (r"\bdrop\s+constraint\b", "drop constraint"),
        (r"\btruncate\b", "truncate"),
        (r"\bdelete\s+from\b", "delete from"),
        (r"\bdrop\s+database\b", "drop database"),
        (r"\bdrop\s+schema\b", "drop schema"),
    ]
    failures = []
    for name in BILLING:
        sql = _strip_comments(_read(name)).lower()
        for pattern, label in banned:
            if re.search(pattern, sql):
                failures.append(f"{name} contains a destructive statement: {label}")
    return failures


def check_idempotent_creates() -> list[str]:
    """Every create must survive a re-run.

    A migration that fails the second time it runs is a migration nobody can
    safely retry after a partial deploy — which is exactly when a retry is
    needed.
    """
    failures = []
    for name in BILLING:
        sql = _strip_comments(_read(name)).lower()
        for stmt, guard in [
            (r"create\s+table\s+(?!if\s+not\s+exists)", "create table without IF NOT EXISTS"),
            (r"create\s+(unique\s+)?index\s+(?!if\s+not\s+exists)", "create index without IF NOT EXISTS"),
            (r"add\s+column\s+(?!if\s+not\s+exists)", "add column without IF NOT EXISTS"),
        ]:
            if re.search(stmt, sql):
                failures.append(f"{name}: {guard}")
    return failures


def check_constraints_are_guarded() -> list[str]:
    """`add constraint` has no IF NOT EXISTS in Postgres, so every one must sit
    behind a pg_constraint existence check or the migration is single-use."""
    failures = []
    for name in BILLING:
        sql = _strip_comments(_read(name))
        added = re.findall(r"add\s+constraint\s+(\w+)", sql, flags=re.IGNORECASE)
        guarded = set(re.findall(r"conname\s*=\s*'(\w+)'", sql, flags=re.IGNORECASE))
        for constraint in added:
            if constraint not in guarded:
                failures.append(f"{name}: constraint {constraint} is not guarded by a conname check")
    return failures


def check_constraint_names_unique() -> list[str]:
    """Constraint names are database-global per table but conventionally unique
    here; a collision means one migration silently skips its own constraint
    because another already claimed the name."""
    seen: dict[str, str] = {}
    failures = []
    for path in sorted(MIGRATIONS.glob("*.sql")):
        sql = _strip_comments(path.read_text(encoding="utf-8"))
        for constraint in re.findall(r"add\s+constraint\s+(\w+)", sql, flags=re.IGNORECASE):
            if constraint in seen and seen[constraint] != path.name:
                failures.append(f"constraint {constraint} defined in both {seen[constraint]} and {path.name}")
            seen[constraint] = path.name
    return failures


def check_policies_and_triggers_are_replaceable() -> list[str]:
    """`create policy` and `create trigger` have no IF NOT EXISTS either; the
    repo's idiom is a preceding DROP ... IF EXISTS."""
    failures = []
    for name in BILLING:
        sql = _strip_comments(_read(name)).lower()
        for created, dropped, label in [
            (r"create\s+policy\s+(\w+)", r"drop\s+policy\s+if\s+exists\s+(\w+)", "policy"),
            (r"create\s+trigger\s+(\w+)", r"drop\s+trigger\s+if\s+exists\s+(\w+)", "trigger"),
        ]:
            for obj in re.findall(created, sql):
                if obj not in re.findall(dropped, sql):
                    failures.append(f"{name}: {label} {obj} created without a preceding DROP IF EXISTS")
    return failures


def check_rls_enabled_on_new_tables() -> list[str]:
    """Every new table must enable RLS and revoke client writes.

    A billing table reachable by `authenticated` is a table a customer could
    write their own invoice into.
    """
    failures = []
    for name in BILLING:
        sql = _strip_comments(_read(name)).lower()
        for table in re.findall(r"create\s+table\s+if\s+not\s+exists\s+public\.(\w+)", sql):
            if f"alter table public.{table} enable row level security" not in sql:
                failures.append(f"{name}: {table} does not enable row level security")
            if not re.search(rf"revoke[\w\s,]*on\s+public\.{table}\s+from", sql):
                failures.append(f"{name}: {table} does not revoke privileges from authenticated/anon")
    return failures


def check_dollar_quotes_balanced() -> list[str]:
    """An unbalanced $$ turns the rest of the file into a string literal, and the
    statements after it silently never run."""
    failures = []
    for name in BILLING:
        count = _read(name).count("$$")
        if count % 2 != 0:
            failures.append(f"{name}: unbalanced dollar-quoted blocks ({count} occurrences of $$)")
    return failures


def check_required_objects_exist_earlier() -> list[str]:
    """Every table and function these migrations reference must be created by a
    migration with a LOWER number. 0021 was rolled back once for exactly this —
    a function body referencing a column a later migration added."""
    failures = []
    earlier = "".join(
        p.read_text(encoding="utf-8")
        for p in sorted(MIGRATIONS.glob("*.sql"))
        if int(p.name[:4]) < 22
    )
    for obj in REQUIRED_OBJECTS:
        bare = obj.split(".", 1)[1]
        if not re.search(rf"\b{bare}\b", earlier):
            failures.append(f"{obj} is referenced but not created by any migration before 0022")
    return failures


def check_no_forward_references() -> list[str]:
    """No billing migration may reference a table that a LATER billing migration
    creates."""
    created_by: dict[str, int] = {}
    for name in BILLING:
        n = int(name[:4])
        for table in re.findall(
            r"create\s+table\s+if\s+not\s+exists\s+public\.(\w+)",
            _strip_comments(_read(name)),
            flags=re.IGNORECASE,
        ):
            created_by[table] = n

    failures = []
    for name in BILLING:
        n = int(name[:4])
        sql = _strip_comments(_read(name))
        for table, made_in in created_by.items():
            if made_in > n and re.search(rf"references\s+public\.{table}\b", sql, flags=re.IGNORECASE):
                failures.append(f"{name} references public.{table}, which {made_in:04d} creates later")
    return failures


def check_money_is_bigint() -> list[str]:
    """Amount columns must be bigint in minor units.

    `integer` overflows above roughly 21 million rupees, which is implausible
    for a monthly charge and entirely plausible for an annual Enterprise
    contract. `numeric`/`float` invite a rupee/paise mix-up, which is a 100x
    billing error in whichever direction hurts most.
    """
    failures = []
    for name in ("0024_billing_payments.sql", "0025_billing_invoices.sql"):
        sql = _strip_comments(_read(name))
        for column, type_ in re.findall(r"^\s*(\w*_minor)\s+(\w+)", sql, flags=re.MULTILINE):
            if type_.lower() != "bigint":
                failures.append(f"{name}: {column} is {type_}, must be bigint (minor units)")
    return failures


def check_provider_is_razorpay_only() -> list[str]:
    """V1 is Razorpay-only. A permissive provider CHECK would let a second
    gateway's rows appear before anyone decided to support one."""
    failures = []
    for name in BILLING:
        sql = _strip_comments(_read(name))
        for allowed in re.findall(r"provider\s+in\s+\(([^)]*)\)", sql, flags=re.IGNORECASE):
            values = {v.strip().strip("'") for v in allowed.split(",")}
            unexpected = values - {"razorpay", "manual"}
            if unexpected:
                failures.append(f"{name}: provider CHECK allows {sorted(unexpected)} — V1 is Razorpay only")
    return failures


def check_no_foreign_gateway_names() -> list[str]:
    """No gateway-specific identifier may survive in a column name. The whole
    point of 0022's rename is that a Razorpay id never sits in a stripe_* column.
    """
    failures = []
    for name in BILLING:
        sql = _strip_comments(_read(name)).lower()
        for token in ("stripe_customer_id", "stripe_subscription_id"):
            # Permitted only inside 0022's guarded rename.
            if token in sql and name != "0022_billing_subscription_state.sql":
                failures.append(f"{name} references {token}")
        for gateway in ("paddle", "braintree", "adyen", "paypal"):
            if gateway in sql:
                failures.append(f"{name} references {gateway} — no foreign provider in this phase")
    return failures


CHECKS = (
    check_files_exist,
    check_no_gaps_or_duplicates,
    check_nothing_destructive,
    check_idempotent_creates,
    check_constraints_are_guarded,
    check_constraint_names_unique,
    check_policies_and_triggers_are_replaceable,
    check_rls_enabled_on_new_tables,
    check_dollar_quotes_balanced,
    check_required_objects_exist_earlier,
    check_no_forward_references,
    check_money_is_bigint,
    check_provider_is_razorpay_only,
    check_no_foreign_gateway_names,
)


def run_all() -> list[str]:
    failures: list[str] = []
    for check in CHECKS:
        failures.extend(check())
    return failures


# ── pytest surface ──────────────────────────────────────────────────────────
def test_files_exist() -> None:
    assert not check_files_exist()


def test_no_gaps_or_duplicates() -> None:
    assert not check_no_gaps_or_duplicates()


def test_nothing_destructive() -> None:
    assert not check_nothing_destructive()


def test_idempotent_creates() -> None:
    assert not check_idempotent_creates()


def test_constraints_are_guarded() -> None:
    assert not check_constraints_are_guarded()


def test_constraint_names_unique() -> None:
    assert not check_constraint_names_unique()


def test_policies_and_triggers_are_replaceable() -> None:
    assert not check_policies_and_triggers_are_replaceable()


def test_rls_enabled_on_new_tables() -> None:
    assert not check_rls_enabled_on_new_tables()


def test_dollar_quotes_balanced() -> None:
    assert not check_dollar_quotes_balanced()


def test_required_objects_exist_earlier() -> None:
    assert not check_required_objects_exist_earlier()


def test_no_forward_references() -> None:
    assert not check_no_forward_references()


def test_money_is_bigint() -> None:
    assert not check_money_is_bigint()


def test_provider_is_razorpay_only() -> None:
    assert not check_provider_is_razorpay_only()


def test_no_foreign_gateway_names() -> None:
    assert not check_no_foreign_gateway_names()


def test_all_checks_pass() -> None:
    """Asserting bridge.

    The checks above RETURN their failures so this file doubles as a standalone
    runner, and pytest treats a returned list as a pass. Without this bridge the
    runner could report FAILED while CI reported green — a defect this repo has
    already been bitten by once. Add a check, add it to CHECKS.
    """
    failures = run_all()
    assert not failures, "\n".join(failures)


if __name__ == "__main__":
    problems = run_all()
    for problem in problems:
        print(f"FAIL: {problem}")
    print("FAILED" if problems else "PASSED")
    sys.exit(1 if problems else 0)
