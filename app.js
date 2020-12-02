
'use strict';
const environment = process.env.ENV;
if(!environment || environment == "development"){
  const connectEnv = require('dotenv').config();

  if (connectEnv.error) {
    console.log("You need to add an env file");
    process.exit();
  }
}

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const nodemailer = require('nodemailer');
const config = require('./config.js');

const transporter = nodemailer.createTransport(config);
const cron = require('node-cron');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();

app.set('views', __dirname + '/views'); // general config
app.set('view engine', 'jade');

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
 
// parse application/json
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true
});

const EmailModel = new Schema({
  from: { type: String, default: `FLS Support <${process.env.MAIL_USER}>` },
  to: { type: String, required: true },
  subject: { type: String, required: true },
  text: { type: String, required: true },
  html: { type: String, required: true },
  sent: { type: Boolean, default: false },
  verify: { type: String, default: config.randomkey() },
  date: { type: Date, default: Date.now }
});

const EmailData = mongoose.model('Email', EmailModel);

cron.schedule('* * * * *', () => {
  const now = new Date().toLocaleDateString();
  EmailData.findOne({ sent: false }, function (err, doc) {
    if(!err && !config.isEmpty(doc)){
      const mailOptions = {
        from: doc.from,
        to: doc.to,
        subject: doc.subject,
        text: doc.text
      };

      if(!config.isEmpty(doc.html)){
        mailOptions.html = doc.html;
      }

      transporter.verify(function(error, success) {
        if (error) {
          console.log("Unable to send mail");
        } else {
          console.log("Server is ready to take our messages");
          transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                console.log("Verified: Unable to send mail");
            } else {
              console.log("Email successfully sent: " + info.response)
              EmailData.updateOne({_id: doc._id}, { sent: true }, function(err, info){
                if(!err) console.log("Email updated successfully for " + doc.to);
              });
            }
          });
        }
      });
    }else{
      console.log("No mails to send at " + now);
    }
  });
});

app.get('/', function (req, res) {
  res.send('Hello World');
});

app.use(function(req, res, next){
  try {
    const auth = req.headers.authorization;
    const api_key = req.headers.api_key;
    if(!auth || auth !== `Bearer ${process.env.APP_SECRET}`){
      throw 'Invalid user ID';
    }else if(!api_key && api_key !== `${process.env.API_KEY}`){
      throw 'Invalid user ID';
    }else{
      next();
    }
  } catch {
    res.status(401).json({
      error: "Invalid Request"
    });
  }
});

/* 
FOR GMAIL SMTP
With 2FA: use application password for logging in
Without 2FA: make sure less secure applications is set in account -> security
then use the account password
 */

app.post('/send-mail', function (req, res) {
  const name = req.body.name;
  const key = req.body.key || config.randomkey();
  const email = new EmailData({
    from: `Company Support <${req.body.from}>`,
    to: `${name} <${req.body.to}>`,
    subject: `${req.body.subject}`,
    text: `${req.body.text}`,
    html: `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width" />
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>Errandspay - Support</title>
        <style>
        </style>
      </head>
      <body class="">
        ${req.body.text}
      </body>
    </html>
`,
    verify: key
  });

  email.save(function (err) {
    if (!err) console.log("Success!");
  });

  res.status(200).json({
    verify: key
  });
})


/* 
* Params : name, to
*/
app.post('/create-user', function (req, res) {
  const name = req.body.name;
  const key = config.randomkey();
  const email = new EmailData({
    from: `Errandspay Support <${process.env.MAIL_USER}>`,
    to: `${name} <${req.body.to}>`,
    subject: `Hi ${name}, please verify your Errandspay account`,
    text: `Hi ${name},\n
    Thanks for joining Errandspay! Please confirm your email address by clicking on the link below.
    We'll communicate with you from time to time via email so it's important that we have an up-to-date email address on file.
    https://errandspay.com/register/activate/${key}
    If you did not sign up for an Errandspay account please disregard this email.
    Happy Earning,
    Errandspay Support
    `,
    html: `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width" />
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>Errandspay - Support</title>
        <style>
        </style>
      </head>
      <body class="">
        <p>Hi ${name},</p>
    <p>Thanks for joining Errandspay! Please confirm your email address by clicking on the link below.
    We'll communicate with you from time to time via email so it's important that we have an up-to-date email address on file.</p>
    <a href="https://errandspay.com/register/activate/${key}">Click here to Verify you account</a>
    <p>If you did not sign up for an Errandspay account please disregard this email.
    Happy Earning,
    Errandspay Support</p>
      </body>
    </html>
`,
    verify: key
  });

  email.save(function (err) {
    if (!err) console.log("Success!");
  });

  res.status(200).json({
    verify: key
  });
});

app.use(function(req, res, next){
  res.status(404);

  // respond with html page
  if (req.accepts('html')) {
    res.render('404', { url: req.url });
    return;
  }

  // respond with json
  if (req.accepts('json')) {
    res.send({ error: 'Not found' });
    return;
  }

  // default to plain-text. send()
  res.type('txt').send('Not found');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('The server is now running on port 3000');
})