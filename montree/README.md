# Montessori Tree 🌳

An interactive, comprehensive Montessori curriculum visualization and classroom management system.

## Project Overview

The Montessori Tree is a skill-tree style visualization of the complete Montessori curriculum (ages 0-6), designed to:

1. **Visualize** - Display all works across 5 areas with proper sequencing
2. **Guide** - Help children progress through the curriculum
3. **Track** - Monitor student progress in real-time
4. **Report** - Generate automated progress reports
5. **Provide** - Link to materials and presentation videos

## Current Phase: Step 1 - Foundation

This step includes:
- Complete curriculum database structure
- Project configuration
- Documentation

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Cursor IDE (recommended)

### Installation

1. Open this folder in Cursor IDE

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
montessori-tree/
├── PROJECT_CONTEXT.md      # IMPORTANT: Read this first every session
├── README.md               # This file
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── tailwind.config.js      # Tailwind CSS config
├── postcss.config.js       # PostCSS config
├── next.config.js          # Next.js config
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout
│   │   ├── page.tsx        # Main page
│   │   └── globals.css     # Global styles
│   ├── components/
│   │   └── (tree components will go here)
│   ├── lib/
│   │   └── curriculum/
│   │       └── data.ts     # Curriculum database
│   └── types/
│       └── curriculum.ts   # TypeScript types
```

## Development Workflow

1. **Read PROJECT_CONTEXT.md** at the start of each session
2. Work on current step
3. Test thoroughly
4. Update PROJECT_CONTEXT.md with progress
5. Move to next step

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 + Tailwind CSS
- **Visualization**: React Flow (@xyflow/react)
- **Database**: Supabase (future)
- **State**: Zustand
- **Language**: TypeScript

## Features Roadmap

- [ ] Step 1: Curriculum data structure ✅
- [ ] Step 2: Interactive tree visualization
- [ ] Step 3: YouTube video linking
- [ ] Step 4: Child tracking system
- [ ] Step 5: Teacher dashboard
- [ ] Step 6: Automated reports
- [ ] Step 7: Materials commerce
- [ ] Step 8: Printable generator
- [ ] Step 9: Mobile app
- [ ] Step 10: RFID integration
- [ ] Step 11: AI camera (future)

## License

Private - All rights reserved

## Author

Tredoux - Whale Montessori Platform

