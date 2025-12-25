# 👨‍👦 Collaboration Setup Guide

This guide will help you and your son work on the same project from different laptops using Cursor.

## 📋 Prerequisites

- ✅ Both laptops have Cursor installed
- ✅ Both have Git installed
- ✅ Both have Node.js and npm installed
- ✅ GitHub account access (the repository is at: `https://github.com/Tredoux555/whale-class.git`)

---

## 🚀 Step 1: Commit and Push Your Current Changes (Your Laptop)

Before your son can access the latest code, make sure all your changes are pushed to GitHub:

```bash
cd /Users/tredouxwillemse/Desktop/whale

# Check what files have changed
git status

# Add all changes
git add -A

# Commit with a descriptive message
git commit -m "Your commit message here"

# Push to GitHub
git push origin main
```

**Note:** You currently have uncommitted changes. Run the commands above to push them.

---

## 💻 Step 2: Set Up Your Son's Laptop

### A. Clone the Repository

On your son's laptop, open Cursor and use the terminal:

```bash
# Navigate to where you want the project (e.g., Desktop)
cd ~/Desktop

# Clone the repository
git clone https://github.com/Tredoux555/whale-class.git

# Navigate into the project
cd whale-class
```

### B. Install Dependencies

```bash
# Install all npm packages
npm install
```

### C. Set Up Environment Variables

Create a `.env.local` file in the project root with these variables:

```bash
# Copy your .env.local file contents and share them securely with your son
# OR create a new .env.local file with these variables:
```

**Required Environment Variables:**

1. **Supabase Variables** (from Supabase Dashboard → Settings → API):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

2. **Story System Variables**:
```env
DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/postgres
STORY_JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

3. **Admin Variables**:
```env
ADMIN_SECRET=your-secret-key
ADMIN_USERNAME=Tredoux
ADMIN_PASSWORD=your-password
```

**⚠️ Security Note:** Share these values securely (not via email or chat). Consider:
- Using a password manager
- Sharing in person
- Using encrypted messaging

### D. Start the Development Server

```bash
npm run dev
```

The app should now be running at `http://localhost:3000`

---

## 🔄 Step 3: Working Together - Git Workflow

### Daily Workflow

**Before starting work:**
```bash
# Always pull latest changes first
git pull origin main
```

**After making changes:**
```bash
# Check what changed
git status

# Add your changes
git add -A

# Commit with a descriptive message
git commit -m "Description of what you changed"

# Push to GitHub
git push origin main
```

**If someone else pushed changes:**
```bash
# Pull latest changes
git pull origin main

# If there are conflicts, Git will tell you
# Resolve conflicts, then:
git add -A
git commit -m "Resolved merge conflicts"
git push origin main
```

---

## 🎯 Best Practices for Collaboration

### 1. **Communication**
- Let each other know when you're working on a file
- Commit and push frequently (don't wait days)
- Write clear commit messages

### 2. **Branching (Optional but Recommended)**
For larger features, create separate branches:

```bash
# Create a new branch
git checkout -b feature-name

# Work on your feature
# ... make changes ...

# Commit and push
git add -A
git commit -m "Added feature X"
git push origin feature-name

# When done, merge to main (on GitHub or locally)
```

### 3. **Avoid Conflicts**
- Work on different files when possible
- If working on the same file, coordinate
- Pull before starting work each day

### 4. **Testing**
- Test your changes locally before pushing
- Run `npm run dev` to make sure everything works
- Check for linter errors: `npm run lint`

---

## 🛠️ Troubleshooting

### "Permission Denied" Error
If your son can't push to GitHub:
- Make sure he's added as a collaborator on GitHub:
  1. Go to: https://github.com/Tredoux555/whale-class/settings/access
  2. Click "Add people"
  3. Add your son's GitHub username

### "Merge Conflicts"
If you both edited the same file:
1. Git will mark conflicts with `<<<<<<<`, `=======`, `>>>>>>>`
2. Open the file in Cursor
3. Choose which version to keep (or combine both)
4. Remove the conflict markers
5. Commit the resolved file

### "Module Not Found" Error
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

### Environment Variables Not Working
- Make sure `.env.local` is in the project root
- Restart the dev server after changing `.env.local`
- Check that variable names match exactly (case-sensitive)

---

## 📚 Additional Resources

- **Git Basics**: https://git-scm.com/book/en/v2/Getting-Started-Git-Basics
- **GitHub Collaboration**: https://docs.github.com/en/get-started/quickstart/hello-world
- **Cursor Documentation**: https://cursor.sh/docs

---

## ✅ Quick Checklist

**Your Laptop:**
- [ ] Commit and push all current changes
- [ ] Share environment variables securely
- [ ] Add your son as collaborator on GitHub (if needed)

**Son's Laptop:**
- [ ] Clone the repository
- [ ] Install dependencies (`npm install`)
- [ ] Create `.env.local` with all required variables
- [ ] Test that `npm run dev` works
- [ ] Pull latest changes before starting work

---

**Happy coding together! 🎉**














