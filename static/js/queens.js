const serverIP = "http://127.0.0.1:5000";

let pendingRemoveQueenID = null;
let cachedHives = [];

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderEmptyState() {
  const content = document.querySelector("#queens-content");
  if (!content) return;
  content.innerHTML = `
    <section class="empty-state">
      <strong>No queens found</strong>
      <p>Add or move queens from the hives page to see them here.</p>
    </section>
  `;
}

function updateStats(total, assigned, locationCount) {
  const totalEl = document.querySelector("#stat-total-queens");
  const assignedEl = document.querySelector("#stat-assigned-queens");
  const unassignedEl = document.querySelector("#stat-unassigned-queens");
  const locationEl = document.querySelector("#stat-queen-locations");
  if (totalEl) totalEl.textContent = String(total);
  if (assignedEl) assignedEl.textContent = String(assigned);
  if (unassignedEl) unassignedEl.textContent = String(total - assigned);
  if (locationEl) locationEl.textContent = String(locationCount);
}

function renderQueens(groups) {
  const content = document.querySelector("#queens-content");
  if (!content) return;
  if (!groups.length) {
    renderEmptyState();
    return;
  }

  const groupMarkup = groups.map((group) => {
    const queensMarkup = group.queens
      .map((queen) => {
        const introDate = queen.intro_date || "N/A";
        const hiveName = queen.hive_name || "Unassigned";
        const hiveIdAttr = queen.hive_id != null && queen.hive_id !== "" ? queen.hive_id : "";
        return `
          <div class="queen-row"
            data-queen-id="${queen.id}"
            data-queen-hive-id="${hiveIdAttr}"
            data-queen-breed="${escapeHTML(queen.breed)}"
            data-queen-colour="${escapeHTML(queen.colour)}"
            data-queen-intro-date="${escapeHTML(queen.intro_date || "")}">
            <div class="queen-id">Queen #${queen.id}</div>
            <div class="queen-meta">
              <span>Breed: ${escapeHTML(queen.breed)}</span>
              <span>Colour: ${escapeHTML(queen.colour)}</span>
              <span>Introduced: ${escapeHTML(introDate)}</span>
              <span>Hive: ${escapeHTML(hiveName)}</span>
            </div>
            <div class="queen-actions">
              <button class="btn-primary btn-ghost btn-sm queen-edit-btn" type="button">Edit</button>
              <button class="btn-danger btn-sm queen-remove-btn" type="button">Remove</button>
            </div>
          </div>
        `;
      })
      .join("");

    const queenCount = group.queens.length;
    return `
      <article class="location-queen-card">
        <div class="location-queen-header">
          <h2>${escapeHTML(group.location)}</h2>
          <span class="queen-count">${queenCount} queen${queenCount === 1 ? "" : "s"}</span>
        </div>
        <div class="queen-list">${queensMarkup}</div>
      </article>
    `;
  });

  content.innerHTML = `<section class="queens-locations-grid">${groupMarkup.join("")}</section>`;
}

async function loadQueensPage() {
  try {
    const [queensRes, hivesRes] = await Promise.all([
      fetch(`${serverIP}/api/queens`),
      fetch(`${serverIP}/api/hives`),
    ]);

    const queensData = await queensRes.json();
    const hivesData = await hivesRes.json();
    if (!queensRes.ok || !hivesRes.ok) {
      renderEmptyState();
      return;
    }

    const queens = queensData.queens || [];
    const hives = hivesData.hives || [];
    cachedHives = hives;
    const hiveByQueenID = new Map(
      hives.filter((hive) => hive.queen_id).map((hive) => [hive.queen_id, hive]),
    );

    const grouped = new Map();
    let assignedCount = 0;
    queens.forEach((queen) => {
      const hive = hiveByQueenID.get(queen.id);
      const location = hive ? (hive.location || "No Location") : "Unassigned";
      const normalizedQueen = {
        id: queen.id,
        breed: queen.breed || "Unknown",
        colour: queen.colour || "Uncoloured",
        intro_date: queen.intro_date || "",
        hive_name: hive ? (hive.name || `Hive ${hive.id}`) : "",
        hive_id: hive ? hive.id : "",
      };
      if (hive) assignedCount += 1;
      if (!grouped.has(location)) grouped.set(location, []);
      grouped.get(location).push(normalizedQueen);
    });

    const groups = Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([location, groupQueens]) => ({
        location,
        queens: groupQueens.sort((a, b) => a.id - b.id),
      }));

    updateStats(queens.length, assignedCount, groups.length);
    renderQueens(groups);
  } catch (error) {
    console.error("Failed to load queens page", error);
    renderEmptyState();
  }
}

function closeOverlay(selector) {
  const overlay = document.querySelector(selector);
  if (overlay) overlay.classList.remove("active");
}

