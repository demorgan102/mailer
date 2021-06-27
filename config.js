const generateKey = (length = 12) => {
  let result           = '';
  const characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

const isEmpty = (item) => {
  const fields = [null, undefined, "", false];
  return fields.includes(item) || item.length === 0;
}

module.exports = config = {
  service: process.env.MAIL_SERVICE,
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  },
  randomkey: generateKey,
  isEmpty: isEmpty
};
