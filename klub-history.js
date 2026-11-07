(() => {
  "use strict";
  const dialog = document.getElementById("history-lightbox");
  if (!dialog || typeof dialog.showModal !== "function") return;
  const photos = Array.from(document.querySelectorAll("[data-history-photo]"));
  const image = document.getElementById("history-lightbox-image");
  const caption = document.getElementById("history-lightbox-caption");
  const counter = document.getElementById("history-photo-counter");
  let current = 0;
  function show(index) {
    current = (index + photos.length) % photos.length;
    const link = photos[current];
    image.alt = link.querySelector("img").alt;
    image.src = link.href;
    caption.textContent = link.dataset.caption;
    counter.textContent = `${current + 1} / ${photos.length}`;
  }
  photos.forEach((link, index) => {
    link.addEventListener("click", event => {
      // Preserve open-in-new-tab and download actions.
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      show(index);
      dialog.showModal();
      document.body.classList.add("history-photo-open");
    });
  });
  dialog.querySelector(".history-lightbox-close").addEventListener("click", () => dialog.close());
  document.getElementById("history-prev").addEventListener("click", () => show(current - 1));
  document.getElementById("history-next").addEventListener("click", () => show(current + 1));
  dialog.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft") { event.preventDefault(); show(current - 1); }
    if (event.key === "ArrowRight") { event.preventDefault(); show(current + 1); }
  });
  let outsidePress = false;
  dialog.addEventListener("pointerdown", event => { outsidePress = event.target === dialog; });
  dialog.addEventListener("click", event => {
    if (outsidePress && event.target === dialog) dialog.close();
    outsidePress = false;
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("history-photo-open");
    image.removeAttribute("src");
  });
})();
