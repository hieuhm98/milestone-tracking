# Git & Version Control

## 1. What is Version Control?

**Analogy:** have you ever seen a folder like this?

```text
Report.docx
Report_v2.docx
Report_v2_final.docx
Report_v2_final_REALLY_final.docx
Report_v2_final_REALLY_final_Lan_edits.docx
```

Everyone has. It is a home-made attempt at **version control**: keeping old versions so you can go back, and trying to tell who changed what. It breaks down fast — which file is current? What exactly did Lan change? What if two people edited different copies at the same time?

Now think of a video game with **save points**. Before a hard boss fight you save. If it goes badly, you reload and try again. Each save remembers exactly where you were. Version control gives software teams save points for their code — with a note on every save saying who made it and why.

A **Version Control System (VCS)** is a system that tracks changes in code over time, allowing many people to work together and to roll back to previous versions.

Three things a VCS gives a team:

1. **History** — every change is recorded: what changed, who changed it, when, and why.
2. **Undo** — you can go back to any earlier version if something breaks.
3. **Teamwork** — ten developers can work on the same project at once without overwriting each other's work.

**Git** is the most popular VCS today (free and open source).

"Open source" means its source code is public and anyone can use it for free. Git was created in 2005 by Linus Torvalds, the creator of Linux, and today almost every software company uses it.

### How Git differs from "Version history" in Google Docs

Google Docs also keeps a version history, so the idea may already feel familiar. Two important differences:

- In Google Docs, everyone edits **one shared copy** live. In Git, every developer has a **full copy of the whole project and its history** on their own computer, works separately, and then combines their work with the others on purpose.
- Google Docs saves automatically every few seconds. In Git, the developer **decides** when to save a version, and writes a short note explaining it.

> **Common misconception:** "Git and GitHub are the same thing." Git is the tool that tracks versions on your computer. GitHub is a website that stores Git projects online so a team can share them. We come back to this in Section 8.

---

## 2. Why do BAs/PMs need to know Git?

A **BA (Business Analyst)** or **PM (Project Manager)** does not write code, but works with people who live in Git all day. Knowing the vocabulary makes you a far more effective teammate.

- To understand what developers are talking about in the daily standup.
- To read a **pull request** and review requirements.
- To understand why merging is needed before a release.
- To know when code has "gone to production".
- You don't need to know how to code, just the concepts.

### What you will hear — and what it means

| A developer says… | In plain words |
|-------------------|----------------|
| "I pushed it yesterday." | My work is uploaded to the shared server; others can see it. |
| "It's still on my branch." | It is done on my side but not yet combined with the main version. |
| "The PR is waiting for review." | I have asked colleagues to check my work before it is combined. |
| "It's merged to main." | It has been approved and combined into the main version — it will go out in the next release. |
| "I had merge conflicts." | Someone else changed the same lines; I had to decide by hand which version to keep. |
| "Let's do a hotfix." | There is an urgent bug in the live system; we will fix it outside the normal schedule. |

A real example: in the standup, a developer says *"Login is done, PR is up, but I'm blocked waiting on review."* A PM who understands Git knows the feature is **not** finished from the user's point of view — nobody can use it until the PR is reviewed and merged. The right next step is to help get a reviewer, not to mark the ticket "Done".

---

## 3. Basic concepts

### Repository (Repo)

**Analogy:** a project folder with a built-in diary. The folder holds the files; the diary records every change ever made to them.

A store of code together with its full change history.
- **Local repo**: on the developer's machine.
- **Remote repo**: on a server (GitHub, GitLab, Bitbucket).

The local repo is where you work; the remote repo is the shared "source of truth" the whole team syncs with.

### Commit

**Analogy:** a save point in a game, with a sticky note on it.

A "snapshot" of the code at a specific point in time, including:
- A message describing the change.
- The author and a timestamp.
- A unique hash (e.g., `a1b2c3d`).

A **hash** is a long ID made of letters and numbers (40 characters in full) that Git calculates from the content. People usually show only the first 7 characters, like `a1b2c3d`. No two commits share one, so it works like a fingerprint.

```text
commit a1b2c3d
Author: Harry <harry@mail.com>
Date:   Mon Apr 8 10:00:00 2024
Message: feat: add login page
```

Saving a commit is a two-step process:

1. **Stage** (`git add`) — choose which changes go into the next snapshot. Think of it as putting items into a box.
2. **Commit** (`git commit`) — seal the box and label it with a message.

The waiting area between the two steps is called the **staging area**.

**Good commit messages** clearly describe what changed and why. Many teams follow a convention with a short prefix:

