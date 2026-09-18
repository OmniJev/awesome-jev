// Verifies every number printed in the README against the README's own contents.
//
// The list is generated from a private data set, so the badges, the table of
// contents and the News paragraph all state counts that nothing in this
// repository recomputes. A pull request that adds an entry updates some of them
// and forgets the rest, and the numbers drift a little at a time.
//
// Each count below is derived the same way the generator derives it:
//
//   entries        every entry outside Related Lists
//   papers         entries carrying an arXiv badge, which is what marks a paper
//   open source    entries in the Open Source section
//   Jev evals      evaluations that are not TypeSafe's own pages
//   with code      distinct repositories behind the Code badges
//   daily papers   entries carrying the Hugging Face upvote badge
//
//   node scripts/check_counts.mjs README.md

import {readFileSync} from 'node:fs';

const LISTS = 'Related Lists';
const OPEN_SOURCE = 'Open Source';
const EVALUATIONS = 'Independent Evaluations';
const SKIP = ['Contents', 'Contributing', 'Footnotes'];

// A leading star used to mark the entries to read first, so allow one here.
const ENTRY = /^-\s+(?:\u2B50\s*)?\[/u;

const file = process.argv[2] ?? 'README.md';
const lines = readFileSync(file, 'utf8').split('\n');

// Section headings carry an emoji; the words after it are the name used below.
const name = heading => heading.replace(/^##\s+/, '').replace(/^[^\p{L}]+/u, '').trim();

const sections = new Map();
let current = null;
for (const line of lines) {
	if (line.startsWith('## ')) {
		current = name(line);
		if (SKIP.includes(current)) current = null;
		else if (!sections.has(current)) sections.set(current, []);
	} else if (current && ENTRY.test(line)) {
		sections.get(current).push(line);
	}
}

const entriesIn = section => sections.get(section) ?? [];
const research = [...sections].filter(([s]) => s !== LISTS).flatMap(([, e]) => e);
const linkOf = entry => entry.match(/\[[^\]]*\]\(([^)]*)\)/)?.[1] ?? '';

const derived = {
	entries: research.length,
	papers: research.filter(e => e.includes('badge/arXiv-')).length,
	'open source': entriesIn(OPEN_SOURCE).length,
	'Jev evals': entriesIn(EVALUATIONS).filter(e => !linkOf(e).includes('typesafe.ai')).length,
	'with code': new Set(
		research.flatMap(e => [...e.matchAll(/github\/stars\/([^?]+)\?/g)].map(m => m[1].toLowerCase())),
	).size,
	'daily papers': research.filter(e => e.includes('badge/dynamic/json')).length,
};

const problems = [];
const rows = [];

function compare(what, written, expected) {
	rows.push([what, written, expected]);
	if (Number(written) !== expected) problems.push(`${what}: says ${written}, README holds ${expected}`);
}

// Badges in the header.
const text = lines.join('\n');
const BADGES = [
	['entries', /badge\/entries-(\d+)-/],
	['papers', /badge\/papers-(\d+)-/],
	['open source', /badge\/open%20source-(\d+)-/],
	['Jev evals', /badge\/Jev%20evals-(\d+)-/],
	['with code', /badge\/with%20code-(\d+)-/],
	['daily papers', /badge\/%F0%9F%A4%97%20daily%20papers-(\d+)-/],
];
for (const [what, pattern] of BADGES) {
	const found = text.match(pattern);
	if (!found) problems.push(`badge ${what}: not found in the header`);
	else compare(`badge ${what}`, found[1], derived[what]);
}

// Per-section counts in the table of contents.
for (const line of lines) {
	const item = line.match(/^-\s+\[[^\]]*\]\(#[^)]*\)\s*\((\d+)\)\s*$/);
	if (!item) continue;
	const section = name(`## ${line.match(/^-\s+\[([^\]]*)\]/)[1]}`);
	if (!sections.has(section)) problems.push(`contents: no section named ${section}`);
	else compare(`contents ${section}`, item[1], entriesIn(section).length);
}

// The two numbers stated in the News paragraph.
const launch = text.match(/(\d+) entries in \d+ sections/);
if (launch) compare('news entries', launch[1], derived.entries);
const models = text.match(/(\d+) open models and codebases/);
if (models) compare('news open models', models[1], derived['open source']);
const evals = text.match(/(\d+) independent evaluations of Jev/);
if (evals) compare('news Jev evals', evals[1], derived['Jev evals']);

const width = Math.max(...rows.map(([what]) => what.length));
for (const [what, written, expected] of rows) {
	const ok = Number(written) === expected;
	console.log(`  ${ok ? 'ok   ' : 'WRONG'}  ${what.padEnd(width)}  ${String(written).padStart(3)}${ok ? '' : ` should be ${expected}`}`);
}

if (problems.length === 0) {
	console.log(`\n${rows.length} counts checked, all match`);
	process.exit(0);
}
console.log(`\n${problems.length} count${problems.length === 1 ? '' : 's'} out of date:`);
for (const problem of problems) console.log(`  ${problem}`);
console.log('\nSet each one to the value shown. Every number above is counted from the README itself.');
process.exit(1);
