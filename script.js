// ==================== DEBUG ==================== 
console.log('📱 Aplikace se načítá...');
console.log('🔐 CryptoJS dostupný?', typeof CryptoJS !== 'undefined' ? '✅ ANO' : '❌ NE');
console.log('💾 localStorage dostupný?', typeof localStorage !== 'undefined' ? '✅ ANO' : '❌ NE');

// Kontrola CryptoJS
if (typeof CryptoJS === 'undefined') {
    console.error('❌ CHYBA: CryptoJS se nenačítá! Zkontrolujte internetové připojení.');
    alert('❌ Chyba: Knihovna CryptoJS se nenačítá. Zkontrolujte internetové připojení.');
}

// ==================== HASHOVÁNÍ HESEL ====================
// Bezpečné hashování hesel pomocí SHA-256
function hashPassword(password) {
    return CryptoJS.SHA256(password).toString();
}

// Porovnání hesla s hashem
function verifyPassword(password, hash) {
    return hashPassword(password) === hash;
}

// ==================== SPRÁVA DATABÁZE ====================
const Database = {
    // Klíč pro uložení všech uživatelů
    USERS_KEY: 'app_users',
    
    // Nový objekt uživatele
    createUser(username, password) {
        return {
            username: username,
            password: hashPassword(password), // Heslo je hashováno!
            createdAt: new Date().toISOString(),
            notes: [] // Pole pro poznámky
        };
    },

    // Vrátí všechny uživatele z databáze
    getAllUsers() {
        const data = localStorage.getItem(this.USERS_KEY);
        return data ? JSON.parse(data) : {};
    },

    // Uloží všechny uživatele
    saveUsers(users) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    },

    // Ověří, zda uživatel existuje a heslo odpovídá
    authenticateUser(username, password) {
        const users = this.getAllUsers();
        const user = users[username];
        return user && verifyPassword(password, user.password);
    },

    // Zaregistruje nového uživatele
    registerUser(username, password) {
        const users = this.getAllUsers();
        
        // Kontrola unikátnosti jména
        if (users[username]) {
            return { success: false, message: '❌ Toto uživatelské jméno je již obsazeno! Zvolte si jiné.' };
        }
        
        users[username] = this.createUser(username, password);
        this.saveUsers(users);
        return { success: true, message: '✅ Registrace úspěšná! Nyní se můžete přihlásit.' };
    },

    // Smaže uživatele z databáze
    deleteUser(username) {
        const users = this.getAllUsers();
        delete users[username];
        this.saveUsers(users);
    },

    // Zkontroluje, zda je uživatel přihlášen
    getCurrentUser() {
        return localStorage.getItem('current_user');
    },

    // Uloží aktuálně přihlášeného uživatele
    setCurrentUser(username) {
        localStorage.setItem('current_user', username);
    },

    // Odhlásí uživatele
    logout() {
        localStorage.removeItem('current_user');
    },

    // ==================== SPRÁVA POZNÁMEK ====================

    // Vrátí poznámky aktuálního uživatele
    getNotes() {
        const users = this.getAllUsers();
        const currentUser = this.getCurrentUser();
        if (!currentUser || !users[currentUser]) return [];
        return users[currentUser].notes || [];
    },

    // Uloží poznámky aktuálního uživatele
    saveNotes(notes) {
        const users = this.getAllUsers();
        const currentUser = this.getCurrentUser();
        if (currentUser && users[currentUser]) {
            users[currentUser].notes = notes;
            this.saveUsers(users);
        }
    },

    // Přidá novou poznámku
    addNote(title, text) {
        const notes = this.getNotes();
        const newNote = {
            id: Date.now(), // Unikátní ID
            title: title,   // Nadpis
            text: text,     // Text poznámky
            starred: false, // Není zvýrazněna
            createdAt: new Date().toISOString()
        };
        notes.push(newNote);
        this.saveNotes(notes);
        return newNote;
    },

    // Smaže poznámku podle ID
    deleteNote(noteId) {
        let notes = this.getNotes();
        notes = notes.filter(note => note.id !== noteId);
        this.saveNotes(notes);
    },

    // Přepne zvýraznění poznámky (toggle)
    toggleStarNote(noteId) {
        const notes = this.getNotes();
        const note = notes.find(n => n.id === noteId);
        if (note) {
            note.starred = !note.starred;
            this.saveNotes(notes);
        }
    }
};

