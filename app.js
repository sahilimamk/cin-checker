/* FileSure — CIN & LLPIN Checker
 * All checks run in the browser. Nothing is uploaded.
 *
 * Sources (checked 24 Nov 2026):
 *  - CIN structure: Companies Act 2013 s.7(3); MCA master data.
 *    21 chars = [L|U] + 5-digit NIC code + 2-letter state + 4-digit year
 *    + 3-letter company class + 6-digit registration number.
 *  - State codes and company-class codes as they appear on CINs
 *    issued by MCA (Ofin Legal lookup, rules checked 20 Oct 2026;
 *    cross-checked against TaxGuru / Inspex / Krystal7).
 *  - LLPIN: LLP Act 2008, MCA FiLLiP. Canonical form is 7 chars:
 *    3 letters + hyphen + 4 digits, e.g. AAB-1234. It encodes NO
 *    state, year or activity — only a registry series + serial.
 *
 * Deliberate honesty limits (see README):
 *  - A well-formed number is NOT proof the entity exists or is
 *    active. Only MCA master data shows live status.
 *  - The 5-digit industry code is an NIC code. We do NOT invent a
 *    description for every code. Only 72900 is labelled, because
 *    multiple MCA/NIC sources agree on it; every other code is
 *    shown as the number, with a pointer to NIC 2008.
 *  - Some AI sources claim an LLPIN is 10 characters ending in
 *    "/LLP". That is wrong: "/LLP" is not part of the LLPIN.
 *    This checker flags it instead of accepting it.
 */

'use strict';

const CURRENT_YEAR = new Date().getFullYear();

const STATE_CODES = {
  AN: 'Andaman & Nicobar Islands', AP: 'Andhra Pradesh',
  AR: 'Arunachal Pradesh', AS: 'Assam', BR: 'Bihar',
  CH: 'Chandigarh', CT: 'Chhattisgarh',
  DN: 'Dadra & Nagar Haveli', DD: 'Daman & Diu',
  DL: 'Delhi', GA: 'Goa', GJ: 'Gujarat', HR: 'Haryana',
  HP: 'Himachal Pradesh', JK: 'Jammu & Kashmir',
  JH: 'Jharkhand', KA: 'Karnataka', KL: 'Kerala',
  LD: 'Lakshadweep', MP: 'Madhya Pradesh',
  MH: 'Maharashtra', MN: 'Manipur', ML: 'Meghalaya',
  MZ: 'Mizoram', NL: 'Nagaland', OR: 'Odisha',
  PY: 'Puducherry', PB: 'Punjab', RJ: 'Rajasthan',
  SK: 'Sikkim', TN: 'Tamil Nadu', TG: 'Telangana',
  TR: 'Tripura', UP: 'Uttar Pradesh', UR: 'Uttarakhand',
  WB: 'West Bengal',
};

const TYPE_CODES = {
  PLC: { name: 'Public limited company', note: 'Shares can be offered to the public. PLC does not by itself mean listed.' },
  PTC: { name: 'Private limited company', note: 'The most common type. Shares are not offered to the public.' },
  OPC: { name: 'One Person Company', note: 'A company with a single member, under the Companies Act, 2013.' },
  NPL: { name: 'Not-for-profit company (Section 8)', note: 'Licensed under Section 8 (old Section 25). Profits are not distributed.' },
  GOI: { name: 'Government of India company', note: 'A company owned by the Government of India.' },
  SGC: { name: 'State Government company', note: 'A company owned by a State government.' },
  FTC: { name: 'Subsidiary of a foreign company', note: 'A private company incorporated in India, subsidiary of a foreign company.' },
  FLC: { name: 'Financial lease company (public)', note: 'A public limited financial leasing company.' },
  GAP: { name: 'Guarantee and association company (public)', note: 'A public company limited by guarantee / association.' },
  GAT: { name: 'Guarantee and association company (private)', note: 'A private company limited by guarantee / association.' },
  ULL: { name: 'Public company, unlimited liability', note: 'A public company whose members have unlimited liability.' },
  ULT: { name: 'Private company, unlimited liability', note: 'A private company whose members have unlimited liability.' },
};

