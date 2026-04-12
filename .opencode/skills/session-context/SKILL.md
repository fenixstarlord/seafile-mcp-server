# Session Context Skill

This skill helps maintain context across multiple OpenWork sessions by reading and updating the session state file.

## Quick Reference

### Check Current Context

```bash
# Read the session state file
cat .opencode/SESSION_STATE.md

# Or check git branch
git branch --show-current
```

### Update Context

When switching branches or changing context, update the session state:

```bash
# Edit the session state file
# Update the "Current Branch" and "Context" sections
```

### Session State File Location

```
.opencode/SESSION_STATE.md
```

## Session State Format

The session state file tracks:

- **Active Branch**: Current git branch
- **Context**: What you're working on
- **Last Updated**: Timestamp
- **Notes**: Any relevant notes

## Usage in New Sessions

When starting a new session, always:

1. Check the session state file:

   ```bash
   cat .opencode/SESSION_STATE.md
   ```

2. Verify you're on the right branch:

   ```bash
   git branch
   ```

3. If needed, switch to the correct branch:
   ```bash
   git checkout <branch-name>
   ```

## Best Practices

- Update SESSION_STATE.md when switching branches
- Commit the state file after significant context changes
- Use descriptive context messages
- Keep notes concise but informative
