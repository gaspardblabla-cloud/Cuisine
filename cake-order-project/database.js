const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'database.json');

class Database {
    constructor() {
        this.initializeDB();
    }

    initializeDB() {
        if (!fs.existsSync(path.dirname(DB_FILE))) {
            fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
        }

        if (!fs.existsSync(DB_FILE)) {
            const initialData = {
                users: [],
                cakes: [
                    {
                        id: '1',
                        name: 'Gâteau basque',
                        price: 28,
                        image: 'images/cake1.jpg',
                        description: 'Un délicieux gâteau basque traditionnel à la crème d\'amandes'
                    },
                    {
                        id: '2',
                        name: 'Clafoutis aux poires',
                        price: 22,
                        image: 'images/cake2.jpg',
                        description: 'Clafoutis moelleux aux poires fraîches et vanille'
                    },
                    {
                        id: '3',
                        name: 'Tarte au citron meringuée',
                        price: 25,
                        image: 'images/cake3.jpg',
                        description: 'Tarte citronnée avec meringue italienne'
                    }
                ],
                reservations: [
                    {
                        id: 'demo-reservation-1',
                        cakeId: '1',
                        userId: 'demo-user-1',
                        userName: 'client123',
                        cakeName: 'Gâteau basque',
                        date: '2024-12-20',
                        status: 'pending',
                        createdAt: new Date().toISOString()
                    }
                ],
                notifications: [
                    {
                        id: 'demo-notification-1',
                        userId: 'chef',
                        type: 'new_reservation',
                        title: 'Nouvelle réservation',
                        message: 'client123 a réservé un Gâteau basque pour le 2024-12-20',
                        read: false,
                        createdAt: new Date().toISOString(),
                        data: { reservationId: 'demo-reservation-1' }
                    }
                ],
                suggestions: [],
                messages: [
                    {
                        id: 'demo-message-1',
                        fromUserId: 'demo-user-1',
                        fromUserName: 'client123',
                        toUserId: 'chef',
                        message: 'Bonjour ! Je voulais savoir si je peux personnaliser mon gâteau basque ?',
                        createdAt: new Date(Date.now() - 3600000).toISOString()
                    },
                    {
                        id: 'demo-message-2',
                        fromUserId: 'chef',
                        fromUserName: 'jochef28',
                        toUserId: 'demo-user-1',
                        message: 'Bien sûr ! Qu\'avez-vous en mind ?',
                        createdAt: new Date().toISOString()
                    }
                ],
                blockedDates: []
            };
            this.writeDB(initialData);
        }
    }

    readDB() {
        try {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading database:', error);
            return this.getDefaultData();
        }
    }

    writeDB(data) {
        try {
            fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error('Error writing database:', error);
            return false;
        }
    }

    getDefaultData() {
        return {
            users: [],
            cakes: [],
            reservations: [],
            notifications: [],
            suggestions: [],
            messages: [],
            blockedDates: []
        };
    }
}

module.exports = new Database();
