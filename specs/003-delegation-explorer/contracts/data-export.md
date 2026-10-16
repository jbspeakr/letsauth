# Export: `/explorer/data.json`

```jsonc
{
  "version": 1,                  // bumps on a breaking change of this shape
  "generatedAt": "2026-10-15T00:00:00.000Z",
  "license": "CC BY 4.0",
  "source": "https://letsauth.eu/explorer/",
  "scenarios": [ /* every data/scenarios/*.yaml as validated, ordered by id */ ]
}
```

Additive changes (a new optional field on a step or toggle) keep `version` 1. Removing or
renaming a field, or changing the meaning of `replaces`, bumps it.
