# Reddit & Community Distribution Playbook: High-Signal GFI Drops

> **Objective:** Drive high-intent open-source contributors into GetMerged organically via Reddit & Discord without triggering spam filters or account bans.

---

## 1. Core Rule of Reddit Distribution (The 9:1 Value Principle)
* **Never pitch GetMerged in the post body.**
* **Never include a custom domain link in the initial post.** Only include raw `github.com` links.
* **Let the metrics do the teasing:** Mentioning specific maintainer velocity numbers (`S-Tier responsiveness`, `~3h median response time`) naturally triggers readers to ask: *"How are you tracking these metrics?"* or *"Where did you find this data?"*
* **Only link in comment replies:** When a commenter asks how you calculated the numbers or where the data came from, reply naturally:
  > *"I wrote an indexer for 100k+ repos that tracks PR review latency and merge rates so people stop opening PRs on dead repos. You can check any repo scorecard directly at https://getmerged.abhishekco.de"*

---

## 2. Target Communities & Flairs

| Community | Best Day / Time (UTC) | Flair | Post Angle |
|---|---|---|---|
| **r/learnprogramming** | Sat & Sun 12:00 – 16:00 | `Resource` | "Looking for your first PR? Here are 5 repos with active maintainers" |
| **r/opensource** | Tue & Thu 13:00 – 17:00 | `Discussion` | "Weekly fresh GFIs with verified <24h review latency" |
| **r/rust** | Wednesday | `Project` or `Community` | Language-specific drop (Rust only) |
| **r/golang** | Thursday | `Community` | Language-specific drop (Go only) |

---

## 3. Automation CLI

To generate the next drop at any time, run:

```bash
/home/deploy/src/opendoor/scripts/distribution/generate_reddit_gfi_drop.py
```

It queries MySQL live for:
* Status: `is_open = 1` and `has_linked_pr = 0`
* Age: Created within the last 7 days
* Quality: Repos in `S` or `A` C-Rank tiers only
* Output: Formatted markdown ready to copy-paste.
