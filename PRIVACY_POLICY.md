# Privacy Policy — where it lives

⛔ **This file is no longer the privacy policy.** The policy is
**[`docs/privacy.html`](docs/privacy.html)**, published at
<https://jsnyde03.github.io/Set_Aside_Tracker/privacy.html> — that URL is what the app links to
(`apps/mobile/src/premium/legal.ts`), what App Store Connect points at, and what a user actually
reads. **Edit that file. There is no second copy, deliberately.**

## Why this file stopped being a copy _(retired 2026-09-21, [D16])_

It had drifted, and not cosmetically. The markdown said crash reporting and analytics were
*"neither currently active"*, that *"we don't transmit your data anywhere at all"*, and that there
were no third parties. By then **Sentry was live in release builds** (DSN wired in `codemagic.yaml`)
and the hosted page correctly named **Sentry and PostHog** as processors.

Nothing linked to this file, so nobody was ever shown the false version. The danger was the next
person told to "update the privacy policy": the markdown is the obvious thing to edit, and
publishing from it would have replaced a correct disclosure with a claim that no data is shared with
anyone. **A second copy of a legal document is a liability, not a convenience.**

## What to do when data handling changes

1. **Edit `docs/privacy.html`** and move its "Last updated" date.
2. **Update the App Store Connect privacy labels** to match. The policy text and the labels are two
   separate declarations to Apple and both have to be true.
3. **Check whether the change needs a new permission string** in `apps/mobile/app.json` — an
   `NSLocation…`/`NSCamera…`-style usage description is a third place the same claim appears, and it
   is the one a reviewer sees first.

⚠️ **The policy constrains the code, not only the other way round.** It states that trip locations
are never stored and never transmitted — only the resulting mileage number is saved. That sentence
is a requirement on how mileage capture is implemented, and a change there is a change here.