| Prefix | Meaning | Example |
|--------|---------|---------|
| `feat:` | a new feature | `feat: add login page` |
| `fix:` | a bug fix | `fix: wrong total when voucher applied` |
| `docs:` | documentation only | `docs: update setup guide` |

A message like `update` or `asdf` tells future readers nothing — avoid it.

### Branch

**Analogy:** a photocopy of a contract that you scribble on. You can try any idea on the copy; the original stays clean. If the idea is good, you copy your changes back into the original.

A branch is an **independent** line of development. It's like making a copy to experiment with without affecting the main version.

```text
main:     A──B──C──────────────M
                \             /
feature/login:   D──E──F──G──
```

How to read this: each letter is a commit. The developer branched off after commit C, made commits D–G on `feature/login` while `main` stayed untouched, and finally **M** (a merge commit) brought the work back into `main`.

- **main/master**: the main branch, usually the most stable code.
- **feature/xxx**: for developing a new feature.
- **hotfix/xxx**: for an emergency fix.

`main` and `master` mean the same thing; newer projects call it `main`, older ones `master`. On most teams, `main` is the code that is running (or about to run) in **production** — the live system real users use.

### Merge
Combining changes from one branch into another. When a feature is done → merge it into main.

### Clone
Creating a local copy of a remote repo.

A new developer joining the team clones the repo on day one: it downloads the whole project and its full history onto their computer.

### Pull / Push
- **Pull**: fetch the latest changes from the remote to local.
- **Push**: push local changes up to the remote.

**Analogy:** the remote repo is a shared cloud folder. *Pull* = download your teammates' latest work. *Push* = upload your own. A developer normally pulls first thing in the morning and pushes when a piece of work is ready to share.

```text
   Developer A's laptop          Remote repo (GitHub)          Developer B's laptop
   ┌───────────────┐   push ──▶  ┌───────────────┐  ◀── push   ┌───────────────┐
   │  local repo   │             │  shared repo  │             │  local repo   │
   └───────────────┘  ◀── pull   └───────────────┘   pull ──▶  └───────────────┘
```

---

## 4. Pull Request (PR) / Merge Request (MR)

**Analogy:** a journalist writes an article, but it does not go straight into the newspaper. It goes to an editor first, who reads it, asks for changes, and only then approves it for print. A pull request is that "send to editor" step for code.

A **Pull Request** is a request to merge code from a feature branch into the main branch — accompanied by a code review.

GitHub and Bitbucket call it a **Pull Request (PR)**; GitLab calls the same thing a **Merge Request (MR)**.

A typical workflow:

```text
1. The developer creates a branch: feature/add-payment
2. Codes and commits
3. Pushes to the remote
4. Creates a Pull Request
5. A colleague reviews the code
6. The BA/PO reviews: does it meet the acceptance criteria?
7. Approve → Merge into main
8. Deploy
```

### What you see on a PR page

When you open a PR on GitHub or GitLab, you typically see:

- **Title and description** — what the change is, often with a link to the ticket (e.g. `JIRA-123`).
- **Commits** — the list of save points included.
- **Files changed** — a "diff": removed lines in red, added lines in green.
- **Conversation** — comments from reviewers, sometimes on specific lines.
- **Checks** — automatic tests that ran (green tick = passed, red cross = failed).
- **Status** — Open, Approved, Changes requested, Merged, or Closed.

**BAs can take part**: reviewing the PR for business logic and checking whether the AC is implemented correctly.

**AC (acceptance criteria)** are the conditions a feature must meet to be accepted, e.g. *"Given a cart over 500,000 VND, when the customer checks out, then shipping is free."* You do not need to read the code. Read the description, look at screenshots, and — best of all — test the feature on the **staging** environment (a private copy of the system used for testing) before it is merged.

A useful BA comment looks like this:

> *"AC #3 says the discount must not apply to sale items. On staging, I added a sale item and still got 10% off. Could you check?"*

> **Common misconception:** "Merged means released." Not necessarily. Merging puts the code into the main branch; **deploying** is the separate step that puts it on the live servers. Some teams deploy every merge automatically, others release once every two weeks.

---

## 5. Gitflow Workflow

A **workflow** is a team's agreed way of using branches. **Gitflow** is a well-known one, used especially by teams with scheduled releases.

```text
main ─────────────────────────── (production)
  └── develop ──────────────────── (integration)
        ├── feature/login ──┐
        ├── feature/cart ───┤→ merge into develop
        └── feature/xxx ────┘
  └── release/1.0 ── (final testing) ── merge into main
  └── hotfix/bug123 ── (emergency fix) ── merge into main + develop
```

