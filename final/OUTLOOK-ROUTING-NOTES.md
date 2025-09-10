# Outlook Routing — No Live Transfer

- Removed hard 'rejected' outcomes; mapped to 'queued' with instructions
- Mapped 'transfer_external' to 'voicemail' + internal notification
- Added a placeholder `notifyInternalSMS()` for internal alerts
- Success paths still route to agents/queues with calendar + availability checks

Files:
- backend/src/services/outlook/OutlookRoutingEngine.ts

