document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // --- Navigation Logic ---
    const menuBtn = document.getElementById('menu-btn');
    const sideNav = document.getElementById('side-nav');
    let isNavOpen = false;

    menuBtn.addEventListener('click', () => {
        if (isNavOpen) {
            sideNav.style.width = '0';
            document.body.style.marginLeft = '0';
        } else {
            sideNav.style.width = '200px';
            document.body.style.marginLeft = '200px';
        }
        isNavOpen = !isNavOpen;
    });

    // --- Data & Chart Logic ---
    let monsters = [];
    let players = [];
    
    async function fetchData(url) {
        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch data:', error);
            return []; // Return empty array on error
        }
    }

    let powerRankingChartInstance, statDistributionChartInstance, playerPowerChartInstance, dropRateChartInstance;

    function calculatePlayerPower(player) {
        let power = 0;
        for (const stat in player.stats) { power += player.stats[stat]; }
        power += player.level * 10;
        power += (player.skills?.length || 0) * 15;
        let equipBonus = 0;
        for (const slot in player.equipment) {
            const item = player.equipment[slot];
            if (item && item.stats) {
                item.stats.forEach(s => { equipBonus += s.value; });
            }
        }
        power += equipBonus * 2;
        return Math.floor(power);
    }
    
    function renderPlayerPowerChart() {
        // ... (Fungsi ini tetap sama dari sebelumnya)
        const container = document.getElementById('player-power-container');
        const canvas = document.getElementById('playerPowerChart');
        const message = document.getElementById('no-player-message');

        if (players.length === 0) {
            canvas.style.display = 'none';
            message.classList.remove('hidden');
            return;
        }

        canvas.style.display = 'block';
        message.classList.add('hidden');
        
        const sortedPlayers = [...players].sort((a, b) => calculatePlayerPower(b) - calculatePlayerPower(a));
        const playerNames = sortedPlayers.map(p => p.name);
        const playerPowers = sortedPlayers.map(p => calculatePlayerPower(p));
        const ctx = canvas.getContext('2d');
        if (playerPowerChartInstance) playerPowerChartInstance.destroy();
        playerPowerChartInstance = new Chart(ctx, {
            type: 'bar',
            data: { labels: playerNames, datasets: [{ label: 'Power Level', data: playerPowers, backgroundColor: 'rgba(255, 159, 64, 0.6)', borderColor: 'rgba(255, 159, 64, 1)', borderWidth: 1 }] },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    // --- FUNGSI BARU: Membuat Grafik Drop Rate ---
    function renderDropRateChart() {
        const ctx = document.getElementById('dropRateChart').getContext('2d');
        
        if (dropRateChartInstance) dropRateChartInstance.destroy();
        
        dropRateChartInstance = new Chart(ctx, {
            type: 'doughnut', // Tipe grafik diubah menjadi doughnut
            data: {
                labels: ['Common', 'Rare', 'Epic', 'Legendary'],
                datasets: [{
                    label: 'Drop Rate %',
                    data: [65, 25, 8, 2], // Persentase drop rate
                    backgroundColor: [
                        '#6c757d', // Common (Abu-abu)
                        '#007bff', // Rare (Biru)
                        '#6f42c1', // Epic (Ungu)
                        '#fd7e14'  // Legendary (Oranye)
                    ],
                    borderColor: '#fff',
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top', // Posisi legenda
                    }
                }
            }
        });
    }
    
    function updateMonsterCharts() {
        // --- 1. Monster Power Ranking Chart (Kiri Atas) ---
        if (monsters.length > 0) {
            const monsterPower = monsters.map(m => {
                const totalPower = Object.values(m.stats).reduce((sum, val) => sum + val, 0);
                return { name: m.name, power: totalPower };
            }).sort((a, b) => b.power - a.power).slice(0, 5);

            const powerRankingCtx = document.getElementById('powerRankingChart').getContext('2d');
            if (powerRankingChartInstance) powerRankingChartInstance.destroy();
            powerRankingChartInstance = new Chart(powerRankingCtx, {
                type: 'bar',
                data: {
                    labels: monsterPower.map(m => m.name),
                    datasets: [{ label: 'Monster Total Stats', data: monsterPower.map(m => m.power), backgroundColor: 'rgba(54, 162, 235, 0.6)', borderColor: 'rgba(54, 162, 235, 1)', borderWidth: 1 }]
                },
                options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
            });
        }

        // --- 2. Stat Distribution Chart (Kanan Atas) ---
        if (monsters.length > 0) {
             const totalStats = monsters.reduce((acc, monster) => {
                acc.str += monster.stats.str; acc.agi += monster.stats.agi; acc.dex += monster.stats.dex;
                acc.def += monster.stats.def; acc.con += monster.stats.con; acc.int += monster.stats.int;
                return acc;
            }, { str: 0, agi: 0, dex: 0, def: 0, con: 0, int: 0 });

            const statDistributionCtx = document.getElementById('statDistributionChart').getContext('2d');
            if (statDistributionChartInstance) statDistributionChartInstance.destroy();
            statDistributionChartInstance = new Chart(statDistributionCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(totalStats).map(s => s.toUpperCase()),
                    datasets: [{ label: 'Total Stats', data: Object.values(totalStats), backgroundColor: ['rgba(255, 99, 132, 0.7)', 'rgba(75, 192, 192, 0.7)', 'rgba(255, 206, 86, 0.7)', 'rgba(201, 203, 207, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)'] }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }
    
    // --- Panggil semua fungsi render saat halaman dimuat ---
    async function initializeDashboard() {
        [monsters, players] = await Promise.all([
            fetchData('http://localhost:3000/api/monsters'),
            fetchData('http://localhost:3000/api/players')
        ]);

        // Parse JSON fields for monsters and players
        monsters.forEach(m => {
            m.stats = typeof m.stats === 'string' ? JSON.parse(m.stats) : m.stats;
            m.skills = typeof m.skills === 'string' ? JSON.parse(m.skills) : m.skills;
        });
        players.forEach(p => {
            p.stats = typeof p.stats === 'string' ? JSON.parse(p.stats) : p.stats;
            p.skills = typeof p.skills === 'string' ? JSON.parse(p.skills) : p.skills;
            p.equipment = typeof p.equipment === 'string' ? JSON.parse(p.equipment) : p.equipment;
        });

        updateMonsterCharts();
        renderPlayerPowerChart();
        renderDropRateChart();
    }

    initializeDashboard();
});