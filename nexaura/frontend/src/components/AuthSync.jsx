import React, { useEffect, useRef } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { getApiBaseUrl } from '../services/api';

export default function AuthSync() {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const lastSyncedRef = useRef(null);

  useEffect(() => {
    if (!isSignedIn || !user) {
      lastSyncedRef.current = null;
      return;
    }

    const syncPayload = {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress || null,
      full_name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || null,
      avatar_url: user.imageUrl || null,
      phone: user.primaryPhoneNumber?.phoneNumber || null,
    };

    const syncKey = `${user.id}-${syncPayload.email}-${syncPayload.full_name}-${syncPayload.avatar_url}`;
    if (lastSyncedRef.current === syncKey) {
      return;
    }

    const syncToDatabase = async () => {
      try {
        const token = await getToken();
        const headers = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${getApiBaseUrl()}/api/users/sync`, {
          method: 'POST',
          headers,
          body: JSON.stringify(syncPayload),
        });

        if (response.ok) {
          const dbUser = await response.json();
          lastSyncedRef.current = syncKey;
          // Store user details in sessionStorage for instant UI access
          sessionStorage.setItem('skinora_db_user', JSON.stringify(dbUser));
        } else {
          console.warn('Database user sync returned status:', response.status);
        }
      } catch (err) {
        console.warn('Database user sync failed:', err);
      }
    };

    syncToDatabase();
  }, [isSignedIn, user, getToken]);

  return null;
}
