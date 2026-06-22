/**
 * rAF-driven continuous scroll for webtoon mode. Held arrow keys call
 * `start(dir)`; the loop scrolls the container every frame and ramps from
 * `SPEED` to `SPEED_FAST` after the key has been held past `BOOST_AFTER`.
 * `stop(dir)` halts only if the active direction still matches.
 */
export function createContinuousScroll(
  getContainer: () => HTMLDivElement | undefined,
) {
  let dir = 0;
  let raf = 0;
  let lastFrame = 0;
  let startTime = 0;
  const SPEED = 3000; // px/s
  const SPEED_FAST = 15000; // px/s after hold
  const BOOST_AFTER = 2000; // ms

  function loop(now: number) {
    if (!dir) return;
    if (lastFrame) {
      const dt = (now - lastFrame) / 1000;
      const speed = now - startTime > BOOST_AFTER ? SPEED_FAST : SPEED;
      getContainer()?.scrollBy(0, dir * speed * dt);
    }
    lastFrame = now;
    raf = requestAnimationFrame(loop);
  }

  return {
    start(d: number) {
      if (dir === d) return;
      dir = d;
      lastFrame = 0;
      startTime = performance.now();
      raf = requestAnimationFrame(loop);
    },
    stop(d: number) {
      if (dir !== d) return;
      dir = 0;
      cancelAnimationFrame(raf);
    },
    cleanup() {
      cancelAnimationFrame(raf);
    },
  };
}
