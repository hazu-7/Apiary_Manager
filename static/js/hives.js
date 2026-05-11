import Fuse from "../libs/fuse.mjs";
import {
  postHiveData,
  postQueen,
  postLocation,
  removeLocation,
  uploadImage,
  updateImage,
  updateHiveData,
  removeHive,
  fetchHives,
  fetchLocations,
} from "./api.js";

let hives = await fetchHives();
let locations = await fetchLocations();
let pendingDeleteHiveID = null;
const selectedHiveIDs = new Set();

// ── Date helpers ─────────────────────────────────────────────
function formatForDisplay(dateString) {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "N/A";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatForInput(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ── Stats strip ──────────────────────────────────────────────
function updateStats(data = hives) {
  const total = data.length;
  const queened = data.filter((h) => h.queen_id).length;
  const unqueened = total - queened;
  const locationSet = new Set(data.map((h) => h.location).filter(Boolean));

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-queened").textContent = queened;
  document.getElementById("stat-unqueened").textContent = unqueened;
  document.getElementById("stat-locations").textContent = locationSet.size;
}

// ── Render hive cards ────────────────────────────────────────
async function renderHives(data = hives) {
  const container = document.getElementById("hive-grid");
  if (data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 12px; display: block; color: var(--text-muted);">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <strong>No hives found</strong>
        <p>Try adjusting your search or add a new hive.</p>
      </div>`;
    updateStats(data);
    return;
  }

  container.innerHTML = data
    .map(
      (hive) => `
    <article class="hive-card${selectedHiveIDs.has(hive.id) ? " selected" : ""}" data-hive-id="${hive.id}">
      <div class="hive-card-image">
        <img src="../${hive.image}" alt="${hive.name}" loading="lazy">
        <input
          class="hive-select-checkbox"
          type="checkbox"
          data-hive-id="${hive.id}"
          ${selectedHiveIDs.has(hive.id) ? "checked" : ""}
          title="Select hive"
        >
        <span class="queen-badge ${hive.queen_id ? "queened" : "unqueened"}">
          ${hive.queen_id ? "Queened" : "Unqueened"}
        </span>
      </div>
      <div class="hive-card-body">
        <div class="hive-card-title">${hive.name}</div>
        <div class="hive-card-meta">
          <div class="hive-meta-row">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            ${hive.location ? hive.location[0].toUpperCase() + hive.location.slice(1) : "No location"}
          </div>
          <div class="hive-meta-row">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Last inspection: ${formatForDisplay(hive.last_inspection)}
          </div>
        </div>
      </div>
      <div class="hive-card-footer">
        <button class="btn-sm edit-hive-btn" type="button">Edit</button>
        <button class="btn-sm danger delete-hive-btn" type="button">Delete</button>
      </div>

      <!-- Expanded details panel -->
      <div class="hive-details">
        <button class="hive-close-btn" type="button">✕</button>
        <p><strong>Location:</strong> ${hive.location || "N/A"}</p>
        <p><strong>Box Size:</strong> ${hive.box_size || "N/A"}</p>
        <p><strong>Frames:</strong> ${hive.frames ?? "N/A"}</p>
        <p><strong>Queen ID:</strong> ${hive.queen_id ?? "None"}</p>
        <p><strong>Hive ID:</strong> ${hive.id}</p>
      </div>
    </article>
  `,
    )
    .join("");

  updateStats(data);
  syncBulkActionsBar();
}

// ── Card click handler ───────────────────────────────────────
document.getElementById("hive-grid").addEventListener("click", (event) => {
  const clickedCard = event.target.closest(".hive-card");
  const clickedClose = event.target.closest(".hive-close-btn");
  const clickedEdit = event.target.closest(".edit-hive-btn");
  const clickedDelete = event.target.closest(".delete-hive-btn");
  const clickedCheckbox = event.target.closest(".hive-select-checkbox");

  if (!clickedCard) return;
  if (clickedCheckbox) return;

  if (clickedEdit) {
    const hiveID = Number(clickedCard.dataset.hiveId);
    const hiveToEdit = hives.find((item) => item.id === hiveID);
    if (hiveToEdit) openEditHivePopup(hiveToEdit);
    return;
  }

  if (clickedDelete) {
    const hiveID = Number(clickedCard.dataset.hiveId);
    const hiveToDelete = hives.find((item) => item.id === hiveID);
    if (hiveToDelete) openDeleteHivePopup(hiveToDelete);
    return;
  }

  const wasExpanded = clickedCard.classList.contains("expanded");
  document.querySelectorAll(".hive-card.expanded").forEach((item) => item.classList.remove("expanded"));

  if (!wasExpanded && !clickedClose) {
    clickedCard.classList.add("expanded");
  }
});

// ── Checkbox selection ───────────────────────────────────────
document.getElementById("hive-grid").addEventListener("change", (event) => {
  const checkbox = event.target.closest(".hive-select-checkbox");
  if (!checkbox) return;
  const hiveID = Number(checkbox.dataset.hiveId);
  const card = checkbox.closest(".hive-card");
  if (checkbox.checked) {
    selectedHiveIDs.add(hiveID);
    card?.classList.add("selected");
  } else {
    selectedHiveIDs.delete(hiveID);
    card?.classList.remove("selected");
  }
  syncBulkActionsBar();
});

// ── Edit hive popup ──────────────────────────────────────────
async function openEditHivePopup(hive) {
  resetQueenAction("edit");
  document.querySelector("#edit-hive-id").value = hive.id;
  document.querySelector("#edit-image-id").value = hive.image_id;
  document.querySelector("#edit-hive-name").value = hive.name || "";
  document.querySelector("#edit-hive-location").value = hive.location || "";
  document.querySelector("#edit-hive-box-size").value = hive.box_size || "";
  document.querySelector("#edit-hive-frames").value = hive.frames || "";

  const editImage = document.querySelector("#edit-image");
  const editLabel = editImage.parentElement;
  const addHiveInput = document.querySelector(".upload-image");

  if (addHiveInput && addHiveInput.parentElement) {
    const addHiveLabel = addHiveInput.parentElement;
    const targetWidth = addHiveLabel.offsetWidth;
    const targetHeight = addHiveLabel.offsetHeight;
    if (targetWidth > 0 && targetHeight > 0) {
      editLabel.style.width = `${targetWidth}px`;
      editLabel.style.height = `${targetHeight}px`;
      editLabel.style.flex = "none";
    }
  }

  editImage.style.width = "100%";
  editImage.style.height = "100%";
  editImage.style.objectFit = "contain";
  editImage.src = "http://127.0.0.1:5000/static/images/uploadHive.png";

  if (hive.last_inspection) {
    document.querySelector("#edit-hive-last-inspection").value = formatForInput(hive.last_inspection);
  } else {
    document.querySelector("#edit-hive-last-inspection").value = new Date().toISOString().slice(0, 10);
  }

  document.querySelector("#edit-hive-overlay").classList.add("active");
}

function openDeleteHivePopup(hive) {
  pendingDeleteHiveID = hive.id;
  document.querySelector("#delete-hive-name").textContent = hive.name || `Hive ${hive.id}`;
  document.querySelector("#delete-hive-overlay").classList.add("active");
}

// ── API helpers ──────────────────────────────────────────────

// ── Search & sort ────────────────────────────────────────────
const fuseOptions = { keys: ["id", "location", "last_inspection", "name"], threshold: 0.3 };
const fuse = new Fuse(hives, fuseOptions);

const search = document.querySelector("#search-box");
const sortBy = document.querySelector("[name='sort']");

let currentResults = [...hives];

function syncBulkActionsBar() {
  const bulkActions = document.querySelector("#bulk-actions");
  const selectedCount = document.querySelector("#selected-count");
  const count = selectedHiveIDs.size;
  selectedCount.textContent = `${count} selected`;
  if (count > 0) bulkActions.classList.add("active");
  else bulkActions.classList.remove("active");
}

function getSelectedHives() {
  return hives.filter((item) => selectedHiveIDs.has(item.id));
}

function clearSelection() {
  selectedHiveIDs.clear();
  syncBulkActionsBar();
}

function openBulkDeletePopup() {
  document.querySelector("#bulk-delete-count").textContent = String(selectedHiveIDs.size);
  document.querySelector("#bulk-delete-overlay").classList.add("active");
}

function openBulkEditPopup() {
  document.querySelector("#bulk-edit-location").value = "";
  document.querySelector("#bulk-edit-box-size").value = "";
  document.querySelector("#bulk-edit-frames").value = "";
  document.querySelector("#bulk-edit-last-inspection").value = "";
  document.querySelector("#bulk-edit-overlay").classList.add("active");
}

function applySort(data) {
  let sorted = [...data];
  if (sortBy.value === "location") sorted.sort((a, b) => a.location.localeCompare(b.location));
  else if (sortBy.value === "queen") sorted.sort((a, b) => (a.queen_id ? 0 : 1) - (b.queen_id ? 0 : 1));
  else if (sortBy.value === "box-size") sorted.sort((a, b) => a.box_size.localeCompare(b.box_size));
  else if (sortBy.value === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
  return sorted;
}

function updateView() {
  const sorted = applySort(currentResults);
  renderHives(sorted);
}

search.addEventListener("input", (e) => {
  const query = e.target.value;
  if (query === "") currentResults = [...hives];
  else currentResults = fuse.search(query).map((result) => result.item);
  updateView();
});

sortBy.addEventListener("change", () => updateView());
sortBy.value = "name";

renderHives();
syncBulkActionsBar();

// ── Bulk action buttons ──────────────────────────────────────
document.querySelector("#clear-selection-btn").addEventListener("click", () => {
  clearSelection();
  renderHives(applySort(currentResults));
});

document.querySelector("#bulk-delete-btn").addEventListener("click", () => {
  if (selectedHiveIDs.size === 0) return;
  openBulkDeletePopup();
});

document.querySelector("#bulk-edit-btn").addEventListener("click", () => {
  if (selectedHiveIDs.size === 0) return;
  openBulkEditPopup();
});

// ── Add hive ─────────────────────────────────────────────────
let activeQueenContext = "add";
const queenActions = {
  add: { mode: null, queenData: null, moveData: null },
  edit: { mode: null, queenData: null, moveData: null },
};

function resetQueenAction(context) {
  queenActions[context] = { mode: null, queenData: null, moveData: null };
}

function getHiveInspectionDate(hive) {
  if (!hive?.last_inspection) return new Date().toISOString().slice(0, 10);
  const d = new Date(hive.last_inspection);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

async function updateHiveQueen(hive, queenID) {
  return updateHiveData(hive.id, hive.name, hive.location_id, hive.box_size, hive.frames, getHiveInspectionDate(hive), queenID);
}

function populateMoveQueenOptions(context) {
  const moveFrom = document.querySelector("#move-queen-from");
  const replaceWith = document.querySelector("#replace-with-queen");
  const editHiveID = Number(document.querySelector("#edit-hive-id").value);
  const sourceOptions = hives
    .filter((item) => context !== "edit" || item.id !== editHiveID)
    .map((item) => `<option value="${item.id}">${item.name}</option>`)
    .join("");
  moveFrom.innerHTML = sourceOptions;
  replaceWith.innerHTML = '<option value="none">None</option>' + sourceOptions;
}

document.querySelector("#addHiveBtn").addEventListener("click", () => {
  document.querySelector("#post-hive-popup").reset();
  document.querySelector("#add-queen-popup").reset();
  document.querySelector(".upload-image").value = "";
  resetQueenAction("add");
  const locationNames = locations.map((loc) => loc.name);
  const locationOptions = locationNames.map((loc) => `<option value="${loc}">`).join(" ");
  document.querySelector("#locations").innerHTML = locationOptions;
  const today = new Date().toISOString().slice(0, 10);
  document.querySelectorAll(".established-date").forEach((item) => (item.value = today));
  document.querySelector("#add-hive-overlay").classList.add("active");
});

function changeImageDynamically(e) {
  const file = e.target.files[0];
  const label = e.target.parentElement;
  const img = label.querySelector("img");
  if (file) {
    const currentWidth = label.offsetWidth;
    const currentHeight = label.offsetHeight;
    label.style.width = `${currentWidth}px`;
    label.style.height = `${currentHeight}px`;
    label.style.flex = "none";
    img.src = URL.createObjectURL(file);
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.style.borderRadius = "var(--radius-md)";
  }
}

document.querySelectorAll(".upload-image").forEach((input) => {
  input.addEventListener("change", (e) => changeImageDynamically(e));
});

document.querySelector("#post-hive-popup").addEventListener("submit", async (e) => {
  e.preventDefault();
  locations = await fetchLocations();
  let queenID = null;
  const addQueenAction = queenActions.add;

  if (addQueenAction.mode === "add" && addQueenAction.queenData) {
    const queenResponse = await postQueen(addQueenAction.queenData.breed, addQueenAction.queenData.colour, addQueenAction.queenData.introDate);
    queenID = queenResponse.queen_id;
  } else if (addQueenAction.mode === "move" && addQueenAction.moveData) {
    const sourceHive = hives.find((item) => item.id === addQueenAction.moveData.moveFromHiveID);
    if (!sourceHive || !sourceHive.queen_id) {
      alert("Selected source hive has no queen to move.");
      return;
    }
    queenID = sourceHive.queen_id;
    if (addQueenAction.moveData.replaceWithHiveID !== null) {
      const replaceHive = hives.find((item) => item.id === addQueenAction.moveData.replaceWithHiveID);
      if (!replaceHive) {
        alert("Replacement hive was not found.");
        return;
      }
      const sourceWasUpdated = await updateHiveQueen(sourceHive, replaceHive.queen_id ?? null);
      const replaceWasUpdated = await updateHiveQueen(replaceHive, null);
      if (!sourceWasUpdated || !replaceWasUpdated) {
        alert("Could not move queen. Please try again.");
        return;
      }
    } else {
      const sourceWasUpdated = await updateHiveQueen(sourceHive, null);
      if (!sourceWasUpdated) {
        alert("Could not move queen. Please try again.");
        return;
      }
    }
  }

  const locationNames = locations.map((loc) => loc.name);
  const data = [...document.querySelectorAll(".add-hive-input")].map((item) => item.value.toLowerCase());
  if (data[1] === "") data[1] = "no location";

  if (!locationNames.includes(data[1])) {
    await postLocation(data[1], "Undefined");
    locations = await fetchLocations();
  }

  data[1] = locations.find((item) => item.name === data[1]);
  if (data[0] === "") {
    data[0] = data[1].name[0].toUpperCase() + data[1].name.slice(1).toLowerCase() + " " + (data[1].max_number_of_hives + 1);
  }

  const imageUploadResponse = await uploadImage(document.querySelector(".upload-image").files[0], data[0]);
  const imageID = imageUploadResponse.image_id;

  await postHiveData(data[0], data[1].id, data[2], data[3], data[4], queenID, imageID);
  resetQueenAction("add");
  document.querySelector("#add-hive-overlay").classList.remove("active");
  hives = await fetchHives();
  currentResults = [...hives];
  renderHives();
});

// ── Add queen popup ──────────────────────────────────────────
document.querySelectorAll('.queen-action-btn[data-action="add"]').forEach((button) => {
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    activeQueenContext = button.dataset.context;
    document.querySelector("#add-queen-popup").reset();
    document.querySelector("#add-queen-overlay").classList.add("active");
  });
});

document.querySelector("#add-queen-popup").addEventListener("submit", (e) => {
  e.preventDefault();
  const queenData = [...document.querySelectorAll(".new-queen-input")].map((item) => item.value);
  queenActions[activeQueenContext] = {
    mode: "add",
    queenData: { breed: queenData[0], colour: queenData[1], introDate: queenData[2] },
    moveData: null,
  };
  document.querySelector("#add-queen-overlay").classList.remove("active");
});

// ── Move queen popup ─────────────────────────────────────────
document.querySelectorAll('.queen-action-btn[data-action="move"]').forEach((button) => {
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    activeQueenContext = button.dataset.context;
    populateMoveQueenOptions(activeQueenContext);
    document.querySelector("#mv-queen-overlay").classList.add("active");
  });
});

document.querySelector("#mv-queen-popup").addEventListener("submit", (e) => {
  e.stopPropagation();
  e.preventDefault();
  const moveFrom = document.querySelector("#move-queen-from");
  const replaceWith = document.querySelector("#replace-with-queen");
  if (moveFrom.value === replaceWith.value) {
    alert("Please select a different hive!");
    return;
  }
  queenActions[activeQueenContext] = {
    mode: "move",
    queenData: null,
    moveData: {
      moveFromHiveID: Number(moveFrom.value),
      replaceWithHiveID: replaceWith.value === "none" ? null : Number(replaceWith.value),
    },
  };
  document.querySelector("#mv-queen-overlay").classList.remove("active");
});

// ── Edit hive submit ─────────────────────────────────────────
document.querySelector("#edit-hive-popup").addEventListener("submit", async (e) => {
  e.preventDefault();
  const hiveID = Number(document.querySelector("#edit-hive-id").value);
  const name = document.querySelector("#edit-hive-name").value.trim();
  const locationName = document.querySelector("#edit-hive-location").value.trim();
  const boxSize = document.querySelector("#edit-hive-box-size").value.trim();
  const frames = document.querySelector("#edit-hive-frames").value.trim();
  const lastInspection = document.querySelector("#edit-hive-last-inspection").value;
  const imageID = Number(document.querySelector("#edit-image-id").value);
  const currentHive = hives.find((item) => item.id === hiveID);
  const editQueenAction = queenActions.edit;
  let queenID = currentHive?.queen_id ?? null;

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

  if (editQueenAction.mode === "add" && editQueenAction.queenData) {
    const queenResponse = await postQueen(editQueenAction.queenData.breed, editQueenAction.queenData.colour, editQueenAction.queenData.introDate);
    queenID = queenResponse.queen_id;
  } else if (editQueenAction.mode === "move" && editQueenAction.moveData) {
    const sourceHive = hives.find((item) => item.id === editQueenAction.moveData.moveFromHiveID);
    if (!sourceHive || !sourceHive.queen_id) {
      alert("Selected source hive has no queen to move.");
      return;
    }
    queenID = sourceHive.queen_id;
    if (editQueenAction.moveData.replaceWithHiveID !== null) {
      const replaceHive = hives.find((item) => item.id === editQueenAction.moveData.replaceWithHiveID);
      if (!replaceHive) {
        alert("Replacement hive was not found.");
        return;
      }
      const sourceWasUpdated = await updateHiveQueen(sourceHive, replaceHive.queen_id ?? null);
      const replaceWasUpdated = await updateHiveQueen(replaceHive, null);
      if (!sourceWasUpdated || !replaceWasUpdated) {
        alert("Could not move queen. Please try again.");
        return;
      }
    } else {
      const sourceWasUpdated = await updateHiveQueen(sourceHive, null);
      if (!sourceWasUpdated) {
        alert("Could not move queen. Please try again.");
        return;
      }
    }
  }

  const wasUpdated = await updateHiveData(hiveID, name, location.id, boxSize, frames, lastInspection, queenID);
  const imageUpdated = await updateImage(imageID, document.querySelector("#upload-image-edit-input").files[0], name);

  if (!wasUpdated) {
    alert("Could not update hive. Please try again.");
    return;
  }
  if (!imageUpdated) console.warn("Could not update image.");

  hives = await fetchHives();
  currentResults = [...hives];
  resetQueenAction("edit");
  renderHives();
  document.querySelector("#edit-hive-overlay").classList.remove("active");
});

// ── Delete hive ──────────────────────────────────────────────
document.querySelector("#cancel-delete-hive").addEventListener("click", () => {
  pendingDeleteHiveID = null;
  document.querySelector("#delete-hive-overlay").classList.remove("active");
});

document.querySelector("#confirm-delete-hive").addEventListener("click", async () => {
  if (pendingDeleteHiveID === null) return;
  const wasDeleted = await removeHive(pendingDeleteHiveID);
  if (!wasDeleted) {
    alert("Could not delete hive. Please try again.");
    return;
  }
  pendingDeleteHiveID = null;
  document.querySelector("#delete-hive-overlay").classList.remove("active");
  hives = await fetchHives();
  currentResults = [...hives];
  renderHives();
});

// ── Bulk delete ──────────────────────────────────────────────
document.querySelector("#cancel-bulk-delete").addEventListener("click", () => {
  document.querySelector("#bulk-delete-overlay").classList.remove("active");
});

document.querySelector("#confirm-bulk-delete").addEventListener("click", async () => {
  const ids = [...selectedHiveIDs];
  if (ids.length === 0) return;
  for (const hiveID of ids) {
    const wasDeleted = await removeHive(hiveID);
    if (!wasDeleted) {
      alert("Could not delete one or more hives.");
      return;
    }
  }
  document.querySelector("#bulk-delete-overlay").classList.remove("active");
  clearSelection();
  hives = await fetchHives();
  currentResults = [...hives];
  renderHives();
});

// ── Bulk edit ────────────────────────────────────────────────
document.querySelector("#cancel-bulk-edit").addEventListener("click", () => {
  document.querySelector("#bulk-edit-overlay").classList.remove("active");
});

document.querySelector("#bulk-edit-popup").addEventListener("submit", async (e) => {
  e.preventDefault();
  const selectedHives = getSelectedHives();
  if (selectedHives.length === 0) return;

  const locationName = document.querySelector("#bulk-edit-location").value.trim();
  const boxSize = document.querySelector("#bulk-edit-box-size").value.trim();
  const frames = document.querySelector("#bulk-edit-frames").value.trim();
  const lastInspection = document.querySelector("#bulk-edit-last-inspection").value;

  let locationID = null;
  if (locationName !== "") {
    let location = locations.find((item) => item.name === locationName);
    if (!location) {
      await postLocation(locationName, "Undefined");
      locations = await fetchLocations();
      location = locations.find((item) => item.name === locationName);
    }
    locationID = location.id;
  }

  for (const hive of selectedHives) {
    const wasUpdated = await updateHiveData(
      hive.id,
      hive.name,
      locationID ?? hive.location_id,
      boxSize || hive.box_size,
      frames || hive.frames,
      lastInspection || (hive.last_inspection ? new Date(hive.last_inspection).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
    );
    if (!wasUpdated) {
      alert("Could not update one or more hives.");
      return;
    }
  }

  document.querySelector("#bulk-edit-overlay").classList.remove("active");
  clearSelection();
  hives = await fetchHives();
  currentResults = [...hives];
  renderHives();
});

// ── Generic popup close (close button & backdrop click) ──────
document.addEventListener("click", (e) => {
  const closeButton = e.target.closest(".popup-close-btn");
  if (closeButton) {
    const overlaySelector = closeButton.dataset.overlay;
    if (!overlaySelector) return;
    const overlay = document.querySelector(overlaySelector);
    if (overlay) {
      overlay.classList.remove("active");
      if (overlaySelector === "#delete-hive-overlay") pendingDeleteHiveID = null;
    }
    return;
  }

  // Backdrop click
  const overlayIDs = [
    "#add-hive-overlay",
    "#add-queen-overlay",
    "#mv-queen-overlay",
    "#edit-hive-overlay",
    "#delete-hive-overlay",
    "#bulk-edit-overlay",
    "#bulk-delete-overlay",
  ];
  for (const id of overlayIDs) {
    const overlay = document.querySelector(id);
    if (e.target === overlay) {
      overlay.classList.remove("active");
      if (id === "#delete-hive-overlay") pendingDeleteHiveID = null;
      break;
    }
  }
});

// ── Escape key ───────────────────────────────────────────────
document.addEventListener("keyup", (e) => {
  if (e.key !== "Escape") return;
  const overlayIDs = [
    "#add-queen-overlay",
    "#mv-queen-overlay",
    "#edit-hive-overlay",
    "#delete-hive-overlay",
    "#bulk-edit-overlay",
    "#bulk-delete-overlay",
    "#add-hive-overlay",
  ];
  for (const id of overlayIDs) {
    const overlay = document.querySelector(id);
    if (overlay.classList.contains("active")) {
      overlay.classList.remove("active");
      if (id === "#delete-hive-overlay") pendingDeleteHiveID = null;
      break;
    }
  }
});

// ── Sidebar toggle ───────────────────────────────────────────
document.querySelector("#toggle-sidebar").addEventListener("click", () => {
  document.querySelector("#sidebar").classList.toggle("collapsed");
});

const expandSidebarBtn = document.querySelector("#expand-sidebar");
if (expandSidebarBtn) {
  expandSidebarBtn.addEventListener("click", () => {
    document.querySelector("#sidebar").classList.remove("collapsed");
  });
}