function openEditQueenOverlay(row) {
  const queenID = Number(row.dataset.queenId);
  document.querySelector("#edit-queen-id").value = String(queenID);
  document.querySelector("#edit-queen-breed").value = row.dataset.queenBreed || "";
  document.querySelector("#edit-queen-colour").value = row.dataset.queenColour || "";
  document.querySelector("#edit-queen-intro-date").value = row.dataset.queenIntroDate || "";
  const hiveSelect = document.querySelector("#edit-queen-hive");
  if (hiveSelect) {
    const sorted = [...cachedHives].sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || "")),
    );
    hiveSelect.innerHTML =
      `<option value="">Unassigned</option>` +
      sorted
        .map(
          (h) =>
            `<option value="${h.id}">${escapeHTML(h.name || `Hive ${h.id}`)}</option>`,
        )
        .join("");
    const currentHiveId = row.dataset.queenHiveId || "";
    hiveSelect.value = currentHiveId ? String(currentHiveId) : "";
  }
  document.querySelector("#edit-queen-overlay").classList.add("active");
}

function openRemoveQueenOverlay(row) {
  pendingRemoveQueenID = Number(row.dataset.queenId);
  document.querySelector("#remove-queen-name").textContent = `Queen #${pendingRemoveQueenID}`;
  document.querySelector("#remove-queen-overlay").classList.add("active");
}

document.addEventListener("click", (event) => {
  const editButton = event.target.closest(".queen-edit-btn");
  const removeButton = event.target.closest(".queen-remove-btn");
  const closeButton = event.target.closest(".popup-close-btn");
  const addButton = event.target.closest("#add-queen-btn");

  if (addButton) {
    document.querySelector("#add-queen-popup").reset();
    document.querySelector("#add-queen-overlay").classList.add("active");
    return;
  }

  if (editButton) {
    const row = editButton.closest(".queen-row");
    if (!row) return;
    openEditQueenOverlay(row);
    return;
  }

  if (removeButton) {
    const row = removeButton.closest(".queen-row");
    if (!row) return;
    openRemoveQueenOverlay(row);
    return;
  }

  if (closeButton) {
    const overlaySelector = closeButton.dataset.overlay;
    if (overlaySelector) closeOverlay(overlaySelector);
  }
});

document.querySelector("#add-queen-popup").addEventListener("submit", async (event) => {
  event.preventDefault();
  const breed = document.querySelector("#add-queen-breed").value.trim();
  const colour = document.querySelector("#add-queen-colour").value.trim();
  const introDate = document.querySelector("#add-queen-intro-date").value;

  const response = await fetch(`${serverIP}/api/queen/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ breed, colour, intro_date: introDate }),
  });
  const result = await response.json();
  if (!response.ok) {
    alert(result.message || "Could not add queen.");
    return;
  }
  window.location.reload();
});

document.querySelector("#edit-queen-popup").addEventListener("submit", async (event) => {
  event.preventDefault();
  const queenID = Number(document.querySelector("#edit-queen-id").value);
  const breed = document.querySelector("#edit-queen-breed").value.trim();
  const colour = document.querySelector("#edit-queen-colour").value.trim();
  const introDate = document.querySelector("#edit-queen-intro-date").value;
  const hiveSelect = document.querySelector("#edit-queen-hive");
  const hiveValue = hiveSelect?.value.trim() ?? "";
  const payload = {
    breed,
    colour,
    intro_date: introDate,
    hive_id: hiveValue === "" ? null : Number(hiveValue),
  };

  const response = await fetch(`${serverIP}/api/queen/update/${queenID}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) {
    alert(result.message || "Could not update queen.");
    return;
  }
  window.location.reload();
});

document.querySelector("#cancel-remove-queen").addEventListener("click", () => {
  pendingRemoveQueenID = null;
  closeOverlay("#remove-queen-overlay");
});

document.querySelector("#confirm-remove-queen").addEventListener("click", async () => {
  if (!pendingRemoveQueenID) return;
  const response = await fetch(`${serverIP}/api/queen/remove/${pendingRemoveQueenID}`, {
    method: "DELETE",
  });
  const result = await response.json();
  if (!response.ok) {
    alert(result.message || "Could not remove queen.");
    return;
  }
  window.location.reload();
});

document.addEventListener("keyup", (event) => {
  if (event.key !== "Escape") return;
  closeOverlay("#add-queen-overlay");
  closeOverlay("#edit-queen-overlay");
  closeOverlay("#remove-queen-overlay");
});

document.querySelector("#toggle-sidebar").addEventListener("click", () => {
  document.querySelector("#sidebar").classList.toggle("collapsed");
});

const expandSidebarBtn = document.querySelector("#expand-sidebar");
if (expandSidebarBtn) {
  expandSidebarBtn.addEventListener("click", () => {
    document.querySelector("#sidebar").classList.remove("collapsed");
  });
}

loadQueensPage();
