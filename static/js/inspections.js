import { fetchHives, fetchLocations, postLocation, updateHiveData, updateImage } from "./api.js";

let hives = [];
let locations = [];

function formatForInput(dateValue) {
  if (!dateValue) return new Date().toISOString().slice(0, 10);
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" }).format(d);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = String(value);
}

function updateStats() {
  const total = hives.length;
  const totalLocations = new Set(hives.map((h) => h.location || "No Location")).size;
  const queened = hives.filter((h) => Boolean(h.queen_id)).length;
  setText("stat-total", total);
  setText("stat-locations", totalLocations);
  setText("stat-queened", queened);
  setText("stat-unqueened", total - queened);
}

function groupHivesByLocation(list) {
  const map = new Map();
  for (const hive of list) {
    const loc = hive.location || "No Location";
    if (!map.has(loc)) map.set(loc, []);
    map.get(loc).push(hive);
  }
  for (const [loc, arr] of map.entries()) {
    arr.sort((a, b) => new Date(b.last_inspection) - new Date(a.last_inspection));
    map.set(loc, arr);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function render(groups) {
  const root = document.getElementById("inspections-body");
  if (!root) return;

  if (!groups.length) {
    root.innerHTML = `<div class="empty-state"><strong>No hives found</strong><p>Add hives from the Hives page.</p></div>`;
    return;
  }

  root.innerHTML = groups
    .map(([locName, locHives]) => {
      const rows = locHives
        .map((h) => {
          const queened = Boolean(h.queen_id);
          return `
            <div class="hive-row" data-hive-id="${h.id}">
              <div class="hive-row-title">
                <strong>${escapeHtml(h.name || `Hive ${h.id}`)}</strong>
                <span>Last inspection: ${fmtDate(h.last_inspection)}</span>
              </div>
              <div class="hive-row-meta">
                <div class="hive-badges">
                  <span class="badge ${queened ? "queened" : "unqueened"}">${queened ? "Queened" : "Unqueened"}</span>
                  <span class="badge">${escapeHtml(h.box_size || "—")}</span>
                  <span class="badge">${escapeHtml(h.frames || "—")} frames</span>
                </div>
                ${h.notes ? `<div title="Notes">${escapeHtml(h.notes)}</div>` : `<div class="dash-muted">No notes</div>`}
              </div>
              <div>
                <button class="btn-primary btn-ghost btn-sm-link edit-hive-btn" type="button">Edit</button>
              </div>
            </div>
          `;
        })
        .join("");

      return `
        <div class="loc-group" data-location="${escapeHtml(locName)}" data-open="true">
          <div class="loc-group-header" role="button" tabindex="0">
            <div class="loc-title">
              <h2>${escapeHtml(locName)}</h2>
              <span class="loc-count">${locHives.length}</span>
            </div>
            <div class="loc-chevron">▾</div>
          </div>
          <div class="loc-group-body">${rows}</div>
        </div>
      `;
    })
    .join("");
}

function populateLocationsDatalist() {
  const dl = document.getElementById("locations");
  if (!dl) return;
  const names = [...new Set(locations.map((l) => l.name))].sort((a, b) => a.localeCompare(b));
  dl.innerHTML = names.map((n) => `<option value="${escapeHtml(n)}">`).join("");
}

function changeImageDynamically(e) {
  const file = e.target.files[0];
  const label = e.target.parentElement;
  const img = label.querySelector("img");
  if (file && img) {
    img.src = URL.createObjectURL(file);
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
  }
}

function openEditPopup(hive) {
  document.querySelector("#edit-hive-id").value = hive.id;
  document.querySelector("#edit-image-id").value = hive.image_id;
  document.querySelector("#edit-hive-name").value = hive.name || "";
  document.querySelector("#edit-hive-location").value = hive.location || "";
  document.querySelector("#edit-hive-box-size").value = hive.box_size || "";
  document.querySelector("#edit-hive-frames").value = hive.frames || "";
  document.querySelector("#edit-hive-last-inspection").value = formatForInput(hive.last_inspection);
  document.querySelector("#edit-image").src = hive.image || "";
  document.querySelector("#edit-hive-feed").checked = Boolean(hive.feed);

  const notes = hive.notes || "";
  const notesEl = document.querySelector("#edit-hive-notes");
  notesEl.value = notes;
  syncNotesCounter();

  document.querySelector("#edit-hive-overlay").classList.add("active");
}

function syncNotesCounter() {
  const notesEl = document.querySelector("#edit-hive-notes");
  const counter = document.querySelector("#notes-counter");
  if (!notesEl || !counter) return;
  counter.textContent = `${notesEl.value.length}/500`;
}

function setupSidebarToggle() {
  const btn = document.querySelector("#toggle-sidebar");
  const sidebar = document.querySelector("#sidebar");
  if (!btn || !sidebar) return;
  btn.addEventListener("click", () => sidebar.classList.toggle("collapsed"));

  const expandBtn = document.querySelector("#expand-sidebar");
  if (expandBtn) expandBtn.addEventListener("click", () => sidebar.classList.remove("collapsed"));
}

function setupAccordion() {
  document.addEventListener("click", (e) => {
    const header = e.target.closest(".loc-group-header");
    if (!header) return;
    const group = header.closest(".loc-group");
    const body = group.querySelector(".loc-group-body");
    const open = group.dataset.open !== "false";
    group.dataset.open = open ? "false" : "true";
    body.style.display = open ? "none" : "grid";
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const header = e.target.closest(".loc-group-header");
    if (!header) return;
    e.preventDefault();
    header.click();
  });
}

function setupOverlayClose() {
  document.querySelectorAll(".popup-close-btn, [data-overlay]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const selector = btn.dataset.overlay;
      if (selector) document.querySelector(selector).classList.remove("active");
    });
  });
}

