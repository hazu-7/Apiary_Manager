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
      <h3> ${hive.location} ${hive.id}</h3>
      <img src="../images/Pasted image.png" width="200">
      <div style="text-align: left; font-weight:500">
        Last Inspection: ${hive.last_inspection}
      </div>
    </div>
  `,
    )
    .join("");
}

async function postHiveData(boxSize, locationID, frames, lastInpsection) {
  const hiveData = {
    box_size: boxSize,
    location_id: locationID,
    frames: frames,
    last_inspection: lastInpsection,
  };

  try {
    const response = await fetch("http://127.0.0.1:5000/api/hives/add", {
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
  console.log(data);
  render_hives(data);
});

render_hives();

document.querySelector("#addHiveBtn").addEventListener("click", () => {
  const locationNames = locations.map((loc) => loc.name);
  const locationOptions = locationNames.map((loc) => `<option value="${loc}">`).join(" ");
  const datalist = document.querySelector("#locations");
  datalist.innerHTML = `${locationOptions}`;
  document.querySelector(".add_hive_overlay").setAttribute("style", "display:flex");

  document.querySelector("#post_hive_to_database").addEventListener("click", () => {
    const data = [...document.querySelectorAll(".add_hive_input")].map((item) => item.value);
    postHiveData(data[1], data[0], data[2], data[3]);
    console.log(data);
  });
});
