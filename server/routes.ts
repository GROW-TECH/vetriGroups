import express, { type Express } from 'express';
import { createServer, type Server } from 'node:http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import Razorpay from 'razorpay';

interface OrderNotificationData {
  supplierName: string;
  supplierPhone: string;
  materialName: string;
  quantity: number;
  unit: string;
  totalCost: number;
  clientProject: string;
  orderDate: string;
}

function generateTamilMessage(data: OrderNotificationData): string {
  return `வணக்கம் ${data.supplierName}, புதிய ஆர்டர் வந்துள்ளது. ${data.materialName} - ${data.quantity} ${data.unit}, மொத்த தொகை ரூ.${data.totalCost.toLocaleString('en-IN')}. திட்டம்: ${data.clientProject}. தயவுசெய்து உறுதிப்படுத்தவும்.`;
}

function generateWhatsAppMessage(data: OrderNotificationData): string {
  return `*NEW MATERIAL ORDER*

Supplier: ${data.supplierName}
Material: ${data.materialName}
Quantity: ${data.quantity} ${data.unit}
Total Amount: Rs. ${data.totalCost.toLocaleString('en-IN')}
Project: ${data.clientProject}
Order Date: ${data.orderDate}

Please confirm order receipt.

---
Sri Sai Sumathi Builders`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
  
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  const whatsappPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const whatsappAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  let razorpay: Razorpay | null = null;
  
  if (razorpayKeyId && razorpayKeySecret) {
    razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });
  }

  app.post("/api/razorpay/create-order", async (req, res) => {
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
        notes: notes || {},
      };

      const order = await razorpay.orders.create(options);
      
      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: razorpayKeyId,
      });
    } catch (error) {
      console.error("Razorpay order creation error:", error);
      res.status(500).json({ error: "Failed to create payment order" });
    }
  });

  app.post("/api/razorpay/verify-payment", async (req, res) => {
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
      const expectedSignature = crypto
        .createHmac("sha256", razorpayKeySecret)
        .update(body.toString())
        .digest("hex");

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

  app.get("/api/razorpay/config", (req, res) => {
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

  app.get("/api/notifications/config", (req, res) => {
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

  app.post("/api/notifications/send-order-notification", async (req, res) => {
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
      } = req.body as OrderNotificationData;

      if (!supplierPhone) {
        return res.status(400).json({ error: "Supplier phone number is required" });
      }

      const notificationData: OrderNotificationData = {
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

      const formattedPhone = supplierPhone.startsWith('+') 
        ? supplierPhone 
        : supplierPhone.startsWith('91') 
          ? `+${supplierPhone}` 
          : `+91${supplierPhone}`;

      if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
        try {
          const replitDomain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(',')[0];
          
          if (!replitDomain) {
            results.voiceCall.error = "No public domain configured for voice callbacks";
          } else {
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`;
            const twimlUrl = `https://${replitDomain}/api/notifications/voice-twiml?message=${encodeURIComponent(tamilMessage)}`;
            
            const twilioAuth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');
            
            const callResponse = await fetch(twilioUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${twilioAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
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
          
          const whatsappPhone = formattedPhone.replace('+', '');
          
          const whatsappResponse = await fetch(whatsappUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${whatsappAccessToken}`,
              'Content-Type': 'application/json'
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

  app.get("/api/notifications/voice-twiml", (req, res) => {
    const message = req.query.message as string || "New order received";
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="hi-IN">${message}</Say>
  <Pause length="1"/>
  <Say voice="Polly.Aditi" language="hi-IN">${message}</Say>
</Response>`;
    
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  });

  // Development upload endpoint: accepts base64 image and saves to server/uploads
  app.post('/api/upload-photo', async (req, res) => {
    try {
      const { filename, base64 } = req.body;
      if (!filename || !base64) return res.status(400).json({ error: 'filename and base64 is required' });

      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

      // strip data URL prefix if present
      const cleaned = base64.includes('base64,') ? base64.split('base64,')[1] : base64;
      const buffer = Buffer.from(cleaned, 'base64');
      const outPath = path.join(uploadsDir, filename);
      fs.writeFileSync(outPath, buffer);

      const publicUrl = `${req.protocol}://${req.get('host')}/uploads/${encodeURIComponent(filename)}`;
      res.json({ url: publicUrl, storagePath: `uploads/${filename}` });
    } catch (err) {
      console.error('Upload endpoint error:', err);
      res.status(500).json({ error: 'Failed to save file on server' });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  const httpServer = createServer(app);

  return httpServer;
}
