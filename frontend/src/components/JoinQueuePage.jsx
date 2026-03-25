import { useState, useEffect } from 'preact/hooks';
import { createQueue, getQueuesByService } from '../api';
import styles from './JoinQueuePage.module.css';

export function JoinQueuePage({ services, email, onShowToast, onUpdateQueues }) {
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || '');
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [queueLength, setQueueLength] = useState(0);

  const service = services.find((s) => s.id === selectedServiceId);

  const estimateWaitTime = (position, duration) =>
    Math.max(0, (position - 1) * duration);

  useEffect(() => {
    const fetchQueueLength = async () => {
      try {
        const result = await getQueuesByService(selectedServiceId);
        if (result && result.success) {
          setQueueLength(result.data.length);
        }
      } catch (err) {
        console.error('Failed to load queue length:', err);
      }
    };

    if (selectedServiceId) {
      fetchQueueLength();
    }
  }, [selectedServiceId]);

  const handleJoinQueue = async () => {
    if (!service || service.status !== 'open') return;

    setLoading(true);
    try {
      const result = await createQueue({
        email,
        serviceId: selectedServiceId,
        position: queueLength + 1,
        status: 'waiting'
      });

      if (result && result.success) {
        setJoined(true);
        setQueueLength(queueLength + 1);
        onShowToast('Joined queue', `You joined "${service.name}".`);
        onUpdateQueues?.();
      }
    } catch (err) {
      onShowToast('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveQueue = () => {
    setJoined(false);
    setQueueLength(Math.max(0, queueLength - 1));
    onShowToast('Left queue', `You left the queue.`);
    onUpdateQueues?.();
  };

  const estimatedWait = service
    ? estimateWaitTime(queueLength + 1, service.expectedDurationMin)
    : 0;

  return (
    <div>
      <p class={styles.h1}>Join Queue</p>
      <p class={styles.p}>Select a service and join the queue to track your position.</p>

      <div class={styles.card}>
        <label class={styles.label}>Service</label>
        <select
          class={styles.input}
          value={selectedServiceId}
          onChange={(e) => setSelectedServiceId(e.target.value)}
          disabled={joined}
        >
          {services.map((s) => (
            <option key={s.id} value={s.id} disabled={s.status !== 'open'}>
              {s.name} {s.status !== 'open' ? '(Closed)' : ''}
            </option>
          ))}
        </select>

        <div class={styles.cards} style="margin-top:12px;">
          <div class={styles.card}>
            <div class={`${styles.tag} ${styles.muted}`}>Estimated wait time</div>
            <strong>${estimatedWait} minutes</strong>
            <p class={styles.p} style="margin-top:8px;">
              Based on queue length × expected duration.
            </p>
          </div>
          <div class={styles.card}>
            <div class={`${styles.tag} ${styles.muted}`}>Current queue length</div>
            <strong>${queueLength}</strong>
            <p class={styles.p} style="margin-top:8px;">
              {service?.status === 'open' ? 'Service is open.' : 'Service is closed.'}
            </p>
          </div>
        </div>

        <div class={styles.btnRow}>
          <button
            class={styles.btn}
            onClick={handleJoinQueue}
            disabled={!service?.status || service.status !== 'open' || joined || loading}
          >
            {loading ? 'Joining...' : 'Join Queue'}
          </button>
          <button
            class={`${styles.btn} ${styles.danger}`}
            onClick={handleLeaveQueue}
            disabled={!joined}
          >
            Leave Queue
          </button>
        </div>
      </div>
    </div>
  );
}
