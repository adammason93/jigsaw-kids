# Phase 2 — Canonical Wondii design system

Recorded 30 September 2026. Phase 3 has not started.

The system is opt-in. Loading the token file does not restyle a legacy page. A surface uses `css/wondii-system.css` classes on purpose. `css/wondii-p1.css` remains the older skin that reaches into existing class names. New work should use the system classes, not add another override to the P1 skin.

Internal reference: `/design-system.html` (`design-system.html`). It is `noindex` and is not linked from customer navigation.

## Principles

Wondii should feel playful, polished, warm, imaginative, and clear: premium children's publishing with a calm educational product and a little game-like delight.

Public and family surfaces can be warmer and more exploratory. Schools stay calmer. Classroom presentation can be larger and more immersive. Admin can be denser. They share type, space, radius, buttons, focus, and motion. They do not have to look identical.

## Token architecture

Existing names stay, so the P1 skin does not shift:

| Current | Where it already lives | Canonical token |
| --- | --- | --- |
| `#141b4d` | Portal, school, P1 buttons, `js/organisation.js` | `--w-color-brand` / `--w-ink` |
| `#5c6284` | Muted labels | `--w-text-muted` / `--w-soft` |
| `#f6f5fc` | Page paper | `--w-surface-page` / `--w-paper` |
| `#fffdfb` | Cards | `--w-surface-card` / `--w-card` |
| `rgba(20, 27, 77, 0.08)` | Hairline | `--w-border-soft` / `--w-line` |
| `22px` / `28px` | Cards and sheets | `--w-radius-md` / `--w-radius-lg` |
| `0 10px 26px …` / `0 18px 50px …` | Cards and overlays | `--w-shadow-soft` / `--w-shadow-raised` |
| Nunito | Body, buttons, labels | `--w-font-body` |
| Fredoka | Titles | `--w-font-display` |
| `#0f9f6e` | Success | `--w-color-success` |
| `#e11d48` | Danger. Also used as a teacher CTA in `org-portal.css` | `--w-color-danger`. Primary actions use navy, not this red |
| `#c41230` | Ramsden accent in `schools/ramsden.js` and some lesson chrome | `--school-accent` when `[data-school="ramsden"]` or `--org-primary` |
| Sniglet | Older family game titles | Not canonical. Leave on game boards until those games migrate |
| Lora, Schoolbell, Kalam, Patrick Hand, Comic Neue | Storybook reading faces | Story reading may use `--w-font-story` (Lora). The others stay storybook-only |

Semantic tokens cover surface, text, action, space (`--w-space-1` to `--w-space-8`), radius, shadow (flat, soft, raised, overlay), motion, and z-index. There is no token per component.

`--w-accent` still follows `--org-primary` for older classroom buttons. New components do not use it for body text, success, warning, or error.

## School theme

```css
--school-primary
--school-primary-soft
--school-accent
--school-on-accent
--school-logo
--school-hero-treatment
```

Default accent follows the organisation colour already applied by `js/organisation.js` (`--org-primary`). Ramsden is configuration:

`[data-school="ramsden"]` sets the accent to `#c41230` and a soft red wash.

Primary buttons stay navy. Error, success, warning, and body text do not take the school colour. A school-branded action uses `.w-btn--school`. The showcase toggles Default Wondii and Ramsden on the same components.

## Typography

One font link for new surfaces:

`Fredoka` 500, 600, 700 and `Nunito` 400, 600, 700, 800, with `display=swap`.

| Role | Face |
| --- | --- |
| Display, H1, H2, H3, classroom display | Fredoka |
| Body, small, label, button | Nunito |
| Expressive story | Lora, loaded only where a story is read |

Game pages that still import Sniglet were not changed.

## Components

All of these live in `css/wondii-system.css`:

- Buttons: primary, secondary, quiet, danger, icon, classroom (`--room`), loading, disabled, focus-visible
- Cards: standard, interactive, feature, class, content panel, raised classroom panel
- Forms: input, textarea, select, checkbox, radio, segmented choice, file, search, invalid, help, disabled
- Dialog: native `<dialog>` with title, description, actions, close, and a destructive variant
- Icons: 24px grid, 1.75 stroke, round caps, `currentColor`. Decorative character art is separate. Emoji is not a UI icon in the system
- Avatars: tiny, small, standard, large, classroom; selected, active, celebrating, inactive
- Feedback: success, warning, error, information, correct, try again, saved, pending
- Loading: inline spinner, button loading, skeleton, classroom spinner
- Empty: title plus one next step
- Shell: `.w-page`, `.w-wrap`, `.w-section`, `.w-title`, `.w-toolbar`

## Motion, depth, responsive, accessibility

Motion is short (`140ms` / `220ms`) and used for hover, press, and loading. `prefers-reduced-motion` removes those animations.

Depth is flat, soft, raised, or overlay. Cards use the soft shadow. Dialogs use the overlay shadow.

Context expectations, not a retrofit of every page:

| Context | Expectation |
| --- | --- |
| Public | Desktop, tablet, and mobile |
| Family | Desktop, tablet, and mobile |
| Teacher portal | Desktop and tablet first |
| Classroom | 16:9 board first |
| Admin | Desktop first |

Shared controls use a visible focus ring, 44px targets (64px for classroom actions), disabled buttons, and native dialog focus behaviour.

## Pilots

1. Public home bar buttons on `index.html` (PUB-001).
2. Teacher today hero actions, search field, and empty class state in `schools/learn/home.js` (SCH-001). The rest of that dashboard is unchanged.
3. Join screens in `schools/learn/join.js` (CLS-038, CLS-039, CLS-040, CLS-042).

Family game boards were not migrated.

## Migration guidance

Add `css/wondii-tokens.css` and `css/wondii-system.css` after the page's own stylesheet. Replace one surface's buttons, fields, and cards with the `w-` classes. Do not add global element selectors to the system file. Do not extend `wondii-p1.css` for new work.

## Visual check

Rendered in headless Chrome: the showcase at desktop and tablet width, the Ramsden theme (accent button red, primary button navy), an open dialog, and a 16:9 classroom frame with a visible focus ring. Join and the public home bar were rendered. The signed-in teacher dashboard was not opened; the hero, search, and empty-class markup were rendered with `org-portal.css` and the system stylesheet.

## Tests

`node tests/school-ownership.test.js` passed after this phase. School ownership and persistence code was not changed.
