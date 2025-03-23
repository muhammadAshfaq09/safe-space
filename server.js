require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const Post = require('./models/Post');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const auth = require('./middleware/auth');
const User = require('./models/User');
const multer = require('multer');

// Fix MongoDB connection string
mongoose.connect( process.env.MONGODB_URI ,  {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);  // Exit if MongoDB connection fails
});

app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Add authentication endpoints
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const user = new User({ username, email, password });
        await user.save();
        const token = jwt.sign({ userId: user._id },process.env.JWT_SECRET || 'your_jwt_secret');
        res.status(201).json({ token, username: user.username });
    } catch (error) {
        res.status(400).json({ error: 'Username or email already exists' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('Invalid credentials');
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }
        const token = jwt.sign({ userId: user._id }, 'your_jwt_secret');
        res.json({ token, username: user.username });
    } catch (error) {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Add profile endpoints
app.get('/api/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching profile' });
    }
});

app.put('/api/profile', auth, async (req, res) => {
    try {
        const updates = req.body;
        const user = await User.findByIdAndUpdate(
            req.userId,
            { ...updates },
            { new: true }
        ).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Error updating profile' });
    }
});

const storage = multer.diskStorage({
    destination: 'public/uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

app.post('/api/profile/picture', auth, upload.single('profilePic'), async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        user.profilePic = `/uploads/${req.file.filename}`;
        await user.save();
        res.json({ profilePic: user.profilePic });
    } catch (error) {
        res.status(500).json({ error: 'Error uploading picture' });
    }
});

app.post('/api/posts', async (req, res) => {
    try {
        const { content, category } = req.body;
        if (!content || !category) {
            return res.status(400).json({ error: 'Content and category are required' });
        }
        const post = new Post({ content, category });
        const savedPost = await post.save();
        res.status(201).json(savedPost);
    } catch (error) {
        console.error('Post creation error:', error);
        res.status(500).json({ error: 'Error creating post' });
    }
});

app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ timestamp: -1 });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching posts' });
    }
});

app.post('/api/posts/:id/react', async (req, res) => {
    try {
        const { id } = req.params;
        const { reactionType, remove } = req.body;
        const post = await Post.findById(id);
        
        if (post && post.reactions[reactionType] !== undefined) {
            if (remove && post.reactions[reactionType] > 0) {
                post.reactions[reactionType]--;
            } else if (!remove) {
                post.reactions[reactionType]++;
            }
            const updatedPost = await post.save();
            res.json(updatedPost);
        } else {
            res.status(404).json({ error: 'Post not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error updating reaction' });
    }
});

// Add comment to post
app.post('/api/posts/:id/comments', async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        
        if (!content) {
            return res.status(400).json({ error: 'Comment content is required' });
        }

        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        post.comments.push({ content });
        const updatedPost = await post.save();
        res.json(updatedPost);
    } catch (error) {
        console.error('Comment creation error:', error);
        res.status(500).json({ error: 'Error adding comment' });
    }
});

// Delete comment
app.delete('/api/posts/:postId/comments/:commentId', async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const post = await Post.findById(postId);
        
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        post.comments.id(commentId).remove();
        await post.save();
        res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Comment deletion error:', error);
        res.status(500).json({ error: 'Error deleting comment' });
    }
});

// Add edit endpoint before the catch-all route
app.put('/api/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { content, category } = req.body;
        
        if (!content || !category) {
            return res.status(400).json({ error: 'Content and category are required' });
        }

        const post = await Post.findByIdAndUpdate(
            id,
            { content, category },
            { new: true }
        );

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        res.json(post);
    } catch (error) {
        console.error('Post edit error:', error);
        res.status(500).json({ error: 'Error editing post' });
    }
});

// Add delete endpoint before the catch-all route
app.delete('/api/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.findByIdAndDelete(id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Post deletion error:', error);
        res.status(500).json({ error: 'Error deleting post' });
    }
});

// Serve index.html for all routes to support client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
