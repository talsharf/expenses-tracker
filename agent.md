# Agent Guidelines & Best Practices

## Browser Subagent File Uploads & Interaction
- **Native OS Dialogs:** Browser subagents cannot interact with or type paths into native OS file selection dialogs.
- **Exposing Hidden Inputs:** If a subagent attempts to expose hidden file input elements or run custom scripts and encounters security restrictions, it should not persist in trying alternative hacks indefinitely.
- **Fail-Safe Policy:** If a browser action (such as file upload, complex selector interaction, or timed-out page read) fails **2 to 3 times**, the subagent/agent must stop immediately, explain the issue clearly, and ask the user for assistance or manual execution.
