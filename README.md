# CIN & LLPIN Checker — FileSure

Paste CINs and LLPINs, one per line, and get a plain-English answer for each:
valid or not (and if not, exactly what is wrong), company or LLP, listed or
unlisted, state, year of incorporation, and company type.

**Live:** https://sahilimamk.github.io/cin-checker/
**No sign-up, no upload** — all checking runs in JavaScript in the browser.

## What it checks

### CIN — 21 characters, six parts

| Chars | Meaning |
|---|---|
| 1 | Listing status: `L` listed, `U` unlisted |
| 2–6 | Industry code (5-digit NIC code) |
| 7–8 | State / UT code, e.g. `MH` Maharashtra, `DL` Delhi |
| 9–12 | Year of incorporation |
| 13–15 | Company type: `PTC` private, `PLC` public, `OPC` one-person, `NPL` Section 8, `GOI` Govt of India, `SGC` State Govt, `FTC` foreign subsidiary, `FLC` financial lease, `GAP` / `GAT` guarantee & association, `ULL` / `ULT` unlimited liability |
| 16–21 | Registration number (6 digits) |

Example: `L17110MH1973PLC019786` — listed public limited company,
Maharashtra, 1973, registration 019786.

### LLPIN — 7 characters

`AAA-1234`: 3 letters, a hyphen, 4 digits. It encodes **no** state, year or
activity — only a registry series and a serial. The page says so, instead of
pretending otherwise.

## What it deliberately does NOT do

- **A valid format is not proof the company exists or is active.** Only MCA
  master data shows live status. Every valid row links to MCA, and the page
  says this in three places.
- **It does not invent industry descriptions.** The 5-digit code is an NIC
  code; only `72900` is labelled (multiple sources agree: "Other
  computer-related activities"). Every other code is shown as the number,
  with a pointer to NIC 2008. Guessing a description for 100,000+ NIC codes
  would be fabrication.
- **It does not accept `/LLP` as part of an LLPIN.** Some AI-written sources
  claim an LLPIN is 10 characters ending in `/LLP`. That is wrong — the
  canonical LLPIN is 7 characters, `AAA-1234`. This checker flags the suffix
  as the single error it is, and offers the corrected number.

## Errors it catches, per field

Wrong length, `X` instead of `L`/`U`, letters in a digit slot, unknown state
code (`XX`), unknown company-type code (`XXX`), a future year (`2099`),
`000000` registration, a missing hyphen/digits in an LLPIN, two numbers on
one line, and the classic scan typo — the letter `O` where a `0` belongs.
Where a single O→0 fix makes a CIN valid, the result offers it as a
one-click "Use this" correction.

## Design decisions

- **Built for CAs, lawyers and business owners, not developers.** Serif
  headings + clean sans body, navy/teal on warm paper, no jargon without a
  plain-English gloss next to it.
- **First use needs no instructions.** The placeholder already shows the
  format, "Try a sample list" shows a good and a messy result in one click,
  and the empty state explains itself.
- **500 lines is a first-class case.** "Test with 500 lines" generates a
  500-line mixed list; parsing is measured and shown in ms, results are
  filterable (Valid / Problems / Companies / LLPs + free-text search) and
  exportable as CSV. Blank lines are counted and ignored, not treated as
  errors.
- **Mobile is a table that becomes cards.** Below 760px the results table
  reflows into labelled cards; the textarea, buttons and stats all stack.
- **Same data, one source of truth.** The reference tables at the bottom of
  the page are rendered from the exact `STATE_CODES` / `TYPE_CODES` objects
  the checker uses, so the docs can never drift from the code.

## Files

- `index.html` — page structure + UI logic
- `styles.css` — all styling, responsive
- `app.js` — pure validation logic (no DOM), so it is unit-testable in Node

## Test it

```bash
node -e "
const {validateLine, parseList, summarise} = require('./app.js');
for (const c of ['L17110MH1973PLC019786','L85110KA1981PLC013115',
  'U65929KA2018PLC116815','AAB-1234','L1711OMH1973PLC019786',
  'U72900XX2015PTC123456','AAA-1234/LLP']) console.log(c, validateLine(c,1));
"
```

Known traps in the sample list: Zerodha's `U65929KA2018PLC116815` is a
**public** company that is **unlisted** (PLC ≠ listed), and
`L1711OMH1973PLC019786` has a letter O in place of a zero.

## Sources (checked 24 Nov 2026)

Companies Act, 2013 ss. 7(3), 12(3); LLP Act, 2008; MCA master data
(mca.gov.in); CIN / LLPIN format as it appears on CINs issued by MCA
(Ofin Legal lookup, rules checked 20 Oct 2026; cross-checked against
TaxGuru, Inspex, Krystal7, The Company Check).
