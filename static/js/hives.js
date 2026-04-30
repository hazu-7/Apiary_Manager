import Fuse from "../libs/fuse.mjs";

async function fetchHives() {
  const response = await fetch("http://127.0.0.1:5000/api/hives");
  // console.log("fetch request");
  const data = await response.json();
  //console.log(data.hives);
  return data.hives;
}

async function fetchLocations() {
  const response = await fetch("http://127.0.0.1:5000/api/locations");
  const data = await response.json();
  return data.locations;
}

let hives = await fetchHives();
let locations = await fetchLocations();
let pendingDeleteHiveID = null;
const selectedHiveIDs = new Set();

// 1. For the UI Cards (DD-MM-YYYY)
function formatForDisplay(dateString) {
  if (!dateString) return "N/A";

  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "N/A"; // Failsafe

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();

  return `${dd}-${mm}-${yyyy}`;
}

// 2. For the HTML Inputs (YYYY-MM-DD)
function formatForInput(dateString) {
  if (!dateString) return "";

  const d = new Date(dateString);
  if (isNaN(d.getTime())) return ""; // Failsafe

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}
async function renderHives(data = hives) {
  const container = document.querySelector(".all-hives");
  container.style.gap = "5px";
  container.innerHTML = data
    .map(
      (hive) => `
    <article class="card hive-card" style="text-align: center" data-hive-id="${hive.id}">
      <input class="hive-select-checkbox" type="checkbox" data-hive-id="${hive.id}" ${selectedHiveIDs.has(hive.id) ? "checked" : true}>
      <h3>${hive.name}</h3>
      <img src="../${hive.image}" width="80%" height="200px">
      <div style="text-align: left; font-weight:500">
        Last Inspection: ${formatForDisplay(hive.last_inspection)}</br>
        Location: ${hive.location[0].toUpperCase() + hive.location.slice(1)}</br> 
        Queen Status: ${hive.queen_id ? "Queened" : "Unqueened"}
      </div>
      <div class="hive-details">
        <button class="hive-close-btn" type="button" >x</button>
        <p><strong>Location:</strong> ${hive.location || "N/A"}</p>
        <p><strong>Box Size:</strong> ${hive.box_size || "N/A"}</p>
        <p><strong>Frames:</strong> ${hive.frames ?? "N/A"}</p>
        <p><strong>Queen ID:</strong> ${hive.queen_id ?? "N/A"}</p>
        <p><strong>Hive ID:</strong> ${hive.id}</p>
        <button class="btn-primary edit-hive-btn" type="button">Edit Hive</button>
        <button class="btn-danger delete-hive-btn" type="button">Delete Hive</button>
      </div>
    </article>
  `,
    )
    .join("");
  syncBulkActionsBar();
}

//extra info/ delete/ edit hive popup
document.querySelector(".all-hives").addEventListener("click", (event) => {
  const clickedCard = event.target.closest(".hive-card");
  const clickedClose = event.target.closest(".hive-close-btn");
  const clickedEdit = event.target.closest(".edit-hive-btn");
  const clickedDelete = event.target.closest(".delete-hive-btn");
  const clickedCheckbox = event.target.closest(".hive-select-checkbox");
  if (!clickedCard && !clickedClose) return;
  if (clickedCheckbox) return;

  if (clickedEdit) {
    const hiveID = Number(clickedCard.dataset.hiveId);
    const hiveToEdit = hives.find((item) => item.id === hiveID);
    if (!hiveToEdit) return;
    openEditHivePopup(hiveToEdit);
    return;
  }

  if (clickedDelete) {
    const hiveID = Number(clickedCard.dataset.hiveId);
    const hiveToDelete = hives.find((item) => item.id === hiveID);
    if (!hiveToDelete) return;
    openDeleteHivePopup(hiveToDelete);
    return;
  }

  const wasExpanded = clickedCard.classList.contains("expanded");

  document.querySelectorAll(".hive-card.expanded").forEach((item) => {
    item.classList.remove("expanded");
  });

  if (!wasExpanded && !clickedClose) {
    clickedCard.classList.add("expanded");
  }
});

