// Simple API configuration
const API_URL = 'http://localhost:3000/api';

// Wait for page to load
document.addEventListener('DOMContentLoaded', function() {
    
    // Handle login form
    handleLoginForm();
    
    // Handle star ratings
    handleStarRatings();
    
    // Handle navigation buttons
    handleNavigationButtons();
    
    // Handle session registration
    handleSessionRegistration();
    
    // Handle feedback form
    handleFeedbackForm();
    
    // Handle profile form
    handleProfileForm();
    
    // Load page data
    loadPageData();
    
    // Check if user is logged in
    checkAuthentication();
});

// Handle login form submission
function handleLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form data
        const username = document.querySelector('input[type="text"]').value;
        const password = document.querySelector('input[type="password"]').value;
        const roleSelect = document.getElementById('user-role');
        const selectedPage = roleSelect.value;
        
        // Get role from selected page
        let role = 'student';
        if (selectedPage.includes('admin')) role = 'admin';
        if (selectedPage.includes('counselor')) role = 'counselor';
        
        // Check if fields are filled
        if (!username || !password) {
            showMessage('Please enter username and password');
            return;
        }
        
        try {
            // Send login request
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, role })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Save user data
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Go to selected page
                window.location.href = selectedPage;
            } else {
                showMessage(data.message || 'Login failed');
            }
        } catch (error) {
            showMessage('Connection error. Please try again.');
        }
    });
}

// Handle star ratings for feedback
function handleStarRatings() {
    const stars = document.querySelectorAll('.star');
    
    stars.forEach((star, index) => {
        star.addEventListener('click', function() {
            // Fill stars up to clicked star
            stars.forEach((s, i) => {
                if (i <= index) {
                    s.classList.add('filled');
                } else {
                    s.classList.remove('filled');
                }
            });
        });
    });
}

// Handle navigation buttons (home, logout)
function handleNavigationButtons() {
    // Home button
    const homeBtn = document.querySelector('.home-btn, .home-link');
    if (homeBtn) {
        homeBtn.addEventListener('click', function() {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user.role === 'student') {
                window.location.href = 'student-menu.html';
            } else if (user.role === 'admin') {
                window.location.href = 'admin.html';
            } else if (user.role === 'counselor') {
                window.location.href = 'counselor.html';
            }
        });
    }
    
    // Logout buttons
    document.querySelectorAll('.logout-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'index.html';
            }
        });
    });
}

// Handle session registration using event delegation
function handleSessionRegistration() {
    // Remove existing listeners to prevent duplicates
    document.removeEventListener('click', sessionRegistrationHandler);
    // Add event delegation listener
    document.addEventListener('click', sessionRegistrationHandler);
}

// Session registration event handler
async function sessionRegistrationHandler(e) {
    if (!e.target.classList.contains('register-btn')) return;
    
    e.preventDefault();
    const btn = e.target;
    
    const sessionId = btn.dataset.sessionId;
    const token = localStorage.getItem('token');
    
    if (!token) {
        showMessage('Please login first');
        return;
    }
    
    // Show stress questionnaire first
    showStressQuestionnaire(sessionId, btn);
}

// Show stress questionnaire modal
function showStressQuestionnaire(sessionId, btn) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 1000; overflow-y: auto;
    `;
    
    const questions = [
        'Been upset because of something that happened unexpectedly?',
        'Felt that you were unable to control important things in your life?',
        'Felt nervous and stressed?',
        'Felt confident about your ability to handle your personal problems?',
        'Felt that things were going your way?',
        'Found that you could NOT cope with all the things you had to do?',
        'Been able to control irritations in your life?',
        'Felt that you were on top of things?',
        'Been angered because of things that happened that were out of your control?',
        'Felt difficulties were piling up so high that you could not overcome them?'
    ];
    
    const options = ['Never', 'Almost Never', 'Sometimes', 'Fairly Often', 'Very Often'];
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 10px; width: 600px; max-width: 90%; max-height: 90%; overflow-y: auto;">
            <h3 style="margin: 0 0 20px; color: #1976d2;">Stress Assessment</h3>
            <p style="margin-bottom: 20px; color: #666;">In the LAST MONTH, how often have you:</p>
            <form id="stress-form">
                ${questions.map((q, i) => `
                    <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #eee; border-radius: 8px;">
                        <p style="margin-bottom: 10px; font-weight: bold;">${i + 1}. ${q}</p>
                        ${options.map((opt, j) => `
                            <label style="display: block; margin: 5px 0; cursor: pointer;">
                                <input type="radio" name="q${i}" value="${j}" required style="margin-right: 8px;">
                                ${opt}
                            </label>
                        `).join('')}
                    </div>
                `).join('')}
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button type="button" onclick="this.closest('.modal').remove()" 
                            style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
                    <button type="submit" 
                            style="padding: 10px 20px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">Submit & Register</button>
                </div>
            </form>
        </div>
    `;
    
    modal.className = 'modal';
    document.body.appendChild(modal);
    
    modal.querySelector('#stress-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Calculate stress score
        let score = 0;
        for (let i = 0; i < questions.length; i++) {
            const value = parseInt(document.querySelector(`input[name="q${i}"]:checked`).value);
            // Reverse scoring for positive questions (3, 4, 6, 7)
            if ([3, 4, 6, 7].includes(i)) {
                score += (4 - value);
            } else {
                score += value;
            }
        }
        
        modal.remove();
        proceedWithRegistration(sessionId, btn, score);
    });
}

