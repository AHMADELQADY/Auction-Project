document.addEventListener("DOMContentLoaded", () => {
  const auctionGrid = document.getElementById("auctionGrid");
  const searchInput = document.getElementById("searchInput");
  const errorMessage = document.getElementById("errorMessage");
  const bidModal = document.getElementById("bidModal");
  const modalDetails = document.getElementById("modalDetails");
  const modalTitle = document.getElementById("modalTitle");
  const bidForm = document.getElementById("bidForm");
  const bidAmount = document.getElementById("bidAmount");
  const modalErrorMessage = document.getElementById("modalErrorMessage");
  const closeButton = document.getElementById("closeBidModal");

  const auctionDetailsModal = document.getElementById("auctionDetailsModal");
  const closeDetailsModal = document.getElementById("closeDetailsModal");
  const auctionDetails = document.getElementById("auctionDetails");
  const detailsModalTitle = document.getElementById("detailsModalTitle");
  const bidsHistoryContainer = document.getElementById("bidsHistoryDetails");
  const bidsHistoryModal = document.getElementById("bidsHistoryModal");
  const closeBidsHistoryModal = document.getElementById("closeBidsHistoryModal");
  const bidDetailsModal = document.getElementById("bidDetailsModal");
  const closeBidDetailsModal = document.getElementById("closeBidDetailsModal");
  const bidDetailsContent = document.getElementById("bidDetailsContent");

  let currentAuctionId = null;

  // Fetch auctions from the server
  async function fetchAuctions(query = "") {
    try {
      const url = query ? `/api/auctions?q=${encodeURIComponent(query)}` : "/api/auctions";

      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch auctions");
      }

      const auctions = await response.json();
      renderAuctions(auctions);
    } catch (err) {
      console.error("Error in fetchAuctions:", err);
      auctionGrid.innerHTML = `<p>Error loading auctions. Please try again later.</p>`;
    }
  }

  // Render auctions in a grid
  function renderAuctions(auctions) {
    auctionGrid.innerHTML = "";

    auctions.forEach((auction) => {
      const isExpired = new Date(auction.expirationDate) <= new Date();
      const auctionDiv = document.createElement("div");
      auctionDiv.className = "auction-item";
      auctionDiv.setAttribute("data-id", auction._id);

      auctionDiv.innerHTML = `
        <h3>${auction.title}</h3>
        <p>${auction.description}</p>
        <p><strong>Expiration:</strong> ${new Date(auction.expirationDate).toLocaleString()}</p>
        <p><strong>Starting Price:</strong> $${auction.startingPrice}</p>
        <p><strong>Current Bid:</strong> $${auction.currentBid || auction.startingPrice}</p>
        ${
          isExpired
            ? `<p class="expired">Auction Expired</p>`
            : `<button class="bid-button" data-id="${auction._id}" data-title="${auction.title}" data-current="${auction.currentBid || auction.startingPrice}">Bid</button>`
        }
      `;

      auctionGrid.appendChild(auctionDiv);
    });

    attachCellListeners();
    attachBidListeners();
  }

  // Add event listeners to auction cells
  function attachCellListeners() {
    const auctionCells = document.querySelectorAll(".auction-item");
    auctionCells.forEach((cell) => {
      cell.removeEventListener("click", handleCellClick); // Remove previous listeners
      cell.addEventListener("click", handleCellClick);
    });
  }

  // Handle auction cell click
  async function handleCellClick(e) {
    if (e.target.classList.contains("bid-button")) return; // Ignore clicks on Bid button
    const auctionId = this.getAttribute("data-id");
    currentAuctionId = auctionId; // Set currentAuctionId
    await fetchAuctionDetails(auctionId);
  }

  // Fetch auction details
  async function fetchAuctionDetails(auctionId) {
    try {
      const response = await fetch(`/api/auctions/${auctionId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Include credentials for authentication
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error("You must be logged in to view auction details.");
      }

      if (!response.ok) {
        throw new Error("Failed to fetch auction details");
      }

      const auction = await response.json();
      console.log(auction);
      renderAuctionDetails(auction);
    } catch (err) {
      console.error(err);
      auctionDetails.innerHTML = `<p>${err.message}</p>`;
      auctionDetailsModal.classList.remove("hidden");
    }
  }

  // Show auction details in modal
  function renderAuctionDetails(auction) {
    currentAuctionId = auction._id || auction._id?.$oid; // Ensure the ID is set correctly
    detailsModalTitle.innerText = `Details for "${auction.title}"`;
  
    // Parsing della data di scadenza
    const expirationDate = new Date(auction.expirationDate);
  
    // Confronto per verificare se l'asta è scaduta
    const isExpired = expirationDate.getTime() <= Date.now();
  
    // Log per debug
    console.log("Auction ID:", auction._id);
    console.log("Expiration Date:", auction.expirationDate);
    console.log("Parsed Expiration Date:", expirationDate.toISOString());
    console.log("Current Date (UTC):", new Date().toISOString());
    console.log("Is Expired:", isExpired);
    console.log("Winner:", auction.winner);
    console.log("HighestBidder:", auction.highestBidder);

    // Calcolo del messaggio del vincitore
    let winnerMessage;
    if (isExpired) {
      auction.winner = auction.highestBidder;
      if (!auction.winner || auction.winner === "Auction is not over") {
        winnerMessage = "No bids were placed"; // Nessuna offerta
      } else {
        winnerMessage = auction.winner; // Mostra il vincitore
      }
    } else {
      winnerMessage = "Auction is not over"; // Asta ancora attiva
    }


  
    auctionDetails.innerHTML = `
      <p><strong>Description:</strong> ${auction.description}</p>
      <p><strong>Expiration Date:</strong> ${expirationDate.toLocaleString()}</p>
      <p><strong>Starting Price:</strong> $${auction.startingPrice}</p>
      <p><strong>Current Bid:</strong> $${auction.currentBid || auction.startingPrice}</p>
      <p><strong>Winner:</strong> ${winnerMessage}</p>
      <p><strong>Highest Bidder:</strong> ${
        auction.highestBidder || "No Bidders Yet"
      }</p>
      <p><strong>Created By:</strong> ${auction.createdBy}</p>
      <p><strong>Created At:</strong> ${new Date(auction.createdAt).toLocaleString()}</p>
      <button id="bidsHistoryButton" class="bid-button">Bid History</button>
    `;
  
    auctionDetailsModal.classList.remove("hidden");
  
    const bidsHistoryButton = document.getElementById("bidsHistoryButton");
    bidsHistoryButton.addEventListener("click", () => {
      fetchBidsHistory(currentAuctionId);
      openBidsHistoryModal();
    });
  }

  // Fetch bids history
  async function fetchBidsHistory(auctionId) {
    console.log("Fetching bids history for auction ID:", auctionId);
    if (!auctionId) {
      console.error("Invalid auction ID:", auctionId);
      auctionDetails.innerHTML += `<p>Error: Invalid auction ID.</p>`;
      return;
    }

    try {
      const response = await fetch(`/api/auctions/${auctionId}/bids`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch bids history");
      }

      const bidsResponse = await response.json();
      console.log("Bids history response:", bidsResponse);

      const bids = Array.isArray(bidsResponse) ? bidsResponse : bidsResponse.bidHistory;
      if (!Array.isArray(bids)) {
        throw new Error("Bids history is not in the expected format");
      }

      renderBidsHistory(bids);
    } catch (err) {
      console.error("Error fetching bids history:", err);
      auctionDetails.innerHTML += `<p>Error loading bids history. Please try again later.</p>`;
    }
  }

  // Render bids history
  function renderBidsHistory(bids) {
    const bidsHistoryContent = document.getElementById("bidsHistoryContent");
    if (!bidsHistoryContent) {
      console.error("Bids history content container not found");
      return;
    }
  
    if (bids.length === 0) {
      bidsHistoryContent.innerHTML = `<p>No bids have been placed yet.</p>`;
    } else {
      bidsHistoryContent.innerHTML = `
        <div class="bids-history-grid">
          <div class="bids-header"><strong>User</strong></div>
          <div class="bids-header"><strong>Amount</strong></div>
          <div class="bids-header"><strong>Date</strong></div>
          <div class="bids-header"><strong>Action</strong></div>
          ${bids
            .map((bid) => {
              const bidId = bid._id?.$oid || bid._id; // Supporto per diversi formati di ID
              const createdAt = bid.createdAt?.$date || bid.createdAt; // Data nel formato MongoDB
              const formattedDate = createdAt ? new Date(createdAt).toLocaleString() : "Unknown Date";
              return `
                <div class="bid-item">${bid.username}</div>
                <div class="bid-item">$${bid.amount}</div>
                <div class="bid-item">${formattedDate}</div>
                <div class="bid-item"><button class="details-button" data-id="${bidId}">Details</button></div>
              `;
            })
            .join("")}
        </div>
      `;
      attachDetailsListeners();
    }
  }

  // Attach listeners for bid details
  function attachDetailsListeners() {
    const detailsButtons = document.querySelectorAll(".details-button");
    detailsButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        const bidId = button.dataset.id;
        console.log(button);
        console.log(bidId);
        await fetchBidDetails(bidId);
      });
    });
  }

  // Fetch bid details
  async function fetchBidDetails(bidId) {
    try {
      const response = await fetch(`/api/bids/${bidId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (response.status === 403) {
        bidDetailsContent.innerHTML = `<p>You need to be an Admin to see these details.</p>`;
      } else if (!response.ok) {
        throw new Error("Failed to fetch bid details");
      } else {
        const bidDetails = await response.json();
        console.log(bidDetails);
        renderBidDetails(bidDetails);
      }

      bidDetailsModal.classList.remove("hidden");
    } catch (err) {
      console.error("Error fetching bid details:", err);
      bidDetailsContent.innerHTML = `<p>An error occurred while fetching bid details. Please try again later.</p>`;
      bidDetailsModal.classList.remove("hidden");
    }
  }

  // Render bid details in modal
  function renderBidDetails(details) {
    // Controlla il formato della data di creazione
    const createdAt = details.createdAt?.$date || details.createdAt; 
    const formattedDate = createdAt ? new Date(createdAt).toLocaleString() : "Unknown Date";
  
    // Genera il contenuto del modal
    bidDetailsContent.innerHTML = `
      <p><strong>Name:</strong> ${details.name || "N/A"}</p>
      <p><strong>Surname:</strong> ${details.surname || "N/A"}</p>
      <p><strong>Username:</strong> ${details.username}</p>
      <p><strong>Amount:</strong> $${details.amount}</p>
      <p><strong>Placed On:</strong> ${formattedDate}</p>
    `;
  }

  // Close the bid details modal
  closeBidDetailsModal.addEventListener("click", () => {
    bidDetailsModal.classList.add("hidden");
    bidDetailsContent.innerHTML = ""; // Clear content
  });

  // Open the bids history modal
  function openBidsHistoryModal() {
    bidsHistoryModal.classList.remove("hidden");
  }

  // Close the bids history modal
  closeBidsHistoryModal.addEventListener("click", () => {
    bidsHistoryModal.classList.add("hidden");
  });

  // Close the details modal
  closeDetailsModal.addEventListener("click", () => {
    auctionDetailsModal.classList.add("hidden");
  });

  // Attach bid listeners
  function attachBidListeners() {
    const bidButtons = document.querySelectorAll(".bid-button");
    bidButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        currentAuctionId = button.dataset.id;
        modalTitle.innerText = `Place Your Bid on "${button.dataset.title}"`;
        modalDetails.innerHTML = `
          <p><strong>Current Bid:</strong> $${button.dataset.current}</p>
        `;
        bidModal.classList.remove("hidden");
        modalErrorMessage.innerText = ""; // Clear previous error messages
      });
    });
  }

  // Handle bid submission
  // Handle bid submission
  bidForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const bidValue = parseFloat(bidAmount.value);

  try {
    // **1️⃣ Recupera i dettagli dell'asta prima di inviare l'offerta**
    const auctionResponse = await fetch(`/api/auctions/${currentAuctionId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!auctionResponse.ok) {
      throw new Error("Failed to fetch auction details.");
    }

    const auction = await auctionResponse.json();

    // **2️⃣ Verifica se l'asta è scaduta**
    const now = new Date();
    const expirationDate = new Date(auction.expirationDate);

    console.log("Auction Expiration Date (UTC):", expirationDate.toISOString());
    console.log("Current Time (UTC):", now.toISOString());

    if (expirationDate.getTime() <= now.getTime()) {
      modalErrorMessage.style.color = "red";
      modalErrorMessage.innerText = "This auction has already expired.";
      return; // **Esci subito per evitare la richiesta al server**
    }

    // **3️⃣ Se l'asta è attiva, invia il bid**
    const response = await fetch(`/api/auctions/${currentAuctionId}/bids`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ amount: bidValue }),
    });

    const result = await response.json();

    // **4️⃣ Gestione della risposta**
    if (!response.ok) {
      modalErrorMessage.style.color = "red";
      modalErrorMessage.innerText = result.error || "Failed to place bid.";
    } else {
      modalErrorMessage.style.color = "green";
      modalErrorMessage.innerText = result.success || "Bid placed successfully!";
      setTimeout(() => {
        bidModal.classList.add("hidden");
        fetchAuctions(); // Refresh auctions
      }, 2000);
    }
  } catch (err) {
    console.error("Error placing bid:", err);
    modalErrorMessage.style.color = "red";
    modalErrorMessage.innerText = "An error occurred. Please try again.";
  }
});

  // Close the bid modal
  closeButton.addEventListener("click", () => {
    bidModal.classList.add("hidden");
    modalErrorMessage.innerText = "";
    bidAmount.value = ""; // Reset input field
  });

  // Dynamic search
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    fetchAuctions(query);
  });

  // Fetch auctions initially
  fetchAuctions();
});