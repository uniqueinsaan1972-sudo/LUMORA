# LUMORA UI design system
- **Tokens:** `web/app/globals.css` — CSS variables for dark (signature) and a hand-tuned light theme; `.dark` class on <html> (default dark, saved in localStorage `lumora-theme`).
- **Aurora background:** 3 slow-drifting radial lights (`.aurora`, transform-only animation). **Surfaces:** `.card` / `.glass` (translucent + backdrop blur).
- **Module identity:** `data-module` is set from the URL (components/ModuleShell.tsx); each module overrides `--a1/--a2/--glow/--on-accent`, so buttons, icons, active nav and bars pick up the module colour. Add a module = add one CSS rule.
- **Fonts (self-hosted, no external requests):** Inter Variable (UI), Manrope Variable (headings), Noto Nastaliq Urdu (Urdu).
- **Components:** `components/ui.tsx` (PageTitle, Stat, Bars, ProgressBar, ProgressRing, Empty, Skeleton), `Reveal`/`CountUp`, `Toast`, `ConfirmDialog`, `Nav` (collapsible sidebar, animated active indicator, tooltips, mobile drawer).
- **Motion:** framer-motion for page transitions/dialogs/nav; CSS for hover, press, option-select, accordions, bars, flashcard flip. `MotionConfig reducedMotion="user"` + a `prefers-reduced-motion` CSS block disable motion for users who ask.
- **RTL:** logical properties (`start/end`, `ms/me`, `border-e`); layout sets `dir` from the user's language.
