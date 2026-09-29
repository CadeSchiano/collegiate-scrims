'use client';

import { Bell, Check, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase/client';

export default function NotificationsBell() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const {
      data: { user: activeUser },
    } = await supabase.auth.getUser();
    setUser(activeUser);
    if (!activeUser) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('notifications')
      .select('id,title,body,link,read_at,created_at')
      .eq('user_id', activeUser.id)
      .order('created_at', { ascending: false })
      .limit(12);
    setNotifications(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen || !user) return;
    const unreadIds = notifications.filter((item) => !item.read_at).map((item) => item.id);
    if (!unreadIds.length) return;
    const readAt = new Date().toISOString();
    await supabase.from('notifications').update({ read_at: readAt }).in('id', unreadIds);
    setNotifications((current) => current.map((item) => ({ ...item, read_at: readAt })));
  }

  if (!user) return null;
  const unreadCount = notifications.filter((item) => !item.read_at).length;

  return (
    <div className="notifications-menu">
      <button
        type="button"
        className="notification-trigger"
        onClick={toggle}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && <b>{unreadCount > 9 ? '9+' : unreadCount}</b>}
      </button>
      {open && (
        <section className="notifications-panel">
          <header>
            <strong>Notifications</strong>
            {unreadCount > 0 && <span>{unreadCount} new</span>}
          </header>
          {loading ? (
            <LoaderCircle className="spin" size={17} />
          ) : notifications.length === 0 ? (
            <p className="notifications-empty">You’re all caught up.</p>
          ) : (
            notifications.map((item) => (
              <button
                type="button"
                key={item.id}
                className="notification-item"
                onClick={() => item.link && router.push(item.link)}
              >
                <Check size={14} />
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                </div>
              </button>
            ))
          )}
        </section>
      )}
    </div>
  );
}
