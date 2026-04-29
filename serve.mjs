import { createServer }           from 'http';
import { readFile, writeFile }     from 'fs/promises';
import { extname, join }           from 'path';
import { fileURLToPath }           from 'url';
import { randomBytes }             from 'crypto';
import nodemailer                  from 'nodemailer';
import { config as emailCfg }      from './booking-config.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = 3000;
const BOOKINGS_FILE = join(ROOT, 'bookings.json');

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.json': 'application/json',
};

/* ── Email transport ── */
const transporter = nodemailer.createTransport(emailCfg.smtp);

/* ── Booking storage ── */
async function loadBookings() {
  try { return JSON.parse(await readFile(BOOKINGS_FILE, 'utf8')); }
  catch { return []; }
}
async function saveBookings(list) {
  await writeFile(BOOKINGS_FILE, JSON.stringify(list, null, 2), 'utf8');
}

/* ── Email helpers ── */
function ownerEmailHtml(b) {
  const base = emailCfg.serverUrl;
  return `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{margin:0;padding:0;background:#050f1a;font-family:'Helvetica Neue',Arial,sans-serif;color:#c8c4be}
  .wrap{max-width:600px;margin:0 auto;padding:40px 24px}
  .logo{font-size:22px;letter-spacing:.12em;text-transform:uppercase;color:#f0ebe3;margin-bottom:32px}
  .logo b{color:#1bc8bc;font-weight:400}
  .card{background:#0b2035;border:1px solid rgba(27,200,188,.12);padding:32px;margin-bottom:24px}
  h2{font-size:26px;color:#f0ebe3;font-weight:300;margin:0 0 8px}
  .badge{display:inline-block;padding:4px 12px;background:rgba(196,146,79,.15);border:1px solid rgba(196,146,79,.35);color:#c4924f;font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:24px}
  .row{display:flex;gap:16px;margin-bottom:12px}
  .label{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#6a7a86;width:120px;flex-shrink:0;padding-top:2px}
  .val{color:#f0ebe3;font-size:15px}
  .rule{height:1px;background:rgba(27,200,188,.09);margin:24px 0}
  .actions{display:flex;gap:12px;margin-top:8px}
  .btn{display:inline-block;padding:14px 32px;text-decoration:none;font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:500}
  .accept{background:#1bc8bc;color:#050f1a}
  .decline{background:transparent;border:1px solid rgba(224,82,82,.45);color:#e05252}
  .footer{font-size:11px;color:#6a7a86;margin-top:32px;line-height:1.8}
</style></head><body>
<div class="wrap">
  <div class="logo">Sea<b>Urchin</b></div>
  <div class="card">
    <div class="badge">New Booking Request</div>
    <h2>Booking #${b.id.slice(0,8).toUpperCase()}</h2>
    <p style="color:#6a7a86;margin:0 0 24px;font-size:13px">Submitted ${new Date(b.createdAt).toLocaleString('en-GB',{dateStyle:'full',timeStyle:'short'})}</p>
    <div class="rule"></div>
    <div class="row"><span class="label">Name</span><span class="val">${esc(b.name)}</span></div>
    <div class="row"><span class="label">Email</span><span class="val"><a href="mailto:${esc(b.email)}" style="color:#1bc8bc">${esc(b.email)}</a></span></div>
    <div class="row"><span class="label">Phone</span><span class="val">${esc(b.phone||'—')}</span></div>
    <div class="rule"></div>
    <div class="row"><span class="label">Service</span><span class="val">${esc(b.service)}</span></div>
    <div class="row"><span class="label">Date</span><span class="val">${esc(b.date)}</span></div>
    <div class="row"><span class="label">Time</span><span class="val">${esc(b.time)}</span></div>
    <div class="row"><span class="label">People</span><span class="val">${esc(String(b.people))}</span></div>
    <div class="row"><span class="label">Experience</span><span class="val">${esc(b.experience||'—')}</span></div>
    ${b.notes ? `<div class="rule"></div><div class="row"><span class="label">Notes</span><span class="val" style="white-space:pre-wrap">${esc(b.notes)}</span></div>` : ''}
    <div class="rule"></div>
    <div class="actions">
      <a href="${base}/api/booking/accept?token=${b.acceptToken}" class="btn accept">✓ Accept Booking</a>
      <a href="${base}/api/booking/decline?token=${b.declineToken}" class="btn decline">✕ Decline</a>
    </div>
  </div>
  <div class="footer">SeaUrchin Diving Center · Flic en Flac, Mauritius<br>This email was generated automatically by your booking system.</div>
</div></body></html>`;
}