### The branches, one by one

| Branch | Purpose | Lives for |
|--------|---------|-----------|
| `main` | Code that is in production; every commit here is a release | Forever |
| `develop` | Integration branch: finished features are combined here and tested together | Forever |
| `feature/*` | One new feature, e.g. `feature/login` | Until the feature is merged into `develop` |
| `release/*` | Preparing a version, e.g. `release/1.0`: only final testing and small fixes | Until it is merged into `main` (and back into `develop`) |
| `hotfix/*` | An urgent fix for a production bug, branched straight from `main` | Until it is merged into `main` **and** `develop` |

### A story to follow

1. Two developers build `feature/login` and `feature/cart` at the same time, each on their own branch.
2. When each is finished and its PR is approved, it is merged into `develop`.
3. Before the release date, the team creates `release/1.0` from `develop`. Testers test it; only bug fixes are allowed here — no new features.
4. When testing passes, `release/1.0` is merged into `main` and deployed. Version 1.0 is live.
5. Two days later, users report that payments fail. A developer creates `hotfix/bug123` **from `main`** (the live code), fixes it, and merges it into `main` (to fix production) **and** `develop` (so the bug does not come back in the next release).

Many teams today use something simpler — for example **trunk-based development**, where everyone merges small changes into `main` frequently. The concepts (branch, PR, merge) are the same.

---

## 6. Basic Git commands (to understand, not necessarily to use)

Developers type Git commands into a **terminal** (a text window where you type instructions instead of clicking). The text after `#` is a comment explaining the command.

```bash
git clone <url>       # download the repo
git pull              # fetch the latest changes
git checkout -b feature/login  # create and switch to a new branch
git add .             # stage changes
git commit -m "feat: add login"  # save a snapshot
git push              # push to the remote
git merge feature/login  # merge a branch into the current branch
git log               # view the commit history
```

Two more you will see often:

```bash
git status            # show which files changed and what is staged
git log --oneline     # short history: one line per commit
```

`git log` shows the history of commits in the repository: who committed, when, and with what message — the project's diary.

### Try it yourself: your first repository

This exercise is safe: everything happens in a new practice folder that you can delete afterwards.

**Install Git first.**
- **macOS:** open **Terminal** (press `Cmd + Space`, type "Terminal"). Type `git --version`. If Git is missing, macOS offers to install the "Command Line Developer Tools" — accept.
- **Windows:** download Git from `https://git-scm.com`, install with the default options, then open **Git Bash** from the Start menu. Use Git Bash for all commands below.

Check it works — you should see a version number such as `git version 2.50.1` (any recent version is fine):

```bash
git --version
```

**Step 1 — create a practice repo:**

```bash
mkdir git-practice
cd git-practice
git init -b main
git config user.name "Your Name"
git config user.email "you@example.com"
```

Expected: `Initialized empty Git repository in …/git-practice/.git/`. The two `config` lines set the name shown on your commits, for this practice folder only.

**Step 2 — make your first commit:**

```bash
echo "Shopping list" > notes.txt
git status
git add notes.txt
git commit -m "Add shopping list"
```

`git status` lists `notes.txt` in red under "Untracked files" — Git sees the file but is not tracking it yet. After the commit you see something like `[main (root-commit) 3f2a91c] Add shopping list` and `1 file changed, 1 insertion(+)`.

**Step 3 — work on a branch, then merge:**

```bash
git checkout -b feature/add-milk
echo "Milk" >> notes.txt
git commit -am "Add milk"
git checkout main
cat notes.txt
git merge feature/add-milk
cat notes.txt
git log --oneline
```

Notice: right after switching back to `main`, `notes.txt` contains only "Shopping list" — the branch's change is not there yet. After the merge (Git prints `Fast-forward`, meaning `main` simply moved forward to include the branch's commit), the file contains "Milk" too, and `git log --oneline` shows both commits, newest first.

(`-am` is a shortcut: stage all changes to already-tracked files and commit in one go.)

When you are done, you can simply delete the `git-practice` folder. Nothing was sent anywhere — this repo exists only on your computer, because you never pushed it to a remote.

---

## 7. Merge Conflicts

**Analogy:** two colleagues each print the same contract. One changes the payment deadline to "30 days"; the other changes the same sentence to "45 days". When they bring their copies back, nobody can combine them automatically — a human has to decide which one is right.

A **merge conflict** happens when two people change the same part of the same file in different ways on two different branches, and Git cannot tell which version to keep.

Important: most merges have **no** conflict. If one person edits the login page and another edits the cart page — or even different lines of the same file — Git combines them automatically. Conflicts only happen when the *same lines* were changed differently.

