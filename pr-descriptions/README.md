# Opening the PRs

Five stacked branches, pushed to origin, nothing merged.

| # | Branch | Base (target) |
|---|---|---|
| 1 | `fix/expense-backend-correctness` | `main` |
| 2 | `fix/group-edit-permissions` | branch 1 |
| 3 | `feat/expense-api-fields` | branch 2 |
| 4 | `fix/settlement-wrong-group` | branch 3 |
| 5 | `feat/page-overhauls` | branch 4 |

Open them in order. Each base is the previous branch, so PR 2 is only mergeable
once PR 1 lands.

There is no `gh` CLI on this machine, so the descriptions are written out:

- `pr-descriptions/1-fix-expense-backend-correctness.md`
- `pr-descriptions/2-fix-group-edit-permissions.md`
- `pr-descriptions/3-feat-expense-api-fields.md`
- `pr-descriptions/4-fix-settlement-wrong-group.md`
- `pr-descriptions/5-feat-page-overhauls.md`

Or from GitHub's UI:

```
compare/main...fix/expense-backend-correctness?expand=1
```

then swap `main` for the previous branch as you go.

## Before merging

- **PR 1 carries migration `0008`**, which rewrites `expenses.amount` and
  `expenses_expensepayer.amount_paid` under an `ACCESS EXCLUSIVE` lock. It is
  unapplied on the dev database. Run `python manage.py migrate` deliberately
  rather than letting it run on first production deploy.
- **PR 5's UI is not visually verified.** No browser was connected during this
  work. Compile checks and tests pass; nobody has looked at the layouts.

## Housekeeping

- `feat/dashboard` still exists at the old squashed commit. Delete it — PRs
  opened from it would undo the split.
- `backup/pre-split-3e0c41b` is a local tag on the original monolith, kept so
  you can diff against it. Safe to delete once the PRs land.