// Proceed with actual registration
async function proceedWithRegistration(sessionId, btn, stressScore) {
    const token = localStorage.getItem('token');
    
    console.log('Attempting registration for session:', sessionId);
    
    // Disable button during request
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Registering...';
    
    try {
        const response = await fetch(`${API_URL}/sessions/${sessionId}/register`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ stressScore })
        });
        
        console.log('Registration response status:', response.status);
        const data = await response.json();
        console.log('Registration response data:', data);
        
        if (response.ok) {
            if (data.confirmed) {
                // Direct registration confirmed with tier and rank
                const sessionDate = new Date(btn.dataset.sessionDate);
                const today = new Date();
                const daysRemaining = Math.ceil((sessionDate - today) / (1000 * 60 * 60 * 24));
                
                const tierLabels = {
                  1: 'FIFO',
                  2: 'Priority',
                  3: 'Hybrid'
                };
                
                btn.innerHTML = `Registered ✓<br><small>Tier: ${tierLabels[data.tier]} (Rank #${data.rank})<br>${daysRemaining} days</small>`;
                btn.style.background = '#4caf50';
                btn.style.color = 'white';
                btn.style.fontSize = '11px';
                btn.style.lineHeight = '1.1';
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-success');
                
                showMessage(`Registration confirmed! You're in ${data.tierDescription} (Rank #${data.rank})`);
            } else if (data.waitlisted) {
                // Added to waitlist
                btn.innerHTML = `Waitlisted<br><small>#${data.waitlistPosition} in queue</small>`;
                btn.style.background = '#ff9800';
                btn.style.color = 'white';
                btn.style.fontSize = '11px';
                btn.style.lineHeight = '1.1';
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-warning');
                btn.disabled = true;
                
                showMessage(`Added to waitlist! You're at position #${data.waitlistPosition}. You'll be notified if a spot opens up.`);
            } else {
                // Added to pending (shouldn't happen but fallback)
                btn.innerHTML = 'Pending<br><small>Processing...</small>';
                btn.style.background = '#ff9800';
                btn.style.color = 'white';
                btn.style.fontSize = '11px';
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-warning');
                btn.disabled = true;
                
                showMessage('Registration pending. You will be notified with confirmation details.');
            }
            
            // Reload both "Sessions Available" and "My Sessions" sections
            setTimeout(() => {
                loadSessions();
                loadMyRegisteredSessions();
            }, 1000);
        } else if (data.requiresProfile) {
            showMessage('Please complete your profile first');
            btn.disabled = false;
            btn.innerHTML = originalText;
            setTimeout(() => {
                window.location.href = 'student-details.html';
            }, 2000);
        } else if (data.alreadyRegistered) {
            // Student already registered for another session - button should already be grey
            // This is just a safeguard error handler
            showMessage(`You are already registered for a session. Only one registration is allowed at a time.`);
            btn.disabled = false;
            btn.innerHTML = originalText;
        } else {
            showMessage(data.message || 'Registration failed');
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('Connection error. Please try again.');
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// Handle feedback form
function handleFeedbackForm() {
    const feedbackForm = document.getElementById('feedback-form');
    if (!feedbackForm) return;
    
    // Load available sessions for feedback
    loadAvailableFeedbackSessions();
    
    feedbackForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const token = localStorage.getItem('token');
        if (!token) {
            showMessage('Please login first');
            return;
        }
        
        // Get rating (count filled stars)
        const rating = document.querySelectorAll('.star.filled').length;
        const comment = document.querySelector('textarea').value;
        const sessionSelect = document.getElementById('session-select');
        const sessionId = sessionSelect ? sessionSelect.value : null;
        
        if (!rating) {
            showMessage('Please provide a rating');
            return;
        }
        
        if (!comment.trim()) {
            showMessage('Please provide a comment');
            return;
        }
        
        if (!sessionId) {
            showMessage('Please select a session');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/feedback`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sessionId, rating, comment })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showMessage('Feedback submitted successfully!');
                feedbackForm.reset();
                document.querySelectorAll('.star').forEach(s => s.classList.remove('filled'));
                loadAvailableFeedbackSessions(); // Reload available sessions
            } else {
                showMessage(data.message || 'Feedback submission failed');
            }
        } catch (error) {
            showMessage('Connection error. Please try again.');
        }
    });
}

// Handle profile form
function handleProfileForm() {
    const profileForm = document.querySelector('#profile-form');
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage !== 'student-details.html' || !profileForm) return;
    
    // Add real-time validation
    addFormValidation(profileForm);
    
    profileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const token = localStorage.getItem('token');
        if (!token) {
            showMessage('Please login first');
            return;
        }
        
        // Validate form before submission
        if (!validateForm(profileForm)) {
            showMessage('Please fix the errors and try again');
            return;
        }
        
        // Get form data
        const profileData = {
            fullName: profileForm.querySelector('input[name="fullName"]')?.value.trim() || '',
            email: profileForm.querySelector('input[name="email"]')?.value.trim() || '',
            phone: profileForm.querySelector('input[name="phone"]')?.value.trim() || '',
            department: profileForm.querySelector('input[name="department"]')?.value.trim() || '',
            year: profileForm.querySelector('select[name="year"]')?.value || ''
        };
        
        try {
            const response = await fetch(`${API_URL}/users/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Update local storage
                const user = JSON.parse(localStorage.getItem('user'));
                user.hasCompletedProfile = data.hasCompletedProfile;
                Object.assign(user, profileData);
                localStorage.setItem('user', JSON.stringify(user));
                
                // Show success view
                showSuccessView(profileData);
            } else {
                showMessage(data.message || 'Profile update failed');
            }
        } catch (error) {
            showMessage('Connection error. Please try again.');
        }
    });
}

// Add real-time form validation
function addFormValidation(form) {
    const inputs = form.querySelectorAll('input, select');
    
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(input);
        });
        
        input.addEventListener('input', function() {
            clearError(input);
        });
    });
}

// Validate individual field
function validateField(field) {
    const value = field.value.trim();
    const name = field.name;
    let isValid = true;
    let errorMessage = '';
    
    switch(name) {
        case 'fullName':
            if (!value) {
                errorMessage = 'Full name is required';
                isValid = false;
            } else if (value.length < 2) {
                errorMessage = 'Name must be at least 2 characters';
                isValid = false;
            } else if (!/^[A-Za-z\s]+$/.test(value)) {
                errorMessage = 'Name can only contain letters and spaces';
                isValid = false;
            }
            break;
            
        case 'email':
            if (!value) {
                errorMessage = 'Email is required';
                isValid = false;
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                errorMessage = 'Please enter a valid email address';
                isValid = false;
            }
            break;
            
        case 'phone':
            if (!value) {
                errorMessage = 'Phone number is required';
                isValid = false;
            } else if (!/^[0-9]{10}$/.test(value)) {
                errorMessage = 'Phone number must be exactly 10 digits';
                isValid = false;
            }
            break;
            
        case 'department':
            if (!value) {
                errorMessage = 'Department is required';
                isValid = false;
            } else if (value.length < 2) {
                errorMessage = 'Department must be at least 2 characters';
                isValid = false;
            }
            break;
            
        case 'year':
            if (!value) {
                errorMessage = 'Please select your year';
                isValid = false;
            }
            break;
    }
    
    showFieldError(field, errorMessage);
    return isValid;
}

// Show field error
function showFieldError(field, message) {
    const errorElement = document.getElementById(`${field.name}-error`);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.color = '#d32f2f';
        errorElement.style.fontSize = '12px';
        errorElement.style.marginTop = '4px';
    }
    
    if (message) {
        field.style.borderColor = '#d32f2f';
    } else {
        field.style.borderColor = '';
    }
}

// Clear field error
function clearError(field) {
    showFieldError(field, '');
}

// Validate entire form
function validateForm(form) {
    const inputs = form.querySelectorAll('input[required], select[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!validateField(input)) {
            isValid = false;
        }
    });
    
    return isValid;
}

