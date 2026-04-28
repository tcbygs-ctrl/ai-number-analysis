const SEED_DATA = [
  { drawDate: '2024-12-16', firstPrize: '123456', lastTwo: '78', lastThree: ['123', '456'], frontThree: ['234', '567'], nearFirst: ['123455', '123457'] },
  { drawDate: '2024-12-01', firstPrize: '789012', lastTwo: '34', lastThree: ['789', '012'], frontThree: ['890', '123'], nearFirst: ['789011', '789013'] },
  { drawDate: '2024-11-16', firstPrize: '345678', lastTwo: '90', lastThree: ['345', '678'], frontThree: ['456', '789'], nearFirst: ['345677', '345679'] },
  { drawDate: '2024-11-01', firstPrize: '901234', lastTwo: '56', lastThree: ['901', '234'], frontThree: ['012', '345'], nearFirst: ['901233', '901235'] },
  { drawDate: '2024-10-16', firstPrize: '567890', lastTwo: '12', lastThree: ['567', '890'], frontThree: ['678', '901'], nearFirst: ['567889', '567891'] },
  { drawDate: '2024-10-01', firstPrize: '234567', lastTwo: '89', lastThree: ['234', '567'], frontThree: ['345', '678'], nearFirst: ['234566', '234568'] },
  { drawDate: '2024-09-16', firstPrize: '890123', lastTwo: '45', lastThree: ['890', '123'], frontThree: ['901', '234'], nearFirst: ['890122', '890124'] },
  { drawDate: '2024-09-01', firstPrize: '456789', lastTwo: '01', lastThree: ['456', '789'], frontThree: ['567', '890'], nearFirst: ['456788', '456790'] },
  { drawDate: '2024-08-16', firstPrize: '012345', lastTwo: '67', lastThree: ['012', '345'], frontThree: ['123', '456'], nearFirst: ['012344', '012346'] },
  { drawDate: '2024-08-01', firstPrize: '678901', lastTwo: '23', lastThree: ['678', '901'], frontThree: ['789', '012'], nearFirst: ['678900', '678902'] },
  { drawDate: '2024-07-16', firstPrize: '345123', lastTwo: '78', lastThree: ['345', '123'], frontThree: ['456', '234'], nearFirst: ['345122', '345124'] },
  { drawDate: '2024-07-01', firstPrize: '901678', lastTwo: '34', lastThree: ['901', '678'], frontThree: ['012', '789'], nearFirst: ['901677', '901679'] },
  { drawDate: '2024-06-16', firstPrize: '234890', lastTwo: '56', lastThree: ['234', '890'], frontThree: ['345', '901'], nearFirst: ['234889', '234891'] },
  { drawDate: '2024-06-01', firstPrize: '567012', lastTwo: '90', lastThree: ['567', '012'], frontThree: ['678', '123'], nearFirst: ['567011', '567013'] },
  { drawDate: '2024-05-16', firstPrize: '890456', lastTwo: '12', lastThree: ['890', '456'], frontThree: ['901', '567'], nearFirst: ['890455', '890457'] },
  { drawDate: '2024-05-01', firstPrize: '123789', lastTwo: '45', lastThree: ['123', '789'], frontThree: ['234', '890'], nearFirst: ['123788', '123790'] },
  { drawDate: '2024-04-16', firstPrize: '456234', lastTwo: '89', lastThree: ['456', '234'], frontThree: ['567', '345'], nearFirst: ['456233', '456235'] },
  { drawDate: '2024-04-01', firstPrize: '789567', lastTwo: '01', lastThree: ['789', '567'], frontThree: ['890', '678'], nearFirst: ['789566', '789568'] },
  { drawDate: '2024-03-16', firstPrize: '012890', lastTwo: '23', lastThree: ['012', '890'], frontThree: ['123', '901'], nearFirst: ['012889', '012891'] },
  { drawDate: '2024-03-01', firstPrize: '345012', lastTwo: '67', lastThree: ['345', '012'], frontThree: ['456', '123'], nearFirst: ['345011', '345013'] },
  { drawDate: '2024-02-16', firstPrize: '678345', lastTwo: '90', lastThree: ['678', '345'], frontThree: ['789', '456'], nearFirst: ['678344', '678346'] },
  { drawDate: '2024-02-01', firstPrize: '901567', lastTwo: '12', lastThree: ['901', '567'], frontThree: ['012', '678'], nearFirst: ['901566', '901568'] },
  { drawDate: '2024-01-16', firstPrize: '234678', lastTwo: '56', lastThree: ['234', '678'], frontThree: ['345', '789'], nearFirst: ['234677', '234679'] },
  { drawDate: '2024-01-02', firstPrize: '567901', lastTwo: '34', lastThree: ['567', '901'], frontThree: ['678', '012'], nearFirst: ['567900', '567902'] },
  { drawDate: '2023-12-16', firstPrize: '890234', lastTwo: '78', lastThree: ['890', '234'], frontThree: ['901', '345'], nearFirst: ['890233', '890235'] },
  { drawDate: '2023-12-01', firstPrize: '123456', lastTwo: '90', lastThree: ['123', '456'], frontThree: ['234', '567'], nearFirst: ['123455', '123457'] },
  { drawDate: '2023-11-16', firstPrize: '456789', lastTwo: '23', lastThree: ['456', '789'], frontThree: ['567', '890'], nearFirst: ['456788', '456790'] },
  { drawDate: '2023-11-01', firstPrize: '789012', lastTwo: '45', lastThree: ['789', '012'], frontThree: ['890', '123'], nearFirst: ['789011', '789013'] },
  { drawDate: '2023-10-16', firstPrize: '012345', lastTwo: '67', lastThree: ['012', '345'], frontThree: ['123', '456'], nearFirst: ['012344', '012346'] },
  { drawDate: '2023-10-01', firstPrize: '345678', lastTwo: '89', lastThree: ['345', '678'], frontThree: ['456', '789'], nearFirst: ['345677', '345679'] }
];

// เรียงจากล่าสุดไปเก่าสุด (seed data อยู่ในลำดับนี้แล้ว แต่ sort เพื่อความปลอดภัย)
SEED_DATA.sort((a, b) => new Date(b.drawDate) - new Date(a.drawDate));

module.exports = SEED_DATA;
