import SibApiV3Sdk from "sib-api-v3-sdk";

const sendEmailBan = async (to, userId) => {
  try {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications["api-key"];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

    const htmlContent = `
  <div style="
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    max-width: 600px; 
    margin: 40px auto; 
    border-radius: 10px; 
    overflow: hidden;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    background-color: #ffffff;
    border: 1px solid #e0e0e0;
  ">
    <div style="
      background-color: #d9534f; 
      color: #fff; 
      padding: 20px; 
      text-align: center;
      font-size: 22px;
      font-weight: bold;
    ">
      🚫 Account Banned
    </div>
    <div style="padding: 30px; color: #333; font-size: 16px; line-height: 1.6;">
      <p>Dear User,</p>
      <p>Your account has been <strong style="color: #d9534f;">banned</strong> by the administrator.</p>
      <p><strong>User ID:</strong> ${userId}</p>
      <p><strong>Email:</strong> ${to}</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p>If you believe this is a mistake, please contact our support team.</p>
      <p style="margin-top: 30px;">– The Oxfam Team</p>
    </div>
  </div>
`;

    const sendSmtpEmail = {
      sender: { email: process.env.SENDER_EMAIL, name: "Oxfam" },
      to: [{ email: to }],
      subject: "🚫 Your Oxfam Account Has Been Banned",
      htmlContent,
    };

    const response = await tranEmailApi.sendTransacEmail(sendSmtpEmail);
    console.log("✅ Ban email sent via API:", response);
  } catch (error) {
    console.error("❌ Error sending ban email via API:", error);
    throw new Error("Failed to send ban email");
  }
};

export default sendEmailBan;
