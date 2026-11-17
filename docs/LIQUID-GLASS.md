# Liquid glass: design guide

How to build this app's "liquid glass" look and motion so that it comes out the same every
time, in this repo or in another project. It is modeled on Apple's iOS 26 design:

- clear glass controls floating over the page;
- frosted glass sheets;
- capsule buttons;
- a glass pill that lifts, slides and settles like a drop of liquid, in the tab bar and in every
  segmented control.

**Source of truth:** the code. This guide explains it and gives every number. If you change a
value, change it in both places.

| What                                 | Where                                                   |
| ------------------------------------ | ------------------------------------------------------- |
| Materials, tokens, every glass class | `apps/web/src/index.css`, section "Liquid glass"        |
| Pill engine (springs, lens, drag)    | `apps/web/src/components/useLiquidPill.ts`              |
| Spring and shape math (pure)         | `apps/web/src/lib/tabPill.ts` (+ `.test.ts`)            |
| Tab bar and "+"                      | `apps/web/src/components/BottomNav.tsx`                 |
| Segmented control                    | `apps/web/src/components/SegmentedControl.tsx`          |
| Button and icon-button class strings | `apps/web/src/components/ui.ts`                         |
| Sheet (popup)                        | `apps/web/src/components/Sheet.tsx`                     |
| Headers, month switcher, toast       | `SubPageHeader.tsx`, `MonthSwitcher.tsx`, `Toaster.tsx` |
| Behavior tests                       | `e2e/tests/bottom-nav.spec.ts`, `segmented.spec.ts`     |

## 1. Where glass goes, and where it doesn't

Glass is for the **layer of controls floating above the content**. It is never used for the
content itself. That is Apple's rule too: glass on glass, or glass on every card, turns into
noise.

| Glass                                                         | Not glass (stays solid)              |
| ------------------------------------------------------------- | ------------------------------------ |
| Tab bar, "+" button                                           | Cards, list rows, charts             |
| Sheets (popups), toasts                                       | Text, amounts, badges                |
| Buttons (primary, secondary, danger)                          | Inputs and chips (a light fill only) |
| Round icon buttons: back, close, header actions, month arrows | Category tiles, avatars              |
| Segmented control pill                                        |                                      |
| Bars over scrolling content (as a fade, the "scroll edge")    |                                      |

## 2. Principles

- **Clear, not frosted, for controls over the page.**
  - Use a very thin tint, a barely-there blur (2px) and strong saturation, so the page's colors
    come through.
  - 6px blur or a thick inner glow reads as frosted plastic. 1px leaves text behind readable
    through the labels.
  - The user asked twice for "more transparent, less blur": don't drift back toward frosted.
- **Frosted only where you read and type** (sheets, toasts). Blur enough that the page behind
  can't fight the form, but keep a visible tint of what's behind.
- **One rim everywhere.** Light comes from the top-left: the rim is brightest on the top and
  left edges and dimmer on the bottom and right. A thin inner glow runs along the edges. Every
  glass element shares the same tokens, so they all look lit by the same light.
- **The color lives in the pill.** Real options are never colored. The chosen look is carried
  only by the pill's copy, so an option the pill has left is never highlighted twice.
- **The lens shows our own content.**
  - Real refraction needs the pixels behind an element. JavaScript can't read them (a security
    rule), and Safari ignores `backdrop-filter: url(#svg)`.
  - What is under a pill, though, is our own options, so we draw a magnified copy instead. That
    works in every browser.
- **Pressed glass swells, it doesn't sink.**
  - Round buttons grow to 1.08×, wide buttons to 1.03×, with a slight brightening and an
    overshooting curve.
- **Motion is liquid:** lift, slide on a slightly bouncy spring, stretch with speed, settle.
  Never a linear tween.

## 3. Tokens and materials

All values: light first, dark in brackets. `white/0.3` means `rgb(255 255 255 / 0.3)`, and
`slate-900` is `rgb(15 23 42)`. Every `backdrop-filter` also gets the `-webkit-` prefix for
Safari.

**Shared tokens** (on `:root`, redefined for dark):