// ==================== UI OVLÁDÁNÍ ====================

// Zobrazí volbu mezi loginem a registrací
function showAuthChoice() {
    document.getElementById('auth-choice').classList.remove('hidden');
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.add('hidden');
}

// Zobrazí login formulář
function showLogin() {
    document.getElementById('auth-choice').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-username').focus();
}

// Zobrazí registrační formulář
function showRegister() {
    document.getElementById('auth-choice').classList.add('hidden');
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
    document.getElementById('register-username').focus();
}

// ==================== AUTENTIZACE ====================

// Přihlášení uživatele
async function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
        alert('⚠️ Vyplňte prosím všechna pole!');
        return;
    }

    try {
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            Database.setCurrentUser(username);
            render();
        } else {
            alert('❌ ' + data.error);
            document.getElementById('login-password').value = '';
        }
    } catch (error) {
        alert('❌ Chyba při přihlášení: ' + error.message);
    }
}

// Registrace nového uživatele
async function register() {
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-password-confirm').value;

    if (!username || !password || !confirmPassword) {
        alert('⚠️ Vyplňte prosím všechna pole!');
        return;
    }

    if (username.length < 3) {
        alert('⚠️ Uživatelské jméno musí mít alespoň 3 znaky!');
        return;
    }

    if (!/^[a-zA-Z0-9_]{3,}$/.test(username)) {
        alert('⚠️ Jméno může obsahovat pouze písmena, čísla a podtržítko!');
        return;
    }

    if (password.length < 4) {
        alert('⚠️ Heslo musí mít alespoň 4 znaky!');
        return;
    }

    if (password !== confirmPassword) {
        alert('⚠️ Hesla se neshodují!');
        return;
    }

    try {
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert('✅ Registrace úspěšná! Nyní se můžete přihlásit.');
            showLogin();
            document.getElementById('register-username').value = '';
            document.getElementById('register-password').value = '';
            document.getElementById('register-password-confirm').value = '';
        } else {
            alert('❌ ' + data.error);
        }
    } catch (error) {
        alert('❌ Chyba při registraci: ' + error.message);
    }
}

// Odhlášení uživatele
function logout() {
    Database.logout();
    render();
}

// Smazání účtu
function showDeleteAccountModal() {
    document.getElementById('delete-account-modal').classList.remove('hidden');
    document.getElementById('delete-account-password').focus();
    document.getElementById('delete-account-password').value = '';
    document.getElementById('delete-account-error').classList.add('hidden');
    document.getElementById('delete-account-error').textContent = '';
}

function closeDeleteAccountModal() {
    document.getElementById('delete-account-modal').classList.add('hidden');
    document.getElementById('delete-account-password').value = '';
    document.getElementById('delete-account-error').classList.add('hidden');
}

function confirmDeleteAccount() {
    const password = document.getElementById('delete-account-password').value;
    const errorElement = document.getElementById('delete-account-error');
    const username = Database.getCurrentUser();

    if (!password) {
        errorElement.textContent = '❌ Prosím, zadejte vaše heslo!';
        errorElement.classList.remove('hidden');
        return;
    }

    // Ověříme heslo
    if (!Database.authenticateUser(username, password)) {
        errorElement.textContent = '❌ Heslo je nesprávné!';
        errorElement.classList.remove('hidden');
        return;
    }

    // Heslo je správné - smaž účet
    Database.deleteUser(username);
    Database.logout();
    closeDeleteAccountModal();
    alert('✅ Účet был úspěšně smazán. Všechny vaše poznámky a data byla smazána.');
    render();
}

// ==================== SPRÁVA POZNÁMEK ====================

// Přidá novou poznámku
async function addNote() {
    const titleInput = document.getElementById('note-title');
    const textInput = document.getElementById('note-input');
    
    const title = titleInput.value.trim();
    const text = textInput.value.trim();

    if (!title) {
        alert('⚠️ Vyplňte prosím nadpis poznámky!');
        return;
    }

    if (!text) {
        alert('⚠️ Vyplňte prosím text poznámky!');
        return;
    }

    try {
        const response = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: Database.getCurrentUser(),
                title,
                text,
                starred: false,
                createdAt: new Date().toISOString()
            })
        });

        if (response.ok) {
            titleInput.value = '';
            textInput.value = '';
            renderNotes();
        } else {
            alert('❌ Chyba při přidávání poznámky');
        }
    } catch (error) {
        alert('❌ Chyba: ' + error.message);
    }
}

