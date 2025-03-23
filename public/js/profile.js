document.addEventListener('DOMContentLoaded', () => {
    if (!isAuthenticated()) {
        window.location.href = '/';
        return;
    }
    initializeTabs();
    loadUserProfile();
    loadUserPosts();
});

function initializeTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const tabContents = document.querySelectorAll('.tab-pane');
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });
}

async function loadUserProfile() {
    try {
        const response = await fetch('/api/profile', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch profile');
        
        const user = await response.json();
        document.getElementById('username').textContent = user.username;
        document.getElementById('navUsername').textContent = user.username;
        document.getElementById('userBio').textContent = user.bio || 'No bio yet';
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('joinDate').textContent = new Date(user.createdAt).toLocaleDateString();
        
        if (user.profilePic) {
            document.getElementById('profileImage').src = user.profilePic;
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showError('Failed to load profile');
    }
}

function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: message,
        timer: 3000,
        showConfirmButton: false
    });
}

async function editProfile() {
    const { value: formValues } = await Swal.fire({
        title: 'Edit Profile',
        html: `
            <input id="editBio" class="swal2-input" placeholder="Bio">
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Save',
        preConfirm: () => ({
            bio: document.getElementById('editBio').value
        })
    });

    if (formValues) {
        try {
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(formValues)
            });

            if (!response.ok) throw new Error('Failed to update profile');

            await loadUserProfile();
            Swal.fire('Success', 'Profile updated successfully', 'success');
        } catch (error) {
            console.error('Error updating profile:', error);
            Swal.fire('Error', 'Failed to update profile', 'error');
        }
    }
}

async function changeProfilePicture() {
    const { value: file } = await Swal.fire({
        title: 'Select profile picture',
        input: 'file',
        inputAttributes: {
            'accept': 'image/*',
            'aria-label': 'Upload your profile picture'
        }
    });

    if (file) {
        const formData = new FormData();
        formData.append('profilePic', file);

        try {
            const response = await fetch('/api/profile/picture', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: formData
            });

            if (!response.ok) throw new Error('Failed to upload picture');

            await loadUserProfile();
            Swal.fire('Success', 'Profile picture updated', 'success');
        } catch (error) {
            console.error('Error updating profile picture:', error);
            Swal.fire('Error', 'Failed to update profile picture', 'error');
        }
    }
}

async function editUsername() {
    const { value: newUsername } = await Swal.fire({
        title: 'Change Username',
        input: 'text',
        inputLabel: 'New Username',
        inputValue: document.getElementById('username').textContent,
        showCancelButton: true,
        inputValidator: (value) => {
            if (!value) {
                return 'Username cannot be empty!';
            }
            if (value.length < 3) {
                return 'Username must be at least 3 characters long!';
            }
        }
    });

    if (newUsername) {
        try {
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ username: newUsername })
            });

            if (!response.ok) throw new Error('Failed to update username');

            await loadUserProfile();
            localStorage.setItem('currentUser', newUsername);
            Swal.fire('Success', 'Username updated successfully', 'success');
        } catch (error) {
            console.error('Error updating username:', error);
            Swal.fire('Error', 'Failed to update username', 'error');
        }
    }
}
