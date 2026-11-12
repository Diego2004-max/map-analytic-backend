import jwt from 'jsonwebtoken';
export function requireSession(req, res, next) {
  try {
    const token = req.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!Number.isSafeInteger(Number(payload.sub)) || Number(payload.sub) < 1) throw new Error('Invalid subject');
    req.userId = Number(payload.sub);
    next();
  } catch { res.status(401).json({ error: 'Tu sesión expiró. Inicia sesión nuevamente.' }); }
}