// Show success view
function showSuccessView(profileData) {
    document.getElementById('profile-form-container').style.display = 'none';
    document.getElementById('success-view').style.display = 'block';
    document.getElementById('details-view').style.display = 'none';
    
    // Store profile data for details view
    window.savedProfileData = profileData;
    
    // Immediately populate the details elements
    setTimeout(() => {
        document.getElementById('display-fullName').textContent = profileData.fullName;
        document.getElementById('display-email').textContent = profileData.email;
        document.getElementById('display-phone').textContent = profileData.phone;
        document.getElementById('display-department').textContent = profileData.department;
        document.getElementById('display-year').textContent = profileData.year;
    }, 100);
}

// Show details view
function showDetailsView() {
    document.getElementById('success-view').style.display = 'none';
    document.getElementById('details-view').style.display = 'block';
    
    // Populate details
    const data = window.savedProfileData;
    if (data) {
        document.getElementById('display-fullName').textContent = data.fullName;
        document.getElementById('display-email').textContent = data.email;
        document.getElementById('display-phone').textContent = data.phone;
        document.getElementById('display-department').textContent = data.department;
        document.getElementById('display-year').textContent = data.year;
    }
}

// Populate details view
function populateDetailsView(data) {
    if (data) {
        document.getElementById('display-fullName').textContent = data.fullName;
        document.getElementById('display-email').textContent = data.email;
        document.getElementById('display-phone').textContent = data.phone;
        document.getElementById('display-department').textContent = data.department;
        document.getElementById('display-year').textContent = data.year;
    }
}

// Enable modification
function enableModification() {
    document.getElementById('profile-form-container').style.display = 'block';
    document.getElementById('success-view').style.display = 'none';
    document.getElementById('details-view').style.display = 'none';
    
    // Re-populate form with current data
    const data = window.savedProfileData;
    if (data) {
        const form = document.getElementById('profile-form');
        form.querySelector('input[name="fullName"]').value = data.fullName || '';
        form.querySelector('input[name="email"]').value = data.email || '';
        form.querySelector('input[name="phone"]').value = data.phone || '';
        form.querySelector('input[name="department"]').value = data.department || '';
        form.querySelector('select[name="year"]').value = data.year || '';
    }
}

// Edit individual field
function editField(fieldName) {
    const displayElement = document.getElementById(`display-${fieldName}`);
    const currentValue = displayElement.textContent;
    
    let inputHtml;
    if (fieldName === 'year') {
        inputHtml = `
            <select id="edit-${fieldName}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                <option value="1st Year" ${currentValue === '1st Year' ? 'selected' : ''}>1st Year</option>
                <option value="2nd Year" ${currentValue === '2nd Year' ? 'selected' : ''}>2nd Year</option>
            </select>
        `;
    } else {
        const inputType = fieldName === 'email' ? 'email' : fieldName === 'phone' ? 'tel' : 'text';
        inputHtml = `<input type="${inputType}" id="edit-${fieldName}" value="${currentValue}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">`;
    }
    
    displayElement.innerHTML = `
        ${inputHtml}
        <div style="margin-top: 8px;">
            <button onclick="saveField('${fieldName}')" style="background: #4caf50; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 5px;">Save</button>
            <button onclick="cancelEdit('${fieldName}', '${currentValue}')" style="background: #f44336; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Cancel</button>
        </div>
    `;
}

