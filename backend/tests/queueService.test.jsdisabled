const { resetStore, addUser, addService } = require('../data/store');
const QueueService = require('../services/QueueService');
// Terminal command to run this test: npm test -- queueService.test.js

describe('QueueService', () => {
  beforeEach(() => {
    resetStore();
  });

  test('sorts queue by higher priority then earlier join time', () => {
    const queue = [
      { userId: 1, priority: 1, joinedAt: '2026-03-24T10:00:00.000Z' },
      { userId: 2, priority: 3, joinedAt: '2026-03-24T10:05:00.000Z' },
      { userId: 3, priority: 3, joinedAt: '2026-03-24T09:59:00.000Z' }
    ];

    const sorted = QueueService.sortQueue(queue);
    expect(sorted.map((item) => item.userId)).toEqual([3, 2, 1]);
  });

  test('calculates wait time as position x service.duration', () => {
    const service = addService({
      name: 'License Renewal',
      description: 'Renew IDs',
      duration: 10,
      priority: 2
    });

    const userA = addUser({ username: 'alex@cougarnet.uh.edu', password: 'password', role: 'user' });
    const userB = addUser({ username: 'blair@cougarnet.uh.edu', password: 'password', role: 'user' });

    QueueService.joinQueue({ serviceId: service.id, userId: userA.id, priority: 2 });
    QueueService.joinQueue({ serviceId: service.id, userId: userB.id, priority: 1 });

    const wait = QueueService.estimateWaitTime(service.id, userB.id);
    expect(wait.position).toBe(2);
    expect(wait.waitTime).toBe(20);
  });
});
