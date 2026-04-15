# Get Dashboard Data

Fetch all articles and topics in the pipeline.

## When to use
- When Sondra asks about the status of her pipeline ("What's in the pipeline?" "What articles are in review?")
- Before suggesting topics, to check what already exists and avoid duplicates
- To see what's been published recently and identify content gaps

## Returns
- **articles**: All articles with their status (researching, drafting, review, published), titles, word counts, and timestamps
- **topics**: All topics in the backlog with priority, status, and whether they were agent-suggested

## Presenting results
Summarize concisely. Group by status. Highlight anything in "review" that needs Sondra's attention. Don't dump raw data.
