const nodemailer = require("nodemailer");
const { emailHost, emailPort, emailUser, emailPass, emailFrom } = require("../config/env");

const transportConfig = {
  host: emailHost,
  port: emailPort,
  secure: emailPort === 465,
};

if (emailUser && emailPass) {
  transportConfig.auth = { user: emailUser, pass: emailPass };
}

const transporter = nodemailer.createTransport(transportConfig);

const sendMail = ({ to, subject, html }) =>
  transporter.sendMail({ from: emailFrom, to, subject, html });

module.exports = { sendMail };
