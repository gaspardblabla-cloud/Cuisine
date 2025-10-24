// État de l'application
let state = {
    currentUser: null,
    cakes: [],
    notifications: [],
    currentPage: 'home',
    currentCake: null
};

// Éléments DOM
const elements = {
    authSection: document.getElementById('auth-section'),
    cakesGrid: document.getElementById('cakes-grid'),
    authModal: document.getElementById('auth-modal'),
    suggestionModal: document.getElementById('suggestion-modal'),
    notificationsModal: document.getElementById('notifications-modal'),
    chatModal: document.getElementById('chat-modal')
};

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    startCatAnimation();
});

function initializeApp() {
    checkAuthStatus();
    loadCakes();
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.getAttribute('data-page');
            showPage(page);
        });
    });

    // Fermeture des modals
    document.querySelectorAll('.close-modal').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeAllModals();
        });
    });

    // Clic en dehors des modals pour fermer
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAllModals();
            }
        });
    });

    // FAB de suggestion
    document.getElementById('suggestion-fab').addEventListener('click', () => {
        if (state.currentUser) {
            showSuggestionModal();
        } else {
            showAuthModal('login');
        }
    });
}

// Gestion de l'authentification
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/me');
        if (response.ok) {
            const data = await response.json();
            state.currentUser = data.user;
            updateUI();
            loadNotifications();
        } else {
            state.currentUser = null;
            updateUI();
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        state.currentUser = null;
        updateUI();
    }
}

function updateUI() {
    updateAuthSection();
    updateNavigation();
    
    if (state.currentUser) {
        if (state.currentUser.role === 'chef') {
            showChefElements();
        } else {
            showUserElements();
        }
    } else {
        showGuestElements();
    }
}

function updateAuthSection() {
    const authSection = elements.authSection;
    
    if (state.currentUser) {
        authSection.innerHTML = `
            <div class="user-menu">
                <button class="btn btn-outline" onclick="showNotifications()">
                    <i class="fas fa-bell"></i>
                    ${state.notifications.filter(n => !n.read).length > 0 ? 
                        `<span class="notification-badge">${state.notifications.filter(n => !n.read).length}</span>` : ''}
                </button>
                <button class="btn btn-secondary" onclick="showProfile()">
                    <img src="${state.currentUser.avatar}" alt="Avatar" class="avatar-sm">
                    ${state.currentUser.username}
                </button>
                <button class="btn btn-outline" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            </div>
        `;
    } else {
        authSection.innerHTML = `
            <div class="auth-buttons">
                <button class="btn btn-outline" onclick="showAuthModal('login')">Se connecter</button>
                <button class="btn btn-primary" onclick="showAuthModal('signup')">S'inscrire</button>
            </div>
        `;
    }
}

function updateNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const currentLink = document.querySelector(`[data-page="${state.currentPage}"]`);
    if (currentLink) {
        currentLink.classList.add('active');
    }
}

// Pages
function showPage(pageName) {
    // Cacher toutes les pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Afficher la page demandée
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
        state.currentPage = pageName;
        updateNavigation();
        
        // Charger le contenu spécifique à la page
        switch(pageName) {
            case 'cakes':
                loadCakes();
                break;
            case 'chef':
                if (state.currentUser?.role === 'chef') {
                    loadChefContent();
                }
                break;
            case 'profile':
                loadProfile();
                break;
        }
    }
}

// Modals
function showAuthModal(type = 'login') {
    const authForms = document.getElementById('auth-forms');
    
    if (type === 'login') {
        authForms.innerHTML = `
            <h3>Connexion</h3>
            <form id="login-form">
                <div class="form-group">
                    <input type="text" placeholder="Pseudo" required>
                </div>
                <div class="form-group">
                    <input type="password" placeholder="Mot de passe" required>
                </div>
                <button type="submit" class="btn btn-primary btn-block">Se connecter</button>
            </form>
            <p class="text-center mt-4">
                Pas de compte ? <a href="#" onclick="showAuthModal('signup')">Créer un compte</a>
            </p>
        `;
        
        document.getElementById('login-form').addEventListener('submit', handleLogin);
    } else {
        authForms.innerHTML = `
            <h3>Inscription</h3>
            <form id="signup-form">
                <div class="form-group">
                    <input type="text" placeholder="Choisissez un pseudo" required>
                </div>
                <div class="form-group">
                    <input type="password" placeholder="Créez un mot de passe" required>
                </div>
                <button type="submit" class="btn btn-primary btn-block">Créer mon compte</button>
            </form>
            <p class="text-center mt-4">
                Déjà un compte ? <a href="#" onclick="showAuthModal('login')">Se connecter</a>
            </p>
        `;
        
        document.getElementById('signup-form').addEventListener('submit', handleSignup);
    }
    
    elements.authModal.classList.add('active');
}