// Only NIC code we label: the one multiple independent sources agree on.
// Every other code is reported as the number alone — never guessed.
const NIC_KNOWN = {
  '72900': 'Other computer-related activities',
};

function clean(raw) {
  return String(raw || '').trim().toUpperCase().replace(/[\s\u00a0]+/g, '');
}

function err(pos, message) { return { pos, message }; }

function validateCIN(input) {
  const s = clean(input);
  const errors = [];
  const parts = { raw: s };
  if (s.length !== 21) {
    errors.push(err('Length', `Must be exactly 21 characters — this has ${s.length}.`));
  }
  if (s.length >= 1) {
    const c = s[0];
    if (c === 'L') parts.listing = 'Listed';
    else if (c === 'U') parts.listing = 'Unlisted';
    else errors.push(err('Character 1', `Listing status must be L (listed) or U (unlisted) — got “${c}”.`));
  }
  if (s.length >= 6) {
    const code = s.slice(1, 6);
    if (!/^\d{5}$/.test(code)) {
      errors.push(err('Characters 2–6', `Industry code must be 5 digits — got “${code}”. Check for the letter O instead of 0, or I instead of 1.`));
    } else {
      parts.industryCode = code;
      parts.industry = NIC_KNOWN[code] || null;
      if (code === '00000') errors.push(err('Characters 2–6', 'Industry code cannot be 00000.'));
    }
  }
  if (s.length >= 8) {
    const code = s.slice(6, 8);
    if (!/^[A-Z]{2}$/.test(code)) {
      errors.push(err('Characters 7–8', `State code must be 2 letters — got “${code}”.`));
    } else if (!STATE_CODES[code]) {
      errors.push(err('Characters 7–8', `“${code}” is not a state / UT code used in CINs (e.g. MH is Maharashtra, DL is Delhi).`));
    } else { parts.stateCode = code; parts.state = STATE_CODES[code]; }
  }
  if (s.length >= 12) {
    const y = s.slice(8, 12);
    if (!/^\d{4}$/.test(y)) {
      errors.push(err('Characters 9–12', `Year of incorporation must be 4 digits — got “${y}”.`));
    } else {
      const year = parseInt(y, 10);
      parts.year = year;
      if (year > CURRENT_YEAR) errors.push(err('Characters 9–12', `Year ${year} is in the future — the latest possible year is ${CURRENT_YEAR}.`));
      else if (year < 1850) errors.push(err('Characters 9–12', `Year ${year} is before modern company registration in India (1850). Check for a typo.`));
      else parts.age = CURRENT_YEAR - year;
    }
  }
  if (s.length >= 15) {
    const code = s.slice(12, 15);
    if (!/^[A-Z]{3}$/.test(code)) {
      errors.push(err('Characters 13–15', `Company type must be 3 letters — got “${code}”.`));
    } else if (!TYPE_CODES[code]) {
      errors.push(err('Characters 13–15', `“${code}” is not a recognised company-type code (PTC, PLC, OPC, NPL, GOI, SGC, FTC, FLC, GAP, GAT, ULL, ULT).`));
    } else { parts.typeCode = code; parts.type = TYPE_CODES[code].name; parts.typeNote = TYPE_CODES[code].note; }
  }
  if (s.length >= 21) {
    const reg = s.slice(15, 21);
    if (!/^\d{6}$/.test(reg)) {
      errors.push(err('Characters 16–21', `Registration number must be 6 digits — got “${reg}”.`));
    } else {
      parts.regNo = reg;
      if (reg === '000000') errors.push(err('Characters 16–21', 'Registration number cannot be 000000.'));
    }
  }
  // Characters outside the expected alphabet anywhere.
  if (/[^A-Z0-9]/.test(s)) {
    errors.push(err('Characters', 'Contains a character that is not a letter or digit — remove spaces, hyphens and punctuation.'));
  }
  return { kind: 'company', input: String(input || '').trim(), normalised: s, valid: errors.length === 0, errors, parts };
}

