const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const connectDB = require('../db');

router.post('/login', async (req, res) => {
  try {
    await connectDB();
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET2 || process.env.JWT_SECRET || 'supersecretjuschiri',
      { expiresIn: '24h' }
    );

    res.json({ token, user: { email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware for checking token locally (for UI state)
const auth = require('../middleware/auth');
router.get('/me', auth, async (req, res) => {
    try {
        await connectDB();
        const user = await User.findById(req.userId).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
