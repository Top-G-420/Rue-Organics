import { useEffect } from 'react';

interface SplashScreenProps {
  onSplashComplete?: () => void; // Optional callback to hide splash
}

const SplashScreen = ({ onSplashComplete }: SplashScreenProps) => {
  useEffect(() => {
    // Redirect to home after 3 seconds (or call callback to transition)
    const timer = setTimeout(() => {
      onSplashComplete?.(); // Call the parent's callback instead of navigate
    }, 3000);

    return () => clearTimeout(timer);
  }, [onSplashComplete]);

  return (
    <div className="flex flex-col min-h-screen bg-green-600 justify-center items-center px-4">
      {/* Logo - Centered and responsive */}
      <img 
        src="/RueOrganics.jpg" 
        alt="Rue Organics Logo" 
        className="w-48 h-48 md:w-64 md:h-64 object-contain mx-auto animate-pulse" 
      />
      
      {/* Optional loading text */}
      <p className="mt-6 text-white text-lg font-semibold">Welcome to Rue Organics</p>
      
      {/* Optional spinner for loading feel */}
      <div className="mt-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    </div>
  );
};

export default SplashScreen;