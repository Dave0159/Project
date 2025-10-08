// Import necessary packages
require('dotenv').config({ path: './Backend/.env' }); // Loads environment variables from .env file
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

// --- DATABASE CONNECTION ---
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        "rejectUnauthorized": true
    }
});

// --- EXPRESS APP SETUP ---
const app = express();
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json({ limit: '10mb' })); // Middleware to parse JSON bodies, with a larger limit for images

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// --- AUTHENTICATION ENDPOINTS ---

// POST /api/register
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }

        // Hash the password
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert new user (default role is 'member')
        await db.query(
            'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
            [name, email, passwordHash]
        );

        res.status(201).json({ message: 'Registration successful! Please log in.' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error during registration.' });
    }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Handle hardcoded admin login
        if (email === 'admin@example.com' && password === 'admin123') {
            const token = jwt.sign({ userId: 0, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
            return res.json({ token, role: 'admin', name: 'Admin' });
        }

        // Find user in the database
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // Compare password with the stored hash
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // Create and sign a JSON Web Token (JWT)
        const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });

        res.json({ token, role: user.role, name: user.name });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error during login.' });
    }
});


// --- MIDDLEWARE TO PROTECT ROUTES ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // Unauthorized

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Forbidden
        req.user = user; // Add user payload to the request object
        next();
    });
};


// --- PLAYER DATA ENDPOINTS (EXAMPLE) ---

// GET /api/players - Fetch all players
app.get('/api/players', authenticateToken, async (req, res) => {
    try {
        // For now, we fetch all players. Later you can filter by req.user.userId
        const [players] = await db.query('SELECT id, name, level, image FROM players');
        res.json(players);
    } catch (error) {
        console.error('Fetch players error:', error);
        res.status(500).json({ message: 'Failed to fetch players.' });
    }
});

// POST /api/players - Create a new player
app.post('/api/players', authenticateToken, async (req, res) => {
    // Only admins can create players in this example
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can create new characters.' });
    }

    try {
        const { name, level, image, stats, skills, description, equipment, equipmentInventory, inventory } = req.body;
        
        // The user_id of the creator (could be the admin's ID or null)
        const creatorUserId = req.user.userId;

        const [result] = await db.query(
            `INSERT INTO players (user_id, name, level, image, description, stats, skills, equipment, equipmentInventory, inventory)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                creatorUserId, name, level, image, description,
                JSON.stringify(stats), JSON.stringify(skills), JSON.stringify(equipment),
                JSON.stringify(equipmentInventory), JSON.stringify(inventory)
            ]
        );

        const newPlayerId = result.insertId;
        res.status(201).json({ id: newPlayerId, ...req.body });

    } catch (error) {
        console.error('Create player error:', error);
        res.status(500).json({ message: 'Failed to create player.' });
    }
});

// GET /api/players/:id - Fetch a single player by ID
app.get('/api/players/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const [players] = await db.query('SELECT * FROM players WHERE id = ?', [id]);
        const player = players[0];

        if (!player) {
            return res.status(404).json({ message: 'Player not found.' });
        }

        // Parse JSON fields before sending
        player.stats = JSON.parse(player.stats || '{}');
        player.skills = JSON.parse(player.skills || '[]');
        player.equipment = JSON.parse(player.equipment || '{}');
        player.equipmentInventory = JSON.parse(player.equipmentInventory || '[]');
        player.inventory = JSON.parse(player.inventory || '{}');

        res.json(player);
    } catch (error) {
        console.error(`Fetch player by id error:`, error);
        res.status(500).json({ message: 'Failed to fetch player.' });
    }
});

// PUT /api/players/:id - Update a player
app.put('/api/players/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can update characters.' });
    }

    try {
        const { id } = req.params;
        const { name, level, image, description, stats, skills, equipment, equipmentInventory, inventory } = req.body;

        await db.query(
            `UPDATE players SET 
                name = ?, level = ?, image = ?, description = ?, 
                stats = ?, skills = ?, equipment = ?, 
                equipmentInventory = ?, inventory = ?
             WHERE id = ?`,
            [
                name, level, image, description,
                JSON.stringify(stats), JSON.stringify(skills), JSON.stringify(equipment),
                JSON.stringify(equipmentInventory), JSON.stringify(inventory),
                id
            ]
        );

        res.json({ message: 'Player updated successfully', id, ...req.body });

    } catch (error) {
        console.error('Update player error:', error);
        res.status(500).json({ message: 'Failed to update player.' });
    }
});

// You would continue to add more endpoints for GET (one player), PUT (update), DELETE, etc.
// And also for monsters, skills, etc.

// --- MONSTER ENDPOINTS ---
app.get('/api/monsters', authenticateToken, async (req, res) => {
    try {
        const [monsters] = await db.query('SELECT * FROM monsters');
        res.json(monsters);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch monsters.' });
    }
});

app.post('/api/monsters', authenticateToken, async (req, res) => {
    try {
        const { name, image, stats, skills } = req.body;
        const [result] = await db.query(
            'INSERT INTO monsters (name, image, stats, skills) VALUES (?, ?, ?, ?)',
            [name, image, JSON.stringify(stats), JSON.stringify(skills)]
        );
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create monster.' });
    }
});

// --- SKILL ENDPOINTS ---
app.get('/api/skills', authenticateToken, async (req, res) => {
    try {
        const [skills] = await db.query('SELECT * FROM skills');
        res.json(skills);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch skills.' });
    }
});

app.post('/api/skills', authenticateToken, async (req, res) => {
    try {
        const { name, category, type, damage_formula, buff_effect, debuff_effect, description, skill_for } = req.body;
        const [result] = await db.query(
            'INSERT INTO skills (name, category, type, damage_formula, buff_effect, debuff_effect, description, skill_for) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, category, type, JSON.stringify(damage_formula), JSON.stringify(buff_effect), JSON.stringify(debuff_effect), description, skill_for]
        );
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create skill.' });
    }
});


// --- START THE SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});