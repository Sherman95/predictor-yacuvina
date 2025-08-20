import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
// If ADMIN_PASS_HASH provided (sha256 hex) it overrides plain password env
const passPlain = process.env.ADMIN_PASSWORD || 'changeme';
const passHashEnv = process.env.ADMIN_PASS_HASH; // expected sha256 hex
const ADMIN_PASS_HASH = passHashEnv || crypto.createHash('sha256').update(passPlain).digest('hex');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-please-change';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '2h';

export function login(req, res){
  console.log('[AUTH][LOGIN] body keys=', Object.keys(req.body||{}), 'origin=', req.headers.origin, 'content-type=', req.headers['content-type']);
  const { username, password } = req.body || {};
  if(!username || !password){
    return res.status(400).json({ ok:false, error:'Faltan credenciales' });
  }
  if(username !== ADMIN_USER){
    return res.status(401).json({ ok:false, error:'Credenciales inválidas' });
  }
  const incomingHash = crypto.createHash('sha256').update(password).digest('hex');
  if(incomingHash !== ADMIN_PASS_HASH){
    return res.status(401).json({ ok:false, error:'Credenciales inválidas' });
  }
  const token = jwt.sign({ sub: ADMIN_USER, role:'admin' }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  res.json({ ok:true, token, user:{ username: ADMIN_USER } });
}

export function me(_req, res){
  res.json({ ok:true, user: res.locals.user });
}

export function refresh(req, res){
  const user = res.locals.user;
  const token = jwt.sign({ sub: user.sub, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  res.json({ ok:true, token });
}

export function invalidate(_req, res){
  // Stateless JWT; client deletes token
  res.json({ ok:true, message:'Sesión finalizada' });
}

export function requireAuth(req, res, next){
  const auth = req.headers.authorization || '';
  if(!auth.startsWith('Bearer ')) return res.status(401).json({ error:'Token requerido'});
  const token = auth.slice(7);
  try{
    const payload = jwt.verify(token, JWT_SECRET);
    res.locals.user = payload;
    next();
  }catch(e){
    return res.status(401).json({ error:'Token inválido o expirado' });
  }
}
