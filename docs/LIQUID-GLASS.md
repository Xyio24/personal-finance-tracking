# Liquid glass: design guide

How to build the bottom navigation's "liquid glass" look and motion so that it comes out the
same every time, in this repo or in another project. It is modeled on Apple's iOS 26 tab bar:
a clear glass capsule floating over the page, with a glass pill under the current tab that
lifts, slides and settles like a drop of liquid.

**Source of truth:** the code. This guide explains it and gives every number. If you change a
value, change it in both places.

| What                         | Where                                        |
| ---------------------------- | -------------------------------------------- |
| Markup, pill engine, drag    | `apps/web/src/components/BottomNav.tsx`      |
| Spring and shape math (pure) | `apps/web/src/lib/tabPill.ts` (+ `.test.ts`) |
| Materials (CSS)              | `apps/web/src/index.css`, "Liquid glass"     |
| Behavior tests               | `e2e/tests/bottom-nav.spec.ts`               |

## 1. Anatomy

```
            fade under the bar (.nav-scrim)
 ╭──────────────────── capsule (.glass) ────────────────────╮   ╭───────╮
 │ ╭─pill─╮                                                 │   │       │
 │ │ ⌂    │    ⇄           🐷          🤲                   │   │   +   │  (.glass-button)
 │ │Beranda│ Transaksi   Tabungan     Hutang                │   │       │
 │ ╰──────╯                                                 │   ╰───────╯
 ╰──────────────────────────────────────────────────────────╯
```

Inside the capsule, from back to front:

1. **Glass**: the capsule's tint, blur and rim (`.glass`).
2. **Real tabs**: four `NavLink`s in a 4-column grid (`.tab-links`), always in the resting
   color. They get a see-through **hole** where the pill is (a CSS mask), so nothing shows
   twice under clear glass.
3. **Pill** (`.tab-pill`, `aria-hidden`, `pointer-events: none`), on top of the tabs:
   - **shape** (`.tab-pill-glass`): the pill's own glass. It stretches and grows.
   - **lens**: a clipping capsule with the same transform. It holds a **copy** of all four
     tabs in the active color, aligned to the real ones and magnified while lifted. The copy is
     what you "see through" the pill.

The "+" is a separate round glass button tinted with the brand color, to the right of the
capsule. Don't put it in the middle of the capsule: the pill would have to slide over it.

## 2. Principles (why it looks the way it does)

- **Clear, not frosted.** Use a thin tint, a light blur and strong saturation, so the page's
  colors come through vividly. Blur only enough that text behind the glass can't be read
  (6px). Heavy blur plus a heavy tint reads as plastic, not glass.
- **Light comes from the top-left.** The rim is brightest on the top and left edges and
  dimmer on the bottom and right. A frosty inner glow runs along all edges. A soft shadow below
  lifts the capsule off the page.
- **The color lives in the pill.** The real tabs are never colored. The active color is
  carried only by the pill's copy, so a tab the pill has left (sliding or dragged away) is never
  colored twice.
- **The lens shows our own content.** Real refraction needs the pixels behind an element.
  JavaScript can't read them (a security rule), and Safari ignores `backdrop-filter: url(#svg)`.
  What is under the pill, though, is our own tabs, so we draw a magnified copy instead. That
  works in every browser.
- **Motion is liquid:** lift off the bar, slide on a slightly bouncy spring, stretch with
  speed, settle back. Never a linear tween.

## 3. Layout

| Thing               | Value                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| Nav container       | `fixed inset-x-0 bottom-0 z-20`, `pointer-events: none` (children opt in)   |
| Bottom gap          | `env(safe-area-inset-bottom) + 0.625rem`                                    |
| Row                 | `max-w-md mx-auto px-4 flex items-center gap-2.5`                           |
| Capsule             | height `3.875rem` (62px), `rounded-full`, padding `0.25rem` (4px), `flex-1` |
| Slots               | 4 equal columns; slot width = row width / 4                                 |
| Pill at rest        | exactly one slot (so 54px tall, inset 4px inside the capsule)               |
| "+" button          | `3.875rem` circle, icon 28px (`size-7`), white                              |
| Tab content         | icon 24px (`size-6`), gap 2px, label 11px `font-medium`, truncated          |
| Scrim               | from 1.5rem above the bar to the bottom edge                                |
| Page bottom padding | `env(safe-area-inset-bottom) + 5.5rem`                                      |
| Toasts              | `bottom: env(safe-area-inset-bottom) + 6rem` (above the bar)                |

Colors (Tailwind palette): tab labels `slate-800` (dark: `slate-100`). The active color, i.e.
the copy inside the pill, is `emerald-600` (dark: `emerald-400`).

## 4. Materials

Light values first, dark in brackets. `--lift` runs from 0 (resting) to 1 (lifted). The pill
engine sets it on `.tab-pill` every frame. `calc()` inside `rgb()` alpha is fine in current
Chromium and Safari.

