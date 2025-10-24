const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'cake-order-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Base de données
const DB_FILE = path.join(__dirname, 'data', 'database.json');

function readDB() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Créer la structure initiale
        const initialData = {
            users: [],
            cakes: [
                {
                    id: '1',
                    name: 'Gâteau basque',
                    price: 28,
                    image: 'images/cake1.jpg',
                    description: 'Un délicieux gâteau basque traditionnel'
                },
                {
                    id: '2',
                    name: 'Clafoutis aux poires',
                    price: 22,
                    image: 'images/cake2.jpg',
                    description: 'Clafoutis moelleux aux poires fraîches'
                }
            ],
            reservations: [],
            notifications: [],
            suggestions: [],
            messages: [],
            blockedDates: []
        };
        
        // Créer le dossier data s'il n'existe pas
        if (!fs.existsSync(path.dirname(DB_FILE))) {
            fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
        }
        
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
        return initialData;
    }
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Initialiser la base avec le compte chef
function initializeDB() {
    const db = readDB();
    const chefExists = db.users.find(user => user.username === 'jochef28');
    
    if (!chefExists) {
        const hashedPassword = bcrypt.hashSync('28032014', 10);
        db.users.push({
            id: uuidv4(),
            username: 'jochef28',
            password: hashedPassword,
            role: 'chef',
            avatar: 'images/avatar-default.png',
            createdAt: new Date().toISOString()
        });
        writeDB(db);
    }
}

// Middleware d'authentification
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
}

function requireChef(req, res, next) {
    if (!req.session.userId || req.session.role !== 'chef') {
        return res.status(403).json({ error: 'Chef access required' });
    }
    next();
}

// Routes d'authentification
app.post('/api/auth/signup', async (req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    
    if (db.users.find(user => user.username === username)) {
        return res.status(400).json({ error: 'Username already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
        id: uuidv4(),
        username,
        password: hashedPassword,
        role: 'user',
        avatar: 'images/avatar-default.png',
        createdAt: new Date().toISOString()
    };
    
    db.users.push(user);
    writeDB(db);
    
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.avatar = user.avatar;
    
    res.json({ 
        message: 'User created successfully',
        user: { id: user.id, username: user.username, role: user.role, avatar: user.avatar }
    });
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    
    const user = db.users.find(u => u.username === username);
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.avatar = user.avatar;
    
    res.json({ 
        message: 'Login successful',
        user: { id: user.id, username: user.username, role: user.role, avatar: user.avatar }
    });
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logout successful' });
});

app.get('/api/me', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    res.json({
        user: {
            id: req.session.userId,
            username: req.session.username,
            role: req.session.role,
            avatar: req.session.avatar
        }
    });
});

// Routes pour les gâteaux
app.get('/api/cakes', (req, res) => {
    const db = readDB();
    res.json(db.cakes);
});

app.post('/api/cakes', requireChef, (req, res) => {
    const { name, price, description } = req.body;
    const db = readDB();
    
    const cake = {
        id: uuidv4(),
        name,
        price: parseInt(price),
        image: 'images/cake1.jpg', // Image par défaut
        description
    };
    
    db.cakes.push(cake);
    writeDB(db);
    
    res.json(cake);
});

app.put('/api/cakes/:id', requireChef, (req, res) => {
    const { id } = req.params;
    const { name, price, description } = req.body;
    const db = readDB();
    
    const cakeIndex = db.cakes.findIndex(cake => cake.id === id);
    if (cakeIndex === -1) {
        return res.status(404).json({ error: 'Cake not found' });
    }
    
    db.cakes[cakeIndex] = { ...db.cakes[cakeIndex], name, price: parseInt(price), description };
    writeDB(db);
    
    res.json(db.cakes[cakeIndex]);
});

app.delete('/api/cakes/:id', requireChef, (req, res) => {
    const { id } = req.params;
    const db = readDB();
    
    const cakeIndex = db.cakes.findIndex(cake => cake.id === id);
    if (cakeIndex === -1) {
        return res.status(404).json({ error: 'Cake not found' });
    }
    
    db.cakes.splice(cakeIndex, 1);
    writeDB(db);
    
    res.json({ message: 'Cake deleted successfully' });
});

// Routes pour les réservations
app.get('/api/reservations', requireAuth, (req, res) => {
    const db = readDB();
    let reservations;
    
    if (req.session.role === 'chef') {
        reservations = db.reservations;
    } else {
        reservations = db.reservations.filter(r => r.userId === req.session.userId);
    }
    
    res.json(reservations);
});

app.post('/api/reservations', requireAuth, (req, res) => {
    const { cakeId, date } = req.body;
    const db = readDB();
    
    const cake = db.cakes.find(c => c.id === cakeId);
    if (!cake) {
        return res.status(404).json({ error: 'Cake not found' });
    }
    
    // Vérifier si la date est disponible
    const isDateBlocked = db.blockedDates.some(bd => 
        bd.date === date && bd.cakeId === cakeId
    );
    
    if (isDateBlocked) {
        return res.status(400).json({ error: 'Date not available' });
    }
    
    const reservation = {
        id: uuidv4(),
        cakeId,
        userId: req.session.userId,
        userName: req.session.username,
        cakeName: cake.name,
        date,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    db.reservations.push(reservation);
    
    // Notification pour le chef
    const notification = {
        id: uuidv4(),
        userId: 'chef', // Pour le chef
        type: 'new_reservation',
        title: 'Nouvelle réservation',
        message: `${req.session.username} a réservé un ${cake.name} pour le ${date}`,
        read: false,
        createdAt: new Date().toISOString(),
        data: { reservationId: reservation.id }
    };
    
    db.notifications.push(notification);
    writeDB(db);
    
    res.json(reservation);
});

app.patch('/api/reservations/:id', requireChef, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const db = readDB();
    
    const reservationIndex = db.reservations.findIndex(r => r.id === id);
    if (reservationIndex === -1) {
        return res.status(404).json({ error: 'Reservation not found' });
    }
    
    const reservation = db.reservations[reservationIndex];
    reservation.status = status;
    
    if (status === 'accepted') {
        // Bloquer la date
        db.blockedDates.push({
            id: uuidv4(),
            cakeId: reservation.cakeId,
            date: reservation.date,
            reservationId: reservation.id
        });
    }
    
    // Notification pour l'utilisateur
    const notification = {
        id: uuidv4(),
        userId: reservation.userId,
        type: 'reservation_update',
        title: 'Réservation mise à jour',
        message: `Votre réservation de ${reservation.cakeName} pour le ${reservation.date} a été ${status === 'accepted' ? 'acceptée' : 'refusée'}`,
        read: false,
        createdAt: new Date().toISOString(),
        data: { reservationId: reservation.id }
    };
    
    db.notifications.push(notification);
    writeDB(db);
    
    res.json(reservation);
});

// Routes pour la disponibilité
app.get('/api/availability/:cakeId', (req, res) => {
    const { cakeId } = req.params;
    const db = readDB();
    
    const blockedDates = db.blockedDates
        .filter(bd => bd.cakeId === cakeId)
        .map(bd => bd.date);
    
    res.json({ blockedDates });
});

// Routes pour les notifications
app.get('/api/notifications', requireAuth, (req, res) => {
    const db = readDB();
    let notifications;
    
    if (req.session.role === 'chef') {
        notifications = db.notifications.filter(n => n.userId === 'chef' || n.userId === req.session.userId);
    } else {
        notifications = db.notifications.filter(n => n.userId === req.session.userId);
    }
    
    res.json(notifications);
});

app.post('/api/notifications/mark-read/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const db = readDB();
    
    const notification = db.notifications.find(n => n.id === id);
    if (notification) {
        notification.read = true;
        writeDB(db);
    }
    
    res.json({ message: 'Notification marked as read' });
});

