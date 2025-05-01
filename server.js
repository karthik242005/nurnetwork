const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const MongoStore = require("connect-mongo");

dotenv.config();

const User = require("./models/User");
const Post = require("./models/Post"); // Ensure this model is correctly created

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ credentials: true, origin: "http://localhost:5000" }));

// Serve static files (e.g., home.html)
app.use(express.static(path.join(__dirname, "public")));

// Session configuration
app.use(
    session({
        secret: process.env.SESSION_SECRET || "your_secret_key",
        resave: false,
        saveUninitialized: false, // Don't create session until something is stored
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI, // Store sessions in MongoDB
            collectionName: "sessions",
            ttl: 14 * 24 * 60 * 60, // 14 days (session expiration)
        }),
        cookie: {
            secure: false, // Set to true if using HTTPS
            httpOnly: true, // Prevent client-side access
            maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
        },
    })
);

// Connect to MongoDB
mongoose
    .connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("❌ MongoDB connection error:", err));

// Authentication middleware
const checkAuth = (req, res, next) => {
    req.isAuthenticated = req.session.user ? true : false;
    next();
};

// **Serve home.html when hitting "/"**
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "home.html"));
});

// **User Authentication Routes**
app.post("/signup", async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: "All fields are required." });
    }

    try {
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ error: "Username or email already in use." });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ username, email, password: hashedPassword });

        await newUser.save();
        req.session.user = { id: newUser._id, username: newUser.username }; // ✅ Store session
        res.redirect("/dashboard.html");
        // ✅ Send success response with redirect
    } catch (error) {
        console.error("❌ Error registering user:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});


app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "All fields are required." });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ error: "Invalid username or password." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid username or password." });
        }

        req.session.user = { id: user._id, username: user.username };
        res.redirect("/dashboard.html");
        // ✅ Send success response
    } catch (error) {
        console.error("❌ Error during login:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});
app.get("/api/session", (req, res) => {
    if (!req.session.user) {
        return res.json({ error: "Not logged in" });
    }
    res.json({ username: req.session.user.username });
});

app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: "Could not log out." });
        res.json({ message: "Logout successful!" });
    });
});

// **POST ROUTES**
app.post("/api/posts/create", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized. Please log in." });
    }

    const { title, content } = req.body;
    if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required." });
    }

    try {
        const newPost = new Post({
            user: req.session.user.id,
            title,
            content,
        });
        await newPost.save();
        res.status(201).json(newPost);
    } catch (error) {
        console.error("❌ Error creating post:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

app.get("/api/posts", async (req, res) => {
    try {
        const posts = await Post.find()
            .populate("user", "username") // Ensure user data is populated
            .sort({ createdAt: -1 });

        res.json(posts);
    } catch (error) {
        console.error("❌ Error fetching posts:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});
app.post("/api/posts/:postId/respond", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized. Please log in." });
    }

    const { content } = req.body;
    const { postId } = req.params;

    if (!content) {
        return res.status(400).json({ error: "Response content is required." });
    }

    try {
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: "Post not found." });
        }

        post.responses.push({
            user: req.session.user.id,
            content,
        });

        await post.save();
        res.json({ message: "Response added successfully!" });
    } catch (error) {
        console.error("❌ Error adding response:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});
// Get a single discussion by ID
app.get("/api/posts/:id", async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate("user", "username")
            .populate("responses.user", "username");

        if (!post) {
            return res.status(404).json({ error: "Post not found." });
        }

        res.json(post);
    } catch (error) {
        console.error("❌ Error fetching post:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});
app.post("/api/posts/:id/response", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized. Please log in." });
    }

    const { content } = req.body;
    if (!content) {
        return res.status(400).json({ error: "Response content is required." });
    }

    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: "Post not found." });
        }

        const newResponse = {
            user: req.session.user.id,
            content,
        };

        post.responses.push(newResponse);
        await post.save();
        res.status(201).json({ message: "Response added successfully." });
    } catch (error) {
        console.error("❌ Error adding response:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});


// Add a reply to a discussion
app.post("/api/posts/:id/reply", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized. Please log in." });
    }

    const { content } = req.body;
    if (!content) {
        return res.status(400).json({ error: "Reply content is required." });
    }

    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: "Discussion not found." });
        }

        post.responses.push({
            user: req.session.user.id,
            content,
            createdAt: new Date(),
        });

        await post.save();
        res.status(201).json({ message: "Reply added successfully!" });
    } catch (error) {
        console.error("❌ Error posting reply:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
