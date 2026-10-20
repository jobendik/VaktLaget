const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const source = html.match(/<script id="app-script">([\s\S]*?)<\/script>/)?.[1];
assert.ok(source, 'The actual application script must be embedded in index.html');
const context = { Intl, Date, Math, JSON, Set, Map, console, setTimeout, clearTimeout };
vm.createContext(context);
vm.runInContext(source, context, { timeout: 10000 });
const app = context.VaktLaget;
const baseline = app.freshState();
const copy = value => JSON.parse(JSON.stringify(value));
function blank() { const s = copy(baseline); s.plan = {}; s.requests = []; s.pairs = []; s.restrictions = []; return s; }

test('Demo starts with exactly one explainable vacancy and no model violations', () => {
  const m = app.metrics(baseline);
  assert.equal(m.staff, 24);
  assert.equal(m.required, 438);
  assert.equal(m.covered, 437);
  assert.equal(m.gaps.length, 1);
  assert.equal(m.gaps[0].day, 1);
  assert.equal(m.gaps[0].shift, 'K');
  assert.equal(m.gaps[0].lack, 1);
  assert.equal(m.issues.length, 0);
});

test('First load uses reproducible independent data', () => {
  const a = app.freshState(), b = app.freshState();
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  a.employees[0].name = 'Changed';
  assert.notEqual(a.employees[0].name, b.employees[0].name);
});

test('Filling vacancies preserves every existing assignment and meets all model requirements', () => {
  const proposal = app.generate(baseline, 'balanced', true, 91);
  for (const [key, value] of Object.entries(baseline.plan)) assert.equal(JSON.stringify(proposal.plan[key]), JSON.stringify(value));
  assert.equal(Object.keys(proposal.plan).length, Object.keys(baseline.plan).length + 1);
  const m = app.metrics(proposal);
  assert.equal(m.coverage, 100);
  assert.equal(m.gaps.length, 0);
  assert.equal(m.issues.length, 0);
});

test('Rebuilding is deterministic, keeps locks, honors absences and produces a valid plan', () => {
  const a = app.generate(baseline, 'wishes', false, 83);
  const b = app.generate(baseline, 'wishes', false, 83);
  assert.equal(JSON.stringify(a.plan), JSON.stringify(b.plan));
  for (const [key, value] of Object.entries(baseline.plan)) if (value.locked) assert.equal(JSON.stringify(a.plan[key]), JSON.stringify(value));
  assert.equal(app.validate(a).length, 0);
  assert.equal(app.gaps(a).length, 0);
  for (const r of a.requests.filter(r => r.status === 'approved')) {
    for (let d = r.start; d <= r.end; d++) assert.equal(app.get(a, r.employee, d), '');
  }
});

test('A late shift followed by an early shift is rejected without mutating the plan', () => {
  const s = blank(), e = s.employees[0];
  assert.equal(app.applyShift(s, e.id, 0, 'K').ok, true);
  const before = JSON.stringify(s.plan);
  const result = app.applyShift(s, e.id, 1, 'D');
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /11 timer/);
  assert.equal(JSON.stringify(s.plan), before);
});

test('Rest calculation understands a night shift ending on the following day', () => {
  const s = blank(), e = s.employees[18];
  e.allowed = ['D', 'K', 'N'];
  app.applyShift(s, e.id, 0, 'N');
  assert.equal(app.applyShift(s, e.id, 1, 'K').ok, false);
  assert.equal(app.applyShift(s, e.id, 1, 'N').ok, true);
});

test('Approving an absence removes a preceding overnight shift, including a locked one', () => {
  const s = blank(), id = s.employees[18].id;
  s.plan[app.key(id, 0)] = { shift: 'N', locked: true };
  s.requests.push({ id: 'night-absence', employee: id, start: 1, end: 1, type: 'ferie', status: 'pending' });
  assert.equal(app.approveRequest(s, 'night-absence'), 1);
  assert.equal(app.get(s, id, 0), '');
  assert.equal(app.applyShift(s, id, 0, 'N').ok, false);
});

test('Overlapping approved requests are rejected without changing the pending request', () => {
  const s = blank(), id = s.employees[0].id;
  s.requests = [
    { id: 'one', employee: id, start: 1, end: 2, type: 'ferie', status: 'approved' },
    { id: 'two', employee: id, start: 2, end: 3, type: 'fri', status: 'pending' },
  ];
  assert.throws(() => app.approveRequest(s, 'two'), /overlapper/);
  assert.equal(s.requests[1].status, 'pending');
});