function customerConfirmHtml(b) {
  return `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{margin:0;padding:0;background:#050f1a;font-family:'Helvetica Neue',Arial,sans-serif;color:#c8c4be}
  .wrap{max-width:600px;margin:0 auto;padding:40px 24px}
  .logo{font-size:22px;letter-spacing:.12em;text-transform:uppercase;color:#f0ebe3;margin-bottom:32px}
  .logo b{color:#1bc8bc;font-weight:400}
  .hero-line{font-size:36px;font-weight:300;color:#f0ebe3;line-height:1.15;margin-bottom:12px}
  .hero-line em{color:#1bc8bc;font-style:italic}
  .sub{color:#6a7a86;font-size:14px;line-height:1.7;margin-bottom:32px}
  .card{background:#0b2035;border:1px solid rgba(27,200,188,.12);padding:28px;margin-bottom:24px}
  .card-title{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#1bc8bc;margin-bottom:16px}
  .row{display:flex;gap:16px;margin-bottom:10px}
  .label{font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:#6a7a86;width:110px;flex-shrink:0;padding-top:2px}
  .val{color:#f0ebe3;font-size:14px}
  .rule{height:1px;background:rgba(27,200,188,.09);margin:20px 0}
  .cta{display:inline-block;margin-top:8px;padding:14px 32px;background:#1bc8bc;color:#050f1a;text-decoration:none;font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:500}
  .info-box{border-left:2px solid rgba(27,200,188,.3);padding:12px 16px;margin:24px 0;font-size:13px;color:#6a7a86;line-height:1.7}
  .footer{font-size:11px;color:#6a7a86;margin-top:32px;line-height:1.8}
</style></head><body>
<div class="wrap">
  <div class="logo">Sea<b>Urchin</b></div>
  <div class="hero-line">Your dive is<br><em>confirmed.</em></div>
  <p class="sub">We're thrilled to have you join us in the water. Here's everything you need for your visit.</p>
  <div class="card">
    <div class="card-title">Booking Details</div>
    <div class="row"><span class="label">Reference</span><span class="val">#${b.id.slice(0,8).toUpperCase()}</span></div>
    <div class="row"><span class="label">Service</span><span class="val">${esc(b.service)}</span></div>
    <div class="row"><span class="label">Date</span><span class="val">${esc(b.date)}</span></div>
    <div class="row"><span class="label">Time</span><span class="val">${esc(b.time)}</span></div>
    <div class="row"><span class="label">People</span><span class="val">${esc(String(b.people))}</span></div>
    <div class="rule"></div>
    <div class="row"><span class="label">Name</span><span class="val">${esc(b.name)}</span></div>
  </div>
  <div class="info-box">
    <strong style="color:#c8c4be">What to bring:</strong> swimwear, towel, sunscreen (reef-safe please), and your sense of adventure. All diving equipment is provided.<br><br>
    <strong style="color:#c8c4be">Where to find us:</strong> Royal Road / Coastal Road, Flic en Flac, Mauritius.<br><br>
    <strong style="color:#c8c4be">Questions?</strong> Call us on <a href="tel:+23045388825" style="color:#1bc8bc">+230 453 88 25</a> or WhatsApp <a href="https://wa.me/23058509487" style="color:#1bc8bc">+230 5850 9487</a>.
  </div>
  <a href="https://maps.google.com/?q=SeaUrchin+Flic+en+Flac+Mauritius" class="cta">View on Map</a>
  <div class="footer">SeaUrchin Diving Center · Flic en Flac, Mauritius<br>© 2024 SeaUrchin. Please do not reply to this automated email — contact us directly using the details above.</div>
</div></body></html>`;
}

