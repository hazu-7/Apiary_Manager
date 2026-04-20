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
async function render_hives(data = hives) {
  const container = document.querySelector(".all-hives");
  container.style.gap = "5px";
  container.innerHTML = data
    .map(
      (hive) => `
    <div class="card" style="text-align: center">
      <h3> ${hive.name}</h3>
      <img src="../images/Pasted image.png" width="200">
      <div style="text-align: left; font-weight:500">
        Last Inspection: ${hive.last_inspection}
      </div>
    </div>
  `,
    )
    .join("");
}

async function postHiveData(name, locationID, boxSize, frames, lastInpsection) {
  const hiveData = {
    box_size: boxSize,
    location_id: locationID,
    frames: frames,
    last_inspection: lastInpsection,
    name: name,
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
      console.log("Success:", result.message);
    } else {
      console.error("Server error:", result.error);
    }
  } catch (error) {
    console.error("Network error:", error);
  }
}
const fuseOptions = {
  keys: ["id", "location", "last_inspection"],
  threshold: 0.3, // 0.0 is perfect match, 1.0 matches anything
};

let hives = await fetchHives();
let locations = await fetchLocations();
const fuse = new Fuse(hives, fuseOptions);
const search = document.querySelector("#search-box");

search.addEventListener("input", (e) => {
  const query = e.target.value;
  if (query.trim() === "") {
    render_hives(hives); // Show all if search is empty
    return;
  }
  const searchResults = fuse.search(query);
  const filteredHives = searchResults.map((result) => result.item);
  render_hives(filteredHives);
});

const sortBy = document.querySelector("[name='sort']");
sortBy.addEventListener("change", (e) => {
  let data = hives;
  if (e.target.value == "location") {
    data = locations.flatMap((loc) => loc.hives);
  }
  render_hives(data);
});

render_hives();

//Add hive popup javascript
document.querySelector("#addHiveBtn").addEventListener("click", () => {
  const locationNames = locations.map((loc) => loc.name);
  const locationOptions = locationNames.map((loc) => `<option value="${loc}">`).join(" ");
  const datalist = document.querySelector("#locations");
  const overlay = document.querySelector(".add_hive_overlay");
  const post_hive_btn = document.querySelector("#post_hive_to_database");
  datalist.innerHTML = `${locationOptions}`;
  overlay.setAttribute("style", "display:flex");

  post_hive_btn.addEventListener("click", async () => {
    post_hive_btn.disabled = true;
    const data = [...document.querySelectorAll(".add_hive_input")].map((item) => item.value);
    if (!locationNames.includes(data[1])) {
      await postLocation(data[1], "Undefined");
      locations = await fetchLocations();
    }

    data[1] = locations.find((item) => item.name == data[1]).id;
    postHiveData(data[0], data[1], data[2], data[3], data[4]);
    overlay.setAttribute("style", "display:none");
    render_hives();
  });
  //close popup if escape is pressed
  document.addEventListener("keyup", (e) => {
    if (e.key == "Escape") {
      overlay.setAttribute("style", "display: none");
    }
  });
  overlay.addEventListener("click", (e) => {
    if (e.target == overlay) {
      overlay.setAttribute("style", "display:none");
      e.stopPropagation();
    }
  });
});
