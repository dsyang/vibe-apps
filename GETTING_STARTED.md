# Getting Started

This is a modern React application built with TypeScript, featuring:
- 🚀 Vite for fast development and building
- 🎨 Tailwind CSS for responsive styling
- 📱 Mobile-first design approach
- ✨ TypeScript for type safety
- 🧪 Vitest and React Testing Library for testing
- 🛣️ React Router for client-side routing

## Prerequisites

Make sure you have the following installed on your machine:
- Node.js (v18 or higher recommended)
- npm (comes with Node.js)

## Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:
```bash
npm install
```

## Available Scripts

### Development Server

To start the development server:
```bash
npm run dev
```
This will start the app in development mode. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### Running Tests

To run the test suite:
```bash
npm test
```

To run tests with coverage report:
```bash
npm run test:coverage
```

### Building for Production

To create a production build:
```bash
npm run build
```

The build artifacts will be stored in the `dist` directory.

### Linting

To run the linter:
```bash
npm run lint
```

### Preview Production Build

To preview the production build locally:
```bash
npm run preview
```

## Project Structure

```
src/
├── components/     # Reusable components
├── test/          # Test setup and utilities
├── App.tsx        # Main application component
├── App.test.tsx   # Tests for App component
└── index.css      # Global styles and Tailwind imports
```

## Development

- The application uses Tailwind CSS for styling. You can customize the theme in `tailwind.config.js`
- Components are written in TypeScript and use functional components with hooks
- Tests are co-located with their components
- The layout is responsive and mobile-first

## Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [React Router Documentation](https://reactrouter.com/)
- [Vitest Documentation](https://vitest.dev/) 