test('Rolling seven-day hour limits cross calendar week boundaries', () => {
  const s = blank(), e = s.employees[0];
  s.rules.maxHours = 24;
  for (const d of [4, 5, 6]) assert.equal(app.applyShift(s, e.id, d, 'D').ok, true);
  const result = app.applyShift(s, e.id, 7, 'D');
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /sju sammenhengende/);
});

test('Consecutive-day limits, shift permissions and pair exclusions are enforced', () => {
  const s = blank(), e = s.employees[0], other = s.employees[1];
  s.rules.maxDays = 2;
  assert.equal(app.applyShift(s, e.id, 0, 'D').ok, true);
  assert.equal(app.applyShift(s, e.id, 1, 'D').ok, true);
  assert.equal(app.applyShift(s, e.id, 2, 'D').ok, false);
  assert.equal(app.applyShift(s, e.id, 4, 'N').ok, false);
  s.pairs.push({ id: 'avoid-pair', a: e.id, b: other.id, mode: 'avoid' });
  assert.equal(app.applyShift(s, other.id, 0, 'D').ok, false);
});

test('Every offered direct replacement is assignable and does not alter other shifts', () => {
  const options = app.repairOptions(baseline, 1, 'K');
  assert.ok(options.length > 0);
  for (const option of options) {
    const s = copy(baseline), id = option.employee.id;
    const result = app.applyShift(s, id, 1, 'K');
    assert.equal(result.ok, true);
    assert.equal(app.metrics(s).coverage, 100);
    assert.equal(app.validate(s).length, 0);
    for (const [key, value] of Object.entries(baseline.plan)) assert.equal(JSON.stringify(s.plan[key]), JSON.stringify(value));
  }
});

test('Insufficient staffing is reported as unmet need, not hidden by invalid assignments', () => {
  const s = blank(); s.employees = [s.employees[0]];
  const proposal = app.generate(s, 'balanced', true, 44);
  const m = app.metrics(proposal);
  assert.ok(m.coverage < 100);
  assert.ok(m.gaps.length > 0);
  assert.equal(m.issues.length, 0);
});

test('Vacancies and missing competencies are distinct and both prevent a clean review', () => {
  const s = blank();
  s.rules.needs.weekday.D = 1;
  const e = s.employees.find(e => !e.medication && e.experienced);
  assert.equal(app.applyShift(s, e.id, 0, 'D').ok, true);
  const gap = app.gaps(s).find(g => g.day === 0 && g.shift === 'D');
  assert.equal(gap.lack, 0);
  assert.equal(gap.med, true);
});

test('CSV exports all six weeks, uses BOM/semicolons and neutralizes formula prefixes', () => {
  const s = copy(baseline);
  s.employees[0].name = '=HYPERLINK("https://example.test")';
  s.employees[1].name = '  +cmd';
  const text = app.csv(s);
  assert.equal(text.charCodeAt(0), 0xfeff);
  assert.ok(text.includes('"2026-10-19"'));
  assert.ok(text.includes('"2026-11-29"'));
  assert.ok(text.includes('"\'=HYPERLINK('));
  assert.ok(text.includes('"\'  +cmd"'));
  assert.ok(text.includes('DEMO'));
});

test('Backup validation rejects malformed data, unknown references and impossible bounds', () => {
  assert.doesNotThrow(() => app.validateData(copy(baseline)));
  const changes = [
    s => { s.rules.rest = -1; },
    s => { s.employees[0].id = '__proto__'; },
    s => { s.employees[1].id = s.employees[0].id; },
    s => { s.employees[0].percent = 101; },
    s => { s.employees[0].allowed = ['constructor']; },
    s => { s.plan['e01:42'] = { shift: 'D', locked: false }; },
    s => { s.requests[0].employee = 'eMissing'; },
    s => { s.requests[0].end = 42; },
    s => { s.rules.needs.weekday.D = 1.5; },
    s => { s.pairs[0].a = s.pairs[0].b; },
  ];
  for (const change of changes) {
    const s = copy(baseline); change(s);
    assert.throws(() => app.validateData(s));
  }
});

test('Every page renders data without treating employee names as HTML', () => {
  const s = copy(baseline);
  s.employees[0].name = '<img src=x onerror=alert(1)>';
  for (const page of app.viewNames) {
    const markup = app.viewMarkup(s, page);
    assert.ok(markup.length > 1000, page);
    assert.ok(!markup.includes('<img src=x'), page);
    assert.ok(!markup.includes('undefined'), page);
    assert.ok(!markup.includes('NaN'), page);
  }
});