**Capsule `.glass`**

- `background-color`: `rgb(255 255 255 / 0.2)` [`rgb(15 23 42 / 0.36)`]
- `backdrop-filter: blur(6px) saturate(190%)`, plus the `-webkit-` prefix for Safari.
- `box-shadow`, in this order:
  - `inset 1.5px 1.5px 0 -0.5px white/0.95` [`/0.28`]: top-left highlight
  - `inset -1px -1px 0 0 white/0.6` [`/0.1`]: bottom-right rim
  - `inset 0 0 0 0.5px white/0.6` [`/0.14`]: hairline edge
  - `inset 0 0 12px 0 white/0.4` [`/0.06`]: frosty inner glow
  - `0 0 0 0.5px slate-900/0.08` [none]: outer hairline, so it holds its edge on white
  - `0 10px 28px -8px slate-900/0.25` [`black/0.55`]: lift shadow

**Pill `.tab-pill-glass`** (two layers, so each fades on its own)

- Shade (`background-color`), strongest at rest: `slate-900 / 0.08·(1−lift)`
  [`white / 0.12·(1−lift)`].
- Light (`background-image`, a vertical gradient), only when lifted:
  `white / 0.28·lift → 0.12·lift` [`0.14·lift → 0.06·lift`].
- Rim and glow, scaled by lift: `inset 1.5px 1.5px 0 -0.5px white/0.95·lift`,
  `inset -1px -1px 0 0 white/0.6·lift`, `inset 0 0 10px 0 white/0.5·lift`
  [`0.35`, `0.12`, `0.08` × lift].
- Shadow: `0 10px·lift 24px·lift -4px slate-900/0.25·lift` [`black/0.5·lift`].
- No `backdrop-filter` on the pill. It sits inside the capsule's backdrop root, and the hole
  already hides what it would blur.

**"+" `.glass-button`** (tinted glass)

- `background-color: rgb(5 150 105 / 0.85)` [`/0.8`], with the same blur and saturation as
  the capsule.
- Rim: `inset 1.5px 1.5px 0 -0.5px white/0.6` [`/0.4`], `inset -1px -1px 0 0 white/0.2`,
  `inset 0 0 0 0.5px white/0.25` [`/0.15`], `inset 0 0 12px 0 white/0.15`.
- Shadow: `0 10px 28px -8px emerald-600/0.6` [`black/0.6`].
- Pressed, it swells instead of sinking: `scale(1.08)` and `brightness(1.1)`, on
  `transform 360ms cubic-bezier(0.3, 1.5, 0.5, 1)`.

**Scrim `.nav-scrim`**: `linear-gradient(to top, slate-50/0.5, slate-50/0)`
[`slate-950/0.5 → 0`]. Keep it light. Its only job is to keep a busy page from fighting the
labels.

**The hole `.tab-links`**: a horizontal mask gradient that is opaque everywhere except between
`--hole-start` and `--hole-end`, with soft edges (3px outside, 5px inside). Set both prefixed
and unprefixed `mask-image`.

## 5. Motion

All per-frame work runs in one `requestAnimationFrame` loop that writes `style.transform`
straight to the DOM. There is no React state per frame. The loop stops when everything is at
rest.

**Springs** (damped, semi-implicit Euler, 1/240s substeps, `dt` capped at 1/20s):

| Spring | Stiffness (1/s²) | Damping ratio | Feel                                 |
| ------ | ---------------- | ------------- | ------------------------------------ |
| Slide  | 320              | 0.72          | ~4% overshoot, at rest in under 0.9s |
| Lift   | 260              | 0.95          | soft rise and fall, no bounce        |

Rest is reached when |value − target| < 0.05 and |velocity| < 0.5. Lift aims for 1 while the
pill moves (|x − target| ≥ 0.5 or |v| ≥ 5 px/s) or is dragged, and for 0 otherwise.

**Shape at any moment** (`pillShape(v, lift)`, with `v` in px/s):

```
stretch = min(|v| / 3200, 0.22)
scaleX  = (1 + stretch)        × (1 + 0.14·lift)   // longer along the path, wider when lifted
scaleY  = (1 − 0.45·stretch)   × (1 + 0.26·lift)   // thinner when fast, taller than the bar when lifted
magnify = 1 + 0.12·lift                            // what shows through the lens
```

