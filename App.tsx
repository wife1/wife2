import React, { useState } from 'react';
import LandingHero from './components/LandingHero';
import CharacterCreator from './components/CharacterCreator';
import ChatInterface from './components/ChatInterface';
import { Character, AppView } from './types';

function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LANDING);
  const [character, setCharacter] = useState<Character | null>(null);
  const [showGalleryOnCreator, setShowGalleryOnCreator] = useState(false);

  const handleStart = () => {
    setShowGalleryOnCreator(false);
    setCurrentView(AppView.CREATOR);
  };

  const handleCharacterCreated = (newCharacter: Character) => {
    setCharacter(newCharacter);
    setCurrentView(AppView.CHAT);
  };

  const handleCancelCreation = () => {
    setCurrentView(AppView.LANDING);
  };

  const handleBackFromChat = () => {
    setCharacter(null);
    setCurrentView(AppView.CREATOR);
    setShowGalleryOnCreator(true);
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
          initialShowGallery={showGalleryOnCreator}
        />
      )}

      {currentView === AppView.CHAT && character && (
        <ChatInterface 
          character={character}
          onBack={handleBackFromChat}
        />
      )}
    </div>
  );
}

export default App;