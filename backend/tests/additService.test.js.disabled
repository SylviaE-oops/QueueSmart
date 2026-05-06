const { resetStore, addUser, addService } = require('../data/store');
const QueueService = require('../services/QueueService');

describe('QueueService - additional tests', () => {
  beforeEach(() => {
    resetStore();
  });

  test('sortQueue keeps earlier join time first when priorities are equal', () => {
    const queue = [
      { userId: 1, priority: 2, joinedAt: '2026-03-24T10:05:00.000Z' },
      { userId: 2, priority: 2, joinedAt: '2026-03-24T10:01:00.000Z' },
      { userId: 3, priority: 2, joinedAt: '2026-03-24T10:03:00.000Z' }
    ];

    const sorted = QueueService.sortQueue(queue);

    expect(sorted.map(item => item.userId)).toEqual([2, 3, 1]);
  });

  test('sortQueue returns empty array when queue is empty', () => {
    const sorted = QueueService.sortQueue([]);
    expect(sorted).toEqual([]);
  });

  test('joinQueue places highest priority user ahead of lower priority users', () => {
    const service = addService({
      name: 'Campus Bookstore',
      description: 'Pickup books',
      duration: 5,
      priority: 1
    });

    const userA = addUser({ username: 'a@cougarnet.uh.edu', password: 'password', role: 'user' });
    const userB = addUser({ username: 'b@cougarnet.uh.edu', password: 'password', role: 'user' });
    const userC = addUser({ username: 'c@cougarnet.uh.edu', password: 'password', role: 'user' });

    QueueService.joinQueue({ serviceId: service.id, userId: userA.id, priority: 1 });
    QueueService.joinQueue({ serviceId: service.id, userId: userB.id, priority: 1 });
    QueueService.joinQueue({ serviceId: service.id, userId: userC.id, priority: 3 });

    const queue = QueueService.getQueue(service.id);

    expect(queue.map(item => item.userId)).toEqual([userC.id, userA.id, userB.id]);
  });

  test('estimateWaitTime returns first position with one service duration', () => {
    const service = addService({
      name: 'Library',
      description: 'Reserve pickup',
      duration: 7,
      priority: 1
    });

    const user = addUser({ username: 'solo@cougarnet.uh.edu', password: 'password', role: 'user' });

    QueueService.joinQueue({ serviceId: service.id, userId: user.id, priority: 1 });

    const wait = QueueService.estimateWaitTime(service.id, user.id);

    expect(wait.position).toBe(1);
    expect(wait.waitTime).toBe(7);
  });

  test('estimateWaitTime updates after another user with higher priority joins', () => {
    const service = addService({
      name: 'Law Center',
      description: 'Law pickup',
      duration: 8,
      priority: 1
    });

    const userA = addUser({ username: 'alpha@cougarnet.uh.edu', password: 'password', role: 'user' });
    const userB = addUser({ username: 'beta@cougarnet.uh.edu', password: 'password', role: 'user' });

    QueueService.joinQueue({ serviceId: service.id, userId: userA.id, priority: 1 });
    QueueService.joinQueue({ serviceId: service.id, userId: userB.id, priority: 3 });

    const waitA = QueueService.estimateWaitTime(service.id, userA.id);
    const waitB = QueueService.estimateWaitTime(service.id, userB.id);

    expect(waitB.position).toBe(1);
    expect(waitB.waitTime).toBe(8);

    expect(waitA.position).toBe(2);
    expect(waitA.waitTime).toBe(16);
  });

  test('removing a user shrinks the queue correctly', () => {
    const loc = QueueService.addLocation({ name: 'Main Desk' });

    QueueService.addToQueue(loc.id, { userId: 1, priority: 1 });
    QueueService.addToQueue(loc.id, { userId: 2, priority: 2 });
    QueueService.addToQueue(loc.id, { userId: 3, priority: 1 });

    QueueService.removeFromQueue(loc.id, 2);

    const queue = QueueService.getQueue(loc.id);

    expect(queue.length).toBe(2);
    expect(queue.map(item => item.userId)).toEqual([1, 3]);
  });

  test('removing a user that does not exist does not change queue', () => {
    const loc = QueueService.addLocation({ name: 'Annex' });

    QueueService.addToQueue(loc.id, { userId: 1, priority: 1 });

    QueueService.removeFromQueue(loc.id, 999);

    const queue = QueueService.getQueue(loc.id);

    expect(queue.length).toBe(1);
    expect(queue[0].userId).toBe(1);
  });

  test('getQueue returns separate results for separate locations with multiple users', () => {
    const loc1 = QueueService.addLocation({ name: 'Bookstore' });
    const loc2 = QueueService.addLocation({ name: 'Library' });

    QueueService.addToQueue(loc1.id, { userId: 10, priority: 1 });
    QueueService.addToQueue(loc1.id, { userId: 11, priority: 2 });
    QueueService.addToQueue(loc2.id, { userId: 20, priority: 1 });

    const q1 = QueueService.getQueue(loc1.id);
    const q2 = QueueService.getQueue(loc2.id);

    expect(q1.map(x => x.userId)).toEqual([11, 10]);
    expect(q2.map(x => x.userId)).toEqual([20]);
  });
});