| Token               | Value                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--glass-rim`       | `inset 1.5px 1.5px 0 -0.5px white/0.95, inset -1px -1px 0 0 white/0.7, inset 0 0 0 0.5px white/0.6, inset 0 0 6px 0 white/0.3` [`0.28, 0.1, 0.14, 0.06`] |
| `--glass-rim-soft`  | for colored glass: `… white/0.5, … white/0.15, … white/0.2, inset 0 0 8px 0 white/0.12` [`0.3, 0.08, 0.12, 0.06`]                                        |
| `--glass-edge`      | `0 0 0 0.5px slate-900/0.08` [none]: an outer hairline so glass holds its edge on white                                                                  |
| `--glass-shadow`    | `0 10px 28px -8px slate-900/0.25` [`black/0.55`]                                                                                                         |
| `--glass-shadow-sm` | `0 4px 12px -4px slate-900/0.2` [`black/0.5`]                                                                                                            |

**Materials:**

| Class                      | Tint                                    | Backdrop                    | Shadow                                                  |
| -------------------------- | --------------------------------------- | --------------------------- | ------------------------------------------------------- |
| `.glass` (clear)           | `white/0.1` [`slate-900/0.22`]          | `blur(2px) saturate(190%)`  | rim + edge + `--glass-shadow`                           |
| `.glass-regular` (frosted) | `white/0.62` [`slate-900/0.66`]         | `blur(20px) saturate(180%)` | rim + edge + `--glass-shadow`                           |
| `.glass-sm` (modifier)     |                                         |                             | swaps in `--glass-shadow-sm` (icon buttons)             |
| `.btn-primary` (tinted)    | `rgb(5 150 105 / 0.92)` (emerald-600)   | none                        | rim-soft + `0 6px 16px -6px emerald/0.55` [`black/0.5`] |
| `.btn-secondary` (clear)   | `white/0.55` [`white/0.08`]             | none                        | rim + edge + `--glass-shadow-sm`                        |
| `.btn-danger` (tinted)     | `rgb(244 63 94 / 0.1)` [`/0.14`] (rose) | none                        | rim + edge + `--glass-shadow-sm`                        |

- Tint, blur and saturation are the variables `--glass-tint`, `--glass-blur` and
  `--glass-saturate`.
- Buttons get no `backdrop-filter`: there are many of them, and their tint is strong enough on
  its own.

**Press:**

- `.glass-button` (round) swells to `scale(1.08)` with `brightness(1.1)`.
- `.glass-press` (wide) swells to `scale(1.03)` with `brightness(1.06)`.
- Both on `transform 360ms cubic-bezier(0.3, 1.5, 0.5, 1)`.

## 4. Components

### Tab bar and "+"

```
            fade under the bar (.nav-scrim)
 ╭──────────────────── capsule (.glass) ────────────────────╮   ╭───────╮
 │ ╭─pill─╮                                                 │   │       │
 │ │ ⌂    │    ⇄           🐷          🤲                   │   │   +   │  (.glass .glass-button)
 │ │Beranda│ Transaksi   Tabungan     Hutang                │   │       │
 │ ╰──────╯                                                 │   ╰───────╯
 ╰──────────────────────────────────────────────────────────╯
