/**
 * Page-level scroll controller. Everything here is transform/opacity only —
 * no layout-triggering property is written on scroll.
 *
 * Owns: the left-edge progress thread, the hero's scroll progress (--hp), the
 * sticky-nav state, and the shared reveal-on-scroll observer.
 */

export function initScroll() {
  const thread = document.querySelector<HTMLElement>('[data-thread-fill]');
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  const hero = document.querySelector<HTMLElement>('[data-hero]');

  let ticking = false;

  function read() {
    const y = window.scrollY || window.pageYOffset;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const sp = Math.min(1, y / max);

    thread?.style.setProperty('--sp', sp.toFixed(4));

    /* Hero scroll progress: 0 at the top, 1 once the hero has scrolled its own
       height. Drives the surfer's descent and the bloom behind it, both of which
       are pure CSS off this one variable — so the hero's scroll motion adds no
       listener and no second rAF loop to the page.
       (This computation previously fed the dawn→midday sky cross-fade. That element
       went with the diurnal arc; the arithmetic was the only part worth keeping.) */
    if (hero) {
      hero.style.setProperty('--hp', Math.min(1, y / Math.max(1, hero.offsetHeight)).toFixed(4));
    }

    nav?.classList.toggle('is-stuck', y > 40);

    /* The hero is a full-bleed photograph now, so the bar spends the first screen
       over a dark image and every screen after it over paper. `on-dark` is what
       swaps the bar's own colours between the two.
       The switch happens when the bar's LOWER edge leaves the hero, not when the
       page starts moving — flipping at y > 40 would have put a light bar on a dark
       picture for the remaining ~850px of the hero. Without a hero on the page
       (the service pages, the 404) the class simply never goes on. */
    if (nav) {
      const overHero = !!hero && y < hero.offsetHeight - nav.offsetHeight;
      nav.classList.toggle('on-dark', overHero);
    }
    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(read);
  }

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  read();
  landOnHash();
}

/**
 * Land on the fragment when the page is ENTERED at one (…/#services from a service
 * page, a shared /#contact link, the 404's shortcuts). This is the one-pager's main
 * navigation, so it has to be reliable.
 *
 * The browser does this itself — but `html { scroll-behavior: smooth }` makes that
 * built-in scroll ANIMATE, and it starts before the webfonts have swapped in. The
 * reflow when Fraunces lands cancels the animation partway and the visitor is left
 * near the top of the page. Measured: entering /#process put scrollY at 0 rather
 * than 2534.
 *
 * So do it explicitly, with smooth switched off for the duration, and again once
 * fonts have settled. In-page clicks are untouched and stay smooth.
 *
 * The offset is computed rather than delegated to scrollIntoView: the process
 * section is `overflow: hidden`, which makes it its own scrollport, and Chrome then
 * spends part of the scroll-margin scrolling that inner box — it landed 96px and
 * 53px short in two different code paths. Plain arithmetic lands on the pixel.
 */
function landOnHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;

  const jump = () => {
    const el = document.getElementById(id);
    if (!el) return;
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    const top = el.getBoundingClientRect().top + window.scrollY - margin;
    window.scrollTo(0, Math.max(0, Math.round(top)));
    root.style.scrollBehavior = prev;
  };

  jump();
  document.fonts?.ready.then(() => requestAnimationFrame(jump));
  addEventListener('load', () => requestAnimationFrame(jump), { once: true });
}

/**
 * Element scroll progress → a `--p` custom property from 0 to 1.
 *
 * `--p` is the fraction of the element that has passed a fixed *reading line* on
 * screen (default 62% of viewport height, overridable per element with
 * `data-progress-anchor`). Two consequences, both deliberate:
 *
 *  - Whatever `--p` drives tracks the reader instead of trailing them. The earlier
 *    version measured against the whole section plus a viewport of run-off, so a
 *    tall heading block consumed most of the range and the process line ran roughly
 *    40% behind the step you were actually reading.
 *  - Because the anchor is fixed on screen, the leading edge stays visible for the
 *    entire time the element is in view — it enters with it and leaves with it.
 *
 * Still a plain scroll-linked variable, not a pinned scrub: native scrolling, the
 * back button, keyboard paging and momentum all keep working.
 */
export function initSectionProgress() {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-progress]'));
  if (!els.length) return;

  let ticking = false;

  function read() {
    const vh = innerHeight;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (!r.height) continue;
      const anchor = vh * (Number(el.dataset.progressAnchor) || 0.62);
      const p = Math.max(0, Math.min(1, (anchor - r.top) / r.height));
      el.style.setProperty('--p', p.toFixed(4));
    }
    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(read);
  }

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  read();
}

/**
 * Count-up on the headline figures.
 *
 * The element's text is already the final value — the counter overwrites it while
 * running and restores it at the end. So no-JS, reduced-motion, a crawler and the
 * accessibility tree all read the real number, and the animation is purely additive.
 *
 * `aria-hidden` is NOT used and the value is not announced mid-flight: the figures
 * sit in a <dl> that a screen reader reads once, and rewriting the text 60 times a
 * second in a live region would be hostile. It stays a visual flourish.
 */
export function initCounters() {
  if (!document.documentElement.classList.contains('js-motion')) return;
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-count]'));
  if (!els.length || !('IntersectionObserver' in window)) return;

  const DUR = 1100;

  const run = (el: HTMLElement) => {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) return;
    const final = el.textContent ?? String(target);
    const t0 = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / DUR);
      // ease-out cubic: fast off the mark, settling onto the number rather than
      // arriving at constant speed and stopping dead
      const v = 1 - Math.pow(1 - t, 3);
      if (t < 1) {
        el.textContent = String(Math.round(target * v));
        requestAnimationFrame(step);
      } else {
        el.textContent = final;
      }
    };
    requestAnimationFrame(step);
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        run(e.target as HTMLElement);
      }
    },
    { threshold: 0.6 },
  );
  els.forEach((el) => io.observe(el));
}

/**
 * Reveal-on-scroll. Elements are visible by default; the .js-motion class on <html>
 * is what hides them, and that class is only added when motion is allowed — so a JS
 * failure can never leave the page blank.
 */
export function initReveals() {
  if (!document.documentElement.classList.contains('js-motion')) return;
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        el.classList.add('is-in');
        io.unobserve(el); // one-shot; nothing re-hides on scroll back up
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
  );

  // stagger is per named group, so one section's index never leaks into another's
  const groupCount = new Map<string, number>();

  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    const group = el.dataset.revealGroup;
    if (group) {
      const i = groupCount.get(group) ?? 0;
      groupCount.set(group, i + 1);
      el.style.setProperty('--reveal-delay', `${Math.min(i, 7) * 0.07}s`);
    }
    io.observe(el);
  });
}