async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get('username') || e.target.querySelector('input[type="text"]').value;
    const password = formData.get('password') || e.target.querySelector('input[type="password"]').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            state.currentUser = data.user;
            updateUI();
            closeAllModals();
            showPage('cakes');
            showNotification('Connexion réussie !', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error, 'error');
        }
    } catch (error) {
        showNotification('Erreur de connexion', 'error');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get('username') || e.target.querySelector('input[type="text"]').value;
    const password = formData.get('password') || e.target.querySelector('input[type="password"]').value;
    
    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            state.currentUser = data.user;
            updateUI();
            closeAllModals();
            showPage('cakes');
            showNotification('Compte créé avec succès !', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error, 'error');
        }
    } catch (error) {
        showNotification('Erreur lors de la création du compte', 'error');
    }
}

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        state.currentUser = null;
        state.notifications = [];
        updateUI();
        showPage('home');
        showNotification('Déconnexion réussie', 'success');
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Gestion des gâteaux
async function loadCakes() {
    try {
        const response = await fetch('/api/cakes');
        if (response.ok) {
            state.cakes = await response.json();
            renderCakes();
        }
    } catch (error) {
        console.error('Error loading cakes:', error);
    }
}

function renderCakes() {
    const grid = elements.cakesGrid;
    
    if (state.cakes.length === 0) {
        grid.innerHTML = '<p class="text-center">Aucun gâteau disponible pour le moment.</p>';
        return;
    }
    
    grid.innerHTML = state.cakes.map(cake => `
        <div class="cake-card" onclick="showReservationPage('${cake.id}')">
            <div class="cake-image">
                <i class="fas fa-birthday-cake"></i>
            </div>
            <div class="cake-content">
                <h3 class="cake-title">${cake.name}</h3>
                <p class="cake-description">${cake.description}</p>
                <div class="cake-price">${cake.price}€</div>
                <div class="cake-actions">
                    ${state.currentUser ? 
                        `<button class="btn btn-primary" onclick="event.stopPropagation(); showReservationPage('${cake.id}')">
                            Réserver
                        </button>` : 
                        `<button class="btn btn-outline" onclick="event.stopPropagation(); showAuthModal('login')">
                            Se connecter pour réserver
                        </button>`
                    }
                </div>
            </div>
        </div>
    `).join('');
}

function showReservationPage(cakeId) {
    const cake = state.cakes.find(c => c.id === cakeId);
    if (!cake) return;
    
    state.currentCake = cake;
    const content = document.getElementById('reservation-content');
    
    content.innerHTML = `
        <div class="reservation-header">
            <h2>Réserver: ${cake.name}</h2>
            <p>Choisissez une date disponible pour votre commande</p>
        </div>
        
        <div class="calendar-container">
            <div id="calendar"></div>
        </div>
        
        <div class="reservation-actions">
            <button class="btn btn-primary" onclick="makeReservation()" id="reserve-btn" disabled>
                Confirmer la réservation
            </button>
        </div>
    `;
    
    showPage('reservation');
    loadCalendar(cakeId);
}

// Calendrier et réservations
async function loadCalendar(cakeId) {
    try {
        const response = await fetch(`/api/availability/${cakeId}`);
        if (response.ok) {
            const data = await response.json();
            renderCalendar(data.blockedDates);
        }
    } catch (error) {
        console.error('Error loading availability:', error);
    }
}

