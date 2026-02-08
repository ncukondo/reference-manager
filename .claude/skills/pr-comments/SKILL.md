---
name: pr-comments
description: Responds to PR comments and review feedback. Use when addressing specific comments on a PR.
---

# PR Comments: #$ARGUMENTS

PR #$ARGUMENTS のコメントに対応します。

## PR Info
!`gh pr view $ARGUMENTS --json title,author,state --jq '"Title: \(.title)\nAuthor: \(.author.login)\nState: \(.state)"' 2>/dev/null`

## Review Comments
!`gh api repos/{owner}/{repo}/pulls/$ARGUMENTS/comments --jq '.[] | "[\(.user.login)] \(.path):\(.line // .original_line)\n\(.body)\n---"' 2>/dev/null`

## Review Requests
!`gh pr view $ARGUMENTS --json reviews --jq '.reviews[] | select(.state == "CHANGES_REQUESTED") | "[\(.author.login)] \(.state)\n\(.body)\n---"' 2>/dev/null`

## Steps

### 1. Understand Comments

Read all comments and identify:
- **Critical**: Must fix before merge
- **Suggestions**: Optional improvements
- **Questions**: Need clarification

### 2. Address Each Comment

For each comment:

1. **If code change needed**:
   - Make the fix
   - Commit with descriptive message
   - Reply to comment explaining the fix

2. **If clarification needed**:
   - Reply to comment with explanation
   - Reference relevant code/docs

3. **If disagreement**:
   - Reply with reasoning
   - Propose alternative if applicable

### 3. Reply to Comments

```bash
# Reply to a specific comment
gh api repos/{owner}/{repo}/pulls/$ARGUMENTS/comments/{comment_id}/replies \
  -f body="Fixed in commit abc123"

# Or add a general PR comment
gh pr comment $ARGUMENTS --body "Addressed all review comments:
- Fixed type issue in auth.ts
- Added missing tests
- Updated documentation"
```

### 4. Push Changes

```bash
git add -A
git commit -m "fix: address PR review comments

- [list of changes]

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push
```

### 5. Request Re-review (optional)

```bash
gh pr edit $ARGUMENTS --add-reviewer <reviewer>
```

## Spawning a Worker for PR Comments

From main agent:
```bash
./scripts/spawn-agent.sh --pr $ARGUMENTS -- "/pr-comments $ARGUMENTS"
```

## Notes

- Always be respectful in responses
- Explain *why* you made changes, not just *what*
- If you disagree with feedback, explain your reasoning politely
- Mark conversations as resolved when addressed
