(() => {
  let queued = false;
  function paint() {
    queued = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    const progress = max > 0 ? Math.max(0, Math.min(1, scrollY / max)) : 0;
    const root = document.documentElement.style;
    [245, 207, 221].forEach((end, i) => {
      root.setProperty(['--page-r', '--page-g', '--page-b'][i], String(Math.round(8 + (end - 8) * progress)));
    });
  }
  function schedule() { if (!queued) { queued = true; requestAnimationFrame(paint); } }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  new ResizeObserver(schedule).observe(document.body);
  paint();
})();
