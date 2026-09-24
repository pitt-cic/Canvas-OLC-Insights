import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Hero from './components/sections/Hero';
import Features from './components/sections/Features';
import Demo from './components/sections/Demo';
import Architecture from './components/sections/Architecture';
import TechStack from './components/sections/TechStack';
import Costs from './components/sections/Costs';
import CallToAction from './components/sections/CallToAction';
import FloatingParticles from './components/ui/FloatingParticles';

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <FloatingParticles count={15} />
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Demo />
        <Architecture />
        <TechStack />
        <Costs />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}