document.querySelector(".all-hives").addEventListener("change", (event) => {
  const checkbox = event.target.closest(".hive-select-checkbox");
  if (!checkbox) return;
  const hiveID = Number(checkbox.dataset.hiveId);
  if (checkbox.checked) {
    selectedHiveIDs.add(hiveID);
  } else {
    selectedHiveIDs.delete(hiveID);
  }
  syncBulkActionsBar();
});
async function openEditHivePopup(hive) {
  // set values for editHive popup
  document.querySelector("#edit-hive-id").value = hive.id;
  document.querySelector("#edit-image-id").value = hive.image_id;
  document.querySelector("#edit-hive-name").value = hive.name || "";
  document.querySelector("#edit-hive-location").value = hive.location || "";
  document.querySelector("#edit-hive-box-size").value = hive.box_size || "";
  document.querySelector("#edit-hive-frames").value = hive.frames || "";

  const editImage = document.querySelector("#edit-image");
  const editLabel = editImage.parentElement;

  // 1. Find the Add Hive input using the exact class from code
  const addHiveInput = document.querySelector(".upload-image");

  // 2. Safely copy the dimensions if it exists
  if (addHiveInput && addHiveInput.parentElement) {
    const addHiveLabel = addHiveInput.parentElement;
    const targetWidth = addHiveLabel.offsetWidth;
    const targetHeight = addHiveLabel.offsetHeight;

    // Lock the Edit box to those exact dimensions
    if (targetWidth > 0 && targetHeight > 0) {
      editLabel.style.width = `${targetWidth}px`;
      editLabel.style.height = `${targetHeight}px`;
      editLabel.style.flex = "none";
    }
  }

  // 3. Set the actual image and scale it to fit inside the locked box
  editImage.style.width = "100%";
  editImage.style.height = "100%";
  editImage.style.objectFit = "contain";
  editImage.src = "http://127.0.0.1:5000/static/images/uploadHive.png";
  if (hive.last_inspection) {
    // Safely format whatever weird string Python sends into strictly YYYY-MM-DD
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

async function postHiveData(name, locationID, boxSize, frames, lastInpsection, queen_id, image_id) {
  const hiveData = {
    box_size: boxSize,
    location_id: locationID,
    frames: frames,
    last_inspection: lastInpsection,
    name: name,
    queen_id: queen_id,
    image_id: image_id,
  };
  try {
    const response = await fetch("http://127.0.0.1:5000/api/hive/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(hiveData), // Turn the object into a string
    });

    const result = await response.json();

    if (response.ok) {
      console.log("Success:", result.message);
    } else {
      console.error("Server error:", result.error);
    }
  } catch (error) {
    console.error("Network error:", error);
  }
}

async function postQueen(breed, colour, introDate) {
  const queenData = {
    breed: breed,
    colour: colour,
    introDate: introDate,
  };
  try {
    const response = await fetch("http://127.0.0.1:5000/api/queen/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(queenData),
    });
    const result = await response.json();
    if (response.ok) {
      console.log("Success:", result.message);
    } else {
      console.error("Server error:", result.error);
    }
    return result;
  } catch {
    console.error("Network error:", error);
  }
}

async function postLocation(name, coords) {
  const locationData = {
    name: name,
    coords: coords,
  };
  try {
    const response = await fetch("http://127.0.0.1:5000/api/location/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(locationData), // Turn the object into a string
    });

    const result = await response.json();

    if (response.ok) {
      console.log("Success:", result.success);
    } else {
      console.error("Server error:", result.error);
    }
    return result;
  } catch (error) {
    console.error("Network error:", error);
  }
}

async function uploadImage(image, fileName) {
  const formData = new FormData();
  formData.append("image", image);
  formData.append("fileName", fileName);
  try {
    const response = await fetch("http://127.0.0.1:5000/api/image/add", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (response.ok) {
      console.log("Success:", result.message);
    } else {
      console.error("Server error:", result.error);
    }
    return result;
  } catch (error) {
    console.error("Network error:", error);
  }
}

async function updateImage(imageID, image, fileName) {
  const formData = new FormData();
  formData.append("imageID", imageID);
  formData.append("image", image);
  formData.append("fileName", fileName);
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/image/update/${imageID}`, {
      method: "UPDATE",
      body: formData,
    });
    const result = await response.json();

    if (response.ok) {
      console.log("Success:", result.message);
    } else {
      console.error("Server error:", result.error);
    }
    return result;
  } catch (error) {
    console.error("Network error:", error);
  }
}

async function updateHiveData(hiveID, name, locationID, boxSize, frames, lastInspection) {
  const hiveData = {
    name: name,
    location_id: locationID,
    box_size: boxSize,
    frames: frames,
    last_inspection: lastInspection,
  };

  try {
    const response = await fetch(`http://127.0.0.1:5000/api/hive/update/${hiveID}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(hiveData),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Server error:", result.error || result.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Network error:", error);
    return false;
  }
}

