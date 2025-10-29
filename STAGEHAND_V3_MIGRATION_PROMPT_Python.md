# Stagehand v2 to v3 Migration Prompt (Python)

Use this prompt with your AI coding assistant (like Cursor or Claude) to automatically migrate your Stagehand v2 Python code to v3.

---

## Copy-Paste Prompt for AI Assistant

```
Please migrate my Stagehand v2 Python code to be compatible with Stagehand v3. Apply ALL of the following changes:

### 1. PAGE ACCESS PATTERN (CRITICAL)
- Change ALL instances of `page = stagehand.page` to `page = stagehand.context.pages()[0]`
- This is the most important change and affects every file that accesses the page

### 2. METHOD CALLS MOVE FROM PAGE TO STAGEHAND
- Change ALL `page.act()` calls to `stagehand.act()`
- Change ALL `page.extract()` calls to `stagehand.extract()`
- Change ALL `page.observe()` calls to `stagehand.observe()`

### 3. CONSTRUCTOR PARAMETERS
- Change `model_name` to `model` (can be a string or dictionary)
  Before: `model_name="google/gemini-2.5-flash-preview-05-20"`
  After: `model="google/gemini-2.5-flash-preview-05-20"`
  
  Or with full config:
  ```python
  model={
      "model_name": "google/gemini-2.5-flash",
      "model_api_key": "your-api-key"
  }
  ```

- Rename `dom_settle_timeout_ms` to `dom_settle_timeout` (if present)

### 4. METHOD SIGNATURES

**act() method:**
- Signature: `await stagehand.act(instruction: str, **options)`
- Options include: `page`, `timeout`, `model`, `variables`
- **Note**: The `page` parameter is optional. If not provided, uses the active page.
- Example:
  ```python
  # Simple usage - no page parameter needed (uses active page by default)
  await stagehand.act("click 'football'")
  
  # Or with options:
  await stagehand.act("choose 'Peach' from dropdown", page=page, timeout=10000)
  ```

**extract() method:**
- Signature: `await stagehand.extract(instruction: str, schema: PydanticModel = None, **options)`
- Options include: `page`, `timeout`, `model`, `selector`
- **Note**: The `page` parameter is optional. If not provided, uses the active page.
- Example:
  ```python
  result = await stagehand.extract(
      "extract number one hn story",
      schema=StringData,
      selector="xpath=/html/body/main/...",
      timeout=10000,
      page=page  # optional - only specify if you want a different page
  )
  ```

**observe() method:**
- Signature: `await stagehand.observe(instruction: str = None, **options)`
- Options include: `page`, `timeout`, `model`, `selector`
- **Note**: The `page` parameter is optional. If not provided, uses the active page.
- Returns: `List[ObserveResult]` objects that can be passed directly to `act()`
- Example:
  ```python
  actions = await stagehand.observe("find the button to click")
  await stagehand.act(actions[0])
  ```

### 5. PYDANTIC SCHEMA USAGE
- Continue using Pydantic models for schema definitions (no changes)
- `schema` parameter in `extract()` remains optional but recommended

Please apply these changes to my code while preserving all other functionality.
```

---

## Before/After Examples

### Example 1: Basic Usage

**Before (v2):**
```python
from stagehand import Stagehand, StagehandConfig
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    config = StagehandConfig(
        env="BROWSERBASE",
        model_name="openai/gpt-4.1",
        api_key=os.getenv("BROWSERBASE_API_KEY"),
        project_id=os.getenv("BROWSERBASE_PROJECT_ID"),
    )
    
    async with Stagehand(config) as stagehand:
        page = stagehand.page
        await page.goto("https://example.com")
        await page.act("click the button")

if __name__ == "__main__":
    asyncio.run(main())
```

**After (v3):**
```python
from stagehand import Stagehand, StagehandConfig
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    config = StagehandConfig(
        env="BROWSERBASE",
        model="openai/gpt-4.1",
        api_key=os.getenv("BROWSERBASE_API_KEY"),
        project_id=os.getenv("BROWSERBASE_PROJECT_ID"),
    )
    
    async with Stagehand(config) as stagehand:
        page = stagehand.context.pages()[0]
        await page.goto("https://example.com")
        await stagehand.act("click the button")

if __name__ == "__main__":
    asyncio.run(main())
```

