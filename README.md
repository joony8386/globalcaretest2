# Global Care website

Static multi-page site for **Global Care Co., LTD.** and the **Global Care Innovation Lab**.

**Stack:** plain HTML / CSS / JavaScript. No build step, no framework, no server code. Deploy the folder as-is to any static host (GitHub Pages, Netlify, Vercel, S3, shared hosting).

➡️ **Testing on GitHub first? Follow [`GITHUB-TEST.md`](GITHUB-TEST.md).**

## Preview locally

```bash
cd global-care-site
python3 -m http.server 8080
```
Open http://localhost:8080

## Pages

| Path | Description |
|------|-------------|
| `index.html` | Home: hero, category cards, Innovation Lab entry |
| `about.html` | Mission, Thailand focus, trust |
| `products.html` | Three categories with carousels (see below) |
| `contact.html` | Inquiry form (front-end demo) |
| `lab/index.html` | Innovation Lab hub + visit calendar teaser |
| `lab/showroom.html` | Interactive 3D OR tour (`#or-tour`, Three.js via CDN) + visit calendar (`#visit-calendar`) |
| `lab/research.html` | Research proposals |
| `lab/sourcing.html` | Product sourcing consults |

### Product catalog
1. **Consumables**: Kyphoplasty balloon system, Vertebroplasty needle, Bone cement holding mesh
2. **Pain management**: Water-cooled radiofrequency ablation probes, Console (2 / 4 channel)
3. **Educational / Training**: Aldaver spine surgery simulation model, Altician AR spine surgical training software

### Innovation Lab
- Interactive 3D OR tour (`js/or-scene.js`): a procedural Three.js room with a pin on each product station. Clicking a pin flies the camera there and opens a card with linked products and images. Edit the `STATIONS` array to change copy, products, images, pin positions (`anchor`) or camera angles (`view`). If WebGL or the CDN is unavailable, the page falls back to `assets/or-showroom-birdseye.jpg`.
- Visit calendar showing Available / Booked weekdays, and a floating **Book a visit** button on every Lab page. Logic and sample booked dates live in `js/lab-booking.js`.

## Structure
```
*.html, lab/*.html
css/styles.css
js/main.js (nav, forms, scroll-reveal motion, carousels), js/lab-booking.js, js/or-scene.js (3D tour), js/spine-dialog.js + js/spine-viewer.js (virtual Aldaver model, loads assets/products/aldaver-spine-simulator.glb)
assets/ (logos, favicons, OR image, or-whiteboard/ web images)
```

## Still placeholder
- Email `info@globalcare.example`
- Booked dates in the calendar are demo data
- Contact, booking and Lab forms are front-end only (show a success message; nothing is sent). Wire to a form service or backend before launch.
