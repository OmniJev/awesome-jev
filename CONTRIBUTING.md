# Contributing to Awesome JEV

Thanks for helping. The goal is a compact, high-signal research map of System One models: the papers, open models and evaluations that say what Jev is, what it replaces, and how to measure it.

## The test

Jev is new and the literature about it is thin, so the list is sized to the evidence. An entry is in when it passes at least one of three tests.

| Test | Passes when |
|:--|:--|
| **Primary** | the entry is by TypeSafe, or it directly reproduces or evaluates Jev |
| **Named** | TypeSafe's own materials or the launch discussion named it as what Jev is, or what Jev replaces |
| **Same shape** | the answer set is fixed before inference, the model returns a probability per option, and no free text is generated |

Say in your pull request which test the entry passes, in one line. Work that is merely adjacent (general LLM calibration, general routing, general safety) belongs in the lists under [Related Lists](README.md#-related-lists), however good it is.

Projects that *use* Jev (SDKs, routers, games, integrations) are out of scope here; the directories in Related Lists collect them.

## Before opening a pull request

- Check whether the paper, model or evaluation is already listed.
- Use the primary paper or preprint URL, the official code repository, and the official model or project page.
- Verify every link resolves. Run `python3 scripts/check_links.py README.md`.
- Keep claims at the level the linked work supports.

## Where does an entry go?

| Section | What belongs there |
|:--|:--|
| ⚡ System One & Jev | TypeSafe's own pages, SDKs, essays and the launch discussion |
| 🔓 Open Reproductions | open weights or code that rebuild the System One shape |
| 🧠 Dual-Process Theory, Fast and Slow AI | the System 1 / System 2 lineage the name comes from |
| 🎯 Zero-Shot & Prompted Classifiers | label-conditioned classifiers, encoders and rerankers with a fixed answer set |
| ⚖️ Judges, Verifiers & Reward Models | models whose output is a verdict or a scalar score |
| 🔀 Routing, Cascades & Selection | models that choose a model, tool or path from a fixed set |
| 🛡️ Guardrails & Safety Classifiers | allow / block / escalate classifiers and agent action gates |
| 📏 Calibration & Uncertainty | proper scoring rules, LLM confidence, RL for calibrated confidence, conformal and selective prediction |
| 🧱 Typed & Constrained Outputs | the incumbent ways to get type-safe values out of a generator |
| ⏩ Non-Autoregressive & Parallel Inference | why one pass can answer many questions |
| 📊 Benchmarks & Independent Evaluations | benchmarks for the typed-decision jobs, and every independent test of Jev |
| 📰 Commentary & Analysis | reporting and analysis that separates claims from evidence |

Give each resource one home. Do not duplicate it across sections.

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

The separator is a comma. A leading ⭐ marks the handful of entries a newcomer should read first; use it sparingly.

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
npm run links    # every URL resolves
~~~

`npm run lint` runs awesome-lint's rule set with the list-item rule switched off, since this list follows the paper-list convention (a comma, then the quoted title) rather than the dash-and-description convention.

## Pull request checklist

- [ ] The entry passes one of the three tests, and the PR says which.
- [ ] The paper or primary page is linked, and the arXiv id in the badge matches it.
- [ ] Official code or model links are included when they exist.
- [ ] The description is one clause, concrete, and at the level the source supports.
- [ ] `python3 scripts/check_links.py README.md` passes.
- [ ] Section placement is right and the entry is not duplicated elsewhere.

By contributing, you agree that your contribution can be distributed under the repository's [CC BY 4.0 license](LICENSE).