function customerDeclineHtml(b) {
  return `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{margin:0;padding:0;background:#050f1a;font-family:'Helvetica Neue',Arial,sans-serif;color:#c8c4be}
  .wrap{max-width:600px;margin:0 auto;padding:40px 24px}
  .logo{font-size:22px;letter-spacing:.12em;text-transform:uppercase;color:#f0ebe3;margin-bottom:32px}
  .logo b{color:#1bc8bc;font-weight:400}
  .hero-line{font-size:32px;font-weight:300;color:#f0ebe3;line-height:1.2;margin-bottom:12px}
  .sub{color:#6a7a86;font-size:14px;line-height:1.7;margin-bottom:32px;max-width:440px}
  .cta{display:inline-block;padding:14px 32px;background:#1bc8bc;color:#050f1a;text-decoration:none;font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:500}
  .contact{margin-top:32px;font-size:13px;color:#6a7a86;line-height:1.8}
  .footer{font-size:11px;color:#6a7a86;margin-top:32px;line-height:1.8}
</style></head><body>
<div class="wrap">
  <div class="logo">Sea<b>Urchin</b></div>
  <div class="hero-line">We're sorry — that date<br>isn't available.</div>
  <p class="sub">Thank you for your interest in diving with us, ${esc(b.name.split(' ')[0])}. Unfortunately we're unable to accommodate your request for <strong style="color:#f0ebe3">${esc(b.date)} at ${esc(b.time)}</strong>.</p>
  <p class="sub">We'd love to find an alternative that works for you — please visit our site to choose a new date, or reach out directly and we'll help you find the perfect slot.</p>
  <a href="${emailCfg.serverUrl}/#book" class="cta">Try Another Date</a>
  <div class="contact">
    Or call us: <a href="tel:+23045388825" style="color:#1bc8bc">+230 453 88 25</a><br>
    WhatsApp: <a href="https://wa.me/23058509487" style="color:#1bc8bc">+230 5850 9487</a>
  </div>
  <div class="footer">SeaUrchin Diving Center · Flic en Flac, Mauritius</div>
</div></body></html>`;
}

