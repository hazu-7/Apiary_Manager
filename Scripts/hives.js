import Fuse from "../libs/fuse.mjs";

async function fetchHives() {
  const response = await fetch("http://127.0.0.1:5000/api/hives");
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

async function renderHives(data = hives) {
  const container = document.querySelector(".all-hives");
  container.style.gap = "5px";
  container.innerHTML = data
    .map(
      (hive) => `
    <article class="card hive-card" style="text-align: center" data-hive-id="${hive.id}">
      <h3>${hive.name}</h3>
      <img src="../${hive.image}" width="80%" height="200px">
      <div style="text-align: left; font-weight:500">
        Last Inspection: ${hive.last_inspection || "N/A"}
      </div>
      <div class="hive-details">
        <button class="hive-close-btn" type="button" >x</button>
        <p><strong>Location:</strong> ${hive.location || "N/A"}</p>
        <p><strong>Box Size:</strong> ${hive.box_size || "N/A"}</p>
        <p><strong>Frames:</strong> ${hive.frames ?? "N/A"}</p>
        <p><strong>Queen ID:</strong> ${hive.queen_id ?? "N/A"}</p>
        <p><strong>Hive ID:</strong> ${hive.id}</p>
        <button class="btn-primary edit-hive-btn" type="button">Edit Hive</button>
      </div>
    </article>
  `,
    )
    .join("");
}

document.querySelector(".all-hives").addEventListener("click", (event) => {
  const clickedCard = event.target.closest(".hive-card");
  const clickedClose = event.target.closest(".hive-close-btn");
  const clickedEdit = event.target.closest(".edit-hive-btn");

  if (!clickedCard && !clickedClose) return;

  if (clickedEdit) {
    const hiveID = Number(clickedCard.dataset.hiveId);
    const hiveToEdit = hives.find((item) => item.id === hiveID);
    if (!hiveToEdit) return;
    openEditHivePopup(hiveToEdit);
    return;
  }

  const card = clickedClose ? clickedClose.closest(".hive-card") : clickedCard;
  if (!card) return;

  const wasExpanded = card.classList.contains("expanded");

  document.querySelectorAll(".hive-card.expanded").forEach((item) => {
    item.classList.remove("expanded");
  });

  if (!wasExpanded && !clickedClose) {
    card.classList.add("expanded");
  }
});

function openEditHivePopup(hive) {
  document.querySelector("#edit-hive-id").value = hive.id;
  document.querySelector("#edit-hive-name").value = hive.name || "";
  document.querySelector("#edit-hive-location").value = hive.location || "";
  document.querySelector("#edit-hive-box-size").value = hive.box_size || "";
  document.querySelector("#edit-hive-frames").value = hive.frames || "";

  if (hive.last_inspection) {
    const inspectionDate = new Date(hive.last_inspection).toISOString().slice(0, 10);
    document.querySelector("#edit-hive-last-inspection").value = inspectionDate;
  } else {
    document.querySelector("#edit-hive-last-inspection").value = new Date().toISOString().slice(0, 10);
  }

  document.querySelector("#edit-hive-overlay").classList.add("active");
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
    const response = await fetch("http://127.0.0.1:5000/api/add/hive", {
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
    const response = await fetch("http://127.0.0.1:5000/api/add/queen", {
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
    const response = await fetch("http://127.0.0.1:5000/api/add/location", {
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
    const response = await fetch("http://127.0.0.1:5000/api/add/image", {
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

async function updateHiveData(hiveID, name, locationID, boxSize, frames, lastInspection) {
  const hiveData = {
    name: name,
    location_id: locationID,
    box_size: boxSize,
    frames: frames,
    last_inspection: lastInspection,
  };

  try {
    const response = await fetch(`http://127.0.0.1:5000/api/update/hive/${hiveID}`, {
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

const fuseOptions = {
  keys: ["id", "location", "last_inspection"],
  threshold: 0.3,
};

const fuse = new Fuse(hives, fuseOptions);

const search = document.querySelector("#search-box");
const sortBy = document.querySelector("[name='sort']");

let currentResults = [...hives];

function applySort(data) {
  let sorted = [...data];

  if (sortBy.value === "location") {
    sorted.sort((a, b) => a.location.localeCompare(b.location));
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

//Add hive popup javascript
let addQueen = -1;
document.querySelector("#addHiveBtn").addEventListener("click", (e) => {
  document.querySelector("#post-hive-popup").reset();
  document.querySelector("#add-queen-popup").reset();
  document.querySelector("#upload-image").value = "";
  const locationNames = locations.map((loc) => loc.name);
  const locationOptions = locationNames.map((loc) => `<option value="${loc}">`).join(" ");
  const datalist = document.querySelector("#locations");
  const establishedDateInput = document.querySelectorAll(".established-date");
  const today = new Date().toISOString().slice(0, 10);
  establishedDateInput.forEach((item) => (item.value = today));
  datalist.innerHTML = `${locationOptions}`;
  document.querySelector("#add-hive-overlay").classList.toggle("active");
});

document.querySelector("#upload-image").addEventListener("change", (e) => {
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
});

document.querySelector("#post-hive-popup").addEventListener("submit", async (e) => {
  e.preventDefault();
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
  const data = [...document.querySelectorAll(".add-hive-input")].map((item) => item.value);
  if (data[1] == "") {
    data[1] = "No Location";
  }

  if (!locationNames.includes(data[1])) {
    await postLocation(data[1], "Undefined");
    locations = await fetchLocations();
  }

  data[1] = locations.find((item) => item.name == data[1]);

  if (data[0] === "") {
    data[0] = data[1].name + " " + (data[1].number_of_hives + 1);
  }

  const imageUploadResponce = await uploadImage(document.querySelector("#upload-image").files[0], data[0]);
  console.log(imageUploadResponce.image_id);
  const imageID = imageUploadResponce.image_id;

  postHiveData(data[0], data[1].id, data[2], data[3], data[4], queenID, imageID);
  document.querySelector("#add-hive-overlay").classList.toggle("active");
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

  const wasUpdated = await updateHiveData(
    hiveID,
    name,
    location.id,
    boxSize,
    frames,
    lastInspection,
  );

  if (!wasUpdated) {
    alert("Could not update hive. Please try again.");
    return;
  }

  hives = await fetchHives();
  currentResults = [...hives];
  renderHives();
  document.querySelector("#edit-hive-overlay").classList.remove("active");
});

document.addEventListener("click", (e) => {
  const closeButton = e.target.closest(".popup-close-btn");
  if (!closeButton) return;
  const overlaySelector = closeButton.dataset.overlay;
  if (!overlaySelector) return;
  const overlay = document.querySelector(overlaySelector);
  if (overlay) {
    overlay.classList.remove("active");
  }
});

//close popup screen
document.addEventListener("keyup", (e) => {
  if (e.key === "Escape") {
    const addQueenOverlay = document.querySelector("#add-queen-overlay");
    const hiveOverlay = document.querySelector("#add-hive-overlay");
    const mvQueenOverlay = document.querySelector("#mv-queen-overlay");
    const editHiveOverlay = document.querySelector("#edit-hive-overlay");

    // If addQueen popup is open, close ONLY that
    if (addQueenOverlay.classList.contains("active")) {
      addQueenOverlay.classList.remove("active");
    }
    // else, if mvQueen popup is open, close that
    else if (mvQueenOverlay.classList.contains("active")) {
      mvQueenOverlay.classList.remove("active");
    } else if (editHiveOverlay.classList.contains("active")) {
      editHiveOverlay.classList.remove("active");
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
  if (e.target == addQueenOverlay || e.target == hiveOverlay || e.target == mvQueenOverlay || e.target == editHiveOverlay) {
    // If Queen popup is open, close ONLY that
    if (addQueenOverlay.classList.contains("active")) {
      addQueenOverlay.classList.remove("active");
    }
    // else, if mvQueen popup is open, close that
    else if (mvQueenOverlay.classList.contains("active")) {
      mvQueenOverlay.classList.remove("active");
    } else if (editHiveOverlay.classList.contains("active")) {
      editHiveOverlay.classList.remove("active");
    } else {
      //Otherwise, close hive popup
      hiveOverlay.classList.remove("active");
    }
  }
});
