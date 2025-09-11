# Quick Git Reference for ASIAFLEX

## Adding All Local Changes to Repository

### Basic Workflow

1. **Check status**:
   ```bash
   git status
   ```

2. **Add all changes**:
   ```bash
   git add .
   ```

3. **Commit with message**:
   ```bash
   git commit -m "Your descriptive message"
   ```

4. **Push to repository**:
   ```bash
   git push
   ```

### Complete Example
```bash
git status                    # Check what changed
git add .                     # Add all changes
git commit -m "Add new feature"  # Commit with message
git push                      # Push to remote repository
```

### ASIAFLEX Specific Examples

```bash
# Adding new contract changes
git add contracts/AsiaFlexToken.sol
git commit -m "Update AsiaFlexToken minting logic"
git push

# Adding script modifications
git add scripts/deploy.js scripts/mintByUSD.js
git commit -m "Improve deployment and minting scripts"
git push

# Adding test files
git add test/
git commit -m "Add comprehensive test suite"
git push
```

For detailed instructions in Italian, see [GUIDA_GIT.md](./GUIDA_GIT.md).