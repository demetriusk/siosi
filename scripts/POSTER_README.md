Server-side poster generation (PNG) — notes

This project supports server-side poster PNG generation using `canvas` (node-canvas).

Why use canvas?
- Guarantees consistent typography (Inter) and exact layout.
- Produces a ready-to-share PNG that works across devices and avoids CORS/font race issues.

Dev setup (macOS)
1) Install native dependencies (Homebrew):

   brew install pkg-config cairo pango libpng jpeg giflib librsvg

2) Install npm dependency:

   pnpm add canvas

3) Add Inter font files to the project (recommended path):

   - `public/fonts/Inter-Regular.ttf`
   - `public/fonts/Inter-Bold.ttf`

   Inter is SIL Open Font License; include fonts you have rights to.

   Note: The included `scripts/fetch-inter.cjs` tries to download Inter automatically, but it may fail in restricted environments. If the script fails, download Inter manually from the official release page and place the TTFs in `public/fonts/`:

   https://github.com/rsms/inter/releases

Notes for CI / Docker
- Ensure the container image installs the same native dependencies (cairo, pango, etc.). Many base images provide packages or you can use a small image with the libs preinstalled.

Runtime behavior
- The poster route will try to dynamically import `canvas`. If `canvas` isn't installed or fails to load, the API gracefully falls back to the SVG poster variant so the app continues to work in dev environments.
- When `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` are set, the server will upload generated PNGs to a `posters` bucket and return a public URL.

Security
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret. Only the server should have access to it.

"Go live" checklist
- Install native deps on production host or CI.
- Add Inter font files under `public/fonts/`.
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in production environment.

If you'd like, I can add a small script to fetch Inter TTF files automatically and place them in `public/fonts/` during setup.