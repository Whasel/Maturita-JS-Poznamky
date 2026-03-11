const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Servírování statických souborů
app.use(express.static(path.join(__dirname, '.')));

// Route pro hlavní stránku
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Fallback pro SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Spuštění serveru
app.listen(PORT, () => {
    console.log(`Server běží na http://localhost:${PORT}`);
    console.log(`Prostředí: ${process.env.NODE_ENV || 'development'}`);
});
