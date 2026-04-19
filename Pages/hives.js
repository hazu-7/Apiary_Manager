import Fuse from '../libs/fuse.mjs'

async function fetchHives () {
  const response = await fetch('http://127.0.0.1:5000/api/hives')
  const data = await response.json()
  //console.log(data.hives);
  return data.hives
}

async function fetchLocations () {
  const response = await fetch('http://127.0.0.1:5000/api/locations')
  const data = await response.json()
  return data.locations
}
async function render_hives (data = hives) {
  const container = document.querySelector('.all-hives')
  container.style.gap = '5px'

  container.innerHTML = data
    .map(
      hive => `
    <div class="card" style="text-align: center">
      <h3>ID: ${hive.id}</h3>
      <img src="../images/Pasted image.png" width="200">
      <div style="text-align: left; font-weight:500">
        Last Inspection: ${hive.last_inspection}
      </div>
    </div>
  `
    )
    .join('')
}

const options = {
  keys: ['id', 'location', 'last_inspection'],
  threshold: 0.3 // 0.0 is perfect match, 1.0 matches anything
}

let hives = await fetchHives()
let locations = await fetchLocations()
const fuse = new Fuse(hives, options)
const search = document.querySelector('#search-box')

search.addEventListener('input', e => {
  const query = e.target.value
  if (query.trim() === '') {
    render_hives(hives) // Show all if search is empty
    return
  }
  const searchResults = fuse.search(query)
  const filteredHives = searchResults.map(result => result.item)
  render_hives(filteredHives)
})

const sortBy = document.querySelector("[name='sort']")
sortBy.addEventListener('change', e => {
    let data = hives;
  if (e.target.value == 'location') {
    data = locations.flatMap(loc => loc.hives)
  }
  render_hives(data);
})

render_hives()

const add_hive_popup = document.createElement('div');
document.querySelector('#addHiveBtn').addEventListener('click', () => {
    // Create the element
    const popup = document.createElement('div');
    popup.className = "add_hive_overlay";
    
    popup.innerHTML = `
    <div class="add_hive_content">
        <div class="upload_image">
            <img src="../images/Pasted image.png" width=100%>
        </div>
        <div class="inputs">
                <input>
                <input>
                <input>
                <input> 
                <button>hello</button>               
        </div>
    </div>
    `;

    document.body.appendChild(popup);
    
});


async function postHiveData(boxSize, locationID, frames, varroaFound, lastInpsection) {

  const hiveData = {
    "box_size" : boxSize,
    "location_id" : locationID,
    "frames": frames,
    "varroa_found": varroaFound,
    "last_inspection": lastInpsection
  }

    try {
        const response = await fetch("http://127.0.0.1:5000/api/hives/add", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(hiveData) // Turn the object into a string
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

