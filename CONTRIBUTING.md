# Contributing to Awesome JEV

Thanks for helping. The goal is a compact, high-signal research map of System One models: the papers, open models and evaluations that say what Jev is, what it replaces, and how to measure it.

## The test

Jev is new and the literature about it is thin, so the list is sized to the evidence. An entry is in when it passes at least one of three tests.

| Test | Passes when |
|:--|:--|
| **Primary** | the entry is by TypeSafe, or it directly reproduces or evaluates Jev |
| **Named** | TypeSafe's own materials or the launch discussion named it as what Jev is, or what Jev replaces |
| **Same shape** | the answer set is fixed before inference, the model returns a probability per option, and no free text is generated |

Say in your pull request which test the entry passes, in one line. Work that is merely adjacent (general LLM calibration, general routing, general safety) stays out, however good it is.

Projects that *use* Jev (SDKs, routers, games, integrations) are out of scope here.

## Before opening a pull request

- Check whether the paper, model or evaluation is already listed.
- Use the primary paper or preprint URL, the official code repository, and the official model or project page.
- Verify every link resolves. Run `python3 scripts/check_links.py README.md`.
- Keep claims at the level the linked work supports.

## Where does an entry go?

| Section | What belongs there |
|:--|:--|
| ⚡ System One & Jev | TypeSafe's own pages, SDKs, essays and the launch discussion |
| 🧪 Open Source | open weights or code that rebuild the System One shape |
| 📊 Independent Evaluations | any published test of Jev, with its headline number |
| 📰 Commentary & Analysis | reporting and analysis that checks the claims against the evidence |
| 🧬 The Shape Before Jev | earlier work with the same input and output shape |
| 🧱 What Jev Is Sold Against | the incumbents TypeSafe or the launch discussion named |
| 🧠 Where the Name Comes From | System 1, the bitter lesson, the Jevons paradox |

The three lineage sections together stay under thirty entries. A new lineage entry needs a named mention or an exact match of shape, and usually displaces a weaker one. Give each resource one home. Do not duplicate it across sections.

## Entry format

One line per entry. What follows the name depends on whether the entry has a paper.

**A paper carries its real title**, quoted, exactly as the paper prints it.

~~~markdown
- [RouteLLM](https://arxiv.org/abs/2406.18665), "Learning to Route LLMs with Preference Data". [badges]
~~~

Where the paper is titled `Name: Something`, drop the `Name:` prefix, since the entry name already carries it. Where the entry name already is the full title, leave the quoted title out.

**Anything without a paper**, a model, a codebase, an evaluation or a page, carries one clause saying what it contributes.

~~~markdown
- [Jevlike](https://github.com/vinnylarouge/jevlike), From-scratch model with Jev's exact shape: text plus N options in, one probability per option out. [badges]
~~~

The separator is a comma.

### Badge conventions

| Badge | Pattern | Notes |
|:--|:--|:--|
| arXiv | `badge/arXiv-<ID>-B31B1B` | the real arXiv id in the label |
| Venue | `badge/<Venue>_<Year>-4B5563` | only where acceptance is stated by the paper or the proceedings |
| Code | `github/stars/OWNER/REPO?...&label=Code&color=181717` | one badge carries the repo link and the live star count |
| Daily Papers | `badge/dynamic/json?url=...huggingface.co/api/papers/<ID>&query=$.upvotes` | only where the papers page exists |
| Model / Space | `badge/%F0%9F%A4%97%20Model-8B5CF6`, `badge/%F0%9F%A4%97%20Space-FFD21E` | Hugging Face model or space |
| TypeSafe | `badge/TypeSafe-official-2F80ED` | a page on typesafe.ai or docs.typesafe.ai |
| Website | `badge/Website-2EA44F` | any other project page |

Omit a badge rather than pointing it at a mirror. Do not add a stars badge when there is no public repository.

## Checks before you open a pull request

~~~bash
npm install
npm run lint     # structure, dead links, duplicate links, table of contents
npm run counts   # the badge, contents and News numbers match the entries
npm run links    # every URL resolves
~~~

Adding an entry changes the numbers in the header badges, the table of contents
and the News paragraph. `npm run counts` prints each one with the value the
README's own contents imply, so set them to what it shows.

`npm run lint` runs awesome-lint's rule set with the list-item rule switched off, since this list follows the paper-list convention (a comma, then the quoted title) rather than the dash-and-description convention.

## Pull request checklist

- [ ] The entry passes one of the three tests, and the PR says which.
- [ ] The paper or primary page is linked, and the arXiv id in the badge matches it.
- [ ] Official code or model links are included when they exist.
- [ ] The description is one clause, concrete, and at the level the source supports.
- [ ] `npm run counts` and `python3 scripts/check_links.py README.md` pass.
- [ ] Section placement is right and the entry is not duplicated elsewhere.

## Commit authorship

Commit under your own name and an email tied to your GitHub account, so the
contributors list credits you.

An AI coding tool may have written the patch, and that is fine. What the check
rejects is a commit whose author or committer **resolves to one of those tools'
GitHub accounts**, `@claude`, `@codex`, `@cursoragent` and the like, because
GitHub would then list the tool among this repository's contributors and
clearing it later means rewriting history. A `Co-Authored-By` trailer is not
affected; it never reaches that list.

If the check catches a commit, reset the author and force push the branch:

~~~bash
git commit --amend --author="Your Name <you@example.com>"
git push --force-with-lease
~~~

Being named Claude is not a problem. The check reads the GitHub account behind
the commit, not the name on it.

By contributing, you agree that your contribution can be distributed under the repository's [CC BY 4.0 license](LICENSE).
