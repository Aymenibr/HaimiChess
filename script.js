const usernameInput = document.getElementById('username-input');
const status = document.getElementById('status');
const gameList = document.getElementById('game-list');
const loading = document.getElementById('loading');

// Load saved username
if (localStorage.getItem('chessUsername')) {
  usernameInput.value = localStorage.getItem('chessUsername');
}

document.getElementById('fetch-button').addEventListener('click', async () => {
  const username = usernameInput.value.trim().toLowerCase();
  if (!username) {
    showStatus("Please enter a username.", "error");
    return;
  }

  localStorage.setItem('chessUsername', username);
  showStatus("Fetching last games...", "info");
  gameList.innerHTML = "";

  try {
    // Get archives
    const archivesRes = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`);
    const archivesData = await archivesRes.json();
    const latestArchive = archivesData.archives.pop();

    // Get last 10 games
    const gamesRes = await fetch(latestArchive);
    const gamesData = await gamesRes.json();
    const games = gamesData.games.slice(-10).reverse();

    if (games.length === 0) {
      showStatus("No games found for this user.", "error");
      return;
    }

    // Auto-submit latest game
    await submitGame(games[0].url);
    showStatus("✅ Latest game submitted successfully", "success");

    // Display game list
    gameList.innerHTML = "<h3>Last 10 Games:</h3>";
    games.forEach(game => renderGameButton(game, username));

  } catch (err) {
    console.error("Fetch error:", err);
    showStatus("❌ Failed to fetch or submit.", "error");
  }
});

function showStatus(message, type) {
  status.textContent = message;
  status.className = "status " + (type || "");
}

function renderGameButton(game, username) {
  const youAreWhite = game.white.username.toLowerCase() === username;
  const player = youAreWhite ? game.white : game.black;
  const opponent = youAreWhite ? game.black : game.white;
  const result = player.result;
  const time = new Date(game.end_time * 1000).toLocaleString();

  let styleClass = "game-draw";
  let emoji = "🤝";
  let resultLabel = "draw";
  if (result === "win") {
    styleClass = "game-win";
    emoji = "✅";
    resultLabel = "win";
  } else if (["resigned", "timeout", "checkmated", "lose"].includes(result)) {
    styleClass = "game-loss";
    emoji = "❌";
    resultLabel = "loss";
  }

  const btn = document.createElement("button");
  btn.className = styleClass;
  btn.innerHTML = `
    <div class="left">
      <div>${emoji} ${resultLabel.toUpperCase()} vs <strong>${opponent.username}</strong></div>
      <div class="game-meta">${player.rating} vs ${opponent.rating} | ${time}</div>
    </div>
  `;

  btn.onclick = () => {
    submitGame(game.url, btn)
      .then(() => showStatus(`✅ Submitted: ${game.url}`, "success"))
      .catch(() => showStatus("❌ Submission failed.", "error"));
  };

  gameList.appendChild(btn);
}

async function submitGame(gameUrl, button = null) {
  loading.style.display = "block";
  if (button) button.disabled = true;

  try {
    const response = await fetch("https://analysis-chess.io.vn/wp-admin/admin-ajax.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest"
      },
      body: `action=send_message&message=${encodeURIComponent(gameUrl)}`
    });

    if (!response.ok) throw new Error("Submit failed");
    return await response.text();
  } finally {
    loading.style.display = "none";
    if (button) button.disabled = false;
  }
}
