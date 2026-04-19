const nodemailer = require("nodemailer");
const { emailHost, emailPort, emailUser, emailPass, emailFrom } = require("../config/env");

const transporter = nodemailer.createTransport({
  host: emailHost,
  port: emailPort,
  secure: emailPort === 465,
  auth: { user: emailUser, pass: emailPass },
});

const sendMail = ({ to, subject, html }) =>
  transporter.sendMail({ from: emailFrom, to, subject, html });

module.exports = { sendMail };