### Example 2: With Extract and Schema

**Before (v2):**
```python
async with Stagehand(config) as stagehand:
    page = stagehand.page
    await page.goto("https://news.ycombinator.com")
    
    from pydantic import BaseModel
    
    class UserData(BaseModel):
        title: str
        url: str
    
    user_data = await page.extract(
        "Extract the top story",
        schema=UserData
    )
```

**After (v3):**
```python
async with Stagehand(config) as stagehand:
    page = stagehand.context.pages()[0]
    await page.goto("https://news.ycombinator.com")
    
    from pydantic import BaseModel
    
    class UserData(BaseModel):
        title: str
        url: str
    
    # page parameter is optional - uses active page by default
    user_data = await stagehand.extract(
        "Extract the top story",
        schema=UserData
    )
```

### Example 3: With Act Options

**Before (v2):**
```python
page = stagehand.page
await page.act("click the submit button")
```

**After (v3):**
```python
page = stagehand.context.pages()[0]

# Simple usage - no page parameter needed (uses active page by default)
await stagehand.act("click the submit button")

# Or with options but still no explicit page needed:
await stagehand.act("click the submit button", timeout=10000)
```

### Example 4: With Browserbase Context

**Before (v2):**
```python
config = StagehandConfig(
    env="BROWSERBASE",
    model_name="openai/gpt-4.1",
    browserbase_session_create_params={
        "project_id": os.getenv("BROWSERBASE_PROJECT_ID"),
        "browser_settings": {
            "context": {
                "id": context_id,
                "persist": True,
            },
        },
    },
)

async with Stagehand(config) as stagehand:
    page = stagehand.page
```

**After (v3):**
```python
config = StagehandConfig(
    env="BROWSERBASE",
    model="openai/gpt-4.1",
    browserbase_session_create_params={
        "project_id": os.getenv("BROWSERBASE_PROJECT_ID"),
        "browser_settings": {
            "context": {
                "id": context_id,
                "persist": True,
            },
        },
    },
)

async with Stagehand(config) as stagehand:
    page = stagehand.context.pages()[0]
```

### Example 5: Observe Pattern

**Before (v2):**
```python
page = stagehand.page
await page.goto("https://example.com")
results = await page.observe("Find the button to click")
await page.act(results[0])
```

**After (v3):**
```python
page = stagehand.context.pages()[0]
await page.goto("https://example.com")

actions = await stagehand.observe("find the button to click")
await stagehand.act(actions[0])
```

### Example 6: Complex Form Filling

**Before (v2):**
```python
async with Stagehand(config) as stagehand:
    page = stagehand.page
    
    # Fill form using individual act() calls
    await page.act(f'Fill in the first name field with "{first_name}"')
    await page.act(f'Fill in the last name field with "{last_name}"')
    await page.act(f'Fill in the email field with "{email}"')
```

**After (v3):**
```python
async with Stagehand(config) as stagehand:
    page = stagehand.context.pages()[0]
    
    # Fill form using individual act() calls
    await stagehand.act(f'Fill in the first name field with "{first_name}"')
    await stagehand.act(f'Fill in the last name field with "{last_name}"')
    await stagehand.act(f'Fill in the email field with "{email}"')
```

---

## Quick Reference: All Breaking Changes

| v2 | v3 | Notes |
|---|---|---|
| `stagehand.page` | `stagehand.context.pages()[0]` | **Most critical change** |
| `page.act()` | `stagehand.act()` | Method moved to stagehand |
| `page.extract()` | `stagehand.extract()` | Method moved to stagehand |
| `page.observe()` | `stagehand.observe()` | Method moved to stagehand |
| `model_name=` | `model=` | Constructor parameter |
| `dom_settle_timeout_ms=` | `dom_settle_timeout=` | Constructor parameter |

