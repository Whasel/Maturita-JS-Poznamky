const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

let db;
let notesCollection;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Připojení k MongoDB
async function connectMongoDB() {
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db('notepad');
        notesCollection = db.collection('notes');
        console.log('✓ Připojeno k MongoDB');
        return client;
    } catch (error) {
        console.error('✗ Chyba připojení k MongoDB:', error.message);
        process.exit(1);
    }
}

// API Routes
app.get('/api/notes', async (req, res) => {
    try {
        const username = req.query.username;
        if (!username) {
            return res.status(400).json({ error: 'Uživatelské jméno je povinné' });
        }

        const notes = await notesCollection.find({ username }).toArray();
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/notes', async (req, res) => {
    try {
        const { username, title, text, starred, createdAt } = req.body;
        
        if (!username || !title || !text) {
            return res.status(400).json({ error: 'Chybí povinné pole' });
        }

        const newNote = {
            username,
            title,
            text,
            starred: starred || false,
            createdAt: createdAt || new Date()
        };

        const result = await notesCollection.insertOne(newNote);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/notes/:noteId', async (req, res) => {
    try {
        const { noteId } = req.params;
        const { ObjectId } = require('mongodb');
        
        const result = await notesCollection.deleteOne({ _id: new ObjectId(noteId) });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/notes/:noteId/star', async (req, res) => {
    try {
        const { noteId } = req.params;
        const { ObjectId } = require('mongodb');
        
        const note = await notesCollection.findOne({ _id: new ObjectId(noteId) });
        if (!note) {
            return res.status(404).json({ error: 'Poznámka nebyla nalezena' });
        }

        const result = await notesCollection.updateOne(
            { _id: new ObjectId(noteId) },
            { $set: { starred: !note.starred } }
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Uživatelé - REGISTRACE
app.post('/api/users/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Uživatelské jméno a heslo jsou povinné' });
        }

        const usersCollection = db.collection('users');
        const existing = await usersCollection.findOne({ username });
        
        if (existing) {
            return res.status(400).json({ error: 'Toto uživatelské jméno už existuje' });
        }

        const newUser = {
            username,
            password, // v produkci by mělo být hashováno!
            createdAt: new Date()
        };
        
        const result = await usersCollection.insertOne(newUser);
        res.json({ success: true, message: 'Registrace úspěšná!', userId: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Uživatelé - PŘIHLÁŠENÍ
app.post('/api/users/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Uživatelské jméno a heslo jsou povinné' });
        }

        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ username, password });
        
        if (!user) {
            return res.status(401).json({ error: 'Nesprávné uživatelské jméno nebo heslo' });
        }

        res.json({ success: true, message: 'Přihlášení úspěšné!', userId: user._id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Uživatelé - SEZNAM (pro debugging)
app.get('/api/users', async (req, res) => {
    try {
        const usersCollection = db.collection('users');
        const users = await usersCollection.find({}).toArray();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route pro hlavní stránku
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Fallback pro SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Spuštění serveru
connectMongoDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server běží na http://localhost:${PORT}`);
        console.log(`Prostředí: ${process.env.NODE_ENV || 'development'}`);
    });
});
