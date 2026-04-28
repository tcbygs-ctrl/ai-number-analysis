// Vercel serverless entry point
// ดึงข้อมูลทันทีที่ module โหลด (cold start) เพื่อให้ request แรกมีข้อมูลพร้อม
const { app, initData } = require('../app');

initData().catch(() => {});

module.exports = app;
