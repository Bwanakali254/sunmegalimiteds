import "dotenv/config";
import { getPesapalIPNs } from "../config/pesapal.js";

const TARGET_URL = "https://api.sunmega.co.ke/api/pesapal/ipn";

// Required environment variables
const REQUIRED_ENV_VARS = [
  "PESAPAL_ENV",
  "PESAPAL_IPN_ID",
  "PesaPal_CONSUMER_KEY",
  "PesaPal_CONSUMER_SECRET",
];

// Validate required environment variables
function validateEnvVars() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((key) => console.error(`   - ${key}`));
    process.exit(1);
  }
}

// Extract IPN array from response (handles various nesting structures)
function extractIpnArray(response) {
  // Try different possible structures
  if (Array.isArray(response)) {
    return response;
  }
  if (Array.isArray(response?.data)) {
    return response.data;
  }
  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }
  if (Array.isArray(response?.ipns)) {
    return response.ipns;
  }
  // If none match, return empty array
  return [];
}

// Extract ID from IPN entry (handles various field names)
// Note: Pesapal GetIpnList returns 'ipn_id' as the primary field
function extractId(entry) {
  return (
    entry?.ipn_id ||
    entry?.ipn_notification_id ||
    entry?.ipnNotificationId ||
    entry?.notification_id ||
    entry?.id ||
    null
  );
}

// Extract URL from IPN entry (handles various field names)
// Note: Pesapal GetIpnList returns 'url' as the primary field
function extractUrl(entry) {
  return (
    entry?.url ||
    entry?.ipn_listener_url ||
    entry?.ipnListenerUrl ||
    null
  );
}

async function verifyIpnMatch() {
  try {
    // Validate environment variables
    validateEnvVars();

    // Log environment configuration
    console.log("=== Environment Configuration ===");
    console.log("PESAPAL_ENV:", process.env.PESAPAL_ENV);
    console.log("PESAPAL_IPN_ID:", process.env.PESAPAL_IPN_ID);
    console.log("Target URL:", TARGET_URL);
    console.log("");

    // Call GetIpnList API
    console.log("=== Calling Pesapal GetIpnList API ===");
    const response = await getPesapalIPNs();

    // Print full raw response
    console.log("=== Full GetIpnList Response (Raw JSON) ===");
    console.log(JSON.stringify(response, null, 2));
    console.log("");

    // Extract IPN array
    const ipnList = extractIpnArray(response);

    if (ipnList.length === 0) {
      console.error("❌ No IPN entries found in response");
      console.error("Response structure may differ from expected format");
      process.exit(1);
    }

    console.log(`Found ${ipnList.length} IPN entry/entries`);
    console.log("");

    // Match Summary
    console.log("=== Match Summary ===");

    // Find IPN by URL
    const ipnByUrl = ipnList.find((ipn) => {
      const url = extractUrl(ipn);
      return url === TARGET_URL;
    });

    if (ipnByUrl) {
      const foundId = extractId(ipnByUrl);
      const foundUrl = extractUrl(ipnByUrl);
      console.log(`✅ Found IPN with URL: ${foundUrl}`);
      if (foundId) {
        console.log(`   ipn_id: ${foundId}`);
      } else {
        console.log(`   ⚠️  ipn_id: NOT FOUND (check response structure)`);
      }
      const idMatch = foundId === process.env.PESAPAL_IPN_ID;
      console.log(
        `   Matches PESAPAL_IPN_ID: ${idMatch ? "YES ✅" : "NO ❌"}`
      );
      if (!idMatch && foundId) {
        console.log(
          `   Expected: ${process.env.PESAPAL_IPN_ID}, Found: ${foundId}`
        );
      }
    } else {
      console.log(`❌ No IPN found with URL: ${TARGET_URL}`);
      console.log("Available IPN entries (url, ipn_id):");
      ipnList.forEach((ipn, idx) => {
        const url = extractUrl(ipn);
        const id = extractId(ipn);
        if (url && id) {
          console.log(`   ${idx + 1}. url: ${url}, ipn_id: ${id}`);
        } else {
          console.log(`   ${idx + 1}. url: ${url || "NOT FOUND"}, ipn_id: ${id || "NOT FOUND"}`);
        }
      });
    }
    console.log("");

    // Find IPN by ID
    const ipnById = ipnList.find((ipn) => {
      const id = extractId(ipn);
      return id === process.env.PESAPAL_IPN_ID;
    });

    if (ipnById) {
      const foundId = extractId(ipnById);
      const foundUrl = extractUrl(ipnById);
      console.log(`✅ Found IPN with ipn_id: ${foundId}`);
      if (foundUrl) {
        console.log(`   URL: ${foundUrl}`);
      } else {
        console.log(`   ⚠️  URL: NOT FOUND (check response structure)`);
      }
      const urlMatch = foundUrl === TARGET_URL;
      console.log(
        `   Matches target URL: ${urlMatch ? "YES ✅" : "NO ❌"}`
      );
      if (!urlMatch && foundUrl) {
        console.log(`   Expected: ${TARGET_URL}, Found: ${foundUrl}`);
      }
    } else {
      console.log(
        `❌ No IPN found with ipn_id: ${process.env.PESAPAL_IPN_ID}`
      );
      console.log("Available IPN entries (ipn_id, url):");
      ipnList.forEach((ipn, idx) => {
        const id = extractId(ipn);
        const url = extractUrl(ipn);
        if (id && url) {
          console.log(`   ${idx + 1}. ipn_id: ${id}, url: ${url}`);
        } else {
          console.log(`   ${idx + 1}. ipn_id: ${id || "NOT FOUND"}, url: ${url || "NOT FOUND"}`);
        }
      });
    }
    console.log("");

    // Final verdict
    const urlMatch = ipnByUrl && extractId(ipnByUrl) === process.env.PESAPAL_IPN_ID;
    const idMatch = ipnById && extractUrl(ipnById) === TARGET_URL;
    const bothMatch = urlMatch && idMatch;

    if (bothMatch) {
      console.log("✅ VERIFICATION PASSED: IPN ID and URL match in both directions!");
      process.exit(0);
    } else {
      console.log("❌ VERIFICATION FAILED: IPN ID and URL do not match!");
      if (!urlMatch) {
        console.log("   - URL lookup did not find matching ID");
      }
      if (!idMatch) {
        console.log("   - ID lookup did not find matching URL");
      }
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error during verification:", error.message);
    if (error.response) {
      console.error("API Response Status:", error.response.status);
      console.error("API Response Data:", JSON.stringify(error.response.data, null, 2));
    } else if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

verifyIpnMatch();
