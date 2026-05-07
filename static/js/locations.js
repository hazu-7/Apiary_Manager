import { fetchLocations as apiFetchLocations, postLocation, removeLocation, updateLocation } from "./api.js";

async function fetchLocations() {
  const locations = await apiFetchLocations();
  return locations.map((location) => ({
    id: location.id,
    name: location.name,
    lat: location.lat,
    lng: location.lng,
    number_of_hives: location.hives.length,
  }));
}

let map;
let markerLayer;
let activeLocationId = null;
const markersMap = new Map(); // Helper to link location IDs to Leaflet Marker objects

// --- Initialization ---
let locations = await fetchLocations();

initPickerMap();
initMap();
setupEventListeners();
renderAll();

function initMap() {
  // 1. Create the map instance
  map = L.map("map", {
    zoomControl: false,
    attributionControl: false,
  }).setView([41.295, 36.33194], 8);

  // 2. Add tile layer (using CartoDB Voyager for a cleaner look that matches your UI)
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
  }).addTo(map);

  // 3. Move zoom control to top-right
  L.control.zoom({ position: "topright" }).addTo(map);

  // 4. Create a layer for markers
  markerLayer = L.layerGroup().addTo(map);
}

// --- Rendering Logic ---
function renderAll() {
  const searchTerm = document.querySelector("#location-search").value.toLowerCase();
  const filtered = locations.filter((loc) => loc.name.toLowerCase().includes(searchTerm));

  renderList(filtered);
  renderMarkers(filtered);
  updateStats();
}

function renderList(locs) {
  const container = document.querySelector("#location-list-inner");
  container.innerHTML = "";

  if (locs.length === 0) {
    container.innerHTML = `<div class="loc-empty"><strong>No locations found</strong><p>Try a different search term.</p></div>`;
    return;
  }

  locs.forEach((loc) => {
    const isActive = loc.id === activeLocationId;
    const isMapped = loc.lat && loc.lng && loc.lat != "Undefined" && loc.lat != "Undefined";

    const card = document.createElement("div");
    card.className = `loc-card ${isActive ? "active" : ""}`;
    card.innerHTML = `
            <div class="loc-card-header">
                <span class="loc-card-name">${loc.name}</span>
                <div class="loc-card-actions">
                    <button class="loc-icon-btn edit-trigger" data-id="${loc.id}">✎</button>
                    <button class="loc-icon-btn danger delete-trigger" data-id="${loc.id}">✕</button>
                </div>
            </div>
            <div class="loc-card-meta">
                <div class="loc-meta-row">
                    <span class="loc-meta-label">POS</span>
                    <span>${isMapped ? `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` : "No Coordinates"}</span>
                </div>
            </div>
            ${isMapped ? `<div class="loc-hive-count">🐝 ${loc.number_of_hives} Hives</div>` : `<div class="loc-unmapped-badge">Unmapped</div>`}
        `;

    // Click to focus map
    card.addEventListener("click", (e) => {
      if (e.target.closest(".loc-icon-btn")) return;
      if (!isMapped) return;
      focusLocation(loc);
    });

    // Edit/Delete handlers
    card.querySelector(".edit-trigger").onclick = () => openEditModal(loc);
    card.querySelector(".delete-trigger").onclick = () => openDeleteModal(loc);

    container.appendChild(card);
  });
}

