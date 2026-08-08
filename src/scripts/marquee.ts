/**
 * The client logo marquee: keeps flowing on its own, and can also be scrolled.
 *
 * The two cannot be separate mechanisms. A CSS `transform` animation and native
 * scrolling do not compose — the track would keep sliding underneath whatever the
 * visitor dragged, and letting go would snap. So the auto-motion is moved onto the
 * SAME property the visitor moves: `scrollLeft`. One position, two things writing to
 * it, never at the same moment.
 *
 * The CSS animation stays in the stylesheet as the no-JS path. This module switches
 * it off (`data-live`) before taking over, so the two never both run.
 *
 * The loop is seamless for the same reason it was before: the track holds two copies
 * of the row, so half the scroll width is exactly one copy. Wrapping by that amount
 * lands on an identical pixel and is invisible — including mid-drag, which is what
 * makes the strip feel endless in both directions rather than hitting a wall.
 */

const RESUME_AFTER = 1100; // ms of stillness before the drift starts again

export function initMarquee() {
  const rails = Array.from(document.querySelectorAll<HTMLElement>('[data-marquee]'));
  if (!rails.length) return;

  /* Auto-drift is motion; scrolling is not. Under prefers-reduced-motion the rail
     still becomes scrollable — that is strictly better than what those visitors had
     before, which was a strip they could neither watch nor move. */
  const drift = document.documentElement.classList.contains('js-motion');

  for (const rail of rails) {
    const track = rail.querySelector<HTMLElement>('.track');
    if (!track) continue;

    rail.dataset.live = '1'; // kills the CSS animation, turns on overflow-x
    const dir = rail.dataset.dir === 'rev' ? -1 : 1;
    const dur = Number(track.dataset.dur) || 60;

    let half = 0;
    const measure = () => {
      // one copy of the row; the track holds exactly two
      half = track.scrollWidth / 2;
      if (dir < 0 && rail.scrollLeft === 0) rail.scrollLeft = half; // room to run left
    };
    measure();
    addEventListener('resize', measure, { passive: true });

    /* Speed comes from the same figure the CSS used — one copy per `dur` seconds —
       so the rows stay in step with each other and with the old behaviour. */
    const pxPerSec = () => half / dur;

    let paused = false;
    let idleTimer = 0;
    const hold = () => {
      paused = true;
      clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => { paused = false; }, RESUME_AFTER);
    };

    // Any hint of intent stops the drift; hover keeps the old "let me look at that
    // logo" behaviour, which used to be animation-play-state.
    rail.addEventListener('pointerenter', () => { paused = true; clearTimeout(idleTimer); });
    rail.addEventListener('pointerleave', () => { hold(); });
    rail.addEventListener('wheel', hold, { passive: true });
    rail.addEventListener('touchstart', hold, { passive: true });
    rail.addEventListener('touchend', hold, { passive: true });

    /* Drag on a pointer device. Without it a desktop visitor has no way to move a
       horizontal strip short of shift+wheel, which nobody discovers. */
    let dragging = false;
    let startX = 0;
    let startLeft = 0;
    rail.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return; // native touch scrolling is better
      dragging = true;
      startX = e.clientX;
      startLeft = rail.scrollLeft;
      rail.setPointerCapture(e.pointerId);
      rail.classList.add('is-dragging');
      hold();
    });
    rail.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      rail.scrollLeft = startLeft - (e.clientX - startX);
      hold();
    });
    const endDrag = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      try { rail.releasePointerCapture(e.pointerId); } catch { /* already gone */ }
      rail.classList.remove('is-dragging');
      hold();
    };
    rail.addEventListener('pointerup', endDrag);
    rail.addEventListener('pointercancel', endDrag);

    /* A drag that moved the rail should not also open the logo's link. Suppress the
       click only when it actually travelled — a plain click still works. */
    rail.addEventListener('click', (e) => {
      if (Math.abs(rail.scrollLeft - startLeft) > 4 && !dragging) e.preventDefault();
    }, true);

    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(64, now - last) / 1000; // clamp: a backgrounded tab returns huge
      last = now;

      if (drift && !paused && !dragging && half > 0) {
        rail.scrollLeft += dir * pxPerSec() * dt;
      }

      /* Normalise every frame, drifting or not, so a drag or a flick wraps too. Half
         a track is a whole copy, so the jump lands on an identical pixel. */
      if (half > 0) {
        if (rail.scrollLeft >= half * 1.5) rail.scrollLeft -= half;
        else if (rail.scrollLeft < half * 0.5) rail.scrollLeft += half;
      }

      requestAnimationFrame(step);
    };
    // start each rail mid-track so it has a full copy of room in both directions
    rail.scrollLeft = half;
    requestAnimationFrame(step);
  }
}
