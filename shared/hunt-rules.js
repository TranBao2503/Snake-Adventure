(() => {
  'use strict';

  const timeBonusMax = 1000;
  const timePenaltyPerSecond = 10;

  // Both the browser and backend load this file as their source of Hunt rules.
  globalThis.SnakeHuntRules = {
    snakeLengthPolicy: 'fixed',
    completionCondition: 'all_prey_caught_then_enter_portal',
    timeGraceSeconds: 60,
    timePenaltyRounding: 'whole_seconds',
    timeScoreFloor: 0,
    timeBonusMax,
    timePenaltyPerSecond,
    preyCatalog: [
      { id: 'mouse', label: 'Chuột', color: '#d7ac86', behavior: 'flee',
        moveIntervalMs: 1500, moveDistance: 1, points: 100 },
      { id: 'frog', label: 'Ếch', color: '#bdde76', behavior: 'flee',
        moveIntervalMs: 3000, moveDistance: 2, points: 150 },
    ],
    levels: [
      { id: 'hunt-meadow', title: 'Đồng cỏ', featuredPreyId: 'mouse',
        description: 'Bắt đủ 20 chuột để mở cổng. Chuột đi một ô mỗi 1,5 giây và né đầu rắn. Đi qua cổng để hoàn thành màn.',
        preyCounts: { mouse: 20 }, timeBonusMax, timePenaltyPerSecond },
      { id: 'hunt-pond', title: 'Bờ ao', featuredPreyId: 'frog',
        description: 'Bắt 5 chuột và 15 ếch để mở cổng. Ếch nhảy hai ô mỗi 3 giây. Đi qua cổng để hoàn thành màn.',
        preyCounts: { mouse: 5, frog: 15 }, timeBonusMax, timePenaltyPerSecond },
    ],
  };
})();