function validateLLPIN(input) {
  const raw = String(input || '').trim();
  const s = clean(raw);
  const errors = [];
  const parts = { raw: s };
  const notes = [];

  if (/\/LLP$|\/FLC$/i.test(raw)) {
    errors.push(err('Suffix', '“/LLP” is not part of an LLPIN. The LLPIN ends at the 4 digits — remove the suffix.'));
  }
  if (s.includes('/')) {
    errors.push(err('Format', 'An LLPIN has no slash in it. Use the form AAA-1234.'));
  }
  // One mistake, one error: "AAA-1234/LLP" is a single suffix mistake,
  // not four separate ones. If removing the suffix leaves a valid LLPIN,
  // say exactly that and stop there.
  const stripped = s.replace(/\/(LLP|FLC)$/, '');
  if (/\/LLP$|\/FLC$/i.test(raw) && /^([A-Z]{3})-?(\d{4})$/.test(stripped)) {
    return { kind: 'llp', input: raw, normalised: stripped, valid: false,
      errors: [err('Suffix', '“/LLP” is not part of an LLPIN. The LLPIN ends at the 4 digits — remove the suffix.')],
      notes: [`${stripped.slice(0, 3)}-${stripped.slice(-4)} on its own is a valid LLPIN.`],
      parts: { raw: s }, suggestion: `${stripped.slice(0, 3)}-${stripped.slice(-4)}` };
  }
  // Canonical: AAA-1234. Also accept AAA1234 (hyphen missing) as a
  // formatting fix, not a different number.
  const m = /^([A-Z]{3})-?(\d{4})$/.exec(s);
  if (!m) {
    if (!/^[A-Z]{3}/.test(s)) errors.push(err('Characters 1–3', 'An LLPIN starts with 3 letters — e.g. AAB.'));
    else if (!/^[A-Z]{3}-/.test(s) && /^[A-Z]{3}\d/.test(s)) notes.push('Hyphen added — the usual written form is AAA-1234.');
    if (!/\d{4}$/.test(s)) errors.push(err('Characters 5–8', 'An LLPIN ends with 4 digits — e.g. AAB-1234.'));
    if (s.length !== 7 && s.length !== 8) {
      errors.push(err('Length', `An LLPIN is 7 characters (AAA-1234) — this has ${s.length}.`));
    }
    if (errors.length === 0) errors.push(err('Format', 'Expected the form AAA-1234 — 3 letters, a hyphen, 4 digits.'));
  } else {
    parts.prefix = m[1];
    parts.serial = m[2];
    parts.normalised = `${m[1]}-${m[2]}`;
    if (!s.includes('-')) notes.push('Hyphen added — the usual written form is AAA-1234.');
  }
  return { kind: 'llp', input: raw, normalised: parts.normalised || s, valid: errors.length === 0, errors, notes, parts };
}

// Suggest a fix for the classic scan typo: O in a digit slot, I/l in a digit slot.
function suggestFix(input) {
  const s = clean(input);
  if (s.length !== 21) return null;
  let fixed = s.split('');
  for (let i = 1; i <= 5; i++) if (fixed[i] === 'O') fixed[i] = '0';
  for (let i = 8; i <= 11; i++) if (fixed[i] === 'O') fixed[i] = '0';
  for (let i = 15; i <= 20; i++) { if (fixed[i] === 'O') fixed[i] = '0'; if (fixed[i] === 'I' || fixed[i] === 'L') fixed[i] = '1'; }
  const candidate = fixed.join('');
  if (candidate === s) return null;
  const check = validateCIN(candidate);
  return check.valid ? candidate : null;
}