// Save individual field
async function saveField(fieldName) {
    const inputElement = document.getElementById(`edit-${fieldName}`);
    const newValue = inputElement.value.trim();
    
    if (!newValue) {
        showMessage('Field cannot be empty');
        return;
    }
    
    // Validate field
    if (fieldName === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newValue)) {
        showMessage('Please enter a valid email address');
        return;
    }
    
    if (fieldName === 'phone' && !/^[0-9]{10}$/.test(newValue)) {
        showMessage('Phone number must be exactly 10 digits');
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        showMessage('Please login first');
        return;
    }
    
    try {
        const updateData = {};
        updateData[fieldName] = newValue;
        
        const response = await fetch(`${API_URL}/users/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (response.ok) {
            // Update display and saved data
            document.getElementById(`display-${fieldName}`).textContent = newValue;
            window.savedProfileData[fieldName] = newValue;
            showMessage('Field updated successfully!');
        } else {
            const data = await response.json();
            showMessage(data.message || 'Update failed');
        }
    } catch (error) {
        showMessage('Connection error. Please try again.');
    }
}

// Cancel field edit
function cancelEdit(fieldName, originalValue) {
    document.getElementById(`display-${fieldName}`).textContent = originalValue;
}

// Make functions global
window.showDetailsView = showDetailsView;
window.showSuccessView = () => {
    document.getElementById('profile-form-container').style.display = 'none';
    document.getElementById('success-view').style.display = 'block';
    document.getElementById('details-view').style.display = 'none';
};
window.enableModification = enableModification;
window.editField = editField;
window.saveField = saveField;
window.cancelEdit = cancelEdit;

// Load data for current page
function loadPageData() {
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'student-session.html') {
        loadSessions();
        loadMyRegisteredSessions();
    }
    
    if (currentPage === 'student-details.html') {
        loadUserProfile();
    }
    
    if (currentPage === 'admin.html') {
        loadAdminData();
        handleSessionForm();
    }
    
    if (currentPage === 'counselor.html') {
        loadCounselorData();
    }
}

// Load sessions for student session page
async function loadSessions() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/sessions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const sessions = await response.json();
            displaySessions(sessions);
        }
    } catch (error) {
        console.error('Error loading sessions:', error);
    }
}

// Load user's registered sessions
async function loadMyRegisteredSessions() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/sessions/all-my-sessions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const sessions = await response.json();
            displayMyRegisteredSessions(sessions);
        }
    } catch (error) {
        console.error('Error loading registered sessions:', error);
    }
}

// Display sessions on page (only show unregistered sessions)
function displaySessions(sessions) {
    const container = document.querySelector('.sessions-container');
    if (!container) return;
    
    // Show all confirmed sessions (including registered ones)
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const availableSessions = sessions.filter(session => 
        session.status === 'confirmed'
    );
    
    // Check if user is registered for ANY session (to show "Already Registered" for all other sessions)
    const userRegisteredSessions = availableSessions.filter(session =>
        session.registrations.some(reg => {
            const regId = typeof reg === 'string' ? reg : (reg.user ? (typeof reg.user === 'string' ? reg.user : reg.user._id) : reg._id);
            return regId === currentUser.id;
        })
    );
    
    const isUserAlreadyRegistered = userRegisteredSessions.length > 0;
    
    if (availableSessions.length === 0) {
        container.innerHTML = '<div class="no-sessions card"><p>No sessions available for registration</p></div>';
        return;
    }
    
    container.innerHTML = availableSessions.map(session => {
        // Check if current user is registered for this session
        const isUserRegistered = session.registrations.some(reg => {
            const regId = typeof reg === 'string' ? reg : (reg.user ? (typeof reg.user === 'string' ? reg.user : reg.user._id) : reg._id);
            return regId === currentUser.id;
        });
        
        let buttonDisabled, buttonText, buttonClass, buttonStyle = '';
        
        // Check if user is in waitlist
        const isUserInWaitlist = session.waitlist && session.waitlist.some(w => {
            const wUserId = typeof w === 'string' ? w : (w.user ? (typeof w.user === 'string' ? w.user : w.user._id) : w._id);
            return wUserId === currentUser.id;
        });
        
        if (isUserRegistered) {
            // User is registered for THIS session - show green button with days remaining
            const sessionDate = new Date(session.date);
            const today = new Date();
            const daysRemaining = Math.ceil((sessionDate - today) / (1000 * 60 * 60 * 24));
            
            buttonDisabled = 'disabled';
            buttonText = `Registered ✓<br><small>${daysRemaining} days to go</small>`;
            buttonClass = 'btn btn-success';
            buttonStyle = 'background: #4caf50; color: white; font-size: 12px; line-height: 1.2;';
        } else if (isUserInWaitlist) {
            // User is in waitlist for THIS session - show pending status
            buttonDisabled = 'disabled';
            buttonText = 'Pending';
            buttonClass = 'btn btn-warning';
            buttonStyle = 'background: #ff9800; color: white;';
        } else if (isUserAlreadyRegistered) {
            // User is registered for ANOTHER session - show disabled gray button
            buttonDisabled = 'disabled';
            buttonText = 'Register';
            buttonClass = 'btn btn-secondary';
            buttonStyle = 'background: #9e9e9e; color: white; font-size: 12px; cursor: not-allowed;';
        } else {
            // User is NOT registered for any session - normal flow
            // Check if session is within 2 days
            const sessionDate = new Date(session.date);
            const today = new Date();
            const daysUntilSession = Math.ceil((sessionDate - today) / (1000 * 60 * 60 * 24));
            
            if (daysUntilSession <= 2 && session.registrations.length >= session.maxCapacity) {
                // Within 2 days and actually full (10 confirmed) - show Full
                buttonDisabled = 'disabled';
                buttonText = 'Full';
                buttonClass = 'btn btn-secondary';
            } else if (session.registrations.length >= 6 && daysUntilSession > 2) {
                // Spots 7+ always show as pending until 2 days before
                buttonDisabled = '';
                buttonText = 'Register';
                buttonClass = 'btn btn-primary';
            } else {
                // Available for direct registration (spots 1-6)
                buttonDisabled = '';
                buttonText = 'Register';
                buttonClass = 'btn btn-primary';
            }
        }
        
        return `
            <div class="session-item card">
                <div class="session-left">
                    <div class="stethoscope-icon" style="background-image: url('assets/stethoscope.png');"></div>
                    <div>
                        <div class="doctor-name">Dr. ${session.counselor.fullName || session.counselor.username}</div>
                        <div class="datetime" style="color:var(--blue-800); font-size:13px;">
                            ${session.topic} — ${new Date(session.date).toLocaleDateString()} • ${session.time}
                        </div>

                    </div>
                </div>
                <div class="session-right">
                    <div class="calendar-icon" style="background-image: url('assets/calendar.png');"></div>
                    <button class="register-btn ${buttonClass}" 
                            data-session-id="${session._id}" 
                            data-session-date="${session.date}"
                            style="${buttonStyle}"
                            ${buttonDisabled}>
                        ${buttonText}
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Event listeners are handled by delegation, no need to re-attach
}

// Display user's registered sessions
function displayMyRegisteredSessions(sessions) {
    const container = document.querySelector('.my-sessions-container');
    if (!container) return;
    
    if (sessions.length === 0) {
        container.innerHTML = `
            <div class="no-sessions card">
                <div class="calendar-large" style="background-image: url('assets/calendar.png');"></div>
                <p>No Sessions Registered yet</p>
            </div>
        `;
        return;
    }
    
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    container.innerHTML = sessions.map(session => {
        const statusColor = session.status === 'cancelled' ? '#d32f2f' : (session.isWaitlisted ? '#ff9800' : '#1976d2');
        const statusBgColor = session.status === 'cancelled' ? '#ffebee' : (session.isWaitlisted ? '#fff3e0' : '#e3f2fd');
        const statusText = session.status === 'cancelled' ? 'CANCELLED' : (session.isWaitlisted ? 'WAITLISTED' : session.status.charAt(0).toUpperCase() + session.status.slice(1));
        const sessionDate = new Date(session.date);
        const now = new Date();
        const isFuture = sessionDate > now;
        
        // Find user's registration info to get tier and rank
        const userReg = session.registrations && session.registrations.find(reg => {
            const regUserId = typeof reg === 'string' ? reg : (reg.user ? (typeof reg.user === 'string' ? reg.user : reg.user._id) : reg._id);
            return regUserId === currentUser.id;
        });
        
        const tierLabels = { 1: 'FIFO', 2: 'Priority', 3: 'Hybrid' };
        const tierInfo = userReg && userReg.tier ? `Tier: ${tierLabels[userReg.tier]} | Rank: #${userReg.rank}` : '';
        
        // Apply strikethrough style if cancelled
        const strikeStyle = session.status === 'cancelled' ? 'text-decoration: line-through; opacity: 0.6;' : '';
        
        let html = `
            <div class="session-item card" style="${session.status === 'cancelled' ? 'opacity: 0.7; border-left: 4px solid #d32f2f;' : (session.isWaitlisted ? 'border-left: 4px solid #ff9800;' : 'border-left: 4px solid #4caf50;')}">
                <div class="session-left">
                    <div class="stethoscope-icon" style="background-image: url('assets/stethoscope.png');"></div>
                    <div>
                        <div class="doctor-name" style="${strikeStyle}">Dr. ${session.counselor.fullName}</div>
                        <div class="datetime" style="color:var(--blue-800); font-size:13px; ${strikeStyle}">
                            ${session.topic} — ${sessionDate.toLocaleDateString()} • ${session.time}
                        </div>
                        <div style="font-size:12px; color:${statusColor}; font-weight: bold; background: ${statusBgColor}; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-bottom: 8px;">
                            ${statusText}
                        </div>
        `;
        
        if (tierInfo && !session.isWaitlisted && session.status !== 'cancelled') {
            html += `
                        <div style="font-size:12px; color:#4caf50; margin-top: 8px; padding: 8px; background: #f1f8e9; border-radius: 4px; font-weight: bold;">
                            ✓ ${tierInfo}
                        </div>
            `;
        }
        
        if (session.isWaitlisted && session.status !== 'cancelled') {
            html += `
                        <div style="font-size:12px; color:#ff9800; margin-top: 8px; padding: 8px; background: #fff9e6; border-radius: 4px;">
                            <strong>⏳ Position in Waitlist:</strong> #${session.waitlistPosition}
                        </div>
            `;
        }
        
        if (session.status === 'cancelled' && session.rescheduledTo) {
            const newSession = session.rescheduledTo;
            html += `
                        <div style="font-size:12px; color:#4caf50; margin-top: 8px; padding: 8px; background: #f1f8e9; border-radius: 4px;">
                            <strong>✓ Rescheduled to:</strong> ${new Date(newSession.date).toLocaleDateString()} at ${newSession.time}
                        </div>
            `;
        }
        
        // Show cancel button only for confirmed future sessions that are not waitlisted
        // For cancelled sessions, show strikethrough grey cancel button
        if (isFuture && !session.isWaitlisted) {
            if (session.status === 'confirmed') {
                html += `
                            <div style="margin-top: 12px;">
                                <button class="cancel-session-btn" onclick="cancelSessionRegistration('${session._id}')" 
                                        style="padding: 8px 16px; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold;">
                                    ❌ CANCEL REGISTRATION
                                </button>
                            </div>
                `;
            } else if (session.status === 'cancelled') {
                html += `
                            <div style="margin-top: 12px;">
                                <button class="cancel-session-btn" disabled
                                        style="padding: 8px 16px; background: #9e9e9e; color: #666; border: none; border-radius: 4px; cursor: not-allowed; font-size: 13px; font-weight: bold; text-decoration: line-through;">
                                    ❌ CANCEL REGISTRATION
                                </button>
                            </div>
                `;
            }
        }
        
        html += `
                    </div>
                </div>
            </div>
        `;
        
        return html;
    }).join('');
}

// Load available sessions for feedback
async function loadAvailableFeedbackSessions() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/feedback/available-sessions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const sessions = await response.json();
            populateSessionSelect(sessions);
        }
    } catch (error) {
        console.error('Error loading feedback sessions:', error);
    }
}

