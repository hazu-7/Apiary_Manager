// Mock data representing what your Flask API will return
const hives = [
    { id: "H-01", location: "North Orchard", status: "Healthy", queen: "Beatrix" },
    { id: "H-02", location: "North Orchard", status: "Low Stores", queen: "Cleo" },
    { id: "H-03", location: "West Meadow", status: "Healthy", queen: "Diana" }
];

document.addEventListener('DOMContentLoaded', () => {
    const hiveGrid = document.getElementById('hiveGrid');
    
    // Function to render hives
    const renderHives = () => {
        hiveGrid.innerHTML = hives.map(hive => `
            <div class="card hive-card">
                <h4>Hive ${hive.id}</h4>
                <p><strong>Location:</strong> ${hive.location}</p>
                <p><strong>Queen:</strong> ${hive.queen}</p>
                <div style="margin-top: 15px;">
                    <span class="hive-tag">${hive.status}</span>
                </div>
            </div>
        `).join('');
    };

    renderHives();

    // Simple interaction example
    document.getElementById('addHiveBtn').addEventListener('click', () => {
        alert("This would open a Flask-powered form to add a new hive!");
    });
    document.getElementsByClassName()
});

