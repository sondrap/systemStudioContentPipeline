---
name: Scheduled Publishing
description: Approve an article in advance and set a date and time for it to go live automatically — no need to be at the keyboard when it publishes.
effort: quick
status: planned
---

Sondra approves articles when they're ready, but the best time to publish isn't always when review wraps up. This lets her set a publish time — Tuesday at 8am, when her audience is at their desks — and walk away.

## What it looks like

**Schedule Option in Review**
- The "Approve & Publish" button gains a dropdown: "Publish Now" or "Schedule"
- Selecting "Schedule" opens a compact date/time picker
- After scheduling, the article card shows a clock icon and the scheduled time: "Publishes Tuesday 8:00 AM"

**Scheduled State**
- Articles waiting to publish appear in a distinct "Scheduled" treatment on the pipeline dashboard (in the Published column with a clock icon, or as a fifth stage between Review and Published)
- Sondra can cancel or reschedule at any time before the publish fires

**Automatic Publishing**
- At the scheduled time, the article publishes exactly as if she'd clicked "Publish Now" — same API call, same success behavior
- If publishing fails (API down, network error), the article moves back to Review with an error note and Sondra is notified

## Key details

- Scheduled time is in Sondra's configured timezone (set in settings)
- The scheduler runs at 1-minute granularity — schedules fire within a minute of the set time
- Canceling a schedule moves the article back to Review status
- If the systemstudio.ai API isn't configured, scheduled publishing uses dry-run mode

~~~
Add `scheduledPublishAt` (number, optional) and `scheduleStatus` ('pending' | 'cancelled', optional) to the article record.

A cron job runs every minute, queries for articles where `scheduledPublishAt <= now` and `scheduleStatus = 'pending'`, and calls the existing `publishArticle` method for each. On success, clears the schedule fields. On failure, moves back to review and records the error.

The date/time picker in the UI sets `scheduledPublishAt`. The article card renders a clock icon if `scheduledPublishAt` is set and the article isn't yet published.
~~~