### What a conflict looks like

Git stops the merge and marks the clashing spot inside the file:

```text
<<<<<<< HEAD
Payment due within 30 days
=======
Payment due within 45 days
>>>>>>> feature/new-terms
```

- Between `<<<<<<< HEAD` and `=======` is the version on the branch you are merging **into**.
- Between `=======` and `>>>>>>>` is the version from the branch being merged **in**.

The developer edits the file to keep the correct text, deletes the marker lines, then runs `git add` and `git commit` to finish the merge.

### Why a BA should care

Sometimes a conflict is not a technical question but a **business** one: two features, built from two different requirements, changed the same rule in different ways. The developer may come to you asking *"Ticket A says 30 days, ticket B says 45 — which is right?"* That is a requirements conflict surfacing through Git, and it is the BA's job to resolve it.

> **Try it yourself (optional):** in the `git-practice` folder from Section 6, create a conflict on purpose:
>
> 1. `git checkout -b feature/eggs`, then `echo "Eggs" >> notes.txt` and `git commit -am "Add eggs"`.
> 2. `git checkout main`, then `echo "Bread" >> notes.txt` and `git commit -am "Add bread"`.
> 3. `git merge feature/eggs` — Git prints `CONFLICT (content): Merge conflict in notes.txt`.
> 4. Open `notes.txt` in any text editor: you will see the `<<<<<<<`, `=======` and `>>>>>>>` markers around "Bread" and "Eggs". Keep both lines, delete the three marker lines, save.
> 5. `git add notes.txt` then `git commit -m "Merge eggs"`. The conflict is resolved.

---

## 8. GitHub, GitLab, Bitbucket

**Analogy:** email is a technology; Gmail and Outlook are companies offering an email service. In the same way, **Git** is the technology, and GitHub, GitLab and Bitbucket are services built around it.

These are **Git repository hosting platforms**:

| Platform | Strengths |
|----------|-----------|
| GitHub | The most popular, with a large community |
| GitLab | Integrated CI/CD, self-hosted |
| Bitbucket | Integrates well with Jira (Atlassian) |

They store the **remote repo** online so a team can collaborate, and they add features on top of Git:

- **Pull requests / merge requests** and code review.
- **Access control** — who can see or change which project.
- **Issues** — simple task tracking (many teams use Jira instead).
- **CI/CD** — *Continuous Integration / Continuous Delivery*: robots that automatically run tests on every change and can deploy the code when tests pass.

A few of the terms in the table:

- **Self-hosted** means a company can install GitLab on its own servers instead of using the public website — popular with banks and other organisations that must keep code in-house.
- **Jira** is a popular ticket-tracking tool made by Atlassian, the same company that makes Bitbucket, so a ticket and its code changes can be linked easily.

### Git vs GitHub at a glance

| | Git | GitHub (and similar) |
|--|-----|----------------------|
| What it is | A version control tool | A website / service that hosts Git repos |
| Where it runs | On your computer | In the cloud (or the company's servers) |
| Needs internet? | No | Yes |
| Who makes it | Open-source community | A company (GitHub is owned by Microsoft) |

---

## 9. Summary

- **Git**: version control — tracking the history of the code.
- **Commit**: a snapshot of the code at a point in time.
- **Branch**: an independent line of development.
- **Pull Request**: a request to merge + review — where a BA can take part.
- **main/master**: the stable branch, usually = production.
- **Merge**: combining one branch into another.
- **Merge conflict**: two branches changed the same lines differently; a human must decide.
- **Gitflow**: `feature` → `develop` → `release` → `main`; `hotfix` goes from `main` back into `main` and `develop`.
- GitHub/GitLab/Bitbucket: platforms for storing and collaborating.

### Key terms

| Term | Plain-language meaning |
|------|------------------------|
| Version control (VCS) | A system that records every version of the files so you can compare and go back |
| Repository (repo) | A project folder plus its full change history |
| Commit | A labelled save point: what changed, who, when, why |
| Hash | The unique ID of a commit, e.g. `a1b2c3d` |
| Staging area | Where changes wait before being committed |
| Branch | A separate line of work that does not disturb the main version |
| Merge | Combining the changes from one branch into another |
| Merge conflict | Two changes to the same lines that Git cannot combine on its own |
| Clone / Pull / Push | Copy the remote repo / download new changes / upload your changes |
| Pull Request (PR) / Merge Request (MR) | A request to review and merge a branch |
| Hotfix | An urgent fix for a bug in production |
| Production | The live system that real users use |
