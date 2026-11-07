import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const envPath = path.join(root, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

const apiKey = (process.env.IPPANEL_API_KEY || "").trim();
const fromNumber = (process.env.IPPANEL_FROM || "").trim();
const patternCode = (process.env.IPPANEL_PATTERN_OTP || "").trim();
const baseUrl = (process.env.IPPANEL_BASE_URL || "https://edge.ippanel.com/v1/api").replace(/\/$/, "");
const recipient = process.argv[2] || "09130686153";

if (!apiKey || !fromNumber || !patternCode) {
  console.error("Missing IPPANEL_API_KEY, IPPANEL_FROM, or IPPANEL_PATTERN_OTP");
  process.exit(1);
}

const payload = {
  sending_type: "pattern",
  from_number: fromNumber,
  code: patternCode,
  recipients: [recipient],
  params: { code: "123456", ttlMinutes: "۲" },
};

console.log("Sending OTP pattern SMS to", recipient);
console.log("Endpoint:", `${baseUrl}/send`);

const res = await fetch(`${baseUrl}/send`, {
  method: "POST",
  headers: {
    Authorization: apiKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  body: JSON.stringify(payload),
});

const text = await res.text();
let data;
try {
  data = JSON.parse(text);
} catch {
  data = { raw: text };
}

console.log("HTTP", res.status);
console.log(JSON.stringify(data, null, 2));