app.delete('/api/notifications/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const db = readDB();
    
    const notificationIndex = db.notifications.findIndex(n => n.id === id);
    if (notificationIndex !== -1) {
        db.notifications.splice(notificationIndex, 1);
        writeDB(db);
    }
    
    res.json({ message: 'Notification deleted' });
});

// Routes pour les suggestions
app.post('/api/suggestions', requireAuth, (req, res) => {
    const { title, message } = req.body;
    const db = readDB();
    
    const suggestion = {
        id: uuidv4(),
        userId: req.session.userId,
        userName: req.session.username,
        title,
        message,
        createdAt: new Date().toISOString()
    };
    
    db.suggestions.push(suggestion);
    
    // Notification pour le chef
    const notification = {
        id: uuidv4(),
        userId: 'chef',
        type: 'new_suggestion',
        title: 'Nouvelle suggestion',
        message: `${req.session.username} a fait une suggestion : ${title}`,
        read: false,
        createdAt: new Date().toISOString(),
        data: { suggestionId: suggestion.id }
    };
    
    db.notifications.push(notification);
    writeDB(db);
    
    res.json(suggestion);
});

// Routes pour le chat
app.get('/api/chat/:userId', requireAuth, (req, res) => {
    const { userId } = req.params;
    const db = readDB();
    
    const messages = db.messages.filter(m => 
        (m.fromUserId === req.session.userId && m.toUserId === userId) ||
        (m.fromUserId === userId && m.toUserId === req.session.userId)
    ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    res.json(messages);
});

app.post('/api/chat/:userId', requireAuth, (req, res) => {
    const { userId } = req.params;
    const { message } = req.body;
    const db = readDB();
    
    const chatMessage = {
        id: uuidv4(),
        fromUserId: req.session.userId,
        fromUserName: req.session.username,
        toUserId: userId,
        message,
        createdAt: new Date().toISOString()
    };
    
    db.messages.push(chatMessage);
    
    // Notification pour le destinataire
    const notification = {
        id: uuidv4(),
        userId: userId,
        type: 'new_message',
        title: 'Nouveau message',
        message: `Nouveau message de ${req.session.username}`,
        read: false,
        createdAt: new Date().toISOString(),
        data: { fromUserId: req.session.userId }
    };
    
    db.notifications.push(notification);
    writeDB(db);
    
    res.json(chatMessage);
});

// Route pour mettre à jour le profil
app.put('/api/profile', requireAuth, (req, res) => {
    const { username, avatar } = req.body;
    const db = readDB();
    
    const userIndex = db.users.findIndex(u => u.id === req.session.userId);
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    if (username && username !== db.users[userIndex].username) {
        const usernameExists = db.users.find(u => u.username === username && u.id !== req.session.userId);
        if (usernameExists) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        db.users[userIndex].username = username;
        req.session.username = username;
    }
    
    if (avatar) {
        db.users[userIndex].avatar = avatar;
        req.session.avatar = avatar;
    }
    
    writeDB(db);
    
    res.json({
        user: {
            id: req.session.userId,
            username: req.session.username,
            role: req.session.role,
            avatar: req.session.avatar
        }
    });
});

// Route pour servir l'application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Démarrer le serveur
initializeDB();
app.listen(PORT, () => {
    console.log(`🍰 Server running on http://localhost:${PORT}`);
    console.log(`👨‍🍳 Chef account: jochef28 / 28032014`);
});
