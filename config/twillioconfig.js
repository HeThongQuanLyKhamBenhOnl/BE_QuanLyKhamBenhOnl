const twilio = require("twilio");
require("dotenv").config();

const client = new twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendVerificationCode = async (phoneNumber) => {
  console.log("Verify Service SID:", process.env.TWILIO_VERIFY_SERVICE_SID);

  const verification = await client.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID)
    .verifications.create({ to: phoneNumber, channel: "sms" });

  return verification.status;
};

const verifyCode = async (phoneNumber, code) => {
  const verificationCheck = await client.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID)
    .verificationChecks.create({ to: phoneNumber, code: code });
  return verificationCheck.status;
};

module.exports = { sendVerificationCode, verifyCode };