function renderCalendar(blockedDates) {
    const calendar = document.getElementById('calendar');
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Générer les jours du mois
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    
    let calendarHTML = `
        <div class="calendar-header">
            <div>Dim</div><div>Lun</div><div>Mar</div><div>Mer</div><div>Jeu</div><div>Ven</div><div>Sam</div>
        </div>
        <div class="calendar">
    `;
    
    // Jours vides au début
    for (let i = 0; i < firstDay; i++) {
        calendarHTML += '<div class="calendar-day disabled"></div>';
    }
    
    // Jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isBlocked = blockedDates.includes(dateStr);
        const isPast = new Date(dateStr) < new Date(today.toDateString());
        
        calendarHTML += `
            <div class="calendar-day ${isBlocked || isPast ? 'disabled' : ''}" 
                 onclick="${!isBlocked && !isPast ? `selectDate('${dateStr}')` : ''}">
                ${day}
            </div>
        `;
    }
    
    calendarHTML += '</div>';
    calendar.innerHTML = calendarHTML;
}

let selectedDate = null;

function selectDate(dateStr) {
    selectedDate = dateStr;
    
    // Mettre à jour l'interface
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.classList.remove('selected');
    });
    
    const selectedDay = Array.from(document.querySelectorAll('.calendar-day')).find(day => 
        day.textContent === dateStr.split('-')[2]
    );
    
    if (selectedDay) {
        selectedDay.classList.add('selected');
    }
    
    document.getElementById('reserve-btn').disabled = false;
}

async function makeReservation() {
    if (!selectedDate || !state.currentCake) return;
    
    try {
        const response = await fetch('/api/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cakeId: state.currentCake.id,
                date: selectedDate
            })
        });
        
        if (response.ok) {
            const reservation = await response.json();
            showNotification('Réservation effectuée ! Le chef va la valider.', 'success');
            showPage('cakes');
        } else {
            const error = await response.json();
            showNotification(error.error, 'error');
        }
    } catch (error) {
        showNotification('Erreur lors de la réservation', 'error');
    }
}