// Populate session select dropdown
function populateSessionSelect(sessions) {
    const sessionSelect = document.getElementById('session-select');
    if (!sessionSelect) return;
    
    sessionSelect.innerHTML = '<option value="">Select a completed session</option>';
    
    sessions.forEach(session => {
        const option = document.createElement('option');
        option.value = session._id;
        option.textContent = `${session.counselor.fullName} - ${new Date(session.date).toLocaleDateString()} ${session.time}`;
        sessionSelect.appendChild(option);
    });
}

// Load user profile
async function loadUserProfile() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/users/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const user = await response.json();
            fillUserForm(user);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Fill user form with data
function fillUserForm(user) {
    // If profile is complete, show only success view
    if (user.hasCompletedProfile) {
        document.getElementById('profile-form-container').style.display = 'none';
        document.getElementById('success-view').style.display = 'block';
        window.savedProfileData = {
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            department: user.department,
            year: user.year
        };
        return;
    }
    
    const form = document.querySelector('#profile-form');
    if (!form) return;
    
    // Fill form fields for incomplete profiles
    const nameInput = form.querySelector('input[name="fullName"]');
    const emailInput = form.querySelector('input[name="email"]');
    const phoneInput = form.querySelector('input[name="phone"]');
    const deptInput = form.querySelector('input[name="department"]');
    const yearSelect = form.querySelector('select[name="year"]');
    
    if (nameInput && user.fullName) nameInput.value = user.fullName;
    if (emailInput && user.email) emailInput.value = user.email;
    if (phoneInput && user.phone) phoneInput.value = user.phone;
    if (deptInput && user.department) deptInput.value = user.department;
    if (yearSelect && user.year) yearSelect.value = user.year;
}

// Make form read-only after saving
function makeFormReadOnly() {
    const form = document.querySelector('#profile-form');
    if (!form) return;
    
    // Disable all inputs
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.disabled = true;
        input.style.backgroundColor = '#f5f5f5';
        input.style.color = '#666';
    });
    
    // Change save button to show completion
    const saveBtn = form.querySelector('.save-details-btn');
    if (saveBtn) {
        saveBtn.textContent = 'Details Saved Successfully ✓';
        saveBtn.disabled = true;
        saveBtn.style.backgroundColor = '#4caf50';
        saveBtn.style.color = 'white';
    }
    
    // Update form title
    const title = document.querySelector('.details-form h2');
    if (title) {
        title.textContent = 'Personal Details (Completed)';
    }
}

// Load admin data
async function loadAdminData() {
    loadAdminSessions();
    loadCounselors();
}

// Load counselors for admin
async function loadCounselors() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const users = await response.json();
            const counselors = users.filter(user => user.role === 'counselor');
            displayCounselors(counselors);
            populateCounselorSelect(counselors);
        }
    } catch (error) {
        console.error('Error loading counselors:', error);
    }
}

// Display counselors in admin page
function displayCounselors(counselors) {
    const container = document.querySelector('.counselors-container');
    if (!container) return;
    
    container.innerHTML = counselors.map(counselor => `
        <div class="counselor-item">
            <div class="counselor-left">
                <div class="stethoscope-icon"></div>
                <div class="counselor-info">
                    <span class="name">${counselor.fullName}</span>
                    <div class="calendar-small"></div>
                </div>
            </div>
            <button class="request-session-btn" onclick="openSessionModal('${counselor._id}')">Request Session</button>
        </div>
    `).join('');
}

// Populate counselor select dropdown
function populateCounselorSelect(counselors) {
    const select = document.getElementById('counselor-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Counselor</option>' + 
        counselors.map(counselor => 
            `<option value="${counselor._id}">${counselor.fullName}</option>`
        ).join('');
}

// Open session creation modal
function openSessionModal(counselorId = '') {
    const modal = document.getElementById('session-modal');
    const select = document.getElementById('counselor-select');
    
    if (counselorId) {
        select.value = counselorId;
    }
    
    modal.style.display = 'flex';
}

// Close session creation modal
function closeSessionModal() {
    const modal = document.getElementById('session-modal');
    const form = document.getElementById('session-form');
    
    modal.style.display = 'none';
    form.reset();
}

// Handle session form submission
function handleSessionForm() {
    const form = document.getElementById('session-form');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const token = localStorage.getItem('token');
        if (!token) {
            showMessage('Please login first');
            return;
        }
        
        const formData = {
            counselor: document.getElementById('counselor-select').value
        };
        
        try {
            const response = await fetch(`${API_URL}/sessions/request`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showMessage('Session request sent to counselor!');
                closeSessionModal();
                loadAdminSessions();
            } else {
                showMessage(data.message || 'Failed to create session');
            }
        } catch (error) {
            showMessage('Connection error. Please try again.');
        }
    });
}

// Load sessions for admin with registration counts
async function loadAdminSessions() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/sessions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const sessions = await response.json();
            displayAdminSessions(sessions);
        } else {
            console.error('Failed to load sessions:', response.status);
            const tbody = document.querySelector('.sessions-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="5">Failed to load sessions</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading admin sessions:', error);
        const tbody = document.querySelector('.sessions-table-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5">Error loading sessions</td></tr>';
        }
    }
}

