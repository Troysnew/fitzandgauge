// Fitz & Gauge site: mobile menu, topic tiles + chips + search filtering the episode cards, and the question form.
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  // Mobile menu
  const menu = $("#menuBtn");
  const nav = $("#nav");
  menu?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  nav?.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => {
    nav.classList.remove("open");
    menu?.setAttribute("aria-expanded", "false");
  }));

  // Episode filters: topic tiles and chips set the topic, the search box narrows by title.
  const cards = $$(".mystery-card");
  const status = $("#filterStatus");
  const names = Object.fromEntries($$("[data-topic]").map((t) => [t.dataset.topic, t.textContent.replace(/New Topic Tuesday/, "").trim()]));
  names["case-files"] = "Case Files";
  let active = "all";
  const apply = () => {
    const q = ($("#search")?.value || "").toLowerCase().trim();
    let count = 0;
    cards.forEach((card) => {
      const match = active === "all" || (active === "case-files" ? card.dataset.format === "long" : card.dataset.category === active);
      const show = match && card.dataset.title.toLowerCase().includes(q);
      card.hidden = !show;
      if (show) count++;
    });
    if (status) {
      status.textContent = count ? "" : active !== "all" && !q
        ? `No ${names[active] || "mysteries"} episodes yet. Got an idea? Ask us below!`
        : "No mysteries match that yet. Try another word, or ask us below!";
    }
  };
  const setFilter = (id) => {
    active = id;
    $$(".chip").forEach((c) => c.classList.toggle("active", c.dataset.filter === id));
    $$("[data-topic]").forEach((t) => t.classList.toggle("active", t.dataset.topic === id));
    apply();
  };
  $$(".chip").forEach((chip) => chip.addEventListener("click", () => setFilter(chip.dataset.filter)));
  $$("[data-topic]").forEach((tile) => tile.addEventListener("click", () => setFilter(tile.dataset.topic)));
  $("#search")?.addEventListener("input", apply);

  // Question form: only the question is sent, and only when a delivery service is connected (data-open="true").
  const form = $("#askForm");
  if (form && form.dataset.open === "true") {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const button = form.querySelector("button");
      button.disabled = true;
      try {
        const res = await fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(String(res.status));
        form.reset();
        $("#askThanks").hidden = false;
      } catch {
        alert("Sorry, the question didn't go through. Please try again in a minute.");
      } finally {
        button.disabled = false;
      }
    });
  }
})();