function setupEditFlow() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".edit-hive-btn");
    if (!btn) return;
    const row = btn.closest(".hive-row");
    const hiveID = Number(row.dataset.hiveId);
    const hive = hives.find((h) => h.id === hiveID);
    if (!hive) return;
    populateLocationsDatalist();
    openEditPopup(hive);
  });

  document.querySelectorAll(".upload-image").forEach((input) => {
    input.addEventListener("change", changeImageDynamically);
  });

  document.querySelector("#edit-hive-notes").addEventListener("input", syncNotesCounter);

  document.querySelector("#edit-hive-popup").addEventListener("submit", async (e) => {
    e.preventDefault();
    const hiveID = Number(document.querySelector("#edit-hive-id").value);
    const name = document.querySelector("#edit-hive-name").value.trim();
    const locationName = document.querySelector("#edit-hive-location").value.trim().toLowerCase();
    const boxSize = document.querySelector("#edit-hive-box-size").value.trim();
    const frames = document.querySelector("#edit-hive-frames").value.trim();
    const lastInspection = document.querySelector("#edit-hive-last-inspection").value;
    const notes = document.querySelector("#edit-hive-notes").value.slice(0, 500);
    const feed = document.querySelector("#edit-hive-feed").checked;
    const imageID = Number(document.querySelector("#edit-image-id").value);

    if (!locationName) {
      alert("Please add a location.");
      return;
    }

    let location = locations.find((item) => item.name === locationName);
    if (!location) {
      await postLocation(locationName, "Undefined");
      locations = await fetchLocations();
      location = locations.find((item) => item.name === locationName);
    }

    const wasUpdated = await updateHiveData(hiveID, name, location.id, boxSize, frames, lastInspection, undefined, notes, feed);
    const imageUpdated = await updateImage(imageID, document.querySelector("#upload-image-edit-input").files[0], name);

    if (!wasUpdated) {
      alert("Could not update hive. Please try again.");
      return;
    }
    if (!imageUpdated) console.warn("Could not update image.");

    hives = await fetchHives();
    updateStats();
    applySearchAndRender();
    document.querySelector("#edit-hive-overlay").classList.remove("active");
  });
}

function applySearchAndRender() {
  const q = document.querySelector("#search-box").value.trim().toLowerCase();
  const filtered =
    q === ""
      ? hives
      : hives.filter((h) => {
          const name = (h.name || "").toLowerCase();
          const loc = (h.location || "").toLowerCase();
          const notes = (h.notes || "").toLowerCase();
          return name.includes(q) || loc.includes(q) || notes.includes(q);
        });

  render(groupHivesByLocation(filtered));
}

async function init() {
  setupSidebarToggle();
  setupAccordion();
  setupOverlayClose();
  setupEditFlow();

  [hives, locations] = await Promise.all([fetchHives(), fetchLocations()]);
  populateLocationsDatalist();
  updateStats();
  applySearchAndRender();

  document.querySelector("#search-box").addEventListener("input", applySearchAndRender);
}

init().catch((err) => {
  console.error(err);
  const root = document.getElementById("inspections-body");
  if (root) root.innerHTML = `<div class="empty-state"><strong>Could not load inspections</strong><p>Check the server and try again.</p></div>`;
});