// Notifications
async function loadNotifications() {
    if (!state.currentUser) return;
    
    try {
        const response = await fetch('/api/notifications');
        if (response.ok) {
            state.notifications = await response.json();
            updateUI();
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function showNotifications() {
    const list = document.getElementById('notifications-list');
    
    if (state.notifications.length === 0) {
        list.innerHTML = '<p class="text-center">Aucune notification</p>';
    } else {
        list.innerHTML = state.notifications.map(notif => `
            <div class="notification-item ${notif.read ? '' : 'unread'}">
                <div class="notification-header">
                    <div class="notification-title">${notif.title}</div>
                    <div class="notification-time">${formatTime(notif.createdAt)}</div>
                </div>
                <div class="notification-message">${notif.message}</div>
                <div class="notification-actions">
                    <button class="btn btn-sm" onclick="markNotificationAsRead('${notif.id}')">
                        Marquer comme lu
                    </button>
                    <button class="btn btn-sm btn-error" onclick="deleteNotification('${notif.id}')">
                        Supprimer
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    elements.notificationsModal.classList.add('active');
}

async function markNotificationAsRead(notificationId) {
    try {
        await fetch(`/api/notifications/mark-read/${notificationId}`, { method: 'POST' });
        loadNotifications();
        showNotifications(); // Recharger l'affichage
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function deleteNotification(notificationId) {
    try {
        await fetch(`/api/notifications/${notificationId}`, { method: 'DELETE' });
        loadNotifications();
        showNotifications(); // Recharger l'affichage
    } catch (error) {
        console.error('Error deleting notification:', error);
    }
}

// Interface chef
function showChefElements() {
    const nav = document.querySelector('.nav');
    if (!nav.querySelector('[data-page="chef"]')) {
        const chefLink = document.createElement('a');
        chefLink.href = '#';
        chefLink.className = 'nav-link';
        chefLink.setAttribute('data-page', 'chef');
        chefLink.innerHTML = '<i class="fas fa-chef-hat"></i> Gestion';
        chefLink.addEventListener('click', (e) => {
            e.preventDefault();
            showPage('chef');
        });
        nav.appendChild(chefLink);
    }
}

function showUserElements() {
    // Cacher les éléments spécifiques au chef si présents
    const chefLink = document.querySelector('[data-page="chef"]');
    if (chefLink) {
        chefLink.remove();
    }
}

function showGuestElements() {
    // Cacher les éléments spécifiques au chef si présents
    const chefLink = document.querySelector('[data-page="chef"]');
    if (chefLink) {
        chefLink.remove();
    }
}

async function loadChefContent() {
    const content = document.getElementById('chef-content');
    
    // Par défaut, afficher les réservations
    content.innerHTML = `
        <div id="reservations-tab" class="tab-content active">
            <h3>Réservations en attente</h3>
            <div id="reservations-list"></div>
        </div>
        <div id="cakes-management-tab" class="tab-content">
            <h3>Gestion des gâteaux</h3>
            <button class="btn btn-primary" onclick="showAddCakeForm()">
                <i class="fas fa-plus"></i> Ajouter un gâteau
            </button>
            <div id="cakes-management-list" class="mt-4"></div>
        </div>
        <div id="suggestions-tab" class="tab-content">
            <h3>Suggestions des clients</h3>
            <div id="suggestions-list"></div>
        </div>
    `;
    
    loadChefReservations();
    setupChefTabs();
}

function setupChefTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.getAttribute('data-tab');
            
            // Mettre à jour les boutons
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // Mettre à jour le contenu
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(`${tab}-tab`).classList.add('active');
            
            // Charger le contenu spécifique
            switch(tab) {
                case 'reservations':
                    loadChefReservations();
                    break;
                case 'cakes-management':
                    loadCakesManagement();
                    break;
                case 'suggestions':
                    loadSuggestions();
                    break;
            }
        });
    });
}

async function loadChefReservations() {
    try {
        const response = await fetch('/api/reservations');
        if (response.ok) {
            const reservations = await response.json();
            const pendingReservations = reservations.filter(r => r.status === 'pending');
            
            const list = document.getElementById('reservations-list');
            
            if (pendingReservations.length === 0) {
                list.innerHTML = '<p>Aucune réservation en attente</p>';
            } else {
                list.innerHTML = pendingReservations.map(res => `
                    <div class="reservation-item">
                        <div class="reservation-info">
                            <strong>${res.userName}</strong> - ${res.cakeName}
                            <br>
                            <small>Date: ${res.date}</small>
                        </div>
                        <div class="reservation-actions">
                            <button class="btn btn-success" onclick="updateReservation('${res.id}', 'accepted')">
                                Accepter
                            </button>
                            <button class="btn btn-error" onclick="updateReservation('${res.id}', 'refused')">
                                Refuser
                            </button>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading reservations:', error);
    }
}

async function updateReservation(reservationId, status) {
    try {
        const response = await fetch(`/api/reservations/${reservationId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            showNotification(`Réservation ${status === 'accepted' ? 'acceptée' : 'refusée'}`, 'success');
            loadChefReservations();
        }
    } catch (error) {
        showNotification('Erreur lors de la mise à jour', 'error');
    }
}

// Gestion des gâteaux (chef)
async function loadCakesManagement() {
    const list = document.getElementById('cakes-management-list');
    
    list.innerHTML = state.cakes.map(cake => `
        <div class="cake-management-item">
            <div class="cake-info">
                <h4>${cake.name}</h4>
                <p>${cake.description}</p>
                <div class="cake-price">${cake.price}€</div>
            </div>
            <div class="cake-actions">
                <button class="btn btn-outline" onclick="editCake('${cake.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-error" onclick="deleteCake('${cake.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function showAddCakeForm() {
    // Implémentation simplifiée pour l'exemple
    const name = prompt('Nom du gâteau:');
    const price = prompt('Prix:');
    const description = prompt('Description:');
    
    if (name && price && description) {
        addCake({ name, price: parseInt(price), description });
    }
}

async function addCake(cakeData) {
    try {
        const response = await fetch('/api/cakes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cakeData)
        });
        
        if (response.ok) {
            showNotification('Gâteau ajouté avec succès', 'success');
            loadCakes();
            loadCakesManagement();
        }
    } catch (error) {
        showNotification('Erreur lors de l\'ajout du gâteau', 'error');
    }
}

async function deleteCake(cakeId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce gâteau ?')) {
        try {
            const response = await fetch(`/api/cakes/${cakeId}`, { method: 'DELETE' });
            
            if (response.ok) {
                showNotification('Gâteau supprimé', 'success');
                loadCakes();
                loadCakesManagement();
            }
        } catch (error) {
            showNotification('Erreur lors de la suppression', 'error');
        }
    }
}

// Suggestions
function showSuggestionModal() {
    elements.suggestionModal.classList.add('active');
    
    document.getElementById('suggestion-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = e.target.querySelector('input').value;
        const message = e.target.querySelector('textarea').value;
        
        try {
            const response = await fetch('/api/suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, message })
            });
            
            if (response.ok) {
                showNotification('Suggestion envoyée au chef !', 'success');
                closeAllModals();
                e.target.reset();
            }
        } catch (error) {
            showNotification('Erreur lors de l\'envoi', 'error');
        }
    });
}

// Profil
function showProfile() {
    showPage('profile');
}

function loadProfile() {
    const content = document.querySelector('.profile-content');
    
    content.innerHTML = `
        <div class="profile-header">
            <img src="${state.currentUser.avatar}" alt="Avatar" class="avatar-lg">
            <h2>${state.currentUser.username}</h2>
            <p>${state.currentUser.role === 'chef' ? 'Chef pâtissier' : 'Client'}</p>
        </div>
        
        <div class="profile-actions">
            <button class="btn btn-primary" onclick="showEditProfileForm()">
                <i class="fas fa-edit"></i> Modifier le profil
            </button>
            <button class="btn btn-outline" onclick="showChatWithChef()">
                <i class="fas fa-comments"></i> Contacter le chef
            </button>
        </div>
        
        <div class="profile-stats">
            <h3>Vos réservations</h3>
            <div id="user-reservations"></div>
        </div>
    `;
    
    loadUserReservations();
}

async function loadUserReservations() {
    try {
        const response = await fetch('/api/reservations');
        if (response.ok) {
            const reservations = await response.json();
            const list = document.getElementById('user-reservations');
            
            if (reservations.length === 0) {
                list.innerHTML = '<p>Aucune réservation</p>';
            } else {
                list.innerHTML = reservations.map(res => `
                    <div class="reservation-item">
                        <div class="reservation-info">
                            <strong>${res.cakeName}</strong> - ${res.date}
                            <br>
                            <span class="status status-${res.status}">${getStatusText(res.status)}</span>
                        </div>
                        <button class="btn btn-outline" onclick="showChatAboutReservation('${res.id}')">
                            <i class="fas fa-comment"></i>
                        </button>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading user reservations:', error);
    }
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'En attente',
        'accepted': 'Acceptée',
        'refused': 'Refusée'
    };
    return statusMap[status] || status;
}

// Utilitaires
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

function showNotification(message, type = 'info') {
    // Créer une notification toast
    const toast = document.createElement('div');
    toast.className = `notification-toast notification-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--primary)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-lg);
        z-index: 3000;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// Animation du chat
function startCatAnimation() {
    setInterval(() => {
        const cat = document.getElementById('cat-animation');
        cat.classList.remove('cat-hidden');
        cat.classList.add('cat-visible');
        
        setTimeout(() => {
            cat.classList.remove('cat-visible');
            cat.classList.add('cat-hidden');
        }, 2000);
    }, 20000); // Toutes les 20 secondes
}

// Styles CSS pour les animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .avatar-sm {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        object-fit: cover;
    }
    
    .avatar-lg {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: cover;
        border: 4px solid var(--primary-light);
    }
    
    .user-menu {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        position: relative;
    }
    
    .reservation-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background: white;
        border-radius: var(--border-radius-sm);
        margin-bottom: 0.5rem;
        box-shadow: var(--shadow);
    }
    
    .cake-management-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background: white;
        border-radius: var(--border-radius-sm);
        margin-bottom: 0.5rem;
        box-shadow: var(--shadow);
    }
    
    .status {
        padding: 0.25rem 0.5rem;
        border-radius: var(--border-radius-sm);
        font-size: 0.875rem;
        font-weight: 500;
    }
    
    .status-pending { background: var(--warning); color: var(--text-primary); }
    .status-accepted { background: var(--success); color: white; }
    .status-refused { background: var(--error); color: white; }
    
    .btn-sm {
        padding: 0.25rem 0.5rem;
        font-size: 0.875rem;
    }
    
    .btn-block {
        width: 100%;
        justify-content: center;
    }
`;
document.head.appendChild(style);