async function deleteHive(hiveID) {
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/hive/remove/${hiveID}`, {
      method: "DELETE",
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Server error:", result.error || result.message);
      return false;
    } else {
      console.log("Success:", result.message);
      return true;
    }
  } catch (error) {
    console.error("Network error:", error);
    return false;
  }
}

const fuseOptions = {
  keys: ["id", "location", "last_inspection", "name"],
  threshold: 0.3,
};

const fuse = new Fuse(hives, fuseOptions);

const search = document.querySelector("#search-box");
const sortBy = document.querySelector("[name='sort']");

let currentResults = [...hives];

function syncBulkActionsBar() {
  const bulkActions = document.querySelector("#bulk-actions");
  const selectedCount = document.querySelector("#selected-count");
  const count = selectedHiveIDs.size;
  selectedCount.textContent = `${count} selected`;
  if (count > 0) {
    bulkActions.classList.add("active");
  } else {
    bulkActions.classList.remove("active");
  }
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

  if (sortBy.value === "location") {
    sorted.sort((a, b) => a.location.localeCompare(b.location));
  } else if (sortBy.value === "queen") {
    sorted.sort((a, b) => (a.queen_id ? false : true));
  } else if (sortBy.value === "box-size") {
    console.log("sortby boxsize");
    sorted.sort((a, b) => a.box_size >= b.box_size);
  }

  return sorted;
}

function updateView() {
  const sorted = applySort(currentResults);
  renderHives(sorted);
}

search.addEventListener("input", (e) => {
  const query = e.target.value;

  if (query === "") {
    currentResults = [...hives];
  } else {
    const searchResults = fuse.search(query);
    currentResults = searchResults.map((result) => result.item);
  }

  updateView();
});

sortBy.addEventListener("change", () => {
  updateView();
});

sortBy.value = "id";

renderHives();
syncBulkActionsBar();

document.querySelector("#clear-selection-btn").addEventListener("click", () => {
  clearSelection();
  renderHives(currentResults);
});

document.querySelector("#bulk-delete-btn").addEventListener("click", () => {
  if (selectedHiveIDs.size === 0) return;
  openBulkDeletePopup();
});

document.querySelector("#bulk-edit-btn").addEventListener("click", () => {
  if (selectedHiveIDs.size === 0) return;
  openBulkEditPopup();
});

//Add hive popup javascript
let addQueen = -1;
document.querySelector("#addHiveBtn").addEventListener("click", (e) => {
  document.querySelector("#post-hive-popup").reset();
  document.querySelector("#add-queen-popup").reset();
  document.querySelector(".upload-image").value = "";
  const locationNames = locations.map((loc) => loc.name);
  const locationOptions = locationNames.map((loc) => `<option value="${loc}">`).join(" ");
  const datalist = document.querySelector("#locations");
  const establishedDateInput = document.querySelectorAll(".established-date");
  const today = new Date().toISOString().slice(0, 10);
  establishedDateInput.forEach((item) => (item.value = today));
  datalist.innerHTML = `${locationOptions}`;
  document.querySelector("#add-hive-overlay").classList.toggle("active");
});

function changeImageDynamically(e) {
  const file = e.target.files[0];
  const label = e.target.parentElement; // The container
  const img = label.querySelector("img");

  if (file) {
    // 1. Capture current dimensions to "lock" the box
    const currentWidth = label.offsetWidth;
    const currentHeight = label.offsetHeight;

    // 2. Apply those dimensions as fixed styles
    label.style.width = `${currentWidth}px`;
    label.style.height = `${currentHeight}px`;
    label.style.flex = "none"; // Prevent flexbox from squishing it now

    // 3. Update the image source
    const tempURL = URL.createObjectURL(file);
    img.src = tempURL;

    // 4. Ensure the new image scales to fit the now-locked box
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "contain";
  }
}

document.querySelectorAll(".upload-image").forEach((input) => {
  input.addEventListener("change", (e) => {
    changeImageDynamically(e);
  });
});

document.querySelector("#post-hive-popup").addEventListener("submit", async (e) => {
  e.preventDefault();
  locations = await fetchLocations();
  let queenID = null;
  if (addQueen == 1) {
    const queenData = [...document.querySelectorAll(".new-queen-input")].map((item) => item.value);
    const queenResponce = await postQueen(queenData[0], queenData[1], queenData[2]);
    queenID = queenResponce.queen_id;
  } else if (addQueen == 0) {
    const moveFromHiveID = document.querySelector("#move-queen-from").value;
    const replaceWithHiveID = document.querySelector("#replace-with-queen").value;
    queenID = moveFromHiveID.queen_id;
    if (replaceWithHiveID != "none") {
      moveFromHiveID.queen_id = replaceWithHiveID.queen_id;
      replaceWithHiveID.queen_id = null;
    } else {
      moveFromHiveID.queen_id = null;
    }
  }

  const locationNames = locations.map((loc) => loc.name);
  const data = [...document.querySelectorAll(".add-hive-input")].map((item) => item.value.toLowerCase());
  if (data[1] == "") {
    data[1] = "No Location";
  }
  if (!locationNames.includes(data[1])) {
    await postLocation(data[1], "Undefined");
    locations = await fetchLocations();
  }

  data[1] = locations.find((item) => item.name == data[1]);
  if (data[0] === "") {
    data[0] = data[1].name[0].toUpperCase() + data[1].name.slice(1).toLowerCase() + " " + (data[1].max_number_of_hives + 1);
  }

  const imageUploadResponce = await uploadImage(document.querySelector(".upload-image").files[0], data[0]);
  const imageID = imageUploadResponce.image_id;

  await postHiveData(data[0], data[1].id, data[2], data[3], data[4], queenID, imageID);

  document.querySelector("#add-hive-overlay").classList.toggle("active");
  hives = await fetchHives();
  renderHives();
});

//Add queen popup
document.querySelector("#add-queen").addEventListener("click", (e) => {
  e.stopPropagation();
  addQueen = 1;
  document.querySelector("#add-queen-overlay").classList.toggle("active");
});
//Add queen form submit
document.querySelector("#add-queen-popup").addEventListener("submit", (e) => {
  e.preventDefault();
  document.querySelector("#add-queen-overlay").classList.toggle("active");
});

//move queen popup
document.querySelector("#mv-queen").addEventListener("click", async (e) => {
  e.stopPropagation();
  addQueen = 0;
  document.querySelector("#mv-queen-overlay").classList.toggle("active");
  const moveFrom = document.querySelector("#move-queen-from");
  const replaceWith = document.querySelector("#replace-with-queen");
  moveFrom.innerHTML = [...hives].map((item) => `<option value=${item.id}> ${item.name} </option>`).join("");
  replaceWith.innerHTML = '<option value="none"> None' + moveFrom.innerHTML;
});

document.querySelector("#mv-queen-popup").addEventListener("submit", (e) => {
  e.stopPropagation();
  e.preventDefault();
  const moveFrom = document.querySelector("#move-queen-from");
  const replaceWith = document.querySelector("#replace-with-queen");
  if (moveFrom.value === replaceWith.value) {
    alert("Please select another hive!");
    return;
  }
  document.querySelector("#mv-queen-overlay").classList.toggle("active");
});

document.querySelector("#edit-hive-popup").addEventListener("submit", async (e) => {
  e.preventDefault();

  const hiveID = Number(document.querySelector("#edit-hive-id").value);
  const name = document.querySelector("#edit-hive-name").value.trim();
  const locationName = document.querySelector("#edit-hive-location").value.trim();
  const boxSize = document.querySelector("#edit-hive-box-size").value.trim();
  const frames = document.querySelector("#edit-hive-frames").value.trim();
  const lastInspection = document.querySelector("#edit-hive-last-inspection").value;
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

  const wasUpdated = await updateHiveData(hiveID, name, location.id, boxSize, frames, lastInspection);
  console.log(imageID);
  const imageUpdated = await updateImage(imageID, document.querySelector("#upload-image-edit-input").files[0], name);
  if (!wasUpdated) {
    alert("Could not update hive. Please try again.");
    return;
  }
  if (!imageUpdated) {
    alert("Couldnt update image!");
  }

  // console.log("edit hives");
  hives = await fetchHives();
  currentResults = [...hives];
  renderHives();
  document.querySelector("#edit-hive-overlay").classList.remove("active");
});

document.querySelector("#cancel-delete-hive").addEventListener("click", () => {
  pendingDeleteHiveID = null;
  document.querySelector("#delete-hive-overlay").classList.remove("active");
});

document.querySelector("#confirm-delete-hive").addEventListener("click", async () => {
  if (pendingDeleteHiveID === null) return;
  const wasDeleted = await deleteHive(pendingDeleteHiveID);
  if (!wasDeleted) {
    alert("Could not delete hive. Please try again.");
    return;
  }
  pendingDeleteHiveID = null;
  document.querySelector("#delete-hive-overlay").classList.remove("active");
  // console.log("confirm delete");
  hives = await fetchHives();
  currentResults = [...hives];
  renderHives();
});

document.querySelector("#cancel-bulk-delete").addEventListener("click", () => {
  document.querySelector("#bulk-delete-overlay").classList.remove("active");
});

document.querySelector("#confirm-bulk-delete").addEventListener("click", async () => {
  const ids = [...selectedHiveIDs];
  if (ids.length === 0) return;
  for (const hiveID of ids) {
    const wasDeleted = await deleteHive(hiveID);
    if (!wasDeleted) {
      alert("Could not delete one or more hives. Please try again.");
      return;
    }
  }
  document.querySelector("#bulk-delete-overlay").classList.remove("active");
  clearSelection();
  // console.log("confirm bulk delete");
  hives = await fetchHives();
  currentResults = [...hives];
  renderHives();
});

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
      alert("Could not update one or more hives. Please try again.");
      return;
    }
  }

  document.querySelector("#bulk-edit-overlay").classList.remove("active");
  clearSelection();
  currentResults = [...hives];
});

document.addEventListener("click", (e) => {
  const closeButton = e.target.closest(".popup-close-btn");
  // console.log(e.target);
  if (!closeButton) return;
  const overlaySelector = closeButton.dataset.overlay;
  if (!overlaySelector) return;
  const overlay = document.querySelector(overlaySelector);
  if (overlay) {
    overlay.classList.remove("active");
    if (overlaySelector === "#delete-hive-overlay") {
      pendingDeleteHiveID = null;
    }
  }
});

//close popup screen
document.addEventListener("keyup", (e) => {
  if (e.key === "Escape") {
    const addQueenOverlay = document.querySelector("#add-queen-overlay");
    const hiveOverlay = document.querySelector("#add-hive-overlay");
    const mvQueenOverlay = document.querySelector("#mv-queen-overlay");
    const editHiveOverlay = document.querySelector("#edit-hive-overlay");
    const deleteHiveOverlay = document.querySelector("#delete-hive-overlay");
    const bulkEditOverlay = document.querySelector("#bulk-edit-overlay");
    const bulkDeleteOverlay = document.querySelector("#bulk-delete-overlay");

    // If addQueen popup is open, close ONLY that
    if (addQueenOverlay.classList.contains("active")) {
      addQueenOverlay.classList.remove("active");
    }
    // else, if mvQueen popup is open, close that
    else if (mvQueenOverlay.classList.contains("active")) {
      mvQueenOverlay.classList.remove("active");
    } else if (editHiveOverlay.classList.contains("active")) {
      editHiveOverlay.classList.remove("active");
    } else if (deleteHiveOverlay.classList.contains("active")) {
      pendingDeleteHiveID = null;
      deleteHiveOverlay.classList.remove("active");
    } else if (bulkEditOverlay.classList.contains("active")) {
      bulkEditOverlay.classList.remove("active");
    } else if (bulkDeleteOverlay.classList.contains("active")) {
      bulkDeleteOverlay.classList.remove("active");
    } else {
      //Otherwise, close hive popup
      hiveOverlay.classList.remove("active");
    }
  }
});
document.addEventListener("click", (e) => {
  const addQueenOverlay = document.querySelector("#add-queen-overlay");
  const hiveOverlay = document.querySelector("#add-hive-overlay");
  const mvQueenOverlay = document.querySelector("#mv-queen-overlay");
  const editHiveOverlay = document.querySelector("#edit-hive-overlay");
  const deleteHiveOverlay = document.querySelector("#delete-hive-overlay");
  const bulkEditOverlay = document.querySelector("#bulk-edit-overlay");
  const bulkDeleteOverlay = document.querySelector("#bulk-delete-overlay");
  if (
    e.target == addQueenOverlay ||
    e.target == hiveOverlay ||
    e.target == mvQueenOverlay ||
    e.target == editHiveOverlay ||
    e.target == deleteHiveOverlay ||
    e.target == bulkEditOverlay ||
    e.target == bulkDeleteOverlay
  ) {
    // If Queen popup is open, close ONLY that
    if (addQueenOverlay.classList.contains("active")) {
      addQueenOverlay.classList.remove("active");
    }
    // else, if mvQueen popup is open, close that
    else if (mvQueenOverlay.classList.contains("active")) {
      mvQueenOverlay.classList.remove("active");
    } else if (editHiveOverlay.classList.contains("active")) {
      editHiveOverlay.classList.remove("active");
    } else if (deleteHiveOverlay.classList.contains("active")) {
      pendingDeleteHiveID = null;
      deleteHiveOverlay.classList.remove("active");
    } else if (bulkEditOverlay.classList.contains("active")) {
      bulkEditOverlay.classList.remove("active");
    } else if (bulkDeleteOverlay.classList.contains("active")) {
      bulkDeleteOverlay.classList.remove("active");
    } else {
      //Otherwise, close hive popup
      hiveOverlay.classList.remove("active");
    }
  }
});

document.querySelector("#toggle-sidebar").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("collapsed");
});
