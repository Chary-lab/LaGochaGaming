# AGENTS.md - LaGochaGaming Website

## Entry Points
- <co>`index.html`</co: 4:[0],7:[0],8:[0]>: <co>stream embed</co: 4:[0],7:[0],8:[0]>, <co>clips gallery</co: 4:[0],7:[0],8:[0]>, <co>social feeds</co: 4:[0],7:[0],8:[0]>
- <co>`galeria.html`</co: 4:[0],7:[0],8:[0]>: <co>drag-drop upload</co: 4:[0],7:[0],8:[0]> + <co>lightbox</co: 4:[0],7:[0],8:[0]> (JS in file)
- <co>`sorteo.html`</co: 4:[0],7:[0],8:[0]>: <co>roulette</co: 4:[0],7:[0],8:[0]> + <co>confetti</co: 4:[0],7:[0],8:[0]> (JS in file)
- <co>`style.css`</co: 4:[0],7:[0],8:[0]>: <co>CSS variables control entire theme</co: 4:[0],7:[0],8:[0]>
- <co>`img/`</co: 4:[0],7:[0],8:[0]>: <co>relative paths only</co: 4:[0],7:[0],8:[0]>

## Critical Workflow (from <co>.clinerules</co: 12:[0]>)
- <co>NO terminal commands except final `git push`</co: 12:[0]>
- <co>Read files with native tools only</co: 12:[0]>
- <co>Edit files in ONE block, never line-by-line</co: 12:[0]>
- <co>Navigation/footer duplicated in ALL three HTML files</co: 4:[0],7:[0],8:[0]>

## CSS Architecture
- <co>Colors via CSS variables</co: 5:[0]> - <co>change in one place</co: 5:[0]>
- <co>Breakpoints ONLY at 1024px and 768px</co: 5:[0]>
- <co>Grid: `repeat(3, 1fr)` for clips, `repeat(auto-fill, minmax(280px, 1fr))` for gallery</co: 5:[0]>
- <co>Dark mode values are fixed</co: 5:[0]> - <co>don't modify `--bg-color`/`--card-bg` without updating all</co: 5:[0]>

## Interactive Features
- <co>`galeria.html`</co: 4:[0],7:[0],8:[0]>: <co>drag-drop upload uses `handleFiles()`</co: 7:[0]> - <co>must preserve like button state</co: 7:[0]>
- <co>`sorteo.html`</co: 4:[0],7:[0],8:[0]>: <co>roulette animation must trigger confetti on winner</co: 7:[0]>
- <co>Both pages share footer/social icons</co: 4:[0],7:[0],8:[0]> - <co>use same HTML structure</co: 4:[0],7:[0],8:[0]>

## Deployment
- <co>CSS changes require full page refresh (cache)</co: 4:[0],7:[0],8:[0]>
- <co>Image updates: replace files in `img/` then refresh</co: 4:[0],7:[0],8:[0]>
- <co>Push to main branch for live updates (Kick.com + GitHub Pages)</co: 4:[0],7:[0],8:[0]>

## Image Management
- <co>Maintain `img/` structure exactly</co: 4:[0],7:[0],8:[0]>
- <co>References must be relative</co: 4:[0],7:[0],8:[0]> (`<co>img/1.jpg</co: 4:[0],7:[0],8:[0]>`, `<co>img/fono.png</co: 4:[0],7:[0],8:[0]>`)<co> - no absolute paths</co: 4:[0],7:[0],8:[0]>
- <co>Gallery images must be 280px height for uniform display</co: 5:[0]>

## Testing/Verification
- <co>No tests/lint/typecheck</co: 4:[0],7:[0],8:[0]> - <co>verify manually in browser</co: 4:[0],7:[0],8:[0]>
- <co>Check responsive at 1024px and 768px breakpoints</co: 5:[0]>
- <co>Verify drag-drop works with file picker AND drag-over</co: 7:[0]>
- <co>Confirm roulette displays winner with confetti</co: 7:[0]>

## References
- <co>.clinerules</co: 12:[0]> for workflow enforcement
- <co>style.css</co: 4:[0],7:[0],8:[0]> for all <co>CSS variables</co: 5:[0]>
- <co>galeria.html</co: 4:[0],7:[0],8:[0]> for <co>upload/lightbox pattern</co: 7:[0]>
- <co>sorteo.html</co: 4:[0],7:[0],8:[0]> for <co>roulette/confetti logic</co: 7:[0]>