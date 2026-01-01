const express = require('express');
const axios = require('axios');
const admin = require('firebase-admin');
const cors = require('cors');

// تأكد أن هذا الملف موجود بجانب index.js
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(cors());
app.use(express.json());

// ==================================================================
// 🔴🔴🔴  منطقة التعديل الحساسة  🔴🔴🔴
// اذهب إلى Firebase Console -> Project Settings -> General
// وانسخ "Web API Key" وضعه بين علامات التنصيص في الأسفل
const FIREBASE_WEB_API_KEY = "AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; 
// ==================================================================

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  console.log(`📥 محاولة دخول جديدة للإيميل: ${email}`);

  if (!email || !password) {
    console.log("❌ البيانات ناقصة");
    return res.status(400).json({ error: "الرجاء إرسال الإيميل وكلمة السر" });
  }

  try {
    // 1. التحدث مع جوجل للتأكد من الباسورد
    const googleResponse = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`,
      {
        email: email,
        password: password,
        returnSecureToken: true
      }
    );

    console.log("✅ جوجل وافق على البيانات!");

    // 2. إنشاء توكن العبور (Custom Token)
    const uid = googleResponse.data.localId;
    const customToken = await admin.auth().createCustomToken(uid);

    console.log("🔑 تم إنشاء التوكن وإرساله للتطبيق.");
    res.json({ token: customToken });

  } catch (error) {
    // طباعة الخطأ بالتفصيل في الـ Logs عشان نعرف السبب
    const errorMsg = error.response ? error.response.data.error.message : error.message;
    console.error("❌ فشل الدخول. السبب من جوجل:", errorMsg);

    if (errorMsg === "EMAIL_NOT_FOUND") {
      res.status(400).json({ error: "اسم المستخدم غير موجود" });
    } else if (errorMsg === "INVALID_PASSWORD") {
      res.status(400).json({ error: "كلمة المرور خاطئة" });
    } else if (errorMsg === "USER_DISABLED") {
      res.status(400).json({ error: "هذا الحساب معطل" });
    } else {
      res.status(400).json({ error: "بيانات الدخول غير صحيحة" });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
