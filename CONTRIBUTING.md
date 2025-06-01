# Contributing to Vibe Apps

This guide outlines the contribution workflow and guidelines for this project.

## AI Assistant Guidelines

- see the cursor rules files

### Workflow Instructions

When making changes to the codebase, the AI assistant should:

1. **Branch Management**
   - Work in feature branches created from `main`
   - Follow the naming convention: `feature/description-of-change`
   - Never commit directly to `main` or `production`

2. **Code Changes**
   - Add TypeScript types for all new code
   - Maintain consistent code style with existing codebase
   - Update tests when modifying functionality
   - Keep components small and focused

3. **Documentation**
   - Update relevant documentation for any changes
   - Add JSDoc comments for new functions/components
   - Include code comments for complex logic

4. **Testing**
   - Run tests before committing: `npm test`
   - Run linting before committing: `npm run lint`
   - Verify build succeeds: `npm run build`

5. **Commit Guidelines**
   - Use clear, descriptive commit messages
   - Include the type of change (feat, fix, docs, etc.)
   - Example: "feat: add user authentication component"

6. **Pull Request Process**
   ```bash
   # Create feature branch
   git checkout main
   git checkout -b feature/your-feature-name

   # Make changes and commit
   git add .
   git commit -m "type: descriptive message"

   # Push to GitHub
   git push origin feature/your-feature-name
   ```

### Code Style Guidelines

1. **TypeScript**
   - Use explicit types, avoid `any`
   - Prefer interfaces over type aliases
   - Use proper type imports/exports

2. **React Components**
   - Use functional components
   - Implement proper prop types
   - Follow component file structure:
     ```typescript
     // Imports
     import React from 'react';
     
     // Types
     interface Props {
       // prop types
     }
     
     // Component
     export function ComponentName({ prop1, prop2 }: Props) {
       // implementation
     }
     ```

3. **Styling**
   - Use Tailwind CSS classes
   - Follow mobile-first approach
   - Maintain consistent spacing/layout

4. **File Organization**
   ```
   src/
   ├── components/        # Reusable components
   ├── pages/            # Page components
   ├── hooks/            # Custom hooks
   ├── utils/            # Utility functions
   ├── types/            # TypeScript types
   └── tests/            # Test files
   ```

### Quality Checklist

Before submitting changes, verify:

- [ ] TypeScript compiles without errors
- [ ] All tests pass
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Documentation is updated
- [ ] Code follows style guidelines
- [ ] Changes are in the correct branch
- [ ] Commit messages are descriptive

### Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Build for production
npm run build
```

## Human Contributor Guidelines

[Standard contribution guidelines for human contributors would go here...] 