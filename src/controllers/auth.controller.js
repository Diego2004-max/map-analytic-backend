import { OAuth2Client } from 'google-auth-library';
export class AuthController {
  constructor(clientId) { this.clientId = clientId; this.client = clientId ? new OAuth2Client(clientId) : null; }
  verifyGoogleCredential = async (req, res) => {
    if (!this.client) return res.status(503).json({ error: 'Google sign-in is not configured on the server.' });
    if (typeof req.body?.credential !== 'string') return res.status(400).json({ error: 'A Google credential is required.' });
    try { const ticket = await this.client.verifyIdToken({ idToken: req.body.credential, audience: this.clientId }); const payload = ticket.getPayload(); return res.json({ data: { id: payload.sub, name: payload.name, email: payload.email, picture: payload.picture } }); }
    catch { return res.status(401).json({ error: 'The Google credential could not be verified.' }); }
  };
}