// Display sessions in admin table
function displayAdminSessions(sessions) {
    const tbody = document.querySelector('.sessions-table-body');
    if (!tbody) return;
    
    // Separate sessions by status
    const activeSessions = sessions.filter(session => 
        (session.status === 'requested' || session.status === 'confirmed') &&
        !session.rescheduledFrom // Don't show old rescheduled sessions
    );
    
    const rescheduledSessions = sessions.filter(session => 
        session.status === 'cancelled' && session.rescheduledTo
    );
    
    const cancelledSessions = sessions.filter(session => 
        session.status === 'cancelled' && !session.rescheduledTo
    );
    
    if (activeSessions.length === 0 && rescheduledSessions.length === 0 && cancelledSessions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No sessions found</td></tr>';
        return;
    }
    
    let html = '';
    let sessionIndex = 1;
    
    // Display active sessions
    if (activeSessions.length > 0) {
        html += activeSessions.map((session) => {
            const counselorName = session.counselor ? 
                (session.counselor.fullName || session.counselor.username) : 'Unknown';
            const dateTime = session.status === 'requested' ? 'TBD' : 
                `${new Date(session.date).toLocaleDateString()} / ${session.time}`;
            
            return `
                <tr>
                    <td>${sessionIndex++}.</td>
                    <td>Dr. ${counselorName}</td>
                    <td>${dateTime}</td>
                    <td>
                        ${session.registrations ? session.registrations.length : 0} registered
                        ${session.waitlist && session.waitlist.length > 0 ? `<br><small style="color: #ff9800;">${session.waitlist.length} in waitlist</small>` : ''}
                    </td>
                    <td><span class="status-${session.status}">${session.status.toUpperCase()}</span></td>
                </tr>
            `;
        }).join('');
    }
    
    // Display cancelled/rescheduled sessions section
    if (rescheduledSessions.length > 0) {
        html += '<tr style="background: #ff9800; font-weight: bold; color: white;"><td colspan="5">⚠️ RESCHEDULED SESSIONS</td></tr>';
        html += rescheduledSessions.map((session) => {
            const counselorName = session.counselor ? 
                (session.counselor.fullName || session.counselor.username) : 'Unknown';
            const newSession = session.rescheduledTo;
            
            // Handle case where rescheduledTo might be just an ID or full object
            const newDate = typeof newSession === 'object' ? new Date(newSession.date) : null;
            const newTime = typeof newSession === 'object' ? newSession.time : 'TBD';
            const newRegistrations = typeof newSession === 'object' ? (newSession.registrations ? newSession.registrations.length : 0) : '?';
            const newDateStr = newDate ? newDate.toLocaleDateString() : 'TBD';
            
            return `
                <tr style="background: #fff3e0; border-left: 3px solid #ff9800;">
                    <td colspan="1"></td>
                    <td>Dr. ${counselorName}</td>
                    <td style="font-size: 12px;">
                        <strong style="color: #999;">Original (Cancelled):</strong> <span style="text-decoration: line-through; color: #999;">${new Date(session.date).toLocaleDateString()} / ${session.time}</span>
                        <br>
                        <strong style="color: #4caf50;">📌 New Session:</strong> <span style="color: #4caf50; font-weight: bold;">${newDateStr} / ${newTime}</span>
                    </td>
                    <td><strong style="color: #4caf50;">${newRegistrations}</strong> transferred</td>
                    <td><span class="status-cancelled" style="background: #4caf50;">RESCHEDULED ✓</span></td>
                </tr>
            `;
        }).join('');
    }
    
    // Display cancelled sessions section
    if (cancelledSessions.length > 0) {
        html += '<tr style="background: #d32f2f; font-weight: bold; color: white;"><td colspan="5">❌ CANCELLED SESSIONS</td></tr>';
        html += cancelledSessions.map((session) => {
            const counselorName = session.counselor ? 
                (session.counselor.fullName || session.counselor.username) : 'Unknown';
            
            return `
                <tr style="background: #ffebee; border-left: 3px solid #d32f2f;">
                    <td colspan="1"></td>
                    <td>Dr. ${counselorName}</td>
                    <td style="font-size: 12px; text-decoration: line-through; color: #999;">
                        ${new Date(session.date).toLocaleDateString()} / ${session.time}
                    </td>
                    <td style="color: #999; text-decoration: line-through;">${session.registrations ? session.registrations.length : 0} registered</td>
                    <td><span class="status-cancelled" style="background: #d32f2f;">CANCELLED</span></td>
                </tr>
            `;
        }).join('');
    }
    
    tbody.innerHTML = html;
}

// Load counselor data
async function loadCounselorData() {
    loadCounselorSessions();
}

// Load counselor's sessions
async function loadCounselorSessions() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/sessions/my-counselor-sessions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const sessions = await response.json();
            displayCounselorSessions(sessions);
        }
    } catch (error) {
        console.error('Error loading counselor sessions:', error);
    }
}

