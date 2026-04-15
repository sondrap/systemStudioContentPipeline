---
name: Built-In Newsletter
description: A subscriber list and email delivery system inside the pipeline — so Sondra can send every article directly to her audience's inbox without touching a third-party email platform.
effort: large
status: planned
---

Sondra has readers who'd subscribe to hear from her directly. Right now there's no mechanism for that — the blog is the endpoint. This adds a subscriber list, email delivery, and subscriber growth tools directly into the pipeline. She writes the article, approves it, and the newsletter goes out. That's it.

## What it looks like

**Subscriber List**
- Simple subscriber management: email address, subscribe date, source (blog opt-in, manual import, referral)
- Import from CSV or paste a list
- Unsubscribe handling is automatic — anyone who unsubscribes is removed immediately and never emailed again
- Basic analytics: total subscribers, growth over time, unsubscribe rate

**Send on Publish**
- When Sondra publishes an article, a "Send Newsletter" option appears alongside "Post to LinkedIn"
- Shows a preview of the newsletter email — the formatted article content with her header/footer branding
- Subscriber count displayed: "This will go to 847 subscribers"
- "Send Now" or "Schedule" (send at a specific time)

**Newsletter Email Design**
- Branded email template in SystemStudio's visual identity
- Article hero image at the top, title, article body, prominent link to the full post on the blog
- Footer: unsubscribe link, "Why you're getting this," social links
- Plain-text version auto-generated alongside HTML

**Subscribe Landing Page**
- A public `/subscribe` page on this app that Sondra can link to from her blog
- Simple form: name (optional) + email + "Subscribe" button
- Confirmation email sent automatically
- Optional: a thank-you note Sondra can customize

**Subscriber Growth**
- A blog subscribe widget (embeddable snippet) for systemstudio.ai
- "Join X other readers" social proof

## Key details

- CAN-SPAM and GDPR compliance is non-negotiable: unsubscribe links in every email, physical address in footer, clear sender identity
- No cold outreach. This is for subscribers who opted in.
- Email delivery via an integrated provider (SendGrid, Mailgun, or similar) configured as a secret
- Subscriber data lives in this app's database, not in a third-party platform
- The newsletter edition from Multi-Format Studio is the default email content when this feature is enabled

~~~
A `subscribers` table: `email` (string, unique), `name` (string, optional), `source` ('subscribe-form' | 'import' | 'referral'), `status` ('active' | 'unsubscribed'), `subscribedAt` (timestamp), `unsubscribedAt` (timestamp, optional).

Newsletter sends stored in a `newsletterSends` table: `articleId` (FK), `sentAt` (timestamp), `recipientCount` (number), `status` ('pending' | 'sent' | 'failed').

Public `/subscribe` route (no auth required) with a `subscribe(email, name)` method. Sends a double opt-in confirmation email. Confirmation link hits a `confirmSubscription(token)` method.

Email delivery: use the MindStudio SDK's email integration (or configure SendGrid/Mailgun as a secret). `sendNewsletter(articleId)` method: fetches active subscribers, renders the email template, sends in batches.

The subscribe landing page is an unprotected public route in the web interface.
~~~