**Per frame** (`x` is the pill's left edge in the row and `w` is the slot width):

- pill: `translate3d(x, 0, 0)`, and `--lift`.
- shape and lens: `scale(scaleX, scaleY)` around their center.
- copy: `transform-origin: (x + w/2)px 50%`, then
  `translate3d(−x, 0, 0) scale(magnify/scaleX, magnify/scaleY)`. This lines the copy up with
  the real tabs, undoes the stretch, and leaves an even magnification around the pill's
  center.
- hole: `center ± (w/2)·scaleX`, where `center = x + w/2`.

**Routes.** On a page outside the tabs (e.g. `/laporan`), the pill fades to opacity 0 (150ms)
and the hole closes. Coming back, the pill appears in place and doesn't slide in. A path
belongs to a tab if it equals it or starts with it plus `/` (`/` matches only itself).

## 6. Interaction

- **Tap:** an ordinary `NavLink`. Tapping the current tab while scrolled down smooth-scrolls
  to the top.
- **Drag:**
  - The pointer handlers sit on the row, which has `touch-action: none`.
  - After 8px of sideways movement, call `setPointerCapture`. From then on the pill's center
    glides to the finger, clamped to the row with up to 12% of a slot of rubber band past
    either end.
  - On release, take the nearest slot (`round(x / w)`) and navigate there.
  - Swallow clicks for 500ms after a drag, so the release doesn't also count as a tap.
- Links need `draggable={false}`. Otherwise a mouse drag in Chromium starts a native link
  drag, and the pointer stream is cancelled.

## 7. Accessibility and fallbacks

- The pill and the copy are `aria-hidden` and `pointer-events: none`. Only the real links
  carry names and `aria-current="page"`, so there is no duplicate link for screen readers or
  tests.
- **Focus:** the links get a 2px `emerald-500` outline. The current tab is covered by the
  pill, so its ring is drawn on the pill instead
  (`.tab-row:has([aria-current="page"]:focus-visible) .tab-pill-glass`).
- **`prefers-reduced-motion`:** the pill jumps (no spring, lift or stretch) and the "+" does
  not scale.
- **`prefers-reduced-transparency`, or no `backdrop-filter` support:** the capsule becomes
  solid `slate-100` [`slate-800`] and the "+" solid `emerald-600`.
- **On-screen keyboard up** (`html[data-keyboard]`): the whole nav is hidden.

## 8. Browser support

| Feature                          | Chromium                                                       | Safari (iOS/macOS) | Firefox |
| -------------------------------- | -------------------------------------------------------------- | ------------------ | ------- |
| Blur and saturate behind glass   | yes                                                            | yes (`-webkit-`)   | yes     |
| Lens (magnified copy, hole mask) | yes                                                            | yes                | yes     |
| Refracting the page behind glass | possible via `backdrop-filter: url(#svg)`, **not implemented** | no                 | no      |

Playwright's WebKit build for Windows does **not** paint `backdrop-filter`, so blur can only be
checked on a real iPhone or Mac.

## 9. Pitfalls already hit

- **Coloring the real active tab** makes two tabs green while the pill is dragged away.
- **A ghost label under the lifted pill.** Without the hole, the real label shows through the
  clear lens next to its magnified copy.
- **`position: fixed` inside an animated or transformed ancestor** positions against that
  ancestor. The nav must stay outside the page frame that animates on navigation.
- **Never `cancel()` or `finish()` a running page-entrance animation** (see
  `lib/pageMotion.ts`). In Chromium under load, that can leave the page unclickable.
- **Re-rendering React every frame** for the pill is janky on mid-range Android. Write
  transforms directly.

## 10. Checking your work

1. **Unit tests:** `npm test -w @finance/web` (`tabPill.test.ts`: tab matching, nearest slot,
   spring settles with a small overshoot and stays stable on slow frames, shape limits).
2. **e2e tests:** `E2E_PORT=5180 npm run test:e2e` (`bottom-nav.spec.ts`: the pill follows the
   route, hides outside the tabs, can be dragged to a tab, a wobbly press is still a tap, and it
   doesn't slide with reduced motion).
3. **Screenshots** in light and dark:
   - at rest, over a white card and over colorful content (category icons, chart bars);
   - lifted, mid-slide (~100ms after a tap);
   - mid-drag.

   What to look for:
   - page colors come through the capsule, and text behind it is unreadable;
   - the rim is brighter top-left;
   - exactly one green tab;
   - no doubled label under the lens.
4. **Mutation check:** break one piece on purpose (e.g. remove `draggable={false}`, or the
   reduced-motion branch) and confirm a test fails.

## 11. Reusing it elsewhere (e.g. a segmented control)

The same recipe works for any control whose own content sits under the moving pill:

- the glass track;
- real options in the resting color, with a mask hole under the pill;
- a pill with a shape layer and a lens layer holding a copy of the options in the active
  color;
- the same springs, shape formula and drag rules.

Only `activeTabIndex` (what is selected) and the slot count change.

## 12. Not done yet (ideas)

- **Edge refraction in Chromium:** `backdrop-filter: url(#lens) blur() saturate()` with an SVG
  `feDisplacementMap` fed by a displacement map drawn for the capsule's size, with today's look
  as the fallback for Safari and Firefox.
- **Adaptive tint:** the glass darkens over dark content and lightens over light content, as
  iOS does. That would need the page's colors under the bar.
