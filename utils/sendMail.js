import SibApiV3Sdk from "sib-api-v3-sdk";


const sendEmail = async (to, subject, otp) => {
  // if (!process.env.BREVO_API_KEY) {
  //   throw new Error("BREVO_API_KEY is not set in environment variables");
  // }

  try {
    // Setup Brevo client
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications["api-key"];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

    // Email content
 const htmlContent = `
  <div style="
    font-family: 'Helvetica Neue', Arial, sans-serif;
    max-width: 600px;
    margin: 20px auto;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(0,0,0,0.08);
    background-color: #ffffff;
    border: 1px solid #e0e0e0;
    padding: 0;
  ">
    <div style="
      background-color: #34A853; 
      color: #fff; 
      padding: 25px 20px; 
      text-align: center; 
      font-size: 22px; 
      font-weight: bold;
    ">
      Binance OTP Verification
    </div>
    <div style="padding: 30px 20px; color: #333; font-size: 16px; line-height: 1.6; text-align: center;">
      <p>Hello,</p>
      <p>Use the following OTP to proceed with your transaction:</p>
      <div style="
        display: inline-block;
        color: #34A853;
        font-size: 32px;
        font-weight: bold;
        padding: 15px 40px;
        margin: 5px 0; /* reduced top/bottom gap */
        border-radius: 8px;
        letter-spacing: 6px;
        word-wrap: break-word;
      ">
        ${otp}
      </div>
      <p style="color: #555; margin-bottom: 10px;">This OTP will expire in <strong>10 minutes</strong>.</p>
      <p style="margin-top: 10px; font-size: 14px; color: #888;">
        If you didn't request this, please ignore this email.
      </p>
      <p style="margin-top: 20px;">– The Oxfam Team</p>
    </div>
  </div>
`;

    // Mail options
    const sendSmtpEmail = {
      sender: { email: process.env.SENDER_EMAIL, name: "Oxfam" },
      to: [{ email: to }],
      subject,
      textContent: `Your OTP is ${otp}. It will expire in 10 minutes.`,
      htmlContent,
    };

    const response = await tranEmailApi.sendTransacEmail(sendSmtpEmail);
    console.log("✅ Email sent:", response);
    return response;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw new Error("Failed to send email via Brevo API");
  }
};

export default sendEmail;