function renderMarkers(locs) {
  markerLayer.clearLayers();
  markersMap.clear();

  locs.forEach((loc) => {
    if (!loc.lat || !loc.lng || loc.lat == "Undefined" || loc.lng == "Undefined") return;

    const isActive = loc.id === activeLocationId;

    // Custom marker icon based on your CSS
    const icon = L.divIcon({
      className: `custom-pin ${isActive ? "pin-active" : ""}`,
      html: `<div class="pin-body"></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    const marker = L.marker([loc.lat, loc.lng], { icon })
      .on("click", () => focusLocation(loc))
      .bindPopup(
        `<div class="map-popup"><div class="map-popup-name">${loc.name}</div><div class="map-popup-hives">🐝 ${loc.number_of_hives} Hives</div></div>`,
        {
          closeButton: false,
          offset: [0, -25],
        },
      );

    markerLayer.addLayer(marker);
    markersMap.set(loc.id, marker);
  });
}

// --- Actions ---
function focusLocation(loc) {
  activeLocationId = loc.id;
  renderAll();

  if (loc.lat && loc.lng) {
    map.flyTo([loc.lat, loc.lng], 15, { duration: 1 });
    const marker = markersMap.get(loc.id);
    if (marker) marker.openPopup();
    document.querySelector("#map-hint").classList.add("hidden");
  }
}

function updateStats() {
  const total = locations.length;
  const hives = locations.reduce((sum, l) => sum + l.number_of_hives, 0);
  const mapped = locations.filter((l) => l.lat && l.lng).length;

  document.querySelector("#stat-total").innerText = total;
  document.querySelector("#stat-hives").innerText = hives;
  document.querySelector("#stat-mapped").innerText = mapped;
  document.querySelector("#stat-unmapped").innerText = total - mapped;
}

function setupEventListeners() {
  // Search
  document.querySelector("#location-search").addEventListener("input", renderAll);

  // Sidebar Toggle (Leaflet needs a resize trigger when container size changes)
  document.querySelector("#toggle-sidebar").onclick = () => {
    document.querySelector("#sidebar").classList.toggle("collapsed");
    setTimeout(() => map.invalidateSize(), 300);
  };

  const expandBtn = document.querySelector("#expand-sidebar");
  if (expandBtn) {
    expandBtn.onclick = () => {
      document.querySelector("#sidebar").classList.remove("collapsed");
      setTimeout(() => map.invalidateSize(), 300);
    };
  }

  // Close overlays
  document.querySelectorAll(".popup-close-btn, [data-overlay]").forEach((btn) => {
    btn.onclick = (e) => {
      const selector = btn.dataset.overlay;
      if (selector) document.querySelector(selector).classList.remove("active");
    };
  });

  // Add Location Modal
  document.querySelector("#addLocationBtn").onclick = () => {
    document.querySelector("#add-location-overlay").classList.add("active");
  };

  // Form Submission placeholders
  document.querySelector("#add-location-popup").onsubmit = async (e) => {
    e.preventDefault();
    // Here you would send data to your backend

    const name = document.querySelector("#add-loc-name").value;
    const lat = parseFloat(document.querySelector(".add.lat").value);
    const lng = parseFloat(document.querySelector(".add.lng").value);
    await postLocation(name, lng, lat);
    locations = await fetchLocations();
    focusLocation({ name: name, lat: lat, lng: lng });
    e.target.reset();
    document.querySelector("#add-location-overlay").classList.remove("active");
    renderAll();
  };

  document.querySelector("#edit-location-popup").onsubmit = async (e) => {
    e.preventDefault();
    const id = document.querySelector("#edit-loc-id").value;
    const name = document.querySelector("#edit-loc-name").value;
    const lat = parseFloat(document.querySelector(".edit.lat").value);
    const lng = parseFloat(document.querySelector(".edit.lng").value);
    await updateLocation(id, name, lng, lat);
    locations = await fetchLocations();
    document.querySelector("#edit-location-overlay").classList.remove("active");
    e.target.reset();
    renderAll();
  };

  // ── Generic popup close (close button & backdrop click) ──────
  document.addEventListener("click", (e) => {
    const closeButton = e.target.closest(".popup-close-btn");
    const cancelButton = e.target.closest("#cancel-delete-loc");
    if (closeButton || cancelButton) {
      const overlaySelector = closeButton?.dataset.overlay || cancelButton?.dataset.overlay;
      if (!overlaySelector) return;
      const overlay = document.querySelector(overlaySelector);
      if (overlay) {
        overlay.classList.remove("active");
        if (overlaySelector === "#delete-hive-overlay") pendingDeleteHiveID = null;
      }
      return;
    }

    // Backdrop click
    const overlayIDs = ["#add-location-overlay", "#edit-location-overlay", "#delete-location-overlay"];
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
    const overlayIDs = ["#add-location-overlay", "#edit-location-overlay", "#delete-location-overlay"];
    for (const id of overlayIDs) {
      const overlay = document.querySelector(id);
      if (overlay.classList.contains("active")) {
        overlay.classList.remove("active");
      }
    }
  });
}

// Modals
function openEditModal(loc) {
  document.querySelector("#edit-loc-id").value = loc.id;
  document.querySelector("#edit-loc-name").value = loc.name;
  document.querySelector(".edit.lat").value = loc.lat || "";
  document.querySelector(".edit.lng").value = loc.lng || "";
  document.querySelector("#edit-location-overlay").classList.add("active");
}

function openDeleteModal(loc) {
  document.querySelector("#delete-loc-name").innerText = loc.name;
  document.querySelector("#delete-location-overlay").classList.add("active");

  document.querySelector("#confirm-delete-loc").onclick = async () => {
    await removeLocation(loc.id);
    locations = await fetchLocations();
    document.querySelector("#delete-location-overlay").classList.remove("active");
    renderAll();
  };
}

// Initialize Picker Map Logic
function initPickerMap() {
  // Select by class if you have multiple, or leave as ID if it's unique
  const buttons = document.querySelectorAll("#btn-picker-toggle");

  buttons.forEach((btn) => {
    const container = btn.nextElementSibling;
    const mapDiv = container.querySelector(".map-instance");

    btn.addEventListener("click", () => {
      const isHidden = container.style.display === "none" || container.style.display === "";
      container.style.display = isHidden ? "block" : "none";
      btn.textContent = isHidden ? "✕ Close Map" : "📍 Pick from Map";

      if (isHidden) {
        // 1. Get the current values from the inputs (and convert to numbers)
        const parent = container.parentElement;
        const currentLat = parseFloat(parent.querySelector(".lat").value) || 41.295;
        const currentLng = parseFloat(parent.querySelector(".lng").value) || 36.33194;

        if (!container._mapInstance) {
          // Initialize map centered on input values
          const map = L.map(mapDiv).setView([currentLat, currentLng], 13);

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap",
          }).addTo(map);

          // Save the map instance to the container
          container._mapInstance = map;

          // Create the marker at the input position and save it to the map object
          map._currentMarker = L.marker([currentLat, currentLng]).addTo(map);

          map.on("click", (e) => {
            const { lat, lng } = e.latlng;
            updatePickerMarker(lat, lng, container);
          });
        } else {
          // 2. If map exists, move the view and marker to current input values
          // This handles the case where you open the overlay for a DIFFERENT location
          const map = container._mapInstance;
          map.setView([currentLat, currentLng], 13);

          if (map._currentMarker) {
            map._currentMarker.setLatLng([currentLat, currentLng]);
          }
        }

        // 3. Fix Leaflet's gray box/centering issue
        setTimeout(() => {
          container._mapInstance.invalidateSize();
        }, 200); // 200ms is usually enough
      }
    });
  });
}

function updatePickerMarker(lat, lng, container) {
  const parent = container.parentElement;
  const inputLat = parent.querySelector(".lat");
  const inputLng = parent.querySelector(".lng");
  const map = container._mapInstance;

  // Update Input Fields
  if (inputLat) inputLat.value = lat.toFixed(6);
  if (inputLng) inputLng.value = lng.toFixed(6);

  // Update Marker
  if (map && map._currentMarker) {
    map._currentMarker.setLatLng([lat, lng]);
  }
}
