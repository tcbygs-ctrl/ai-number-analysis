const mongoose = require('mongoose');

const LotteryResultSchema = new mongoose.Schema({
  drawDate: { type: Date, required: true },
  firstPrize: { type: String, required: true },
  lastTwo: { type: String, required: true },
  lastThree: [{ type: String }],
  frontThree: [{ type: String }],
  nearFirst: [{ type: String }]
}, { timestamps: true });

LotteryResultSchema.index({ drawDate: -1 });

module.exports = mongoose.model('LotteryResult', LotteryResultSchema);
