import axios from "axios";

const BASE_URL =
  process.env.PESAPAL_ENV === "live"
    ? "https://pay.pesapal.com/v3"
    : "https://cybqa.pesapal.com/pesapalv3";

export const getPesapalToken = async () => {
  const res = await axios.post(
    `${BASE_URL}/api/Auth/RequestToken`,
    {
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET
    },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    }
  );

  // Log full response for truth, not guessing
  console.log("Pesapal auth response:", res.data);

  return res.data.token; // official docs say field is `token`
};

// Ipn function
export const registerPesapalIPN = async (ipnUrl) => {
  const token = await getPesapalToken(); // reuse your working auth

  const res = await axios.post(
    `${BASE_URL}/api/URLSetup/RegisterIPN`,
    {
      url: ipnUrl,
      ipn_notification_type: "GET"
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    }
  );

  console.log("Pesapal IPN register response:", res.data);
  return res.data;
};

// functionality to pesapal
export const submitPesapalOrder = async (orderData) => {
  const token = await getPesapalToken();

  const res = await axios.post(
    `${BASE_URL}/api/Transactions/SubmitOrderRequest`,
    orderData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    }
  );

  console.log("Pesapal submit order response:", res.data);
  return res.data;
};

// helper function
export const getPesapalTransactionStatus = async (orderTrackingId) => {
  const token = await getPesapalToken();

  const res = await axios.get(
    `${BASE_URL}/api/Transactions/GetTransactionStatus`,
    {
      params: { orderTrackingId },
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    }
  );

  console.log("Pesapal transaction status:", res.data);
  return res.data;
};


export const getPesapalIPNs = async () => {
  const token = await getPesapalToken();
  const res = await axios.get(
    `${BASE_URL}/api/URLSetup/GetIpnList`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    }
  );
  return res.data;
};

