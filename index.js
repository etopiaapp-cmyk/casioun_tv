const express = require('express');
const axios = require('axios');
const admin = require('firebase-admin');
const cors = require('cors');

// استدعاء ملف مفاتيح الخدمة (سنقوم بإنشائه في الخطوة القادمة)
const serviceAccount = require('./serviceAccountKey.json');

// تهيئة الفايربيس بصلاحيات الأدمن
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(cors()); // للسماح للاتصال من أي مكان
app.use(express.json());

// 🔴 هام جداً: استبدل هذا بالمفتاح الخاص بمشروعك
// تجده في Firebase Console -> Project Settings -> General -> Web API Key
const FIREBASE_WEB_API_KEY = "AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; 

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "الرجاء إرسال الإيميل وكلمة السر" });
  }

  try {
    console.log(`محاولة تسجيل دخول للإيميل: ${email}`);

    // 1. التحقق من صحة الإيميل والباسورد مع سيرفرات جوجل
    // السيرفر يقوم بهذا الطلب بدلاً من تطبيق الموبايل لتجاوز الحظر
    const googleResponse = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`,
      {
        email: email,
        password: password,
        returnSecureToken: true
      }
    );

    // 2. إذا البيانات صحيحة، نحصل على الـ UID الخاص بالمستخدم
    const uid = googleResponse.data.localId;

    // 3. نستخدم صلاحيات الأدمن لإنشاء "توكن مخصص" (Custom Token)
    // هذا التوكن هو الذي سيسمح للتطبيق بالدخول وتجاوز أي قيود جغرافية
    const customToken = await admin.auth().createCustomToken(uid);

    console.log("تم تسجيل الدخول بنجاح وإنشاء التوكن.");

    // 4. إرسال التوكن للتطبيق
    res.json({ token: customToken });

  } catch (error) {
    console.error("خطأ في تسجيل الدخول:", error.response ? error.response.data : error.message);
    res.status(401).json({ error: "فشل تسجيل الدخول: تأكد من الإيميل أو كلمة السر" });
  }
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 