// Smaže poznámku
async function deleteNote(noteId) {
    if (confirm('Opravdu chceš smazat tuto poznámku?')) {
        try {
            const response = await fetch(`/api/notes/${noteId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                renderNotes();
            } else {
                alert('❌ Chyba při mazání poznámky');
            }
        } catch (error) {
            alert('❌ Chyba: ' + error.message);
        }
    }
}

// Přepne zvýraznění poznámky
async function toggleStar(noteId) {
    try {
        const response = await fetch(`/api/notes/${noteId}/star`, {
            method: 'PUT'
        });

        if (response.ok) {
            renderNotes();
        } else {
            alert('❌ Chyba při zvýraznění poznámky');
        }
    } catch (error) {
        alert('❌ Chyba: ' + error.message);
    }
}

// Filtr: Zobrazit všechny poznámky
let currentFilter = 'all';

function showAllNotes() {
    currentFilter = 'all';
    document.getElementById('filter-all').classList.add('active');
    document.getElementById('filter-starred').classList.remove('active');
    renderNotes();
}

// Filtr: Zobrazit pouze zvýrazněné
function showOnlyStarred() {
    currentFilter = 'starred';
    document.getElementById('filter-all').classList.remove('active');
    document.getElementById('filter-starred').classList.add('active');
    renderNotes();
}

// Vykreslí seznam poznámek
async function renderNotes() {
    const notesList = document.getElementById('notes-list');
    const username = Database.getCurrentUser();

    try {
        const response = await fetch(`/api/notes?username=${username}`);
        const notes = await response.json();

        // Filtrování
        let filtered = notes;
        if (currentFilter === 'starred') {
            filtered = notes.filter(note => note.starred);
        }

        if (filtered.length === 0) {
            notesList.innerHTML = '<p class="no-notes">Žádné poznámky. Začněte tím, že si poznamenáte něco!</p>';
            return;
        }

        // Seřadíme poznámky od nejnovější
        filtered = filtered.reverse();

        notesList.innerHTML = filtered.map(note => `
            <div class="note-item ${note.starred ? 'starred' : ''}">
                <div class="note-content">
                    <h4 class="note-title">${escapeHtml(note.title)}</h4>
                    <p class="note-text">${escapeHtml(note.text)}</p>
                    <small class="note-date">${formatDate(note.createdAt)}</small>
                </div>
                <div class="note-actions">
                    <button onclick="toggleStar('${note._id}')" class="btn-star" title="${note.starred ? 'Zrušit zvýraznění' : 'Zvýraznit'}">
                        ${note.starred ? '⭐' : '☆'}
                    </button>
                    <button onclick="deleteNote('${note._id}')" class="btn-delete" title="Smazat">🗑️</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        notesList.innerHTML = '<p class="no-notes">❌ Chyba při načítání poznámek</p>';
        console.error('Chyba:', error);
    }
}

// Pomocná funkce: Bezpečné vypsání textu (XSS protection)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Pomocná funkce: Formátování data
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('cs-CZ');
}

// ==================== VYKRESLOVÁNÍ STRÁNKY ====================

// Hlavní render funkce
async function render() {
    const currentUser = Database.getCurrentUser();
    const authSection = document.getElementById('auth-section');
    const appSection = document.getElementById('app-section');

    if (currentUser) {
        // Uživatel je přihlášen
        authSection.classList.add('hidden');
        appSection.classList.remove('hidden');
        document.getElementById('welcome-message').textContent = `👋 Vítej, ${currentUser}!`;
        await renderNotes(); // Zobrazíme poznámky (asynchronně)
    } else {
        // Uživatel není přihlášen
        authSection.classList.remove('hidden');
        appSection.classList.add('hidden');
        showAuthChoice();
        
        // Vyčistíme formuláře
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('register-username').value = '';
        document.getElementById('register-password').value = '';
        document.getElementById('register-password-confirm').value = '';
    }
}

// Inicializace při načtení stránky
document.addEventListener('DOMContentLoaded', function() {
    render();
    
    // Event listener pro Enter klávesu v modalu pro smazání účtu
    const deletePasswordInput = document.getElementById('delete-account-password');
    if (deletePasswordInput) {
        deletePasswordInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                confirmDeleteAccount();
            }
        });
    }
});