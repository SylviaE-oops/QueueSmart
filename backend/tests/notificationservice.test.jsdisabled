const { resetStore, addUser } = require('../data/store');
const NotificationService = require('../services/NotificationService');



describe('NotificationService', () => {
  beforeEach(() => {
    resetStore();
  });

  test('sends a notification to a single user', () => {
    const user = addUser({ username: 'alex@cougarnet.uh.edu', password: 'password', role: 'user' });

    NotificationService.sendNotification({
      userId: user.id,
      title: 'Queue Update',
      message: 'Your turn is coming up!'
    });

    const notifications = NotificationService.getUserNotifications(user.id);
    expect(notifications.length).toBe(1);
    expect(notifications[0].title).toBe('Queue Update');
    expect(notifications[0].message).toBe('Your turn is coming up!');
  });

  test('marks notification as read', () => {
    const user = addUser({ username: 'blair@cougarnet.uh.edu', password: 'password', role: 'user' });

    const notification = NotificationService.sendNotification({
      userId: user.id,
      title: 'Reminder',
      message: 'Your appointment is tomorrow'
    });

    NotificationService.markAsRead(user.id, notification.id);

    const notifications = NotificationService.getUserNotifications(user.id);
    expect(notifications[0].read).toBe(true);
  });

  test('retrieves all unread notifications', () => {
    const user = addUser({ username: 'casey@cougarnet.uh.edu', password: 'password', role: 'user' });

    NotificationService.sendNotification({
      userId: user.id,
      title: 'Update 1',
      message: 'First message'
    });
    NotificationService.sendNotification({
      userId: user.id,
      title: 'Update 2',
      message: 'Second message'
    });

    
    const allNotifications = NotificationService.getUserNotifications(user.id);
    NotificationService.markAsRead(user.id, allNotifications[0].id);

    const unreadNotifications = NotificationService.getUnreadNotifications(user.id);
    expect(unreadNotifications.length).toBe(1);
    expect(unreadNotifications[0].title).toBe('Update 2');
  });
});