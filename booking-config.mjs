export const config = {
  smtp: {
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  },
  ownerEmail: process.env.OWNER_EMAIL,
  fromName:   process.env.FROM_NAME || 'SeaUrchin Diving Center',
  serverUrl:  process.env.SERVER_URL || 'http://localhost:3000',
};
