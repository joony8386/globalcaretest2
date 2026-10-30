# Test the Global Care site on GitHub Pages

A step-by-step guide. No coding needed for Option A. Replace `YOUR_USERNAME` and `YOUR_REPO` with your own GitHub username and repository name.

---

## 0. (Optional, recommended) Test on your computer first
1. Unzip `global-care-site.zip`. You get a folder `global-care-site/`.
2. Open a terminal in that folder and run:
   ```bash
   python3 -m http.server 8080
   ```
3. Open http://localhost:8080 in your browser. Press `Ctrl+C` in the terminal to stop.

---

## 1. Create a new GitHub repository
1. Sign in at https://github.com and click **+** (top right) → **New repository**.
2. Name it, e.g. `global-care-site`.
3. Choose visibility:
   - **Public**: GitHub Pages works on the free plan.
   - **Private**: Pages needs a paid plan (GitHub Pro, Team or Enterprise). On a free account, use Public for testing.
4. **Do not** tick "Add a README" (the site already has one). Leave the other options off.
5. Click **Create repository**.

## 2. Upload the site files

> ⚠️ Important: `index.html` must be at the **top level** of the repo, not inside a subfolder. Upload the *contents* of `global-care-site/`, not the folder itself.

### Option A: Website upload (easiest)
1. In the new empty repo, click **uploading an existing file**.
2. Open the unzipped `global-care-site/` folder on your computer, select **everything inside it** (`index.html`, `about.html`, `css`, `js`, `assets`, `lab`, …) and drag it into the browser.
3. Wait until every file shows as uploaded.
4. Click **Commit changes**.
5. Check the repo's main page: you should see `index.html`, `css/`, `js/`, `lab/`, `assets/` at the top level.

### Option B: Git command line
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cp -R global-care-site/. YOUR_REPO/
cd YOUR_REPO
git add .
git commit -m "Global Care site for Pages test"
git branch -M main
git push -u origin main
```

## 3. Turn on GitHub Pages
1. In the repo, go to **Settings** → **Pages** (left sidebar).
2. Under **Build and deployment** → **Source**, choose **Deploy from a branch**.
3. Branch: **main** (or `master` if that's what your repo uses), folder: **/ (root)**.
4. Click **Save**.

## 4. Open the site
1. Wait 1–2 minutes. (Progress is in the **Actions** tab; a green tick means it's done.)
2. Open: `https://YOUR_USERNAME.github.io/YOUR_REPO/`
   The link also appears at the top of **Settings → Pages**.

## 5. Click-test checklist
**Main site**
- [ ] Home loads with logo, styling and images (no plain unstyled page)
- [ ] Top navigation works on every page; favicon shows in the browser tab
- [ ] About page
- [ ] Products: three categories, **Consumables**, **Pain management**, **Educational / Training**; each carousel slides
- [ ] Home category cards link to the right product section
- [ ] Contact form: submit shows a success message (demo only, nothing is sent)

**Innovation Lab**
- [ ] Lab hub page and calendar teaser link
- [ ] Showroom: 3D OR tour loads; click pins 1–7
- [ ] Pin 1: **Try the virtual model** opens the 3D spine model (same button on the Aldaver card on Products)
- [ ] Pin 3: full tower image shows, and the video starts when you scroll down inside the card
- [ ] Research and Sourcing pages load and forms show success
- [ ] Visit calendar: weekdays show **Available** / **Booked**; weekends and past days are disabled; month arrows work
- [ ] Clicking an available day pre-fills the booking date
- [ ] Floating **Book a visit** button appears on every Lab page, opens the form, and shows the success message

**Also try** on a phone (or narrow the browser window) to check the mobile menu and layout.

## 6. Common problems
| Symptom | Cause / fix |
|---|---|
| 404 at the Pages URL | Pages not enabled yet, wrong branch, or still building. Re-check step 3 and wait a few minutes. |
| Page shows but no styling, missing images | Files are nested in a subfolder (e.g. `YOUR_REPO/global-care-site/index.html`). Move the contents to the repo root, or open `https://YOUR_USERNAME.github.io/YOUR_REPO/global-care-site/`. |
| Pages option not available | Private repo on a free plan. Make the repo public or upgrade. |
| Changes don't appear | Wait 1–2 minutes after each commit, then hard refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`) or use a private window. |
| Some images missing only on GitHub | File names are case-sensitive on GitHub. Don't rename files. |

## 7. Updating later
Upload the changed files again (**Add file → Upload files**, same names overwrite) or `git push`. The site redeploys automatically.

## Before going live
- Replace `info@globalcare.example` with the real email.
- Connect the forms and booking to a real service (e.g. Formspree, Netlify Forms or a backend).
- Replace demo booked dates in `js/lab-booking.js` with the real schedule.
