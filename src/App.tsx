import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';

function Home() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Your App</h1>
      <p className="text-gray-600">
        This is a modern React application built with TypeScript, featuring responsive design and
        testing capabilities.
      </p>
    </div>
  );
}

function About() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">About</h1>
      <p className="text-gray-600">
        This was created by Dan with the help of Cursor.
      </p>
    </div>
  );
}

interface AppProps {
  RouterComponent?: typeof Router;
}

function App({ RouterComponent = Router }: AppProps) {
  return (
    <RouterComponent>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Layout>
    </RouterComponent>
  );
}

export default App;
