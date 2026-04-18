async function fetchHives () {
  const response = await fetch('http://127.0.0.1:5000/api/hives')
  const data = await response.json()
  //console.log(data.hives);
  return data.hives
}
async function render_hives() {
  const list = await fetchHives();
  const container = document.querySelector('.all-hives');
  container.style.gap = '5px';

  container.innerHTML = list.map(hive => `
    <div class="card" style="text-align: center">
      <h3>ID: ${hive.id}</h3>
      <img src="../images/Pasted image.png" width="200">
      <div style="text-align: left; font-weight:500">
        Location: ${hive.location} <br /> 
        Last Inspection: ${hive.last_inspection}
      </div>
    </div>
  `).join('');
}

render_hives()
