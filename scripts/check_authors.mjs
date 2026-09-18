// Keeps AI tool accounts out of this repository's contributors list.
//
// Two facts decide what this script checks, both measured against the GitHub
// API on 2026-09-19.
//
// First, the contributors list is built from each commit's AUTHOR field. A
// Co-Authored-By trailer never enters it:
//
//   repository                    trailers   author is the bot   bot in contributors
//   opendatahub-io/odh-dashboard       499                   0   no
//   doldecomp/melee                    204                   0   no
//   zhengxuyu/litjev                     3                   1   yes
//
// Second, an author only becomes an entry in that list when its email resolves
// to a GitHub account. An address bound to nothing lands in the anonymous bucket
// that the repository page does not show at all (contributors?anon=true returns
// entries like `type=Anonymous name=sysop email=sysop@decomp.local`, and the
// default anon=false view omits them).
//
// So the question worth asking is not whether a name looks like a tool. It is
// which account GitHub resolved the commit to. That is what `--pr` checks, and
// it is exact: a contributor genuinely called Claude passes, and a fabricated
// address passes too, because neither one can appear as an AI account.
//
// Without network access the script falls back to reading names and addresses,
// which is a guess, so offline hits are warnings.
//
//   node scripts/check_authors.mjs --pr 2 --repo OmniJev/awesome-jev
//   node scripts/check_authors.mjs origin/main..HEAD

import {execFileSync} from 'node:child_process';

// Verified present on GitHub 2026-09-19, each by its own API lookup. Keys are
// lowercase logins, since GitHub logins are case insensitive.
const BLOCKED_LOGINS = new Map([
	['claude', 'Claude Code (account @claude, id 81847)'],
	['codex', 'OpenAI Codex (account @codex, id 267193182)'],
	['cursoragent', 'Cursor Agent (account @cursoragent, id 199161495)'],
	['gemini-code-assist', 'Gemini Code Assist (account @gemini-code-assist, id 200291788)'],
	['google-labs-jules', 'Google Jules (org @google-labs-jules, id 213306698)'],
	['copilot', 'GitHub Copilot (bot account @Copilot, id 198982749)'],
	['devin-ai-integration[bot]', 'Devin (bot account @devin-ai-integration)'],
]);

// Offline fallback only. These produce warnings, never errors, because a name
// is a guess: Claude and Devin are also human given names.
const SUSPECT_EMAILS = new Map([
	['noreply@anthropic.com', '@claude'],
	['codex@openai.com', '@codex'],
	['cursoragent@cursor.com', '@cursoragent'],
]);
const SUSPECT_DOMAINS = ['anthropic.com', 'openai.com', 'cursor.com', 'devin.ai'];
const SUSPECT_NAMES = [/^claude\b/i, /^codex\b/i, /\bcopilot\b/i, /^cursor( agent)?\b/i, /^devin\b/i];

const TRAILER = /^\s*co-authored-by:\s*(.+?)\s*<([^>]*)>/i;
const ADVERT = /generated with \[?(claude code|codex)|\u{1F916}/iu;

const errors = [];
const warnings = [];

function checkMessage(short, message) {
	for (const line of (message ?? '').split('\n')) {
		const trailer = line.match(TRAILER);
		if (trailer && suspect(trailer[1], trailer[2])) {
			warnings.push(`${short} co-author trailer: ${line.trim()}`);
		} else if (ADVERT.test(line)) {
			warnings.push(`${short} tool advertisement: ${line.trim()}`);
		}
	}
}

function suspect(name, email) {
	const address = (email ?? '').toLowerCase();
	if (SUSPECT_EMAILS.has(address)) return SUSPECT_EMAILS.get(address);
	const domain = address.split('@')[1] ?? '';
	if (SUSPECT_DOMAINS.some(d => domain === d || domain.endsWith(`.${d}`))) return domain;
	if (SUSPECT_NAMES.some(p => p.test(name ?? ''))) return name;
	return null;
}

async function checkPullRequest(repo, number) {
	const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
	if (!token) throw new Error('set GITHUB_TOKEN to use --pr');
	const url = `https://api.github.com/repos/${repo}/pulls/${number}/commits?per_page=100`;
	const response = await fetch(url, {
		headers: {authorization: `Bearer ${token}`, accept: 'application/vnd.github+json'},
	});
	if (!response.ok) throw new Error(`GitHub API ${response.status} for ${url}`);
	const commits = await response.json();

	console.log(`checked ${commits.length} commit${commits.length === 1 ? '' : 's'} in ${repo}#${number}`);
	for (const item of commits) {
		const short = item.sha.slice(0, 7);
		for (const role of ['author', 'committer']) {
			const login = item[role]?.login;
			const blocked = login && BLOCKED_LOGINS.get(login.toLowerCase());
			if (blocked) {
				errors.push(
					`${short} ${role} resolves to ${login}, which is ${blocked}\n` +
						`         subject: ${item.commit.message.split('\n')[0]}\n` +
						`         merging this puts that account in the contributors list, and clearing it later means rewriting history\n` +
						`         fix: git commit --amend --author="Your Name <you@example.com>" and force push the branch`,
				);
			}
		}
		checkMessage(short, item.commit.message);
	}
}

function checkRange(range) {
	const F = '@@F@@';
	const R = '@@R@@';
	const raw = execFileSync('git', ['log', '--reverse', `--format=%H${F}%an${F}%ae${F}%cn${F}%ce${F}%B${R}`, range], {
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024,
	});
	const records = raw.split(R).filter(entry => entry.trim());

	console.log(`checked ${records.length} commit${records.length === 1 ? '' : 's'} in ${range} (offline, names only)`);
	for (const record of records) {
		const [sha, an, ae, cn, ce, body] = record.replace(/^\n/, '').split(F);
		const short = sha.slice(0, 7);
		for (const [role, name, email] of [
			['author', an, ae],
			['committer', cn, ce],
		]) {
			const hit = suspect(name, email);
			if (hit) warnings.push(`${short} ${role} looks like a tool: ${name} <${email}> matches ${hit}`);
		}
		checkMessage(short, body);
	}
}

const args = process.argv.slice(2);
const flag = key => {
	const index = args.indexOf(key);
	return index === -1 ? null : args[index + 1];
};

const pr = flag('--pr');
if (pr) {
	await checkPullRequest(flag('--repo') ?? process.env.GITHUB_REPOSITORY, pr);
} else {
	checkRange(args[0] ?? 'origin/main..HEAD');
}

for (const warning of warnings) console.log(`  warn   ${warning}`);
for (const error of errors) console.log(`  ERROR  ${error}`);
if (errors.length === 0 && warnings.length === 0) console.log('  clean');

process.exit(errors.length > 0 ? 1 : 0);
