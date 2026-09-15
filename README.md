# ADAP Recovery Tracker

Weekly tracking for the $265,170 recovery across ELA Solution Sales and
Account Management 1. Five motions, seven milestones, five standing
commitments, thirteen weeks.

Runs as a static page. With Supabase configured it syncs across devices and
people; without it, it stores everything in the browser on one device.

---

## 1 · Put it on GitHub

```bash
git init
git add .
git commit -m "ADAP recovery tracker"
git branch -M main
git remote add origin git@github.com:YOURNAME/adap-tracker.git
git push -u origin main
```

Then **Settings → Pages → Source: GitHub Actions**. The workflow in
`.github/workflows/pages.yml` publishes on every push to `main`.

Your URL will be `https://YOURNAME.github.io/adap-tracker/`.

> Make the repo **private** if the numbers are sensitive. Private repos can
> still use Pages on a paid GitHub plan; on the free plan Pages requires a
> public repo, so either go paid or host it somewhere internal instead.

## 2 · Set up Supabase

1. supabase.com → new project. Pick a region near your team.
2. **SQL Editor** → paste `supabase/schema.sql` → Run.
3. **Authentication → URL Configuration** → add your Pages URL to
   *Site URL* and *Redirect URLs*.
4. **Project Settings → API** → copy the Project URL and the `anon` key
   into `config.js`, then commit and push.
5. Open the app, enter your email, click the link it sends.
6. Back in **SQL Editor**, edit `supabase/seed.sql` to use your email and
   run it. That creates the workspace and the seven milestones.
7. Reload the app. The sidebar should read **SYNCED**.

The anon key is safe to commit. Row level security is what protects the
data — only workspace members can read or write, and that is enforced in
the database, not in the browser.

## 3 · Add your team

After each person has signed in once:

```sql
insert into workspace_members (workspace_id, user_id, role)
select w.id, u.id, 'member'
from workspaces w, auth.users u
where w.name like 'ADAP Recovery%' and u.email = 'balaji@company.com';
```

They will see the same board and can update their own findings and
progress. Changes appear on everyone else's screen without a reload.

## 4 · Install it on a phone

Open the Pages URL, then **Add to Home screen**. It runs full screen with
its own icon.

---

## Files

| | |
|---|---|
| `index.html` | the whole app |
| `db.js` | storage adapter — Supabase, or the browser as a fallback |
| `config.js` | your Supabase URL and anon key |
| `supabase/schema.sql` | tables, triggers, row level security |
| `supabase/seed.sql` | creates the workspace and seeds the milestones |
| `assets/` | icons |

## Without Supabase

Leave `config.js` empty and everything still works, stored in that one
browser on that one device. The sidebar will say **THIS DEVICE ONLY**.
Use **EXPORT JSON** often — clearing site data wipes it, and there is no
other copy.

## Changing the plan

Motions, habits and the target live at the top of the script in
`index.html` — `MOTIONS`, `HABITS`, `TARGET`, `WEEKS`. Milestones live in
the database once Supabase is on; edit them in the Table Editor or add
rows to `milestones`.
