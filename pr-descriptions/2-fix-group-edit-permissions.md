# PR 2 — `fix/group-edit-permissions` → `fix/expense-backend-correctness`

> Base is PR 1, not `main` — these branches are stacked.

## The edit-group dialog could not save

Three defects, all of which made the screen unusable.

**1. Saving without renaming was impossible.** The uniqueness check was:

```python
Group.objects.filter(name__iexact=value).exists()
```

It matched the group being edited against **itself**, so submitting with an
unchanged name returned `400 "A group with this name already exists."` You could
only save by also renaming the group, which makes editing a description
impossible. Now excludes the current group, and a case-only change no longer
collides.

**2. "Remove image" did nothing.** It cleared the form field, so no
`group_image` key was sent — and the backend reads an absent key as "leave the
image alone". Removal is now an explicit signal: the client sends
`group_image=''` and the service distinguishes absent from explicit null.

This needed a `to_internal_value` override, because DRF *drops* empty multipart
fields during validation and it would otherwise read as "no change" again.

**3. Admins could not edit their own group.** `update_group` compared
`group.created_by` against the requester, so an admin who was not the original
creator was rejected — while the UI offered them the button. Now checks
membership role, matching the expense endpoints.

## Dialog rework

- Errors render inline instead of only reaching the console. A rejected save
  used to leave the user staring at a dialog that appeared to do nothing.
- Save is disabled until something changes.
- Image validated client-side (5MB, JPEG/PNG/WebP) with a specific message.
- Character counters on name and description.
- Object URL for a picked image is revoked when replaced — the old effect could
  strand a previously-created blob.
- Edit/Delete hidden from non-admins rather than offered and then refused.
- `aria-invalid` on invalid fields, labels wired via `htmlFor`.

## Testing

69 → 81 tests, all passing. 12 new covering: description-only edit, case-only
rename, real duplicate still rejected, admin-can-edit, member 403, non-member
404, image removal vs. omission, blank name.

> One test asserts on the serializers rather than through the endpoints. Group
> creation without an image returns 500 for an unrelated **pre-existing** reason
> on `main` (`create_group()` requires a `group_image` kwarg that the optional
> serializer omits), which would mask the assertion. Not fixed here — it's
> unrelated to this work. Happy to do it as its own PR.

---
**Next:** `feat/expense-api-fields`