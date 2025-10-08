document.addEventListener('DOMContentLoaded', () => {
    const addPlayerBtn = document.getElementById('add-player-btn');
    const playerModal = document.getElementById('player-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const playerForm = document.getElementById('player-form');
    const playerContainer = document.getElementById('player-container');
    const token = localStorage.getItem('token');

    async function fetchPlayers() {
        try {
            const response = await fetch('http://localhost:3000/api/players', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const players = await response.json();
            playerContainer.innerHTML = '<button id="add-player-btn" class="add-btn">+</button>'; // Clear before adding
            players.forEach(player => {
                const playerCard = document.createElement('div');
                playerCard.className = 'player-card';
                playerCard.innerHTML = `
                    <img src="${player.image}" alt="${player.name}">
                    <h3>${player.name}</h3>
                    <p>Level ${player.level}</p>
                `;
                playerContainer.appendChild(playerCard);
            });
            // Re-add event listener for the add button
            document.getElementById('add-player-btn').addEventListener('click', () => playerModal.classList.remove('hidden'));
        } catch (error) {
            console.error('Error fetching players:', error);
        }
    }

    async function createPlayer(event) {
        event.preventDefault();
        const playerData = {
            name: document.getElementById('player-name').value,
            level: document.getElementById('player-level').value,
            image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // Placeholder
            stats: { str: 5, agi: 5, dex: 5, def: 5, con: 5, int: 5 }, // Default stats
            skills: [],
            description: 'New character',
            equipment: [],
            equipmentInventory: [],
            inventory: []
        };

        try {
            const response = await fetch('http://localhost:3000/api/players', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(playerData)
            });

            if (response.ok) {
                playerModal.classList.add('hidden');
                fetchPlayers(); // Refresh the player list
            } else {
                const error = await response.json();
                alert(`Failed to create player: ${error.message}`);
            }
        } catch (error) {
            console.error('Error creating player:', error);
        }
    }

    addPlayerBtn.addEventListener('click', () => playerModal.classList.remove('hidden'));
    closeModalBtn.addEventListener('click', () => playerModal.classList.add('hidden'));
    playerForm.addEventListener('submit', createPlayer);

    if (token) {
        fetchPlayers();
    } else {
        window.location.href = 'login.html'; // Redirect if not logged in
    }
});