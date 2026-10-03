# PR 1 — `fix/expense-backend-correctness` → `main`

## Bug: every expense update and delete returned 500

`_get_manageable_expense` in `apps/expenses/services.py` referenced
`GroupMembership` without importing it:

```
NameError: name 'GroupMembership' is not defined
```

This affected every `PATCH /expenses/{id}/update/` and
`DELETE /expenses/{id}/delete/`. 11 tests were already failing on `main`.

## Also in this PR

**Sub-cent amounts are now rejected on create and update.** Shares are stored
as whole cents, so `0.00001` across three people floors to `0 + 0 + 0` and the
expense silently does not add up to its own total.

**The exact/percentage split engine** that migration `0008`'s wider decimal
precision exists to support, plus a test suite for it:

- share arithmetic reconciled across amount × participant combinations,
  including sub-cent and many-way splits
- split type switching, payer replacement, rollback on invalid input
- API contract tests for create/update/delete

## ⚠️ Migration `0008` — read before deploying

Widens `expense.amount` and `expense_payer.amount_paid` from
`decimal_places=2` to `5`.

This **rewrites both tables** and takes an `ACCESS EXCLUSIVE` lock. It is
currently unapplied on the dev database:

```
[X] 0007_alter_category_icon
[ ] 0008_alter_expense_amount_alter_expensepayer_amount_paid
```

Apply it deliberately rather than letting it run on first production deploy:

```bash
python manage.py migrate
```

Worth rehearsing against a production-sized dataset first.

## Testing

74 → 69 tests (net +test files reorganised), all passing. `ruff` clean — no new
issues; the 5 remaining are pre-existing on `main`.

## Notes

`config/settings/verify.py` is a throwaway SQLite settings module used to run
the suite without touching a real database. It is not referenced by any deploy
config or script. Happy to delete it if you'd rather not carry it.

---
**Next:** `fix/group-edit-permissions`