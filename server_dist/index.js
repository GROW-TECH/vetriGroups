// server/index.ts
import express2 from "express";

// server/routes.ts
import express from "express";
import { createServer } from "node:http";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import Razorpay from "razorpay";
function generateTamilMessage(data) {
  return `\u0BB5\u0BA3\u0B95\u0BCD\u0B95\u0BAE\u0BCD ${data.supplierName}, \u0BAA\u0BC1\u0BA4\u0BBF\u0BAF \u0B86\u0BB0\u0BCD\u0B9F\u0BB0\u0BCD \u0BB5\u0BA8\u0BCD\u0BA4\u0BC1\u0BB3\u0BCD\u0BB3\u0BA4\u0BC1. ${data.materialName} - ${data.quantity} ${data.unit}, \u0BAE\u0BCA\u0BA4\u0BCD\u0BA4 \u0BA4\u0BCA\u0B95\u0BC8 \u0BB0\u0BC2.${data.totalCost.toLocaleString("en-IN")}. \u0BA4\u0BBF\u0B9F\u0BCD\u0B9F\u0BAE\u0BCD: ${data.clientProject}. \u0BA4\u0BAF\u0BB5\u0BC1\u0B9A\u0BC6\u0BAF\u0BCD\u0BA4\u0BC1 \u0B89\u0BB1\u0BC1\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0B9F\u0BC1\u0BA4\u0BCD\u0BA4\u0BB5\u0BC1\u0BAE\u0BCD.`;
}
function generateWhatsAppMessage(data) {
  return `*NEW MATERIAL ORDER*

Supplier: ${data.supplierName}
Material: ${data.materialName}
Quantity: ${data.quantity} ${data.unit}
Total Amount: Rs. ${data.totalCost.toLocaleString("en-IN")}
Project: ${data.clientProject}
Order Date: ${data.orderDate}

Please confirm order receipt.

---
Sri Sai Sumathi Builders`;
}
async function registerRoutes(app2) {
  const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  const whatsappPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const whatsappAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  let razorpay = null;
  if (razorpayKeyId && razorpayKeySecret) {
    razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret
    });
  }
  app2.post("/api/razorpay/create-order", async (req, res) => {
    try {
      if (!razorpay || !razorpayKeyId) {
        return res.status(500).json({
          error: "Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
        });
      }
      const { amount, currency = "INR", receipt, notes } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Valid amount is required" });
      }
      const options = {
        amount: Math.round(amount * 100),
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
        notes: notes || {}
      };
      const order = await razorpay.orders.create(options);
      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: razorpayKeyId
      });
    } catch (error) {
      console.error("Razorpay order creation error:", error);
      res.status(500).json({ error: "Failed to create payment order" });
    }
  });
  app2.post("/api/razorpay/verify-payment", async (req, res) => {
    try {
      if (!razorpayKeySecret) {
        return res.status(500).json({
          error: "Razorpay is not configured"
        });
      }
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        amount,
        userId,
        clientId,
        stageId
      } = req.body;
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: "Missing payment verification data" });
      }
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto.createHmac("sha256", razorpayKeySecret).update(body.toString()).digest("hex");
      const isValid = expectedSignature === razorpay_signature;
      if (isValid) {
        res.json({
          success: true,
          message: "Payment verified successfully",
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          amount,
          userId,
          clientId,
          stageId
        });
      } else {
        res.status(400).json({
          success: false,
          error: "Payment verification failed - Invalid signature"
        });
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({ error: "Payment verification failed" });
    }
  });
  app2.get("/api/razorpay/config", (req, res) => {
    if (!razorpayKeyId) {
      return res.status(500).json({
        configured: false,
        error: "Razorpay is not configured"
      });
    }
    res.json({
      configured: true,
      keyId: razorpayKeyId
    });
  });
  app2.get("/api/notifications/config", (req, res) => {
    const twilioConfigured = !!(twilioAccountSid && twilioAuthToken && twilioPhoneNumber);
    const whatsappConfigured = !!(whatsappPhoneNumberId && whatsappAccessToken);
    res.json({
      voiceCall: {
        configured: twilioConfigured,
        provider: "twilio",
        language: "Tamil (ta-IN)"
      },
      whatsapp: {
        configured: whatsappConfigured,
        provider: "meta"
      }
    });
  });
  app2.post("/api/notifications/send-order-notification", async (req, res) => {
    try {
      const {
        supplierName,
        supplierPhone,
        materialName,
        quantity,
        unit,
        totalCost,
        clientProject,
        orderDate
      } = req.body;
      if (!supplierPhone) {
        return res.status(400).json({ error: "Supplier phone number is required" });
      }
      const notificationData = {
        supplierName,
        supplierPhone,
        materialName,
        quantity,
        unit,
        totalCost,
        clientProject,
        orderDate
      };
      const tamilMessage = generateTamilMessage(notificationData);
      const whatsappMessage = generateWhatsAppMessage(notificationData);
      const results = {
        voiceCall: { sent: false, message: "", error: "" },
        whatsapp: { sent: false, message: "", error: "" }
      };
      const formattedPhone = supplierPhone.startsWith("+") ? supplierPhone : supplierPhone.startsWith("91") ? `+${supplierPhone}` : `+91${supplierPhone}`;
      if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
        try {
          const replitDomain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(",")[0];
          if (!replitDomain) {
            results.voiceCall.error = "No public domain configured for voice callbacks";
          } else {
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`;
            const twimlUrl = `https://${replitDomain}/api/notifications/voice-twiml?message=${encodeURIComponent(tamilMessage)}`;
            const twilioAuth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64");
            const callResponse = await fetch(twilioUrl, {
              method: "POST",
              headers: {
                "Authorization": `Basic ${twilioAuth}`,
                "Content-Type": "application/x-www-form-urlencoded"
              },
              body: new URLSearchParams({
                To: formattedPhone,
                From: twilioPhoneNumber,
                Url: twimlUrl
              })
            });
            if (callResponse.ok) {
              results.voiceCall.sent = true;
              results.voiceCall.message = `Voice call initiated to ${formattedPhone} (Note: Tamil text read with Hindi voice - for authentic Tamil, use pre-recorded audio)`;
            } else {
              const errorData = await callResponse.json();
              results.voiceCall.error = errorData.message || "Failed to initiate call";
            }
          }
        } catch (err) {
          results.voiceCall.error = err instanceof Error ? err.message : "Voice call failed";
        }
      } else {
        results.voiceCall.message = "Twilio not configured - Voice call skipped";
        console.log("Voice call would be sent with Tamil message:", tamilMessage);
      }
      if (whatsappPhoneNumberId && whatsappAccessToken) {
        try {
          const whatsappUrl = `https://graph.facebook.com/v18.0/${whatsappPhoneNumberId}/messages`;
          const whatsappPhone = formattedPhone.replace("+", "");
          const whatsappResponse = await fetch(whatsappUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${whatsappAccessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: whatsappPhone,
              type: "text",
              text: { body: whatsappMessage }
            })
          });
          if (whatsappResponse.ok) {
            results.whatsapp.sent = true;
            results.whatsapp.message = `WhatsApp message sent to ${formattedPhone}`;
          } else {
            const errorData = await whatsappResponse.json();
            results.whatsapp.error = errorData.error?.message || "Failed to send WhatsApp";
          }
        } catch (err) {
          results.whatsapp.error = err instanceof Error ? err.message : "WhatsApp failed";
        }
      } else {
        results.whatsapp.message = "WhatsApp not configured - Message skipped";
        console.log("WhatsApp message would be sent:", whatsappMessage);
      }
      res.json({
        success: true,
        notifications: results,
        messages: {
          tamil: tamilMessage,
          whatsapp: whatsappMessage
        }
      });
    } catch (error) {
      console.error("Notification error:", error);
      res.status(500).json({
        error: "Failed to send notifications",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/notifications/voice-twiml", (req, res) => {
    const message = req.query.message || "New order received";
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="hi-IN">${message}</Say>
  <Pause length="1"/>
  <Say voice="Polly.Aditi" language="hi-IN">${message}</Say>
</Response>`;
    res.set("Content-Type", "text/xml");
    res.send(twiml);
  });
  app2.post("/api/upload-photo", async (req, res) => {
    try {
      const { filename, base64 } = req.body;
      if (!filename || !base64) return res.status(400).json({ error: "filename and base64 is required" });
      const uploadsDir = path.resolve(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const cleaned = base64.includes("base64,") ? base64.split("base64,")[1] : base64;
      const buffer = Buffer.from(cleaned, "base64");
      const outPath = path.join(uploadsDir, filename);
      fs.writeFileSync(outPath, buffer);
      const publicUrl = `${req.protocol}://${req.get("host")}/uploads/${encodeURIComponent(filename)}`;
      res.json({ url: publicUrl, storagePath: `uploads/${filename}` });
    } catch (err) {
      console.error("Upload endpoint error:", err);
      res.status(500).json({ error: "Failed to save file on server" });
    }
  });
  app2.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
import * as fs2 from "fs";
import * as path2 from "path";
var app = express2();
var log = console.log;
process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err instanceof Error ? err.stack || err.message : err);
});
process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", reason);
});
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    if (origin && origins.has(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express2.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express2.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path3 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path3.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path2.resolve(process.cwd(), "app.json");
    const appJsonContent = fs2.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path2.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs2.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs2.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path2.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs2.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express2.static(path2.resolve(process.cwd(), "assets")));
  app2.use(express2.static(path2.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, _next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  const listenOptions = {
    port,
    host: "0.0.0.0"
  };
  if (process.platform !== "win32") {
    listenOptions.reusePort = true;
  }
  server.listen(listenOptions, () => {
    log(`express server serving on port ${port}`);
    log("Keeping process running (debug mode)");
    if (typeof process.stdin !== "undefined" && typeof process.stdin.pause === "function") {
      process.stdin.resume();
    }
  });
})();
