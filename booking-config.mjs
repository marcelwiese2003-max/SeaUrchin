/* ═══════════════════════════════════════════════════════════
   SeaUrchin Booking — Email Configuration
   Fill in your credentials here before starting the server.
   ═══════════════════════════════════════════════════════════ */

export const config = {

  /* ── SMTP settings ────────────────────────────────────────
     For Gmail: enable 2-Step Verification, then create an
     App Password at myaccount.google.com/apppasswords
     Use that 16-char password below (not your real password).

     For other providers change host/port/secure accordingly.
  ── */
  smtp: {
    host:   'smtp.gmail.com',
    port:    465,
    secure:  true,
    auth: {
      user: 'marcel.wiese2003@gmail.com',
      pass: 'ylqiidxwaoqfvvpe',
    },
  },

  /* ── Owner (your) email ── */
  ownerEmail: 'marcel.wiese2003@gmail.com',
  fromName:   'SeaUrchin Diving Center',

  /* ── Public URL of this server ──────────────────────────
     When running locally: 'http://localhost:3000'
     When deployed: 'https://yourdomain.com'
  ── */
  serverUrl: 'http://localhost:3000',

};
