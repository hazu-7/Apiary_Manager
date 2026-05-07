import { fetchHives, fetchLocations } from "./api.js";

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" }).format(d);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
}

function renderRecentHives(hives) {
  const list = document.getElementById("recent-hives-list");
  if (!list) return;

  if (!hives.length) {
    list.innerHTML = `<div class="empty-state"><strong>No hives yet</strong><p>Add a hive to start tracking your apiary.</p></div>`;
    return;
  }

  list.innerHTML = hives
    .slice(0, 6)
    .map((h) => {
      const isQueened = Boolean(h.queen_id);
      const name = h.name || `Hive ${h.id}`;
      const loc = h.location || "No Location";
      return `
        <a class="dash-item" href="/hives" title="Open hives">
          <div class="dash-item-title">${escapeHtml(name)}</div>
          <div class="dash-item-meta">
            <div>${escapeHtml(loc)}</div>
            <div>Last inspection: ${fmtDate(h.last_inspection)}</div>
          </div>
          <div class="dash-pill-row">
            <span class="dash-pill ${isQueened ? "queened" : "unqueened"}">${isQueened ? "Queened" : "Unqueened"}</span>
            <span class="dash-pill">${escapeHtml(h.box_size || "—")}</span>
          </div>
        </a>
      `;
    })
    .join("");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadDashboard() {
  const [hives, locations] = await Promise.all([fetchHives(), fetchLocations()]);

  const totalHives = hives.length;
  const queenedHives = hives.filter((h) => Boolean(h.queen_id)).length;
  const unqueenedHives = totalHives - queenedHives;
  const totalLocations = locations.length;
  const mappedLocations = locations.filter((l) => Boolean(l.lat) && Boolean(l.lng)).length;

  setText("stat-total-hives", totalHives);
  setText("stat-queened-hives", queenedHives);
  setText("stat-unqueened-hives", unqueenedHives);
  setText("stat-locations", totalLocations);

  setText("kpi-mapped", `${mappedLocations}/${totalLocations}`);

  const footnote = document.getElementById("dash-footnote");
  if (footnote) {
    footnote.textContent = totalLocations
      ? `You have ${mappedLocations} mapped location${mappedLocations === 1 ? "" : "s"} out of ${totalLocations}.`
      : "Add a location to start organizing hives by apiary site.";
  }

  const recent = [...hives].sort((a, b) => new Date(b.last_inspection) - new Date(a.last_inspection));
  renderRecentHives(recent);
}

function setupSidebarToggle() {
  const btn = document.querySelector("#toggle-sidebar");
  const sidebar = document.querySelector("#sidebar");
  if (!btn || !sidebar) return;
  btn.addEventListener("click", () => sidebar.classList.toggle("collapsed"));

  const expandBtn = document.querySelector("#expand-sidebar");
  if (expandBtn) expandBtn.addEventListener("click", () => sidebar.classList.remove("collapsed"));
}

setupSidebarToggle();
loadDashboard().catch((err) => {
  console.error(err);
  setText("dash-footnote", "Could not load dashboard data. Check the server and try again.");
});

