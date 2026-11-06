# Adding your own images (no code needed)

## Table stands and card designs  ->  src/content/showcase/
1. Drop the image in this folder (png, jpg, webp or avif; 1200 px wide is plenty).
2. It appears on the landing page automatically, in filename order. Name files like `04-my-new-stand.webp`.
3. Optional: describe it in `captions.json` (copy an existing block): title, caption, alt text (for screen readers).
Delete an image to remove it from the page.

## Paintings and artefacts  ->  src/content/art/
Only pieces listed in `pieces.json` are shown, so nothing appears by accident.
1. Drop the image in this folder.
2. Copy one block in `pieces.json` and change: `id`, `file` (the image filename), `title`, `story`.
3. Optional fields: `size`, `material`, `price` (only when confirmed, e.g. "₹4,500"), `available` (true or false), `link` (https link), `seller` (who sells it).
Leave out anything you have not confirmed. The page never invents a price or availability.

After any change run `npm run dev` to preview, then push to GitHub; Cloudflare Pages rebuilds by itself.
