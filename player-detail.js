document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const playerId = parseInt(urlParams.get('id'));
    let currentPlayer;
    let allSkills = [];

    // --- API Calls ---
    async function fetchData(url) {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    async function sendData(url, method, data) {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    // Load initial data
    try {
        [currentPlayer, allSkills] = await Promise.all([
            fetchData(`http://localhost:3000/api/players/${playerId}`),
            fetchData('http://localhost:3000/api/skills')
        ]);
    } catch (error) {
        console.error('Failed to load initial data:', error);
        document.body.innerHTML = '<h1>Error loading character data. Please try again later.</h1>';
        return;
    }
    const nameHeader = document.getElementById('player-name-header');
    const description = document.getElementById('player-description');
    const levelInput = document.getElementById('player-level');
    const statsContainer = document.getElementById('stats-container');
    const imagePreview = document.getElementById('player-image-preview');
    const imageUploadInput = document.getElementById('image-upload');
    const skillTreeContainer = document.getElementById('skill-tree-container');
    const goldInput = document.getElementById('player-gold');
    const inventoryList = document.getElementById('inventory-list');
    const newItemInput = document.getElementById('new-item-input');
    const addItemBtn = document.getElementById('add-item-btn');
    const equipInventoryList = document.getElementById('equipment-inventory-list');
    const createEquipBtn = document.getElementById('create-equip-btn');
    const equipModal = document.getElementById('create-equip-modal');
    const closeEquipModal = document.getElementById('close-equip-modal');
    const equipForm = document.getElementById('create-equip-form');
    const addStatBtn = document.getElementById('add-stat-btn');
    const equipStatsContainer = document.getElementById('equip-stats-container');
    const saveBtn = document.getElementById('save-changes-btn');
    const learnSkillBtn = document.getElementById('learn-skill-btn');
    const skillModal = document.getElementById('skill-modal');
    const closeSkillModal = document.getElementById('close-skill-modal');
    const skillModalTitle = document.getElementById('skill-modal-title');
    const skillModalBody = document.getElementById('skill-modal-body');
    const confirmLearnSkillBtn = document.getElementById('confirm-learn-skill-btn');
    let newImageBase64 = null;

    // --- KONTROL AKSES BERDASARKAN ROLE ---
    function isAdmin() {
        const role = localStorage.getItem('role');
        return role === 'admin';
    }
    if (!isAdmin()) {
        // Sembunyikan semua tombol aksi
        document.querySelectorAll('#save-changes-btn, #create-equip-btn, #learn-skill-btn, #add-item-btn, .upload-btn').forEach(btn => btn.style.display = 'none');
        // Nonaktifkan semua input
        document.querySelectorAll('input, textarea, select').forEach(input => input.disabled = true);
    }
    // Kita akan menonaktifkan tombol +/- stat secara dinamis di `renderStats`
    // dan tombol hapus/unequip di event listener mereka.


    // --- Fungsi Render Tampilan ---
    function calculateStatBonuses() {
        const bonuses = { str: 0, agi: 0, dex: 0, def: 0, con: 0, int: 0 };
        for (const slot in currentPlayer.equipment) {
            const item = currentPlayer.equipment[slot];
            if (item && item.stats) {
                item.stats.forEach(statBonus => {
                    if (bonuses[statBonus.stat] !== undefined) {
                        bonuses[statBonus.stat] += statBonus.value;
                    }
                });
            }
        }
        return bonuses;
    }

    function renderStats() {
        const bonuses = calculateStatBonuses();
        statsContainer.innerHTML = '';
        for (const stat in currentPlayer.stats) {
            const baseValue = currentPlayer.stats[stat];
            const bonusValue = bonuses[stat];
            const statDiv = document.createElement('div');
            statDiv.className = 'stat-item';
            statDiv.innerHTML = `
                <label>${stat.toUpperCase()}:</label>
                <div class="stat-value-editor">` +
                (isAdmin() ? `
                    <button class="stat-change-btn" data-stat="${stat}" data-amount="-1">-</button>
                    <span>${baseValue}</span>
                    <button class="stat-change-btn" data-stat="${stat}" data-amount="1">+</button>` : `<span>${baseValue}</span>`) +
                `${bonusValue > 0 ? `<span class="stat-bonus">(+${bonusValue})</span>` : ''}</div>`;
            statsContainer.appendChild(statDiv);
        }
    }
    
    function renderEquippedItems() {
        document.querySelectorAll('.equipment-slot').forEach(slot => {
            const slotName = slot.dataset.slot;
            const equippedItem = currentPlayer.equipment[slotName];
            slot.className = 'equipment-slot';
            if (equippedItem) {
                let statsHtml = equippedItem.stats.map(s => `${s.stat.toUpperCase()} +${s.value}`).join(', '); 
                const unequipButton = isAdmin() ? `<button class="unequip-btn" data-slot="${slotName}">&times;</button>` : '';
                slot.innerHTML = `${unequipButton}<div class="item-name">${equippedItem.name}</div><div class="item-stats">${statsHtml}</div>`;
                if (equippedItem.rarity) {
                    slot.classList.add(`slot-${equippedItem.rarity}`);
                }
            } else {
                slot.innerHTML = `<span>${slotName.charAt(0).toUpperCase() + slotName.slice(1)}</span>`;
            }
        });
    }

    function renderEquipmentInventory() {
        equipInventoryList.innerHTML = '';
        if (currentPlayer.equipmentInventory.length === 0) {
             equipInventoryList.innerHTML = '<li style="cursor: default; text-align: center; color: #888; justify-content: center;">Empty</li>';
        } else {
            currentPlayer.equipmentInventory.forEach(item => {
                const li = document.createElement('li');
                let statsHtml = item.stats.map(s => `${s.stat.toUpperCase()} +${s.value}`).join(', ');
                
                // --- PERUBAHAN DI SINI: Menambahkan tombol hapus ---
                li.innerHTML = `
                    <div class="equip-item-info" data-item-id="${item.id}">
                        <div class="equip-item-name">
                            ${item.name}
                            <span class="rarity-tag rarity-${item.rarity || 'common'}">${(item.rarity || 'common')}</span>
                        </div>
                        <div class="equip-item-details">${statsHtml}</div>
                    </div>
                    ${isAdmin() ? `<button class="remove-equip-btn" data-item-id="${item.id}">&times;</button>` : ''}
                `; // --- PERUBAHAN DI SINI: Tombol hapus hanya untuk admin ---
                equipInventoryList.appendChild(li);
            });
        }
    }
    
    function renderItemInventory() { /* ... (Fungsi ini tetap sama) ... */ }
    function renderSkillTree() { /* ... (Fungsi ini tetap sama) ... */ }

    function loadCharacterDetails() {
        nameHeader.textContent = currentPlayer.name;
        description.value = currentPlayer.description;
        levelInput.value = currentPlayer.level;
        imagePreview.src = currentPlayer.image;
        goldInput.value = currentPlayer.inventory.gold;
        renderStats();
        renderEquippedItems();
        renderEquipmentInventory();
        renderItemInventory();
        renderSkillTree();
    }

    // --- Logika Interaksi ---
    function equipItem(itemToEquip) {
        if (currentPlayer.equipment[itemToEquip.type]) {
            alert(`Slot ${itemToEquip.type} sudah terisi.`);
            return;
        }
        currentPlayer.equipment[itemToEquip.type] = itemToEquip;
        currentPlayer.equipmentInventory = currentPlayer.equipmentInventory.filter(item => item.id !== itemToEquip.id);
        loadCharacterDetails();
    }

    // --- EVENT LISTENER BARU: Menggunakan event delegation untuk equip dan hapus ---
    equipInventoryList.addEventListener('click', (e) => {
        const infoDiv = e.target.closest('.equip-item-info');
        const removeBtn = e.target.closest('.remove-equip-btn');

        if (isAdmin() && removeBtn) { // Jika tombol hapus yang diklik (dan user adalah admin)
            const itemId = parseInt(removeBtn.dataset.itemId);
            const isConfirmed = confirm("Are you sure you want to delete this equipment permanently?");
            if (isConfirmed) {
                currentPlayer.equipmentInventory = currentPlayer.equipmentInventory.filter(item => item.id !== itemId); 
                renderEquipmentInventory();
            }
        } else if (infoDiv) { // Jika area info item yang diklik
            const itemId = parseInt(infoDiv.dataset.itemId);
            const itemToEquip = currentPlayer.equipmentInventory.find(item => item.id === itemId);
            if (itemToEquip) {
                equipItem(itemToEquip);
            }
        }
    });

    document.querySelector('.equipment-panel').addEventListener('click', (e) => {
        if (isAdmin() && e.target.classList.contains('unequip-btn')) {
            const slotName = e.target.dataset.slot;
            const itemToUnequip = currentPlayer.equipment[slotName];
            if (itemToUnequip) {
                currentPlayer.equipmentInventory.push(itemToUnequip);
                currentPlayer.equipment[slotName] = null;
                loadCharacterDetails();
            }
        }
    });
    
    statsContainer.addEventListener('click', (e) => {
        if (isAdmin() && e.target.classList.contains('stat-change-btn')) {
            const statName = e.target.dataset.stat;
            const amount = parseInt(e.target.dataset.amount);
            currentPlayer.stats[statName] += amount;
            renderStats();
        }
    });

    // --- Logika Modal & Form (tetap sama) ---
    function addStatInput() { /* ... (Fungsi ini tetap sama) ... */ }
    createEquipBtn.addEventListener('click', () => { /* ... */ });
    closeEquipModal.addEventListener('click', () => { /* ... */ });
    addStatBtn.addEventListener('click', addStatInput);
    equipForm.addEventListener('submit', (e) => { /* ... */ });
    function showSkillDetails(skillId, isLearning) { /* ... */ }
    learnSkillBtn.addEventListener('click', () => { /* ... */ });
    confirmLearnSkillBtn.addEventListener('click', () => { /* ... */ });
    closeSkillModal.addEventListener('click', () => { /* ... */ });
    imageUploadInput.addEventListener('change', (event) => { /* ... */ });
    addItemBtn.addEventListener('click', () => { /* ... */ });

    // --- Tombol Simpan ---
    saveBtn.addEventListener('click', async () => {
        try {
            if (newImageBase64) {
                currentPlayer.image = newImageBase64;
            }
            currentPlayer.description = description.value;
            currentPlayer.level = parseInt(levelInput.value);
            if (currentPlayer.inventory) {
                currentPlayer.inventory.gold = parseInt(goldInput.value);
            } else {
                currentPlayer.inventory = { gold: parseInt(goldInput.value), items: [] };
            }

            const updatedPlayer = await sendData(`http://localhost:3000/api/players/${playerId}`, 'PUT', currentPlayer);
            
            alert('Character details saved successfully!');
            newImageBase64 = null; 
            // Optionally, re-render with the data returned from the server
            loadCharacterDetails();
        } catch (error) {
            console.error('Failed to save character:', error);
            alert(`Error saving character: ${error.message}`);
        }
    });

    // --- Panggil Fungsi Muat Awal ---
    loadCharacterDetails();

    // --- KODE LENGKAP FUNGSI LAIN AGAR TIDAK ADA YANG TERLEWAT ---
    function renderItemInventory() {
        inventoryList.innerHTML = '';
        if (!currentPlayer.inventory.items || currentPlayer.inventory.items.length === 0) {
            inventoryList.innerHTML = '<li style="color: #888; justify-content: center;">Empty</li>';
        } else {
            currentPlayer.inventory.items.forEach((item, index) => {
                const li = document.createElement('li');
                li.textContent = item;
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-item-btn';
                removeBtn.innerHTML = '&times;';
                removeBtn.onclick = () => { currentPlayer.inventory.items.splice(index, 1); renderItemInventory(); };
                li.appendChild(removeBtn);
                inventoryList.appendChild(li);
            });
        }
    }
    
    function renderSkillTree() {
        skillTreeContainer.innerHTML = '';
        currentPlayer.skills.forEach(skillInfo => {
            const node = document.createElement('div');
            node.className = 'skill-node';
            node.textContent = skillInfo.name;
            node.dataset.skillId = skillInfo.id;
            node.addEventListener('click', () => showSkillDetails(skillInfo.id, false));
            skillTreeContainer.appendChild(node);
        });
    }

    function addStatInput() {
        const div = document.createElement('div');
        div.className = 'stat-input-group';
        div.innerHTML = `<select class="stat-type"><option value="str">STR</option><option value="agi">AGI</option><option value="dex">DEX</option><option value="def">DEF</option><option value="con">CON</option><option value="int">INT</option></select><input type="number" class="stat-value" placeholder="Value" required>`;
        equipStatsContainer.appendChild(div);
    }
    createEquipBtn.addEventListener('click', () => { equipStatsContainer.innerHTML = ''; addStatInput(); equipModal.classList.remove('hidden'); });
    closeEquipModal.addEventListener('click', () => equipModal.classList.add('hidden'));

    equipForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const stats = [];
        equipStatsContainer.querySelectorAll('.stat-input-group').forEach(group => {
            stats.push({ stat: group.querySelector('.stat-type').value, value: parseInt(group.querySelector('.stat-value').value) });
        });
        const newEquipment = { 
            id: Date.now(), 
            name: document.getElementById('equip-name').value, 
            type: document.getElementById('equip-type').value, 
            rarity: document.getElementById('equip-rarity').value,
            stats: stats, 
            passive: document.getElementById('equip-passive').value 
        };
        currentPlayer.equipmentInventory.push(newEquipment);
        renderEquipmentInventory();
        equipModal.classList.add('hidden');
        equipForm.reset();
    });

    function showSkillDetails(skillId, isLearning) { 
        const skill = allSkills.find(s => s.id === skillId);
        if(!skill) return;
        skillModalTitle.textContent = skill.name;
        let effectHtml = ''; // Bangun detail efek skill di sini
        switch (skill.type) {
            case 'damage': effectHtml = `Damage: ${skill.effect.base} + ${skill.effect.percent}% ${skill.effect.stat?.toUpperCase() || ''}`; break;
            case 'buff':
                effectHtml = `Target: ${skill.effect.target}. Efek: `;
                if(skill.effect.type === 'stat_increase') effectHtml += `+${skill.effect.percent}% ${skill.effect.stat?.toUpperCase() || ''}`;
                else if(skill.effect.type === 'hp_recovery') effectHtml += `Pulihkan ${skill.effect.percent}% HP`;
                else if(skill.effect.type === 'debuff_removal') effectHtml += `Hilangkan Debuff`;
                break;
            case 'debuff':
                effectHtml = `Efek: `;
                if(skill.effect.type === 'stat_reduction') effectHtml += `-${skill.effect.percent}% ${skill.effect.stat?.toUpperCase() || ''}`;
                else if(skill.effect.type === 'dot') effectHtml += `-${skill.effect.percent}% HP/detik`;
                break;
        }
        skillModalBody.innerHTML = `<p><strong>${(skill.category || '').toUpperCase()}</strong></p><p><em>${effectHtml}</em></p><p>${skill.desc || 'No description.'}</p>`;
        confirmLearnSkillBtn.classList.add('hidden');
        skillModal.classList.remove('hidden');
    }
    
    learnSkillBtn.addEventListener('click', () => {
        skillModalTitle.textContent = "Learn New Skill";
        const playerSkillIds = new Set(currentPlayer.skills.map(s => s.id));
        const learnableSkills = allSkills.filter(s => s.for === 'player' && !playerSkillIds.has(s.id));
        skillModalBody.innerHTML = '';
        if (learnableSkills.length > 0) {
            learnableSkills.forEach(skill => {
                skillModalBody.innerHTML += `<label><input type="checkbox" value="${skill.id}" data-name="${skill.name}"> ${skill.name}</label>`;
            });
            confirmLearnSkillBtn.classList.remove('hidden');
        } else {
            skillModalBody.innerHTML = '<p style="text-align: center; color: #888;">All skills learned.</p>';
            confirmLearnSkillBtn.classList.add('hidden');
        }
        skillModal.classList.remove('hidden');
    });

    confirmLearnSkillBtn.addEventListener('click', () => {
        skillModalBody.querySelectorAll('input:checked').forEach(checkbox => {
            currentPlayer.skills.push({ id: parseInt(checkbox.value), name: checkbox.dataset.name });
        });
        renderSkillTree();
        skillModal.classList.add('hidden');
    });

    closeSkillModal.addEventListener('click', () => skillModal.classList.add('hidden'));

    imageUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => { newImageBase64 = reader.result; imagePreview.src = newImageBase64; };
        reader.readAsDataURL(file);
    });

    addItemBtn.addEventListener('click', () => {
        const itemName = newItemInput.value.trim();
        if (itemName) {
            currentPlayer.inventory.items.push(itemName);
            renderItemInventory();
            newItemInput.value = '';
        }
    });
});