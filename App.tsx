import React, { useState } from 'react';
import LandingHero from './components/LandingHero';
import CharacterCreator from './components/CharacterCreator';
import ChatInterface from './components/ChatInterface';
import { Character, AppView } from './types';

function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LANDING);
  const [character, setCharacter] = useState<Character | null>(null);

  const handleStart = () => {
    setCurrentView(AppView.CREATOR);
  };

  const handleCharacterCreated = (newCharacter: Character) => {
    setCharacter(newCharacter);
    setCurrentView(AppView.CHAT);
  };

  const handleCancelCreation = () => {
    setCurrentView(AppView.LANDING);
  };

  const handleBackToLanding = () => {
    // Optional: Confirm before leaving chat? For now just go back.
    setCurrentView(AppView.LANDING);
    setCharacter(null);
  };

  return (
    <div className="antialiased">
      {currentView === AppView.LANDING && (
        <LandingHero onStart={handleStart} />
      )}
      
      {currentView === AppView.CREATOR && (
        <CharacterCreator 
          onComplete={handleCharacterCreated}
          onCancel={handleCancelCreation}
        />
      )}

      {currentView === AppView.CHAT && character && (
        <ChatInterface 
          character={character}
          onBack={handleBackToLanding}
        />
      )}
    </div>
  );
}

export default App;