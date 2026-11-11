import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { dbPool } from '../config/database.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AuthController {
  constructor({ googleClientId, jwtSecret }) {
    this.googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;
    this.googleClientId = googleClientId;
    this.jwtSecret = jwtSecret;
  }

  createSession(user) {
    if (!this.jwtSecret) throw new Error('JWT_SECRET is not configured');
    const token = jwt.sign({ sub: user.id, email: user.email }, this.jwtSecret, { expiresIn: '8h' });
    return { token, user: { id: user.id, name: user.display_name, email: user.email } };
  }

  isSessionConfigured(res) {
    if (this.jwtSecret) return true;
    res.status(503).json({ error: 'Authentication is not configured on the server.' });
    return false;
  }

  register = async (req, res) => {
    if (!this.isSessionConfigured(res)) return;
    const { name, email, password } = req.body ?? {};
    if (typeof name !== 'string' || name.trim().length < 2 || !emailPattern.test(email || '') || typeof password !== 'string' || password.length < 10) return res.status(400).json({ error: 'Name, valid email, and a password of at least 10 characters are required.' });
    try {
      const passwordHash = await bcrypt.hash(password, 12);
      const { rows } = await dbPool.query('INSERT INTO app_users (email, display_name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, display_name', [email.trim().toLowerCase(), name.trim(), passwordHash]);
      return res.status(201).json({ data: this.createSession(rows[0]) });
    } catch (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'An account with this email already exists.' });
      return res.status(500).json({ error: 'Unable to create the account.' });
    }
  };

  login = async (req, res) => {
    if (!this.isSessionConfigured(res)) return;
    const { email, password } = req.body ?? {};
    if (!emailPattern.test(email || '') || typeof password !== 'string') return res.status(400).json({ error: 'Email and password are required.' });
    const { rows } = await dbPool.query('SELECT id, email, display_name, password_hash FROM app_users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (!rows[0]?.password_hash || !(await bcrypt.compare(password, rows[0].password_hash))) return res.status(401).json({ error: 'Invalid email or password.' });
    return res.json({ data: this.createSession(rows[0]) });
  };

  verifyGoogleCredential = async (req, res) => {
    if (!this.isSessionConfigured(res)) return;
    if (!this.googleClient || !this.googleClientId) return res.status(503).json({ error: 'Google sign-in is not configured on the server.' });
    try {
      const ticket = await this.googleClient.verifyIdToken({ idToken: req.body?.credential, audience: this.googleClientId });
      const profile = ticket.getPayload();
      if (!profile?.email_verified) return res.status(401).json({ error: 'Google account email is not verified.' });
      const { rows } = await dbPool.query(`INSERT INTO app_users (email, display_name, google_subject) VALUES ($1, $2, $3) ON CONFLICT (google_subject) DO UPDATE SET email = EXCLUDED.email, display_name = EXCLUDED.display_name, updated_at = CURRENT_TIMESTAMP RETURNING id, email, display_name`, [profile.email.toLowerCase(), profile.name || profile.email, profile.sub]);
      return res.json({ data: this.createSession(rows[0]) });
    } catch { return res.status(401).json({ error: 'The Google credential could not be verified.' }); }
  };
}
