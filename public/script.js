document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const hamburger = document.querySelector('.hamburger');

    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        hamburger.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
            navLinks.classList.remove('active');
            hamburger.classList.remove('active');
        }
    });

    loadPosts();

    // Add scroll to top button
    const scrollTop = document.createElement('button');
    scrollTop.className = 'scroll-top';
    scrollTop.innerHTML = '<i class="fas fa-arrow-up"></i>';
    document.body.appendChild(scrollTop);

    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            scrollTop.classList.add('visible');
        } else {
            scrollTop.classList.remove('visible');
        }
    });

    scrollTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    updateNavbar();
});

function updateNavbar() {
    const authButtons = document.querySelector('.auth-buttons');
    const userMenu = document.querySelector('.user-menu');
    
    if (isAuthenticated()) {
        authButtons.innerHTML = `
            <div class="user-menu">
                <span class="username">${currentUser}</span>
                <div class="dropdown-menu">
                    <a href="/profile.html" class="dropdown-item">
                        <i class="fas fa-user"></i> Profile
                    </a>
                    <a href="#" onclick="logout()" class="dropdown-item">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </a>
                </div>
            </div>
        `;
    } else {
        authButtons.innerHTML = `
            <button onclick="showLoginForm()" class="btn btn-secondary">Login</button>
            <button onclick="showSignupForm()" class="btn btn-primary">Sign Up</button>
        `;
    }
}

const API_URL = ''; // Empty string since we're serving from same origin

// Handle post form submission
const postForm = document.getElementById('post-form');
postForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(postForm);
    const postData = {
        content: formData.get('content'),
        category: formData.get('category')
    };

    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error creating post');
        }
        
        postForm.reset();
        await loadPosts();
        
        Swal.fire({
            icon: 'success',
            title: 'Posted!',
            text: 'Your thought has been shared successfully',
            timer: 2000,
            showConfirmButton: false
        });
    } catch (error) {
        console.error('Error posting:', error);
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Failed to create post. Please try again.'
        });
    }
});

// Add user reaction tracking
function getUserReactions() {
    const stored = localStorage.getItem('userReactions');
    return stored ? JSON.parse(stored) : {};
}

function setUserReaction(postId, reactionType) {
    const reactions = getUserReactions();
    reactions[postId] = reactionType;
    localStorage.setItem('userReactions', JSON.stringify(reactions));
}

function removeUserReaction(postId) {
    const reactions = getUserReactions();
    delete reactions[postId];
    localStorage.setItem('userReactions', JSON.stringify(reactions));
}