// Display counselor sessions
function displayCounselorSessions(sessions) {
    const requestsContainer = document.querySelector('.requests-container');
    const sessionsContainer = document.querySelector('.sessions-container');
    
    if (!requestsContainer || !sessionsContainer) return;
    
    // Filter session requests, confirmed sessions, and cancelled sessions
    const sessionRequests = sessions.filter(s => s.status === 'requested');
    const confirmedSessions = sessions.filter(s => s.status === 'confirmed');
    const cancelledSessions = sessions.filter(s => s.status === 'cancelled');
    
    // Display session requests only
    if (sessionRequests.length === 0) {
        requestsContainer.innerHTML = '<div class="no-requests"><p>No requests yet</p></div>';
    } else {
        requestsContainer.innerHTML = sessionRequests.map(session => `
            <div class="request-item requested">
                <div class="request-info">
                    <div class="request-text">Admin has requested a counseling session</div>
                    <div class="request-note">Please set the date, time, and topic</div>
                </div>
                <div class="buttons">
                    <button class="accept-btn" onclick="showSessionForm('${session._id}')">CREATE SESSION</button>
                    <button class="reject-btn" onclick="rejectSessionRequest('${session._id}')">DECLINE</button>
                </div>
            </div>
        `).join('');
    }
    
    // Display confirmed sessions
    let confirmedHTML = '';
    if (confirmedSessions.length === 0) {
        confirmedHTML = '<div class="no-sessions"><p>No active sessions</p></div>';
    } else {
        confirmedHTML = confirmedSessions.map(session => {
            const sessionDate = new Date(session.date);
            const now = new Date();
            const isFuture = sessionDate > now;
            const isRescheduled = session.rescheduledTo ? true : false;
            
            return `
                <div class="session-item confirmed" style="${isRescheduled ? 'border-left: 4px solid #ff9800; opacity: 0.8;' : ''}">
                    <div class="session-info">
                        <div class="session-time">${sessionDate.toLocaleDateString()} at ${session.time}</div>
                        <div class="session-topic">${session.topic}</div>
                        <div class="session-registrations">Registrations: ${session.registrations.length}</div>
                        ${isRescheduled ? `<div style="font-size: 12px; color: #ff9800; font-weight: bold; margin-top: 8px; padding: 6px 8px; background: #fff3e0; border-radius: 4px;">📌 This session has been RESCHEDULED</div>` : ''}
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        ${isFuture && !isRescheduled ? `
                            <button class="reschedule-btn" onclick="showRescheduleForm('${session._id}')" style="padding: 8px 16px; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">RESCHEDULE</button>
                            <button class="cancel-btn" onclick="cancelSession('${session._id}')" style="padding: 8px 16px; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">CANCEL</button>
                        ` : ''}
                        <div class="session-status status-confirmed" style="${isRescheduled ? 'background: #ff9800;' : ''}">
                            ${isRescheduled ? 'RESCHEDULED' : 'CONFIRMED'}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Display cancelled sessions
    let cancelledHTML = '';
    if (cancelledSessions.length > 0) {
        cancelledHTML = `
            <div style="margin-top: 30px;">
                <h3 style="color: #d32f2f; margin: 0 0 15px;">Cancelled Sessions</h3>
                ${cancelledSessions.map(session => {
                    const sessionDate = new Date(session.date);
                    const hasReschedule = session.rescheduledTo ? true : false;
                    
                    return `
                        <div class="session-item cancelled" style="background: #ffebee; border-left: 4px solid #d32f2f; opacity: 0.7;">
                            <div class="session-info">
                                <div style="color: #d32f2f; font-weight: bold; font-size: 12px; margin-bottom: 8px;">❌ CANCELLED</div>
                                <div class="session-time" style="text-decoration: line-through; color: #999;">${sessionDate.toLocaleDateString()} at ${session.time}</div>
                                <div class="session-topic" style="text-decoration: line-through; color: #999;">${session.topic}</div>
                                <div class="session-registrations" style="color: #999;">Registrations: ${session.registrations.length}</div>
                                ${hasReschedule ? `<div style="font-size: 12px; color: #4caf50; font-weight: bold; margin-top: 8px; padding: 6px 8px; background: #f1f8e9; border-radius: 4px;">✓ Rescheduled to new session</div>` : ''}
                            </div>
                            <div class="session-status status-cancelled" style="background: #d32f2f;">
                                CANCELLED
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    // Combine confirmed and cancelled sessions
    sessionsContainer.innerHTML = confirmedHTML + cancelledHTML;
    
    // Load rescheduled sessions
    loadRescheduledSessions();
}

// Show session creation form
function showSessionForm(requestId) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 1000;
    `;
    
    const today = new Date().toISOString().split('T')[0];
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 10px; width: 400px; max-width: 90%;">
            <h3 style="margin: 0 0 20px; color: #1976d2;">Create Session</h3>
            <form id="session-create-form">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Date:</label>
                    <input type="date" id="session-date" min="${today}" required 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Time:</label>
                    <input type="time" id="session-time" required 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Topic:</label>
                    <input type="text" id="session-topic" placeholder="Enter session topic" required 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" onclick="this.closest('.modal').remove()" 
                            style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
                    <button type="submit" 
                            style="padding: 8px 16px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">Create Session</button>
                </div>
            </form>
        </div>
    `;
    
    modal.className = 'modal';
    document.body.appendChild(modal);
    
    modal.querySelector('#session-create-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const date = document.getElementById('session-date').value;
        const time = document.getElementById('session-time').value;
        const topic = document.getElementById('session-topic').value;
        
        if (date && time && topic) {
            createSessionFromRequest(requestId, date, time, topic);
            modal.remove();
        }
    });
}

// Create session from request
async function createSessionFromRequest(requestId, date, time, topic) {
    const token = localStorage.getItem('token');
    if (!token) {
        showMessage('Please login first');
        return;
    }
    
    try {
        // Delete the request
        await fetch(`${API_URL}/sessions/${requestId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // Create new session
        const response = await fetch(`${API_URL}/sessions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ date, time, topic })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Session created successfully!');
            loadCounselorSessions();
        } else {
            showMessage(data.message || 'Failed to create session');
        }
    } catch (error) {
        showMessage('Connection error. Please try again.');
    }
}



// Reject session request
async function rejectSessionRequest(requestId) {
    const token = localStorage.getItem('token');
    if (!token) {
        showMessage('Please login first');
        return;
    }
    
    if (!confirm('Are you sure you want to decline this session request?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/sessions/${requestId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            showMessage('Session request declined');
            loadCounselorSessions();
        } else {
            showMessage('Failed to decline request');
        }
    } catch (error) {
        showMessage('Connection error. Please try again.');
    }
}

// Check if user is logged in for protected pages
function checkAuthentication() {
    const protectedPages = [
        'student-menu.html', 
        'admin.html', 
        'counselor.html', 
        'student-session.html', 
        'student-details.html', 
        'student-feedback.html'
    ];
    
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage) && !localStorage.getItem('token')) {
        window.location.href = 'index.html';
    }
}



// Feedback success flow functions
function showFeedbackSuccess() {
    document.getElementById('feedback-form-container').style.display = 'none';
    document.getElementById('feedback-success-view').style.display = 'block';
    document.getElementById('feedback-details-view').style.display = 'none';
}

function showFeedbackDetails() {
    document.getElementById('feedback-success-view').style.display = 'none';
    document.getElementById('feedback-details-view').style.display = 'block';
    
    // Populate feedback details
    const data = window.savedFeedbackData;
    if (data) {
        document.getElementById('display-session').textContent = data.session;
        document.getElementById('display-rating').textContent = '★'.repeat(data.rating) + '☆'.repeat(5 - data.rating) + ` (${data.rating}/5)`;
        document.getElementById('display-comments').textContent = data.comments;
    }
}

function enableFeedbackModification() {
    document.getElementById('feedback-form-container').style.display = 'block';
    document.getElementById('feedback-success-view').style.display = 'none';
    document.getElementById('feedback-details-view').style.display = 'none';
    
    // Re-populate form with current data
    const data = window.savedFeedbackData;
    if (data) {
        // Set rating stars
        document.querySelectorAll('.star').forEach((star, index) => {
            if (index < data.rating) {
                star.classList.add('filled');
            } else {
                star.classList.remove('filled');
            }
        });
        
        // Set comments
        document.getElementById('feedback-text').value = data.comments;
    }
}

// Make functions global for onclick handlers
window.showFeedbackDetails = showFeedbackDetails;
window.enableFeedbackModification = enableFeedbackModification;
window.showSessionForm = showSessionForm;
window.rejectSessionRequest = rejectSessionRequest;
window.openSessionModal = openSessionModal;
window.closeSessionModal = closeSessionModal;

// Show message to user
function showMessage(message) {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        color: #0d47a1;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        z-index: 10000;
        font-weight: 600;
        border-left: 4px solid #1976d2;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    messageDiv.textContent = message;
    
    // Add to page
    document.body.appendChild(messageDiv);
    
    // Show message
    setTimeout(() => messageDiv.style.transform = 'translateX(0)', 100);
    
    // Hide message after 3 seconds
    setTimeout(() => {
        messageDiv.style.transform = 'translateX(100%)';
        setTimeout(() => document.body.removeChild(messageDiv), 300);
    }, 3000);
}

// Load rescheduled sessions for counselor
async function loadRescheduledSessions() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Only load for counselors
    if (user.role !== 'counselor') return;
    
    const container = document.querySelector('.rescheduled-sessions-container');
    if (!container) return;
    
    try {
        const response = await fetch(`${API_URL}/sessions/my-rescheduled-sessions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const sessions = await response.json();
            displayRescheduledSessions(sessions, container);
        }
    } catch (error) {
        console.error('Error loading rescheduled sessions:', error);
        container.innerHTML = '<div class="no-sessions"><p>Error loading rescheduled sessions</p></div>';
    }
}

// Display rescheduled sessions
function displayRescheduledSessions(sessions, container) {
    if (sessions.length === 0) {
        container.innerHTML = '<div class="no-sessions"><p>No rescheduled sessions</p></div>';
        return;
    }
    
    container.innerHTML = sessions.map(session => {
        const newSession = session.rescheduledTo;
        const newDate = new Date(newSession.date);
        
        return `
            <div class="session-item rescheduled" style="border-left: 4px solid #ff9800; background: #fff9e6; padding: 16px;">
                <div class="session-info">
                    <div style="color: #ff5722; font-weight: bold; margin-bottom: 8px; font-size: 14px;">⚠️ CANCELLED & RESCHEDULED</div>
                    <div style="color: #666; font-size: 12px; margin-bottom: 12px;">Original session date has been cancelled</div>
                    <div class="session-time" style="text-decoration: line-through; color: #999;">${new Date(session.date).toLocaleDateString()} at ${session.time}</div>
                    <div class="session-topic" style="color: #999; text-decoration: line-through;">${session.topic}</div>
                    <hr style="margin: 12px 0; border: none; border-top: 1px solid #ddd;">
                    <div style="color: #4caf50; font-weight: bold; margin-bottom: 8px; font-size: 14px;">✓ NEW SESSION SCHEDULED</div>
                    <div class="session-time" style="color: #4caf50; font-weight: bold;">${newDate.toLocaleDateString()} at ${newSession.time}</div>
                    <div class="session-topic">${newSession.topic}</div>
                    <div class="session-registrations">Registrations: ${newSession.registrations.length}</div>
                </div>
                <div class="session-status status-cancelled" style="background: #ff9800;">RESCHEDULED</div>
            </div>
        `;
    }).join('');
}

// Show reschedule form
function showRescheduleForm(sessionId) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; align-items: center;
        justify-content: center; z-index: 1000;
    `;
    
    // Get current month boundaries
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    const minDate = today.toISOString().split('T')[0];
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 10px; width: 400px; max-width: 90%;">
            <h3 style="margin: 0 0 20px; color: #1976d2;">Reschedule Session</h3>
            <form id="reschedule-form">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">New Date (Current Month Only):</label>
                    <input type="date" id="reschedule-date" 
                           min="${minDate}" 
                           max="${currentMonthEnd}"
                           required 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    <small style="color: #666; margin-top: 4px; display: block;">Select a date in ${new Date(today.getFullYear(), today.getMonth()).toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}</small>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">New Time:</label>
                    <input type="time" id="reschedule-time" required 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Topic (optional):</label>
                    <input type="text" id="reschedule-topic" placeholder="Keep same topic or enter new one" 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" onclick="this.closest('.modal').remove()" 
                            style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
                    <button type="submit" 
                            style="padding: 8px 16px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">Reschedule</button>
                </div>
            </form>
        </div>
    `;
    
    modal.className = 'modal';
    document.body.appendChild(modal);
    
    modal.querySelector('#reschedule-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const newDate = document.getElementById('reschedule-date').value;
        const newTime = document.getElementById('reschedule-time').value;
        const newTopic = document.getElementById('reschedule-topic').value;
        
        if (newDate && newTime) {
            rescheduleSession(sessionId, newDate, newTime, newTopic);
            modal.remove();
        }
    });
}

// Reschedule session
async function rescheduleSession(sessionId, newDate, newTime, newTopic) {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token) {
        showMessage('Please login first');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/sessions/${sessionId}/reschedule`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                newDate,
                newTime,
                newTopic
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Session rescheduled successfully! All registered students have been notified.');
            // Reload data based on user role
            if (user.role === 'counselor') {
                loadCounselorSessions();
            } else if (user.role === 'admin') {
                loadAdminSessions();
            }
        } else {
            showMessage(data.message || 'Failed to reschedule session');
        }
    } catch (error) {
        showMessage('Connection error. Please try again.');
        console.error('Reschedule error:', error);
    }
}

// Cancel session (counselor only)
async function cancelSession(sessionId) {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token) {
        showMessage('Please login first');
        return;
    }
    
    if (!confirm('Are you sure you want to cancel this session? All registered students will be notified via email.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/sessions/${sessionId}/cancel`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('✓ Session cancelled successfully. Email notifications have been sent to all registered students.');
            // Reload data based on user role
            if (user.role === 'counselor') {
                loadCounselorSessions();
            } else if (user.role === 'admin') {
                loadAdminSessions();
            }
        } else {
            showMessage(data.message || 'Failed to cancel session');
        }
    } catch (error) {
        showMessage('Connection error. Please try again.');
        console.error('Cancel error:', error);
    }
}

// Cancel session registration (student)
async function cancelSessionRegistration(sessionId) {
    const token = localStorage.getItem('token');
    if (!token) {
        showMessage('Please login first');
        return;
    }
    
    if (!confirm('Are you sure you want to cancel this session registration? A student from the waitlist will take your spot if available.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/sessions/${sessionId}/cancel-registration`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (data.promoted) {
                showMessage('✓ Registration cancelled! A student from the waitlist has been promoted to your spot.');
            } else {
                showMessage('✓ Registration cancelled successfully. No students were on the waitlist.');
            }
            
            // Reload both sections to reflect changes
            setTimeout(() => {
                loadSessions();
                loadMyRegisteredSessions();
            }, 500);
        } else {
            showMessage(data.message || 'Failed to cancel registration');
        }
    } catch (error) {
        showMessage('Connection error. Please try again.');
        console.error('Cancel registration error:', error);
    }
}

