(() => {
  const TOTAL = 17;
  const pages = Array.from({ length: TOTAL }, (_, i) => `assets/pages/page-${String(i + 1).padStart(2, "0")}.jpg`);
  const $ = (id) => document.getElementById(id);
  const frame = $("book-frame");
  const mount = $("book");
  const handle = $("drag-handle");
  let current = 0;
  let flipping = false;
  let zoom = 1;
  let position = { x: 0, y: 0 };
  let drag = null;

  const pageElements = pages.map((src, index) => {
    const page = document.createElement("div");
    page.className = "flip-page";
    page.setAttribute("aria-label", `第 ${index + 1} 页`);
    const image = document.createElement("img");
    image.src = src;
    image.alt = "";
    image.draggable = false;
    page.appendChild(image);
    return page;
  });

  const flipbook = new St.PageFlip(mount, {
    width: 595, height: 842, size: "stretch", minWidth: 135, maxWidth: 595,
    minHeight: 191, maxHeight: 842, drawShadow: true, flippingTime: 920,
    usePortrait: false, startPage: 0, startZIndex: 0, autoSize: true,
    maxShadowOpacity: .55, showCover: true, mobileScrollSupport: true,
    swipeDistance: 20, clickEventForward: true, useMouseEvents: true,
    showPageCorners: true, disableFlipByClick: false
  });

  function updateFrame() {
    frame.classList.toggle("is-cover", current === 0);
    frame.classList.toggle("is-open", current !== 0);
    frame.classList.toggle("is-flipping", flipping);
    frame.style.setProperty("--book-zoom", zoom);
    frame.style.setProperty("--book-x", `${position.x}px`);
    frame.style.setProperty("--book-y", `${position.y}px`);
    $("zoom-readout").textContent = `${Math.round(zoom * 100)}%`;
    $("zoom-out").disabled = zoom <= .8;
    $("zoom-in").disabled = zoom >= 2;
  }

  function updatePage() {
    const first = current + 1;
    const shown = first === 1 || first === TOTAL ? [first] : [first, Math.min(first + 1, TOTAL)];
    $("page-label").textContent = shown.length === 1 ? (first === 1 ? "封面" : `第 ${first} 页`) : `第 ${shown[0]}-${shown[1]} 页`;
    $("page-readout").textContent = `${shown.length === 2 ? `${shown[0]}-${shown[1]}` : shown[0]} / ${TOTAL}`;
    [$("stage-prev"), $("toolbar-prev")].forEach((button) => button.disabled = current === 0 || flipping);
    [$("stage-next"), $("toolbar-next")].forEach((button) => button.disabled = current >= TOTAL - 1 || flipping);
    document.querySelectorAll(".thumbnail-list button").forEach((button, i) => button.classList.toggle("is-current", shown.includes(i + 1)));
    updateFrame();
  }

  flipbook.on("init", () => { $("loading").remove(); updatePage(); });
  flipbook.on("flip", (event) => { current = Number(event.data); updatePage(); });
  flipbook.on("changeState", (event) => { flipping = event.data !== "read"; updatePage(); });
  flipbook.loadFromHTML(pageElements);
  flipbook.getPage(0).setDensity("soft");
  flipbook.getPage(TOTAL - 1).setDensity("soft");

  const previous = () => { if (!flipping && current > 0) flipbook.flipPrev("bottom"); };
  const next = () => { if (!flipping && current < TOTAL - 1) flipbook.flipNext("bottom"); };
  $("stage-prev").onclick = $("toolbar-prev").onclick = previous;
  $("stage-next").onclick = $("toolbar-next").onclick = next;

  function setZoom(value) { zoom = Math.min(2, Math.max(.8, Math.round(value * 100) / 100)); updateFrame(); }
  frame.addEventListener("wheel", (event) => { event.preventDefault(); setZoom(zoom + (event.deltaY < 0 ? .05 : -.05)); }, { passive: false });
  $("zoom-out").onclick = () => setZoom(zoom - .1);
  $("zoom-in").onclick = () => setZoom(zoom + .1);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Control") frame.classList.add("ctrl-held");
    if (event.key === "ArrowRight" || event.key === "PageDown") next();
    if (event.key === "ArrowLeft" || event.key === "PageUp") previous();
    if (event.key === "Home") flipbook.flip(0, "bottom");
    if (event.key === "End") flipbook.flip(TOTAL - 1, "bottom");
    if (event.key === "Escape") closeDrawer();
  });
  window.addEventListener("keyup", (event) => { if (event.key === "Control") frame.classList.remove("ctrl-held"); });
  window.addEventListener("blur", () => frame.classList.remove("ctrl-held"));
  handle.addEventListener("pointerdown", (event) => {
    if (!event.ctrlKey) return;
    event.preventDefault(); handle.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, ox: position.x, oy: position.y };
  });
  handle.addEventListener("pointermove", (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    position = { x: drag.ox + event.clientX - drag.x, y: drag.oy + event.clientY - drag.y };
    updateFrame();
  });
  const endDrag = (event) => { if (drag && drag.id === event.pointerId) drag = null; };
  handle.addEventListener("pointerup", endDrag);
  handle.addEventListener("pointercancel", endDrag);

  const list = $("thumbnail-list");
  pages.forEach((src, index) => {
    const button = document.createElement("button");
    button.innerHTML = `<img src="${src}" alt=""><span>${index + 1}</span>`;
    button.setAttribute("aria-label", `跳转到第 ${index + 1} 页`);
    button.onclick = () => { if (!flipping) flipbook.flip(index, "bottom"); closeDrawer(); };
    list.appendChild(button);
  });
  function openDrawer() { $("drawer").classList.add("is-open"); $("drawer").setAttribute("aria-hidden", "false"); }
  function closeDrawer() { $("drawer").classList.remove("is-open"); $("drawer").setAttribute("aria-hidden", "true"); }
  $("header-thumbs").onclick = $("toolbar-thumbs").onclick = $("page-readout").onclick = openDrawer;
  $("close-drawer").onclick = closeDrawer;

  function notice(text) { const box = $("notice"); box.textContent = text; box.hidden = false; clearTimeout(notice.timer); notice.timer = setTimeout(() => box.hidden = true, 1800); }
  $("share").onclick = async () => {
    try {
      if (navigator.share) await navigator.share({ title: document.title, url: location.href });
      else { await navigator.clipboard.writeText(location.href); notice("链接已复制"); }
    } catch (_) {}
  };
  $("fullscreen").onclick = async () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  updateFrame();
})();
