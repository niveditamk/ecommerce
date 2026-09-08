# Colour token contract

The MAKR direction is the design; this file is only the **accessibility
contract** underneath it. It exists because a token whose name suggests
"lighter grey" gets reached for as body text, and nothing in CSS stops
you — `--pearl-4` had drifted into 22 text declarations at 2.85:1 before
this was written down.

Ratios below are measured, not estimated: composited against the real
background, and for anything over imagery, sampled from rendered pixels.

## Text colours

| Token | Value | On paper | On bone | Use for |
|---|---|---|---|---|
| `--color-obsidian-ink` | `#141312` | 17.51 | 16.21 | body copy, headings |
| `--pearl-2` | `ink @ .86` | 11.89 | 11.19 | secondary copy, evidence lists |
| `--pearl-3` | `ink @ .64` | 5.47 | 5.31 | **the floor for anything read** — captions, `.tiny`, labels, meta |
| `--gold-text` | `#755b31` | 6.01 | 5.56 | gold-coloured text |

## Not for text

| Token | Value | Ratio | Use for |
|---|---|---|---|
| `--pearl-4` | `ink @ .44` | 2.89 | decoration only — the `— ` bullet, disabled nav |
| `--line`, `--line-2` | `ink @ .10/.05` | — | dividers, decorative rules |
| `--color-eucalyptus-mist` | `#a9aea9` | 2.13 | the one sage accent: the evidence left rule |

`--pearl-4` and the sage rule sit below 3:1 deliberately. Neither
identifies a control or carries meaning — WCAG 1.4.11 does not cover
them, and muting is the point. **If you find yourself using either for
text, use `--pearl-3` instead.**

## Fills and control edges

| Token | Value | Ratio | Note |
|---|---|---|---|
| `--gold` | `#8a6c3a` | 4.90 with white | button fill only — was `#9e7d46` at **3.84**, failing on 53 buttons |
| `--gold-2` | `#755b31` | 6.37 with white | gold button hover |
| `--color-obsidian` | `#141312` | 17.51 with paper | `.btn` fill |
| `--line-control` | `ink @ .46` | 3.05 | input and outline-button borders (1.4.11 needs 3.0) |
| `--line-dark` | `ink @ .22` | 1.61 | decorative only — **not** for a control edge |

Gold as a *fill* and gold as *text* are different values. A fill only has
to sit behind white; text has to clear 4.5:1 against bone, which the fill
value does not.

## Text over imagery

`getComputedStyle` cannot see a gradient or a photograph, so a DOM-only
audit reports a false pass or a false failure here. The hero caption's
original `rgba(20,19,18,0.75)` single-stop scrim measured **2.47:1**
against the brightest pixels of the hero photograph. It is now a
four-stop scrim reaching 0.94 at the baseline: **7.54:1** worst case,
13.65:1 mean, with the image still reading through.

Any new text over an image must be measured the same way — from pixels,
not from tokens.

## Target size

WCAG 2.5.8 wants 24×24 CSS px, with an exception for targets inside a
sentence and an alternative for targets with 24px of clear spacing. Table
checkboxes were 14×14 with neither exception applying; they keep the
small visual box and gain a padded hit area.
