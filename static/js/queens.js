const serverIP = "http://127.0.0.1:5000";

let pendingRemoveQueenID = null;

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
  const payload = { breed, colour, intro_date: introDate };

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