```

| Thing               | Value                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------- |
| Nav container       | `fixed inset-x-0 bottom-0 z-20`, `pointer-events: none` (children opt in)                 |
| Bottom gap          | `env(safe-area-inset-bottom) + 0.625rem`                                                  |
| Row                 | `max-w-md mx-auto px-4 flex items-center gap-2.5`                                         |
| Capsule             | `.glass`, height `3.875rem` (62px), `rounded-full`, padding 4px, `flex-1`                 |
| Slots and pill      | 4 equal slots; at rest the pill is exactly one slot (54px tall)                           |
| Tab content         | icon 24px, gap 2px, label 11px `font-medium`, `slate-800` [`slate-100`]                   |
| Chosen tab (copy)   | `emerald-600` [`emerald-400`]                                                             |
| "+"                 | 62px circle, `.glass .glass-button`, icon 28px, stroke 2.5, `slate-900` [white], like iOS |
| Scrim `.nav-scrim`  | from 1.5rem above the bar: `slate-50/0.2 → 0` [`slate-950/0.2 → 0`]                       |
| Page bottom padding | `env(safe-area-inset-bottom) + 5.5rem`; toasts sit at `+ 6rem`                            |

**Nav pill `.nav-pill`.** It has two layers, so each fades on its own:

- **Resting:** a faint shade, `slate-900/0.08·(1−lift)` [`white/0.12·(1−lift)`].
- **Lifted:** a clear lens.
  - Light layer: a `white/0.28·lift → 0.12·lift` gradient [`0.14 → 0.06`].
  - Rim, scaled by lift: `inset 1.5px 1.5px 0 -0.5px white/0.95·lift`,
    `inset -1px -1px 0 0 white/0.6·lift`, `inset 0 0 10px 0 white/0.5·lift`.
  - Shadow: `0 10px·lift 24px·lift -4px slate-900/0.25·lift`.

The "+" sits beside the capsule, never in its middle, where the pill would have to slide over
it.

### Segmented control

- **Track `.segmented`:** a recessed shade, `slate-900/0.07` [`white/0.08`], `rounded-full`,
  padding 4px. It is a shade so it works both on the page and on a glass sheet.
- **Options:** 36px tall (`h-9`), `text-sm font-medium`, `slate-600` [`slate-300`]. The copy
  in the pill is `slate-900` [white].
- **Pill `.seg-pill`:**
  - Resting, like iOS: a solid white pill, `white/(1 − 0.72·lift)` [`white/(0.2 − 0.08·lift)`],
    with `0 1px 3px slate-900/0.12`.
  - Lifted: it turns into the clear lens, with the same rim and shadow terms as the nav pill.
- The row has `touch-action: pan-y`, so a vertical swipe on it still scrolls the page or sheet,
  and a sideways one drags the pill. The tab bar uses `none`.

### Sheets (popups)

| Thing                  | Value                                                                                                                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Material               | `.glass-regular`                                                                                                                                                                                                                  |
| Geometry               | floats 8px above the bottom edge and from the sides: `mb-2 w-[calc(100%-1rem)]`, `rounded-[2rem]` all round, `max-h-[calc(92dvh-0.5rem)]`                                                                                         |
| Hidden                 | `translate3d(0, calc(100% + 2rem), 0)`, so the gap and shadow are gone too                                                                                                                                                        |
| Backdrop               | `::backdrop` dims with `slate-950/0.3` and no blur; the sheet's own blur softens what is behind it                                                                                                                                |
| Header and footer bars | clear while nothing is under them. When content scrolls beneath them (`data-scrolled` / `data-stuck`), they frost over: `white/0.6` [`slate-900/0.6`] + `blur(16px) saturate(180%)`, with a `slate-900/0.1` [`white/0.1`] divider |
| Grab handle            | `slate-900/0.15` [`white/0.25`]                                                                                                                                                                                                   |
| Close button           | round glass icon button                                                                                                                                                                                                           |

Content inside sheets stays content: inputs are `white/0.8` [`slate-950/0.4`] with a
`slate-900/0.1` [`white/0.1`] border. Chips are `white/0.7` [`white/0.05`]. Info boxes are
`slate-900/0.05` [`white/0.05`]. None of them are glass.

### Buttons

- **Wide buttons:** capsules (`rounded-full`), 48px tall, `font-semibold`, made of
  `.btn-primary`, `.btn-secondary` or `.btn-danger` plus `.glass-press`.
- **Icon buttons:** `glassIconButtonClass` = `.glass .glass-sm .glass-button`, a 40px circle,
  `slate-800` [`slate-100`] icon. They are used for back, close, header actions and month
  arrows. The filter button next to search is the same at 48px, and the search field is a
  capsule.

### Toasts

`.glass-regular`, `rounded-3xl`, text `slate-900` [white]. The undo action is `emerald-700`
[`emerald-300`].

### Scroll edges

Instead of a solid sticky bar, the page fades and softens toward it (iOS's scroll edge effect):

- `.scroll-edge` (sticky header) and `.scroll-edge-bottom` (the full-page form's Simpan bar)
  draw a `::before` behind the bar.
- It extends 1.25rem past the bar, with `z-index: -1`.
- It gets a gradient from the page color `/0.9` to 0, plus `blur(6px)`.
- A mask fades it out from 55% toward the content.

## 5. The liquid pill (`useLiquidPill`)

```ts
const { refs, handlers } = useLiquidPill(index, count, onPick)
```

- `index` is the chosen slot (-1 hides the pill).
- `count` is the number of equal slots.
- `onPick(slot)` is called when a drag ends on another slot.
- The bottom nav passes the route's tab and `navigate`. A segmented control passes its value's
  index and `onChange`.

**Markup** (back to front, inside `refs.row` = `.liquid-row`, which takes `handlers`):

1. `refs.links` = `.liquid-links`: the real options in a grid, always in the resting color. A
   mask gives them a see-through **hole** under the pill, between `--hole-start` and
   `--hole-end`, with soft edges (3px out, 5px in).
2. `refs.pill` = `.liquid-pill`, `aria-hidden`, `pointer-events: none`:
   - `refs.shape` = `.liquid-shape` plus `.nav-pill` or `.seg-pill`: the pill's own glass.
   - `refs.lens`: a `rounded-full overflow-hidden` box with the same transform. It holds
     `refs.copy`, a copy of all options in the chosen style, laid out exactly like the real
     ones (same cell classes).

**Springs** (damped, semi-implicit Euler, 1/240s substeps, `dt` capped at 1/20s):

| Spring | Stiffness (1/s²) | Damping ratio | Feel                                 |
| ------ | ---------------- | ------------- | ------------------------------------ |
| Slide  | 320              | 0.72          | ~4% overshoot, at rest in under 0.9s |
| Lift   | 260              | 0.95          | soft rise and fall, no bounce        |

Rest is reached when |value − target| < 0.05 and |velocity| < 0.5. Lift aims for 1 while the
pill moves (|x − target| ≥ 0.5 or |v| ≥ 5 px/s) or is dragged, and for 0 otherwise.

**Shape** (`pillShape(v, lift)`, with `v` in px/s):

```
stretch = min(|v| / 3200, 0.22)
scaleX  = (1 + stretch)        × (1 + 0.14·lift)   // longer along the path, wider when lifted
scaleY  = (1 − 0.45·stretch)   × (1 + 0.26·lift)   // thinner when fast, taller than the track when lifted
magnify = 1 + 0.12·lift                            // what shows through the lens
```

**Per frame**, in one `requestAnimationFrame` loop that writes styles directly (no React
state), and stops at rest. Here `x` is the pill's left edge and `w` the slot width:

- pill: `translate3d(x, 0, 0)` and `--lift`.
- shape and lens: `scale(scaleX, scaleY)`.
- copy: `transform-origin: (x + w/2)px 50%`, then
  `translate3d(−x, 0, 0) scale(magnify/scaleX, magnify/scaleY)`. This lines the copy up with
  the real options and undoes the stretch, leaving an even magnification around the pill's
  center.
- hole: `x + w/2 ± (w/2)·scaleX`.

**Interaction:**

- **Tap:** the real option's own click (a `NavLink`, or a radio button).
- **Drag:**
  - After 8px of sideways movement, call `setPointerCapture`. The pill's center then glides to
    the finger, clamped with up to 12% of a slot of rubber band past either end.
  - On release, take `round(x / w)` and call `onPick`.
  - Clicks are swallowed for 500ms after a drag.
- Options need `draggable={false}`. Otherwise a mouse drag in Chromium starts a native link
  drag and cancels the pointer stream.
- When `index` becomes -1 (e.g. `/laporan`), the pill fades out (150ms) and the hole closes.
  When a slot is chosen again, the pill appears in place, without sliding in.

## 6. Accessibility and fallbacks

- The pill and the copy are `aria-hidden`. Only the real options carry names and
  `aria-current` or `aria-checked`.
- **Focus:** options get a 2px `emerald-500` outline. The chosen one is covered by the pill,
  so its ring is drawn on the pill instead (`.liquid-row:has(…:focus-visible) .liquid-shape`).
  Glass icon buttons get an outline at 3px offset.
- **`prefers-reduced-motion`:** the pill jumps, with no spring, lift or stretch. Pressed
  buttons don't scale. Sheets and toasts only fade.
- **`prefers-reduced-transparency`, or no `backdrop-filter`:** everything becomes solid.
  `.glass` turns `slate-100` [`slate-800`], and `.glass-regular` and the frosted sheet bars
  turn white [`slate-900`].
- **On-screen keyboard up** (`html[data-keyboard]`): the tab bar is hidden.

## 7. Browser support

| Feature                          | Chromium                                                       | Safari (iOS/macOS) | Firefox |
| -------------------------------- | -------------------------------------------------------------- | ------------------ | ------- |
| Blur and saturate behind glass   | yes                                                            | yes (`-webkit-`)   | yes     |
| Lens (magnified copy, hole mask) | yes                                                            | yes                | yes     |
| Refracting the page behind glass | possible via `backdrop-filter: url(#svg)`, **not implemented** | no                 | no      |

Playwright's WebKit build for Windows does **not** paint `backdrop-filter`, so blur can only be
checked on a real iPhone or Mac.

## 8. Pitfalls already hit

- **Coloring the real chosen option** highlights two options while the pill is dragged away.
- **A ghost label under the lifted pill.** Without the hole, the real label shows through the
  clear lens next to its magnified copy.
- **A thick inner glow (12px at 0.4)** turns clear glass milky. Keep it at 6px/0.3.
- **A solid fill under a floating sheet** (the old "pull-up gap" box-shadow) shows through
  glass. Floating sheets need no gap fill. Their hidden position must clear the margin and the
  shadow.
- **`position: fixed` inside an animated or transformed ancestor** positions against that
  ancestor. The nav must stay outside the page frame that animates on navigation.
- **Never `cancel()` or `finish()` a running page-entrance animation** (`lib/pageMotion.ts`).
  In Chromium under load, that can leave the page unclickable.
- **Re-rendering React every frame** for the pill is janky on mid-range Android. Write the
  styles directly.

## 9. Checking your work

1. **Unit tests:** `npm test -w @finance/web` (`tabPill.test.ts`: slot matching, nearest slot,
   spring settles with a small overshoot and stays stable on slow frames, shape limits).
2. **e2e tests:** `E2E_PORT=5180 npm run test:e2e`.
   - `bottom-nav.spec.ts`: the pill follows the route, hides outside the tabs, can be dragged,
     a wobbly press is still a tap, and it doesn't slide with reduced motion.
   - `segmented.spec.ts`: tap or drag to choose, and only the real options are announced.
3. **Screenshots** in light and dark:
   - the tab bar over white and over colorful content, and mid-slide;
   - a segmented control at rest and mid-drag;
   - a short sheet, and a long one scrolled (frosted header);
   - a sub page with header buttons, scrolled;
   - a toast.

   What to look for:
   - page colors come through clear glass;
   - nothing looks milky;
   - one rim, brighter top-left, everywhere;
   - exactly one highlighted option;
   - no doubled label under a lens;
   - text on sheets is crisp.
4. **Mutation check:** break one piece on purpose (e.g. remove `draggable={false}`, the
   reduced-motion branch, or the `onPick` call) and confirm a test fails.

## 10. Not done yet (ideas)

- **Edge refraction in Chromium:** `backdrop-filter: url(#lens) blur() saturate()` with an SVG
  `feDisplacementMap` fed by a displacement map drawn for the element's size, with today's look
  as the fallback for Safari and Firefox.
- **Adaptive tint:** clear glass darkens over dark content and lightens over light content, as
  iOS does. That would need the page's colors under the bar.
- **Sheet detents:** in iOS, a sheet becomes opaque and edge-to-edge when pulled to full
  height.
