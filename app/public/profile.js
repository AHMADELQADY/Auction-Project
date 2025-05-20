// JS Completo aggiornato

document.addEventListener("DOMContentLoaded", () => {
  const contactLink = document.getElementById("contact-link");
  const layout = document.querySelector(".three-column-layout");
  const rightColumn = document.querySelector(".column.right");
  const userName = document.getElementById("user-name");
  const userSurname = document.getElementById("user-surname");
  const userUsername = document.getElementById("user-username");
  const showUsersButton = document.getElementById("show-users-button");
  const usersModal = document.getElementById("users-modal");
  const closeUsersModal = document.getElementById("close-users-modal");
  const userList = document.getElementById("user-list");
  const searchUsersInput = document.getElementById("search-users");
  const auctionsModal = document.getElementById("auctions-modal");
  const closeAuctionsModal = document.getElementById("close-auctions-modal");
  const auctionsGrid = document.getElementById("auctions-grid");
  const auctionDetailsModal = document.createElement("div");
  const modifyAuctionLink = document.getElementById("modify-auction-link");
  const logoutButton = document.querySelector(".btnLogout");

  // Event listener per il logout
  logoutButton.addEventListener("click", async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      alert("Logout successful");
      window.location.href = "index.html"; // Reindirizza a index.html
    } catch (err) {
      console.error("Error during logout:", err);
      alert("An error occurred while logging out. Please try again.");
    }
  });

  
  
  
  function showRightColumn(contentType) {
    rightColumn.innerHTML = ""; // Pulisce il contenuto precedente
    if (contentType === "create") {
      rightColumn.innerHTML = `
        <h2>Create Auction</h2>
        <form id="create-auction-form" class="create-auction-form">
          <label for="auction-title">Title:</label>
          <input type="text" id="auction-title" name="title" placeholder="Enter Auction Title" required>
  
          <label for="auction-description">Description:</label>
          <textarea id="auction-description" name="description" placeholder="Enter Auction Description" required></textarea>
  
          <label for="auction-expiration">Expiration Date:</label>
          <input type="date" id="auction-expiration" name="expirationDate" required>
  
          <label for="auction-price">Starting Price:</label>
          <input type="number" id="auction-price" name="startingPrice" placeholder="Enter Starting Price" required>
  
          <button type="submit">Create Auction</button>
        </form>
      `;
      document.getElementById("create-auction-form").addEventListener("submit", createAuction);
    } else if (contentType === "modify") {
      rightColumn.innerHTML = `
        <h2>Modify Auction</h2>
        <form id="modify-auction-form" class="modify-auction-form">
          <label for="auction-id">Auction ID:</label>
          <input type="text" id="auction-id" name="auction-id" placeholder="Enter Auction ID" required>
  
          <label for="auction-title">New Title:</label>
          <input type="text" id="auction-title" name="title" placeholder="Enter New Title">
  
          <label for="auction-description">New Description:</label>
          <textarea id="auction-description" name="description" placeholder="Enter New Description"></textarea>
  
          <button type="submit">Update Auction</button>
          <p id="modify-auction-error" class="error-message"></p>
        </form>
      `;
      document.getElementById("modify-auction-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const auctionId = document.getElementById("auction-id").value.trim();
        const title = document.getElementById("auction-title").value.trim();
        const description = document.getElementById("auction-description").value.trim();
        const errorElement = document.getElementById("modify-auction-error");
  
        if (!auctionId || (!title && !description)) {
          errorElement.textContent = "Please provide an Auction ID and at least one field to update.";
          return;
        }
  
        try {
          const response = await fetch(`/api/auctions/${auctionId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ title, description }),
          });
  
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to update the auction.");
          }
  
          const result = await response.json();
          alert(result.success || "Auction updated successfully!");
          rightColumn.classList.add("hidden");
          layout.classList.remove("show-right");
        } catch (err) {
          console.error("Error updating auction:", err);
          errorElement.textContent = err.message || "Failed to update the auction.";
        }
      });
    }
    rightColumn.classList.remove("hidden");
    layout.classList.add("show-right");
  }
  
  contactLink.addEventListener("click", (event) => {
    event.preventDefault();
    showRightColumn("create");
  });
  
  modifyAuctionLink.addEventListener("click", (event) => {
    event.preventDefault();
    showRightColumn("modify");
  });



  // Configura il modal per i dettagli delle aste
  auctionDetailsModal.classList.add("modal");
  auctionDetailsModal.innerHTML = `
    <div class="modal-content">
      <button class="close-button" id="close-auction-details-modal">&times;</button>
      <h2>Auction Details</h2>
      <div id="auction-details-content"></div>
    </div>
  `;
  document.body.appendChild(auctionDetailsModal);

  const closeAuctionDetailsModal = document.getElementById("close-auction-details-modal");
  const auctionDetailsContent = document.getElementById("auction-details-content");

  // Recupera le informazioni dell'utente autenticato
  async function fetchUserInfo() {
    try {
      const response = await fetch("/api/whoami", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
  
      if (!response.ok) {
        throw new Error("Failed to fetch user info");
      }
  
      const user = await response.json();
      userName.textContent = user.name || "N/A";
      userSurname.textContent = user.surname || "N/A";
      userUsername.textContent = user.username || "N/A";
  
      // Carica le aste create dall'utente
      fetchAndDisplayCreatedAuctions(user.username);
    } catch (err) {
      console.error("Error fetching user info:", err);
      userName.textContent = "Error";
      userSurname.textContent = "Error";
      userUsername.textContent = "Error";
    }
  }


  // Mostra tutti gli utenti
  async function fetchAndDisplayUsers(query = "") {
    try {
      const url = query ? `/api/users?q=${encodeURIComponent(query)}` : "/api/users";
      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user list");
      }

      const users = await response.json();
      userList.innerHTML = ""; // Pulisce la lista precedente
      users.forEach((user) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <span>${user.name || "N/A"} ${user.surname || "N/A"} (${user.username})</span>
          <button class="blue-button small-button" data-username="${user.username}">Auctions Won</button>
        `;
        userList.appendChild(li);
      });

      // Aggiungi listener ai pulsanti "Auctions Won"
      const auctionsWonButtons = document.querySelectorAll(".small-button");
      auctionsWonButtons.forEach((button) => {
        button.addEventListener("click", (event) => {
          const username = button.dataset.username;
          fetchAndDisplayAuctions(username);
        });
      });
    } catch (err) {
      console.error("Error fetching user list:", err);
    }
  }

  // Mostra le aste vinte da un utente
  async function fetchAndDisplayAuctions(username) {
    try {
      const response = await fetch(`/api/auctions`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch auctions");
      }

      const auctions = await response.json();
      auctionsGrid.innerHTML = ""; // Pulisce la griglia precedente

      const userAuctions = auctions.filter((auction) => auction.winner === username);

      if (userAuctions.length === 0) {
        auctionsGrid.innerHTML = `<p>No Auctions Won</p>`;
      } else {
        userAuctions.forEach((auction) => {
          const auctionCard = document.createElement("div");
          auctionCard.classList.add("auction-card");
          auctionCard.innerHTML = `
            <h3>${auction.title || "N/A"}</h3>
            <p><strong>Paid:</strong> $${auction.currentBid || "N/A"}</p>
            <p><strong>Date:</strong> ${auction.expirationDate || "N/A"}</p>
          `;
          auctionCard.addEventListener("click", () => {
            fetchAndDisplayAuctionDetails( auction._id || auction._id?.$oid);
          });
          auctionsGrid.appendChild(auctionCard);
        });
      }

      auctionsModal.classList.add("visible");
    } catch (err) {
      console.error("Error fetching auctions won:", err);
    }
  }

  // Mostra i dettagli di un'asta
  async function fetchAndDisplayAuctionDetails(auctionId) {
    try {
      const response = await fetch(`/api/auctions/${auctionId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch auction details");
      }

      const auctionDetails = await response.json();
      auctionDetailsContent.innerHTML = `
        <h3>${auctionDetails.title || "N/A"}</h3>
        <p><strong>Auction ID:</strong> ${auctionId || "N/A"}</p>
        <p><strong>Description:</strong> ${auctionDetails.description || "N/A"}</p>
        <p><strong>Starting Price:</strong> $${auctionDetails.currentBid || "N/A"}</p>
        <p><strong>Expiration Date:</strong> ${auctionDetails.expirationDate || "N/A"}</p>
        <p><strong>Winner:</strong> ${auctionDetails.winner || "N/A"}</p>
      `;

      auctionDetailsModal.classList.add("visible");
    } catch (err) {
      console.error("Error fetching auction details:", err);
    }
  }


  // Mostra le aste create dall'utente autenticato
  async function fetchAndDisplayCreatedAuctions(username) {
    try {
      const response = await fetch(`/api/auctions`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch created auctions");
      }

      const auctions = await response.json();
      const userAuctions = auctions.filter((auction) => auction.createdBy === username);

      const tableBody = document.querySelector("#created-auctions-table tbody");
      tableBody.innerHTML = ""; // Pulisce la tabella precedente

      if (userAuctions.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4">No auctions created</td></tr>`;
      } else {
        userAuctions.forEach((auction) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${auction.title || "N/A"}</td>
            <td>$${auction.startingPrice || "N/A"}</td>
            <td>${auction.expirationDate || "N/A"}</td>
            <td>
              <button class="action-button view-button" data-id="${auction._id || auction._id?.$oid}">
                View
              </button>
              <button class="action-button delete-button" data-id="${auction._id || auction._id?.$oid}">
                Delete
              </button>
            </td>
          `;
          tableBody.appendChild(row);
        });
      }

      // Aggiungi event listener ai pulsanti "View"
      const viewButtons = document.querySelectorAll(".view-button");
      viewButtons.forEach((button) => {
        button.addEventListener("click", (event) => {
          const auctionId = button.getAttribute("data-id");
          fetchAndDisplayAuctionDetails(auctionId);
        });
      });

      // Aggiungi event listener ai pulsanti "Delete"
      const deleteButtons = document.querySelectorAll(".delete-button");
      deleteButtons.forEach((button) => {
        button.addEventListener("click", (event) => {
          const auctionId = button.getAttribute("data-id");
          const confirmDelete = confirm("Are you sure you want to delete this auction?");
          if (confirmDelete) {
            deleteAuction(auctionId);
          }
        });
      });
    } catch (err) {
      console.error("Error fetching created auctions:", err);
      const tableBody = document.querySelector("#created-auctions-table tbody");
      tableBody.innerHTML = `<tr><td colspan="4">Failed to load auctions</td></tr>`;
    }
  }

  // Elimina un'asta
  async function deleteAuction(auctionId) {
    try {
      const response = await fetch(`/api/auctions/${auctionId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete auction: ${response.status}`);
      }

      fetchAndDisplayCreatedAuctions(userUsername.textContent); // Ricarica la tabella dopo l'eliminazione
    } catch (err) {
      console.error("Error deleting auction:", err);
    }
  }

  // Funzione per inviare i dati e creare un'asta
async function createAuction(event) {
  event.preventDefault();

  const title = document.getElementById("auction-title").value.trim();
  const description = document.getElementById("auction-description").value.trim();
  const expirationDate = document.getElementById("auction-expiration").value;
  const startingPrice = document.getElementById("auction-price").value;

  // Validazione dei campi lato client
  if (!title || !description || !expirationDate || !startingPrice || parseFloat(startingPrice) <= 0) {
    alert("Please fill in all fields correctly.");
    return;
  }

  try {
    const response = await fetch("/api/auctions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        title,
        description,
        expirationDate,
        startingPrice: parseFloat(startingPrice),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create auction");
    }

    const result = await response.json();
    alert(result.success || "Auction created successfully!");

    // Resetta il form e aggiorna la lista delle aste create
    document.getElementById("create-auction-form").reset();
    fetchAndDisplayCreatedAuctions(userUsername.textContent);
  } catch (err) {
    console.error("Error creating auction:", err);
    alert("Failed to create auction. Please try again.");
  }
}

// Aggiungi un event listener al form
document.getElementById("create-auction-form").addEventListener("submit", createAuction);

  // Apre il modal per mostrare gli utenti
  showUsersButton.addEventListener("click", () => {
    fetchAndDisplayUsers();
    usersModal.classList.add("visible");
  });

  // Chiude il modal degli utenti
  closeUsersModal.addEventListener("click", () => {
    usersModal.classList.remove("visible");
    userList.innerHTML = ""; // Pulisce la lista degli utenti
    searchUsersInput.value = ""; // Resetta il campo di ricerca
  });

  // Chiude il modal delle aste
  closeAuctionsModal.addEventListener("click", () => {
    auctionsModal.classList.remove("visible");
    auctionsGrid.innerHTML = ""; // Pulisce la griglia delle aste
  });

  // Chiude il modal dei dettagli dell'asta
  closeAuctionDetailsModal.addEventListener("click", () => {
    auctionDetailsModal.classList.remove("visible");
    auctionDetailsContent.innerHTML = ""; // Pulisce i dettagli dell'asta
  });

  // Filtro degli utenti
  searchUsersInput.addEventListener("input", (event) => {
    const query = event.target.value.trim();
    fetchAndDisplayUsers(query);
  });

  // Recupera le informazioni dell'utente all'avvio
  fetchUserInfo();
});