async function fetchHives() {
    const response = await fetch('http://127.0.0.1:5000/api/hives');
    const data = await response.json();
    console.log(data.hives); 
    return data.hives;
}

fetchHives();