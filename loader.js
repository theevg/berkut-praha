(() => {
  const loader = document.querySelector("#page-loader");

  if (!loader) return;

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const startedAt = performance.now();
  const minimumDisplay = reducedMotion ? 0 : 650;

  let closing = false;

  loader.hidden = false;

  function closeLoader() {
    if (closing) return;

    closing = true;
    clearTimeout(safetyTimeout);

    loader.classList.add("is-leaving");

    setTimeout(() => {
      loader.hidden = true;
    }, reducedMotion ? 0 : 350);
  }

  function pageReady() {
    const elapsed = performance.now() - startedAt;
    const remaining = Math.max(0, minimumDisplay - elapsed);

    setTimeout(closeLoader, remaining);
  }

  const safetyTimeout = setTimeout(closeLoader, 3000);

  if (document.readyState === "complete") {
    pageReady();
  } else {
    window.addEventListener("load", pageReady, { once: true });
  }
})();