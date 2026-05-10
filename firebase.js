// ไฟล์: firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // เพิ่มส่วนนี้สำหรับทำฐานข้อมูลจองที่นั่ง

const firebaseConfig = {
  apiKey: "AIzaSyAlaTyhtXf-d6qDSD5AeWR33Hg3VCn55o8",
  authDomain: "ntunspace.firebaseapp.com",
  projectId: "ntunspace",
  storageBucket: "ntunspace.firebasestorage.app",
  messagingSenderId: "952526844615",
  appId: "1:952526844615:web:d1f78ba8e3b44c24ee84e2",
  measurementId: "G-33DZ6EX79H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Export ตัวแปรออกไปให้ไฟล์อื่นเรียกใช้งานได้
export { app, analytics, db };
