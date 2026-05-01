const { resetStore } = require('../data/store');
const QueueService = require('../services/QueueService');

describe('QueueSmart - Multiple Locations', () => {

    beforeEach(() => {
        resetStore();
    });

    test('different locations have independent queues', () => {
        const loc1 = QueueService.addLocation({ name: 'Campus Bookstore' });
        const loc2 = QueueService.addLocation({ name: 'Library' });

        QueueService.addToQueue(loc1.id, { userId: 1, priority: 1 });
        QueueService.addToQueue(loc2.id, { userId: 2, priority: 1 });

        const queue1 = QueueService.getQueue(loc1.id);
        const queue2 = QueueService.getQueue(loc2.id);

        expect(queue1.length).toBe(1);
        expect(queue2.length).toBe(1);

        expect(queue1[0].userId).toBe(1);
        expect(queue2[0].userId).toBe(2);
    });

    test('adding users to one location does not affect another', () => {
        const loc1 = QueueService.addLocation({ name: 'Library' });
        const loc2 = QueueService.addLocation({ name: 'Law Center' });

        QueueService.addToQueue(loc1.id, { userId: 1 });
        QueueService.addToQueue(loc1.id, { userId: 2 });

        const queue1 = QueueService.getQueue(loc1.id);
        const queue2 = QueueService.getQueue(loc2.id);

        expect(queue1.length).toBe(2);
        expect(queue2.length).toBe(0);
    });

    test('removing user from one location does not affect others', () => {
        const loc1 = QueueService.addLocation({ name: 'Bookstore' });
        const loc2 = QueueService.addLocation({ name: 'Library' });

        QueueService.addToQueue(loc1.id, { userId: 1 });
        QueueService.addToQueue(loc2.id, { userId: 2 });

        QueueService.removeFromQueue(loc1.id, 1);

        const queue1 = QueueService.getQueue(loc1.id);
        const queue2 = QueueService.getQueue(loc2.id);

        expect(queue1.length).toBe(0);
        expect(queue2.length).toBe(1);
        expect(queue2[0].userId).toBe(2);
    });

});