test('Date conversion stays stable across the October clock change', () => {
  assert.equal(app.isoAt(0), '2026-10-19');
  assert.equal(app.isoAt(41), '2026-11-29');
  for (let d = 0; d < app.DAYS; d++) assert.equal(app.dayIndex(app.isoAt(d)), d);
});

test('The standalone HTML has no remote runtime dependencies or misleading login form', () => {
  assert.ok(!/<script[^>]+src\s*=/i.test(html));
  assert.ok(!/@import\s+url/i.test(html));
  assert.ok(!/type=["']password/i.test(html));
  assert.match(html, /<html lang="nb" data-theme="dark">/);
  assert.match(html, /prefers-reduced-motion/);
  assert.match(html, /@media print/);
  assert.match(html, /aria-modal="true"/);
});


test('Competency requirements count distinct people and allow one person to hold several skills', () => {
  const s = blank(), a = s.employees[0], b = s.employees[1];
  s.rules.needs.weekday.D = 2;
  s.plan[app.key(a.id, 0)] = { shift: 'D', locked: false };
  s.plan[app.key(b.id, 0)] = { shift: 'D', locked: false };
  b.medication = false;
  const gap = app.gaps(s).find(g => g.day === 0 && g.shift === 'D');
  assert.equal(gap.lack, 0);
  assert.equal(gap.skills.find(x => x.skill === 'medication').have, 1);
  assert.equal(gap.skills.find(x => x.skill === 'medication').need, 2);
  assert.equal(app.requiredSkills(s, [a], 0, 'D'), false);
  b.medication = true;
  assert.equal(app.requiredSkills(s, [a, b], 0, 'D'), true);
});

test('Dated task restrictions preserve shifts but change skill coverage, including overnight overlap', () => {
  const s = blank(), a = s.employees[18], b = s.employees[19];
  s.plan[app.key(a.id, 0)] = { shift: 'N', locked: true };
  s.plan[app.key(b.id, 0)] = { shift: 'N', locked: false };
  const before = JSON.stringify(s.plan);
  s.restrictions.push({ id: 'temporary', employee: a.id, start: 1, end: 2, skill: 'response' });
  assert.equal(app.skillAvailable(s, a, 0, 'N', 'response'), false);
  assert.equal(app.skillAvailable(s, a, 2, 'N', 'response'), false);
  assert.equal(app.skillAvailable(s, a, 3, 'N', 'response'), true);
  assert.equal(app.skillAvailable(s, a, 1, 'N', 'medication'), true);
  const gap = app.gaps(s).find(g => g.day === 0 && g.shift === 'N');
  assert.equal(gap.lack, 0);
  assert.equal(gap.med, false);
  assert.equal(gap.response, true);
  assert.equal(app.validate(s).length, 0);
  assert.equal(JSON.stringify(s.plan), before);
});

test('Replacement suggestions exclude people unable to cover the remaining competency requirement', () => {
  const s = blank(), a = s.employees[0], b = s.employees[1];
  s.rules.needs.weekday.D = 2;
  s.plan[app.key(a.id, 3)] = { shift: 'D', locked: false };
  s.restrictions.push({ id: 'medicine-limit', employee: b.id, start: 3, end: 3, skill: 'medication' });
  const options = app.repairOptions(s, 3, 'D');
  assert.ok(options.length > 0);
  assert.ok(!options.some(o => o.employee.id === b.id));
  assert.ok(options.every(o => o.fitsSkills));
  for (const o of options) assert.ok(app.requiredSkills(s, [a, o.employee], 3, 'D'));
});

test('A soft pair limit changes ranking without turning into an assignment ban', () => {
  const s = blank(), a = s.employees[0], b = s.employees[1];
  const p = { id: 'soft-limit', a: a.id, b: b.id, mode: 'limit', limit: 1 };
  s.pairs = [p];
  for (const id of [a.id, b.id]) s.plan[app.key(id, 0)] = { shift: 'D', locked: false };
  s.plan[app.key(a.id, 2)] = { shift: 'D', locked: false };
  assert.equal(app.pairCount(s, p), 1);
  const without = copy(s); without.pairs = [];
  assert.equal(app.candidateScore(s, b, 2, 'D', 'balanced') - app.candidateScore(without, b, 2, 'D', 'balanced'), 85);
  assert.equal(app.applyShift(s, b.id, 2, 'D').ok, true);
  assert.equal(app.pairPenalty(s), 1);
  assert.equal(app.validate(s).length, 0);
});

test('Hard competency requirements take precedence over a soft pair preference during generation', () => {
  const s = blank(); s.employees = s.employees.slice(0, 2);
  s.pairs = [{ id: 'prefer-apart', a: s.employees[0].id, b: s.employees[1].id, mode: 'limit', limit: 0 }];
  for (const type of ['weekday', 'weekend']) s.rules.needs[type] = { D: 2, K: 1, N: 1 };
  for (const k of ['K', 'N']) s.rules.skills[k] = { medication: 0, experienced: 0, response: 0 };
  const out = app.generate(s, 'balanced', true, 43);
  assert.equal(app.assigned(out, 0, 'D').length, 2);
  assert.ok(app.requiredSkills(out, app.assigned(out, 0, 'D'), 0, 'D'));
  assert.ok(app.pairPenalty(out) > 0);
  assert.equal(app.validate(out).length, 0);
});

test('Approving an absence changes the working draft without altering the saved baseline', () => {
  const s = copy(baseline), original = JSON.stringify(s.basePlan);
  assert.equal(app.planChanges(s).length, 1);
  const entry = Object.entries(s.plan).find(([k]) => k.endsWith(':3'));
  const id = entry[0].split(':')[0];
  s.requests.push({ id: 'base-test', employee: id, start: 3, end: 3, type: 'kurs', status: 'pending' });
  assert.ok(app.approveRequest(s, 'base-test') >= 1);
  assert.equal(JSON.stringify(s.basePlan), original);
  assert.ok(app.planChanges(s).some(c => c.employee.id === id && c.day === 3 && c.to === ''));
  assert.doesNotThrow(() => app.validateData(s));
});

test('Version 1 backups migrate without discarding edits or inventing staff competencies', () => {
  const legacy = copy(baseline); legacy.version = 1; legacy.reviewed = true;
  legacy.notes = 'Bevar mine innspill';
  legacy.rules.medication = true; legacy.rules.experience = false;
  delete legacy.rules.skills; delete legacy.basePlan; delete legacy.restrictions;
  legacy.pairs = legacy.pairs.filter(p => p.mode !== 'limit');
  for (const e of legacy.employees) delete e.response;
  const before = JSON.stringify(legacy.plan);
  const out = app.validateData(legacy);
  assert.equal(out.version, 2);
  assert.equal(out.notes, 'Bevar mine innspill');
  assert.equal(JSON.stringify(out.plan), before);
  assert.equal(JSON.stringify(out.basePlan), before);
  assert.equal(out.reviewed, false);
  assert.equal(out.rules.skills.D.medication, 1);
  assert.equal(out.rules.skills.N.experienced, 0);
  assert.equal(out.rules.skills.K.response, 0);
  assert.ok(out.employees.every(e => e.response === false));
});

test('Extended backups reject invalid competency counts, accommodations, baselines and pair limits', () => {
  const changes = [
    s => { s.rules.skills.D.medication = 1.5; },
    s => { s.rules.skills.N.response = 3; },
    s => { s.restrictions[0].employee = 'eMissing'; },
    s => { s.restrictions[0].start = -1; },
    s => { s.restrictions[0].skill = 'constructor'; },
    s => { s.restrictions.push(copy(s.restrictions[0])); },
    s => { s.basePlan['eMissing:0'] = { shift: 'D', locked: false }; },
    s => { s.pairs.find(p => p.mode === 'limit').limit = -1; },
    s => { s.employees[0].response = 'yes'; },
  ];
  for (const change of changes) { const s = copy(baseline); change(s); assert.throws(() => app.validateData(s)); }
});

test('Theme bootstrap honors a stored light preference and remains usable without storage', () => {
  const themeSource = html.match(/<script id="theme-init">([\s\S]*?)<\/script>/)[1];
  for (const choice of [null, 'light', 'dark', 'invalid', 'throws']) {
    const document = { documentElement: { dataset: {} } };
    vm.runInNewContext(themeSource, { document, localStorage: { getItem: () => { if (choice === 'throws') throw Error('blocked'); return choice; } } });
    assert.equal(document.documentElement.dataset.theme, choice === 'light' ? 'light' : 'dark');
  }
});