/* ── Response page (shown in browser when owner clicks Accept/Decline) ── */
function responsePage(title, message, color, emoji) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — SeaUrchin</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Sans:opsz,wght@9..40,300;9..40,400&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#050f1a;font-family:'DM Sans',sans-serif;font-weight:300;color:#c8c4be;padding:2rem}
  .card{max-width:480px;width:100%;text-align:center}
  .icon{font-size:3rem;margin-bottom:1.5rem}
  h1{font-family:'Cormorant Garamond',serif;font-size:2.8rem;color:#f0ebe3;font-weight:300;margin-bottom:1rem}
  p{color:#6a7a86;line-height:1.75;margin-bottom:2rem}
  a{display:inline-block;padding:.8rem 2rem;background:${color};color:#050f1a;text-decoration:none;font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;font-weight:500}
  .rule{width:48px;height:1px;background:${color};margin:1.5rem auto}
</style></head><body>
<div class="card">
  <div class="icon">${emoji}</div>
  <h1>${title}</h1>
  <div class="rule"></div>
  <p>${message}</p>
  <a href="/">Back to Site</a>
</div></body></html>`;
}

/* ── HTML escape ── */
function esc(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Parse JSON body ── */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 50000) reject(new Error('too large')); });
    req.on('end',  () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('bad json')); } });
    req.on('error', reject);
  });
}

/* ── Send mail (non-fatal — logs errors) ── */
async function sendMail(opts) {
  try {
    await transporter.sendMail({ from: `"${emailCfg.fromName}" <${emailCfg.smtp.auth.user}>`, ...opts });
  } catch (err) {
    console.error('[mail error]', err.message);
  }
}

/* ════════════════════════════════════════
   HTTP SERVER
════════════════════════════════════════ */
createServer(async (req, res) => {

  const url    = new URL(req.url, `http://localhost:${PORT}`);
  const path   = url.pathname;

  /* ── POST /api/book ── */
  if (req.method === 'POST' && path === '/api/book') {
    try {
      const body = await parseBody(req);
      const { name, email, phone, service, date, time, people, experience, notes } = body;

      if (!name || !email || !service || !date || !time) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Missing required fields' }));
      }

      const id           = randomBytes(16).toString('hex');
      const acceptToken  = randomBytes(24).toString('hex');
      const declineToken = randomBytes(24).toString('hex');

      const booking = {
        id, acceptToken, declineToken,
        status: 'pending',
        createdAt: new Date().toISOString(),
        name: String(name).trim().slice(0, 120),
        email: String(email).trim().slice(0, 200),
        phone: String(phone || '').trim().slice(0, 40),
        service: String(service).trim().slice(0, 120),
        date: String(date).trim().slice(0, 40),
        time: String(time).trim().slice(0, 40),
        people: Math.min(Math.max(parseInt(people) || 1, 1), 20),
        experience: String(experience || '').trim().slice(0, 80),
        notes: String(notes || '').trim().slice(0, 1000),
      };

      const bookings = await loadBookings();
      bookings.push(booking);
      await saveBookings(bookings);

      /* Email to owner */
      await sendMail({
        to: emailCfg.ownerEmail,
        subject: `New Booking Request — ${booking.service} on ${booking.date}`,
        html: ownerEmailHtml(booking),
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, ref: id.slice(0,8).toUpperCase() }));

    } catch (err) {
      console.error('[book error]', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Server error' }));
    }
    return;
  }

  /* ── GET /api/booking/accept?token=... ── */
  if (req.method === 'GET' && path === '/api/booking/accept') {
    const token = url.searchParams.get('token');
    const bookings = await loadBookings();
    const idx = bookings.findIndex(b => b.acceptToken === token);

    if (idx < 0) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      return res.end(responsePage('Not Found', 'This booking link is invalid or has already been used.', '#1bc8bc', '🔍'));
    }

    const b = bookings[idx];

    if (b.status !== 'pending') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(responsePage(
        b.status === 'accepted' ? 'Already Accepted' : 'Already Actioned',
        `Booking #${b.id.slice(0,8).toUpperCase()} has already been ${b.status}.`,
        '#1bc8bc', '✓'
      ));
    }

    bookings[idx].status = 'accepted';
    bookings[idx].acceptedAt = new Date().toISOString();
    await saveBookings(bookings);

    await sendMail({
      to: b.email,
      subject: `Your SeaUrchin Booking is Confirmed — ${b.service} on ${b.date}`,
      html: customerConfirmHtml(b),
    });

    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(responsePage(
      'Booking Accepted',
      `Booking #${b.id.slice(0,8).toUpperCase()} for <strong style="color:#f0ebe3">${esc(b.name)}</strong> has been confirmed.<br>A confirmation email has been sent to ${esc(b.email)}.`,
      '#1bc8bc', '✓'
    ));
  }

  /* ── GET /api/booking/decline?token=... ── */
  if (req.method === 'GET' && path === '/api/booking/decline') {
    const token = url.searchParams.get('token');
    const bookings = await loadBookings();
    const idx = bookings.findIndex(b => b.declineToken === token);

    if (idx < 0) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      return res.end(responsePage('Not Found', 'This booking link is invalid or has already been used.', '#e05252', '🔍'));
    }

    const b = bookings[idx];

    if (b.status !== 'pending') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(responsePage(
        'Already Actioned',
        `Booking #${b.id.slice(0,8).toUpperCase()} has already been ${b.status}.`,
        '#1bc8bc', '✓'
      ));
    }

    bookings[idx].status = 'declined';
    bookings[idx].declinedAt = new Date().toISOString();
    await saveBookings(bookings);

    await sendMail({
      to: b.email,
      subject: `Your SeaUrchin Booking Request — Update`,
      html: customerDeclineHtml(b),
    });

    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(responsePage(
      'Booking Declined',
      `Booking #${b.id.slice(0,8).toUpperCase()} for ${esc(b.name)} has been declined.<br>A notification email has been sent to ${esc(b.email)}.`,
      '#e05252', '✕'
    ));
  }

  /* ── Static file serving ── */
  let filePath = join(ROOT, url.pathname === '/' ? '/index.html' : url.pathname);

  /* Block access to sensitive files */
  const blocked = ['booking-config.mjs', 'bookings.json', 'package.json', 'package-lock.json', 'serve.mjs'];
  if (blocked.some(f => filePath.endsWith(f))) {
    res.writeHead(403); return res.end('Forbidden');
  }

  try {
    const data = await readFile(filePath);
    const ext  = extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }

}).listen(PORT, () => {
  console.log(`\nSeaUrchin server → http://localhost:${PORT}`);
  console.log(`  Booking API  → POST /api/book`);
  if (emailCfg.smtp.auth.user === 'YOUR_EMAIL@gmail.com') {
    console.log(`\n  ⚠  Email not configured — edit booking-config.mjs to enable notifications.`);
  }
});
