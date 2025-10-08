document.addEventListener('DOMContentLoaded', () => {
    const addMonsterBtn = document.getElementById('add-monster-btn');
    const monsterModal = document.getElementById('monster-create-modal');
    const closeModalBtn = document.getElementById('close-create-modal-btn');
    const monsterForm = document.getElementById('create-monster-form');
    const monsterContainer = document.getElementById('monster-container');
    const token = localStorage.getItem('token');

    async function fetchMonsters() {
        try {
            const response = await fetch('http://localhost:3000/api/monsters', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const monsters = await response.json();
            monsterContainer.innerHTML = '<button id="add-monster-btn" class="add-btn">+</button>'; // Clear before adding
            monsters.forEach(monster => {
                const monsterCard = document.createElement('div');
                monsterCard.className = 'monster-card';
                monsterCard.innerHTML = `
                    <img src="${monster.image}" alt="${monster.name}">
                    <h3>${monster.name}</h3>
                `;
                monsterContainer.appendChild(monsterCard);
            });
            // Re-add event listener for the add button
            document.getElementById('add-monster-btn').addEventListener('click', () => monsterModal.classList.remove('hidden'));
        } catch (error) {
            console.error('Error fetching monsters:', error);
        }
    }

    async function createMonster(event) {
        event.preventDefault();
        const monsterData = {
            name: document.getElementById('monster-name').value,
            image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // Placeholder
            stats: { hp: 100, mana: 50, str: 10, agi: 10, dex: 10, def: 10, con: 10, int: 10 },
            skills: []
        };

        try {
            const response = await fetch('http://localhost:3000/api/monsters', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(monsterData)
            });

            if (response.ok) {
                monsterModal.classList.add('hidden');
                fetchMonsters(); // Refresh the monster list
            } else {
                const error = await response.json();
                alert(`Failed to create monster: ${error.message}`);
            }
        } catch (error) {
            console.error('Error creating monster:', error);
        }
    }

    addMonsterBtn.addEventListener('click', () => monsterModal.classList.remove('hidden'));
    closeModalBtn.addEventListener('click', () => monsterModal.classList.add('hidden'));
    monsterForm.addEventListener('submit', createMonster);

    if (token) {
        fetchMonsters();
    } else {
        window.location.href = 'login.html';
    }
});