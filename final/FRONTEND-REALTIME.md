# Frontend Realtime Hooks

You can subscribe to realtime inserts for clients and SMS messages.

## Usage

```
import { subscribeToNewClients, subscribeToSMSMessages } from '@/lib/supabase';

useEffect(() => {
  const subClients = subscribeToNewClients((client) => {
    // update local state
  });
  const subSMS = subscribeToSMSMessages((sms) => {
    // update local state
  });
  return () => { subClients.unsubscribe(); subSMS.unsubscribe(); };
}, []);
```

These helpers are defined in `frontend/src/lib/supabase.ts`.

