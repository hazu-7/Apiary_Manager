const serverIP = "http://127.0.0.1:5000";

// async function fetch(url, init = {}) {
//   const response = await fetch(url, { credentials: "same-origin", ...init });
//   return response;
// }

export async function fetchHives() {
  const response = await fetch(`${serverIP}/api/hives`);
  const data = await response.json();
  return data.hives;
}

export async function postHiveData(name, locationID, boxSize, frames, lastInspection, queen_id, image_id) {
  const hiveData = { box_size: boxSize, location_id: locationID, frames, last_inspection: lastInspection, name, queen_id, image_id };
  try {
    const response = await fetch(`${serverIP}/api/hive/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hiveData),
    });
    const result = await response.json();
    if (!response.ok) console.error("Server error:", result.error);
    else console.log("Success:", result.message);
  } catch (error) {
    console.error("Network error:", error);
  }
}

export async function updateHiveData(hiveID, name, locationID, boxSize, frames, lastInspection, queenID, notes, feed) {
  const hiveData = { name: name, location_id: locationID, box_size: boxSize, frames, last_inspection: lastInspection };
  if (queenID !== undefined) hiveData.queen_id = queenID;
  if (notes !== undefined) hiveData.notes = notes;
  if (feed !== undefined) hiveData.feed = feed;
  try {
    const response = await fetch(`${serverIP}/api/hive/update/${hiveID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hiveData),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Server error:", result.error || result.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Network error: ", error);
    return false;
  }
}

export async function removeHive(hiveID) {
  try {
    const response = await fetch(`${serverIP}/api/hive/remove/${hiveID}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) {
      console.error("Server error:", result.error || result.message);
      return false;
    }
    console.log("Success:", result.message);
    return true;
  } catch (error) {
    console.error("Network error:", error);
    return false;
  }
}

export async function fetchLocations() {
  const response = await fetch(`${serverIP}/api/locations`);
  const data = await response.json();
  return data.locations;
}

export async function fetchQueens() {
  const response = await fetch(`${serverIP}/api/queens`);
  const data = await response.json();
  return data.queens;
}

export async function postLocation(name, Longitude, Latitude) {
  const locationData = { name, Longitude, Latitude };
  try {
    const response = await fetch(`${serverIP}/api/location/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(locationData),
    });
    const result = await response.json();
    if (!response.ok) console.error("Server error:", result.error);
    else console.log("Success:", result.success);
    return result;
  } catch (error) {
    console.error("Network error:", error);
  }
}

export async function updateLocation(id, name, longitude, latitude) {
  const locationData = { name: name, lng: longitude, lat: latitude };
  try {
    const response = await fetch(`${serverIP}/api/location/update/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(locationData),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Server error:", result.error || result.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Network error: ", error);
    return false;
  }
}

export async function removeLocation(id) {
  try {
    const response = await fetch(`${serverIP}/api/location/remove/${id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) {
      console.error("Server error:", result.error || result.message);
      return false;
    }
    console.log("Success:", result.message);
    return true;
  } catch (error) {
    console.error("Network error:", error);
    return false;
  }
}

export async function postQueen(breed, colour, introDate) {
  const queenData = { breed, colour, introDate };
  try {
    const response = await fetch(`${serverIP}/api/queen/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queenData),
    });
    const result = await response.json();
    if (!response.ok) console.error("Server error:", result.error);
    else console.log("Success:", result.message);
    return result;
  } catch (error) {
    console.error("Network error:", error);
  }
}

export async function uploadImage(image, fileName) {
  const formData = new FormData();
  formData.append("image", image);
  formData.append("fileName", fileName);
  try {
    const response = await fetch(`${serverIP}/api/image/add`, { method: "POST", body: formData });
    const result = await response.json();
    if (!response.ok) console.error("Server error:", result.error);
    else console.log("Success:", result.message);
    return result;
  } catch (error) {
    console.error("Network error:", error);
  }
}

export async function updateImage(imageID, image, fileName) {
  const formData = new FormData();
  formData.append("imageID", imageID);
  formData.append("image", image);
  formData.append("fileName", fileName);
  try {
    const response = await fetch(`${serverIP}/api/image/update/${imageID}`, { method: "PUT", body: formData });
    const result = await response.json();
    if (!response.ok) console.error("Server error:", result.error);
    else console.log("Success:", result.message);
    return result;
  } catch (error) {
    console.error("Network error:", error);
  }
}

export async function addUser(username, email, password) {
  const userData = { username: username, email: email, password: password };
  try {
    const response = await fetch(`${serverIP}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Server error:", result.message);
      return {
        success: false,
        message: result.message || "Unable to create account.",
      };
    }
    return { success: true, message: "Account created." };
  } catch (error) {
    console.error("Network error: ", error);
    return {
      success: false,
      message: "Network error. Please try again.",
    };
  }
}
