---
description: Launch Axora with maximum reliability (Deep Clean + Node v22)
---

This workflow ensures that Axora starts without hanging by performing a deep clean and forcing the recommended Node environment.

// turbo-all

1. Verify and use Node v22
```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use 22
```

2. Perform Deep Clean of build artifacts
```bash
rm -rf .erb/dll
```

3. Launch Application
```bash
npm start
```
