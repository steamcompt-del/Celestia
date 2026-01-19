---
description: Auto-push changes to GitHub after modifications
---

# Auto Push Workflow

// turbo-all

After making any code changes to the project, ALWAYS run these commands:

1. Stage all changes
```bash
& "C:\Program Files\Git\bin\git.exe" add -A
```

2. Commit with descriptive message
```bash
& "C:\Program Files\Git\bin\git.exe" commit -m "type(scope): description"
```

Commit types:
- `feat`: new feature
- `fix`: bug fix
- `style`: CSS/UI changes
- `refactor`: code refactoring
- `docs`: documentation

3. Push to GitHub
```bash
& "C:\Program Files\Git\bin\git.exe" push
```

## Important
- Always use the full path to git.exe on Windows
- Make sure all changes build/lint before pushing
- Use meaningful commit messages
