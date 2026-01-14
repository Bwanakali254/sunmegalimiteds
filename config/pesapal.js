import axios from "axios";

const BASE_URL =
  process.env.PESAPAL_ENV === "live"
    ? "https://pay.pesapal.com/v3"
    : "https://cybqa.pesapal.com/pesapalv3";

export const getPesapalToken = async () => {
  const res = await axios.post(
    `${BASE_URL}/api/Auth/RequestToken`,
    {
      consumer_key: process.env.PesaPal_CONSUMER_KEY,
      consumer_secret: process.env.PesaPal_CONSUMER_SECRET
    },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    }
  );

  if (!res.data || !res.data.token) {
    throw new Error("Pesapal token not returned");
  }

  return res.data.token;
};

// Register IPN
export const registerPesapalIPN = async (ipnUrl) => {
  const token = await getPesapalToken();

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

  return res.data;
};

// Submit order
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

  return res.data;
};

// Get transaction status
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

  return res.data;
};

// Get registered IPNs
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