function validateLine(raw, lineNo) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null; // blank line: counted, not shown as a row
  if (/[,;]/.test(trimmed) && trimmed.split(/[,;]/).filter(Boolean).length > 1) {
    return { kind: 'unknown', input: trimmed, line: lineNo, normalised: clean(trimmed),
      valid: false, errors: [err('Line', 'One number per line — this line looks like two numbers separated by a comma or semicolon. Put each on its own line.')], parts: {}, notes: [] };
  }
  const s = clean(trimmed);
  // Decide by shape: LLPIN is short (7–8 chars, letters-hyphen-digits);
  // a CIN is 21 chars starting L/U. Anything else is "unknown shape"
  // and gets the CIN length error plus a hint, so the user is not left guessing.
  // Note: an LLPIN with a "/LLP" suffix must still go to the LLP checker,
  // so it gets the specific suffix error instead of a pile of CIN errors.
  let result;
  if (/^[A-Z]{3}-?\d{4}$/.test(s) || /^[A-Z]{3}-/.test(s) || s.includes('/')) {
    result = validateLLPIN(trimmed);
  } else if (/^[LU]/.test(s) || s.length >= 15) {
    result = validateCIN(trimmed);
  } else if (s.length <= 9) {
    // Short input that is neither a CIN nor an LLPIN shape.
    result = validateLLPIN(trimmed);
    if (result.valid) { /* unreachable, kept for clarity */ }
    else {
      result.errors.unshift(err('Length', 'Too short to be a CIN (21 characters) and not in LLPIN form (AAA-1234).'));
    }
  } else {
    result = validateCIN(trimmed);
  }
  result.line = lineNo;
  result.notes = result.notes || [];
  if (!result.valid && result.kind === 'company') {
    const fix = suggestFix(trimmed);
    if (fix) result.suggestion = fix;
  }
  // Normalised-case note: lowercase input is fine, we just upper-cased it.
  if (trimmed !== trimmed.toUpperCase() && result.valid) {
    result.notes.push('Lowercase was accepted — numbers are shown in capitals.');
  }
  return result;
}

function parseList(text) {
  const lines = String(text || '').split(/\r?\n/);
  const blank = lines.filter(l => !l.trim()).length;
  const results = [];
  lines.forEach((line, i) => {
    const r = validateLine(line, i + 1);
    if (r) results.push(r);
  });
  return { results, blank, totalLines: lines.length };
}

function summarise(results) {
  const s = { total: results.length, valid: 0, invalid: 0, companies: 0, llps: 0, listed: 0, unlisted: 0 };
  for (const r of results) {
    if (r.valid) s.valid++; else s.invalid++;
    if (r.kind === 'company') { s.companies++; if (r.valid && r.parts.listing === 'Listed') s.listed++; if (r.valid && r.parts.listing === 'Unlisted') s.unlisted++; }
    if (r.kind === 'llp') s.llps++;
  }
  return s;
}

function toCSV(results) {
  const head = ['Line', 'Input as pasted', 'Normalised', 'Kind', 'Valid?', 'Listed / Unlisted', 'State', 'Year', 'Company type', 'Registration no.', 'Industry code', 'Errors'];
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = results.map(r => [
    r.line, r.input, r.normalised,
    r.kind === 'company' ? 'Company (CIN)' : r.kind === 'llp' ? 'LLP (LLPIN)' : 'Unknown',
    r.valid ? 'Valid' : 'Invalid',
    r.parts.listing || '', r.parts.state || '', r.parts.year || '',
    r.parts.type || '', r.parts.regNo || '', r.parts.industryCode || '',
    r.errors.map(e => `${e.pos}: ${e.message}`).join(' | '),
  ].map(esc).join(','));
  return [head.map(esc).join(','), ...rows].join('\n');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { STATE_CODES, TYPE_CODES, NIC_KNOWN, CURRENT_YEAR, clean, validateCIN, validateLLPIN, validateLine, parseList, summarise, toCSV, suggestFix };
}