---

## Common Migration Patterns

### Pattern 1: Multiple Page Access
If you access `stagehand.page` multiple times, update ALL occurrences:

```python
# Find and replace ALL of these patterns:
page = stagehand.page
some_page = stagehand.page

# With:
page = stagehand.context.pages()[0]
some_page = stagehand.context.pages()[0]
```

### Pattern 2: Function Parameters
If you pass the page to functions, update the function calls:

```python
# Before
async def my_function(stagehand: Stagehand):
    page = stagehand.page
    await page.act("click button")
    # ...

# After
async def my_function(stagehand: Stagehand):
    page = stagehand.context.pages()[0]
    await stagehand.act("click button")
    # ...
```

### Pattern 3: Multiple Stagehand Instances
Update EACH instance individually:

```python
# Before
config1 = StagehandConfig(env="BROWSERBASE", model_name="openai/gpt-4.1")
config2 = StagehandConfig(env="BROWSERBASE", model_name="openai/gpt-4.1")
async with Stagehand(config1) as stagehand1:
    async with Stagehand(config2) as stagehand2:
        page1 = stagehand1.page
        page2 = stagehand2.page

# After
config1 = StagehandConfig(env="BROWSERBASE", model="openai/gpt-4.1")
config2 = StagehandConfig(env="BROWSERBASE", model="openai/gpt-4.1")
async with Stagehand(config1) as stagehand1:
    async with Stagehand(config2) as stagehand2:
        page1 = stagehand1.context.pages()[0]
        page2 = stagehand2.context.pages()[0]
```

---

## Testing Your Migration

After migration, verify these key points:

1. ✅ All `stagehand.page` references are now `stagehand.context.pages()[0]`
2. ✅ All `page.act()` calls are now `stagehand.act()`
3. ✅ All `page.extract()` calls are now `stagehand.extract()`
4. ✅ All `page.observe()` calls are now `stagehand.observe()`
5. ✅ All `model_name` are now `model`
6. ✅ All `dom_settle_timeout_ms` are now `dom_settle_timeout`
7. ✅ Your code runs without errors
8. ✅ Your automation runs successfully

---

## Common Issues and Solutions

### Issue: "AttributeError: 'Stagehand' object has no attribute 'page'"
**Solution**: Change `stagehand.page` to `stagehand.context.pages()[0]`

### Issue: "AttributeError: 'Page' object has no attribute 'act'"
**Solution**: Change `page.act()` calls to `stagehand.act()` and pass page as parameter if needed: `await stagehand.act("instruction", page=page)`

### Issue: "TypeError: extract() takes 1 positional argument but 2 were given"
**Solution**: Change method signature from `page.extract(instruction, schema)` to `stagehand.extract(instruction, schema=YourSchema, **options)`

### Issue: "KeyError: 'model_name'"
**Solution**: Change `model_name` parameter to `model` in your config

---

## Best Practices for v3

1. **Use async context managers** for automatic resource management:
   ```python
   async with Stagehand(config) as stagehand:
       # Your code here
   ```

2. **Keep page reference** if you need Playwright Page methods:
   ```python
   page = stagehand.context.pages()[0]
   await page.goto("https://example.com")  # Playwright method
   await stagehand.act("click button")     # Stagehand method
   ```

3. **Use Pydantic models** for structured extraction:
   ```python
   from pydantic import BaseModel, Field
   
   class UserData(BaseModel):
       name: str = Field(..., description="User's name")
       email: str = Field(..., description="User's email")
   
   data = await stagehand.extract("Extract user info", schema=UserData)
   ```

4. **Handle errors appropriately** with try/except blocks:
   ```python
   try:
       await stagehand.act("click button")
   except Exception as e:
       print(f"Error: {e}")
   ```

---

## Need Help?

If you encounter issues during migration:
- Check that you updated ALL page access patterns
- Verify your model configuration is correct
- Ensure all method calls moved from page to stagehand
- Review the examples above for your specific use case

For more information, see: https://docs.stagehand.dev

