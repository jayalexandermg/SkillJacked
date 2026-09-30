# Live smoke test (run after every production deploy)

Five checks, about 10 minutes. Run them on the live site, in order. If any step fails, stop and
report which step and what you saw — later steps depend on earlier ones.

**Before you start (one-time, in the dashboards):**

- **Vercel → Project → Settings → Environment Variables:** `SUPADATA_API_KEY` is set for
  *Production*. If you just added it, redeploy — env vars only reach new deployments.
- **Supabase → SQL editor:** run
  `select column_name from information_schema.columns where table_name = 'skills';`
  and confirm the list includes `share_id`, `is_public`, `original_content`, `is_edited`,
  `updated_at`. If any is missing, run `supabase/migrations/0001_share_links.sql` and
  `0002_skill_editing.sql` from the repo (both are safe to re-run).

---

### 1. Signed-out jack works

Open the site in a private/incognito window. Paste a YouTube tutorial with clear speech (5–20
minutes is ideal) and click Jack.

- **Pass:** skill cards appear (usually after about a minute). With 10 skills you see **1 Open,
  2 Preview, 7 Locked**.
- **Fail:** an error message, or it spins past ~4 minutes. The most likely cause is the Supadata
  key: see "Before you start".

### 2. Locked cards are honest

Hover a Locked card.

- **Pass:** it says "Sign up to unlock all **N** skills", where N matches the number of skills
  shown in "N skills extracted" above the cards (not always 10).

### 3. Sign-up saves the skills

In the same window, click **Sign Up Free** and create an account. Then open **My Skills**.

- **Pass:** the skills from step 1 are listed, grouped under the video title.
- **Fail:** My Skills is empty. The most likely cause is missing database columns: see "Before
  you start".

### 4. Download installs into Claude Code

On the home page (still signed in), open the first skill and click **Download Skill (.zip)**.

- **Pass:** you get `<skill-name>.zip`. Open **Install for Claude Code** under it and run the
  macOS/Linux or Windows command shown. Then check the file is at
  `~/.claude/skills/<skill-name>/SKILL.md` (one folder, then `SKILL.md`; not two nested folders).
- Start a new Claude Code session and type `/<skill-name>`. **Pass:** Claude Code recognises the
  skill and runs it.

### 5. Library download matches

In **My Skills**, click **Download** on any skill card.

- **Pass:** same result as step 4, a `.zip` holding one `<skill-name>/SKILL.md` folder.
