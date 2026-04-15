---
name: Content Calendar
description: A visual calendar showing what's scheduled, in-flight, and published — so the pipeline tells a story over time instead of just showing what's happening right now.
effort: small
status: planned
---

The pipeline dashboard is excellent for tracking live work. But it says nothing about time: when did she last publish? Is there a gap coming? Is she publishing consistently? The content calendar answers those questions at a glance.

## What it looks like

**Calendar View**
- Monthly calendar view accessible from the sidebar navigation (a new icon, or a toggle on the pipeline dashboard)
- Published articles appear on their publish date
- Scheduled articles appear on their scheduled date with a distinct treatment (outlined, not filled)
- In-progress articles (researching, drafting, review) appear as a count badge on today's date — "3 in flight"

**Article Detail on Hover/Click**
- Clicking a day with articles opens a mini-panel showing those articles
- Click an article to navigate to the editor
- Click an empty future date to create a new topic pre-assigned to that date

**Publishing Rhythm at a Glance**
- The calendar makes gaps obvious: two weeks with no published articles is visually hard to miss
- Streak indicator: "Published 6 weeks in a row" or "Last published 14 days ago"

**Sidebar Integration**
- The pipeline dashboard sidebar shows a mini-calendar (compact month view) alongside the recent articles list
- This makes it easy to see the schedule without leaving the pipeline view

## Key details

- The calendar shows a rolling 3-month window: last month, this month, next month
- Articles can be dragged to different dates on the calendar to reschedule them
- No separate "calendar mode" toggle — it's a first-class view in the navigation
- Works in tandem with Scheduled Publishing; a scheduled article on the calendar has a clock icon

~~~
The calendar view is a new route `/calendar` in the web interface. Uses the existing articles data already loaded in the Zustand store — no new backend calls needed for the view itself.

Frontend-only feature for the calendar rendering. Use a lightweight calendar library or build a simple grid component. Scheduled dates come from a `scheduledPublishAt` field added to the article record (added by the Scheduled Publishing feature).

For the "create topic on date" interaction: clicking an empty future date opens the Add Topic modal pre-populated with the `scheduledPublishAt` date.
~~~
