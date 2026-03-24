# Heartbeat Routine

When your heartbeat fires, do these checks:

1. **Check site health**: Run `bash scripts/site.sh status` for each managed site
2. **Check for scheduled articles**: Look for articles scheduled to publish today
3. **Quick SEO scan**: If it's morning (7-9am), run a brief SEO status check
4. **Report to channel**: If anything noteworthy is found, post a summary

Keep messages concise and actionable. Only notify if there's something worth reporting.