// Add deletePost function
async function deletePost(postId) {
    try {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#6B4DE6',
            cancelButtonColor: '#FF6B6B',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            const response = await fetch(`/api/posts/${postId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete post');
            }

            removeUserReaction(postId);
            await loadPosts();

            Swal.fire(
                'Deleted!',
                'Your post has been deleted.',
                'success'
            );
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        Swal.fire(
            'Error!',
            'Failed to delete post. Please try again.',
            'error'
        );
    }
}

// Add editPost function
async function editPost(postId, currentContent, currentCategory) {
    try {
        const { value: formValues } = await Swal.fire({
            title: 'Edit Your Thought',
            html: `
                <select id="edit-category" class="swal2-select" required>
                    <option value="anxiety" ${currentCategory === 'anxiety' ? 'selected' : ''}>Anxiety</option>
                    <option value="depression" ${currentCategory === 'depression' ? 'selected' : ''}>Depression</option>
                    <option value="relationships" ${currentCategory === 'relationships' ? 'selected' : ''}>Relationships</option>
                    <option value="general" ${currentCategory === 'general' ? 'selected' : ''}>General</option>
                </select>
                <textarea id="edit-content" class="swal2-textarea" required>${currentContent}</textarea>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Save Changes',
            confirmButtonColor: '#6B4DE6',
            cancelButtonColor: '#FF6B6B',
            preConfirm: () => {
                return {
                    content: document.getElementById('edit-content').value,
                    category: document.getElementById('edit-category').value
                }
            }
        });

        if (formValues) {
            const response = await fetch(`/api/posts/${postId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formValues)
            });

            if (!response.ok) {
                throw new Error('Failed to update post');
            }

            await loadPosts();
            Swal.fire('Updated!', 'Your thought has been updated.', 'success');
        }
    } catch (error) {
        console.error('Error editing post:', error);
        Swal.fire('Error!', 'Failed to update post. Please try again.', 'error');
    }
}

// Update reaction mapping to match MongoDB schema
const REACTIONS = {
    likes: { emoji: '👍', label: 'Like' },
    love: { emoji: '❤️', label: 'Love' },
    hugs: { emoji: '🤗', label: 'Hug' },
    sad: { emoji: '😢', label: 'Sad' },
    angry: { emoji: '😠', label: 'Angry' },
    support: { emoji: '💪', label: 'Support' }
};

// Update loadPosts function
async function loadPosts() {
    try {
        const response = await fetch('/api/posts');
        if (!response.ok) {
            throw new Error('Failed to fetch posts');
        }
        const posts = await response.json();
        const postsContainer = document.getElementById('posts-container');
        const userReactions = getUserReactions();
        
        if (!posts || posts.length === 0) {
            postsContainer.innerHTML = '<p class="no-posts">No posts yet. Be the first to share!</p>';
            return;
        }

        postsContainer.innerHTML = posts.map(post => `
            <div class="post-card">
                <div class="post-header">
                    <span class="post-category">${post.category}</span>
                    <div class="post-actions">
                        <button onclick="editPost('${post.id}', '${post.content.replace(/'/g, "\\'")}', '${post.category}')" 
                            class="edit-btn" title="Edit post">✏️</button>
                        <button onclick="deletePost('${post.id}')" class="delete-btn" title="Delete post">🗑️</button>
                    </div>
                </div>
                <p class="post-content">${post.content}</p>
                <div class="post-reactions">
                    ${Object.entries(REACTIONS).map(([type, { emoji, label }]) => `
                        <button onclick="react('${post.id}', '${type}')" 
                            class="reaction-btn ${userReactions[post.id] === type ? 'active' : ''}">
                            ${emoji} ${post.reactions[type] || 0}
                        </button>
                    `).join('')}
                </div>
                <div class="comments-section">
                    <button onclick="addComment('${post.id}')" class="comment-btn">
                        <i class="fas fa-reply"></i> Reply
                    </button>
                    ${post.comments && post.comments.length > 0 ? `
                        <div class="comments-list">
                            ${post.comments.map(comment => `
                                <div class="comment">
                                    <p class="comment-content">${comment.content}</p>
                                    <span class="comment-time">${new Date(comment.timestamp).toLocaleString()}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading posts:', error);
        const postsContainer = document.getElementById('posts-container');
        postsContainer.innerHTML = '<p class="error-message">Failed to load posts. Please try again later.</p>';
    }
}

// Add reaction menu handlers
function showReactionMenu(element) {
    const menu = element.querySelector('.reaction-menu');
    menu.classList.add('active');
}

function hideReactionMenu(element) {
    const menu = element.querySelector('.reaction-menu');
    menu.classList.remove('active');
}

// Update react function to handle reaction types correctly
async function react(postId, reactionType) {
    try {
        const userReactions = getUserReactions();
        const currentReaction = userReactions[postId];

        // If user already reacted with this type, remove the reaction
        if (currentReaction === reactionType) {
            await fetch(`/api/posts/${postId}/react`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reactionType, remove: true })
            });
            removeUserReaction(postId);
        } else {
            // Remove previous reaction if exists
            if (currentReaction) {
                await fetch(`/api/posts/${postId}/react`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reactionType: currentReaction, remove: true })
                });
            }
            // Add new reaction
            await fetch(`/api/posts/${postId}/react`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reactionType })
            });
            setUserReaction(postId, reactionType);
        }

        await loadPosts();
    } catch (error) {
        console.error('Error reacting to post:', error);
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Failed to update reaction. Please try again.',
            timer: 2000,
            showConfirmButton: false
        });
    }
}

// Add comment function
async function addComment(postId) {
    try {
        const { value: content } = await Swal.fire({
            title: 'Add a Reply',
            input: 'textarea',
            inputLabel: 'Your reply',
            inputPlaceholder: 'Type your reply here...',
            showCancelButton: true,
            confirmButtonText: 'Reply',
            confirmButtonColor: '#6B4DE6',
            cancelButtonColor: '#FF6B6B',
            inputValidator: (value) => {
                if (!value) {
                    return 'Please write something!';
                }
            }
        });

        if (content) {
            const response = await fetch(`/api/posts/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });

            if (!response.ok) {
                throw new Error('Failed to add comment');
            }

            await loadPosts();
            Swal.fire('Posted!', 'Your reply has been added.', 'success');
        }
    } catch (error) {
        console.error('Error adding comment:', error);
        Swal.fire('Error!', 'Failed to add reply. Please try again.', 'error');
    }
}

// Add authentication UI functions
function showLoginForm() {
    Swal.fire({
        title: 'Login',
        html: `
            <input type="email" id="email" class="swal2-input" placeholder="Email">
            <input type="password" id="password" class="swal2-input" placeholder="Password">
        `,
        showCancelButton: true,
        confirmButtonText: 'Login',
        showLoaderOnConfirm: true,
        preConfirm: async () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const success = await login(email, password);
            if (!success) throw new Error('Invalid credentials');
            return success;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.reload();
        }
    }).catch(error => {
        Swal.showValidationMessage(error.message);
    });
}

function showSignupForm() {
    Swal.fire({
        title: 'Sign Up',
        html: `
            <input type="text" id="username" class="swal2-input" placeholder="Username">
            <input type="email" id="email" class="swal2-input" placeholder="Email">
            <input type="password" id="password" class="swal2-input" placeholder="Password">
        `,
        showCancelButton: true,
        confirmButtonText: 'Sign Up',
        showLoaderOnConfirm: true,
        preConfirm: async () => {
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const success = await signup(username, email, password);
            if (!success) throw new Error('Signup failed');
            return success;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.reload();
        }
    }).catch(error => {
        Swal.showValidationMessage(error.message);
    });
}