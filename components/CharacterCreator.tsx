import React, { useState, useEffect, useRef } from 'react';
import { Character } from '../types';
import { generateCharacterAvatar } from '../services/geminiService';
import { Loader2, Wand2, ChevronRight, ChevronLeft, User, Palette, Brain, Sparkles, LayoutGrid, X, Trash2, Image as ImageIcon, Upload, UserCircle } from 'lucide-react';

interface CharacterCreatorProps {
  onComplete: (character: Character) => void;
  onCancel: () => void;
  initialShowGallery?: boolean;
}

const STEPS = ['Identity', 'Appearance', 'Personality'];

const HAIR_COLORS = ['Silver', 'Black', 'Brown', 'Blonde', 'Red', 'White', 'Pink', 'Blue', 'Purple', 'Green', 'Multicolor'];
const EYE_COLORS = ['Blue', 'Brown', 'Green', 'Hazel', 'Grey', 'Amber', 'Red', 'Purple', 'Heterochromia'];
const CLOTHING_STYLES = ['Casual chic', 'Casual', 'Formal', 'Streetwear', 'Cyberpunk', 'Fantasy', 'Uniform', 'Bikini', 'Traditional', 'Goth', 'Sporty', 'Business', 'Minimalist'];
const PHYSIQUES = ['Slim', 'Athletic', 'Curvy', 'Muscular', 'Average', 'Petite', 'Tall', 'Plus Size'];

const CharacterCreator: React.FC<CharacterCreatorProps> = ({ onComplete, onCancel, initialShowGallery = false }) => {
  const [step, setStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGallery, setShowGallery] = useState(initialShowGallery);
  const [savedCharacters, setSavedCharacters] = useState<Character[]>([]);
  const [avatarMethod, setAvatarMethod] = useState<'generate' | 'upload' | 'default'>('generate');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<Partial<Character>>({
    name: '',
    age: 24,
    gender: 'Female',
    relationshipType: 'Girlfriend',
    appearance: {
      hairColor: 'Silver',
      eyeColor: 'Blue',
      clothingStyle: 'Casual chic',
      physique: 'Slim',
      style: 'Realistic'
    },
    personality: {
      traits: ['Kind', 'Intelligent'],
      bio: ''
    }
  });

  useEffect(() => {
    const saved = localStorage.getItem('saved_characters');
    if (saved) {
      try {
        setSavedCharacters(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved characters", e);
      }
    }
  }, []);

  const saveCharacterToHistory = (character: Character) => {
    const newHistory = [...savedCharacters, character];
    setSavedCharacters(newHistory);
    localStorage.setItem('saved_characters', JSON.stringify(newHistory));
  };

  const deleteFromHistory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newHistory = savedCharacters.filter(c => c.id !== id);
    setSavedCharacters(newHistory);
    localStorage.setItem('saved_characters', JSON.stringify(newHistory));
  };

  const loadCharacter = (character: Character) => {
    setFormData({
        ...character,
        id: undefined, // Clear ID to ensure a new one is generated for the session
        createdAt: undefined
    });
    setAvatarMethod('upload'); // Treat loaded characters as "upload" (static) so we don't regenerate by default
    setShowGallery(false);
    setStep(2);
  };

  const handleInputChange = (field: keyof Character, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDeepChange = (parent: 'appearance' | 'personality', field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent] as any,
        [field]: value
      }
    }));
  };

  const handleTraitToggle = (trait: string) => {
    const currentTraits = formData.personality?.traits || [];
    const newTraits = currentTraits.includes(trait)
      ? currentTraits.filter(t => t !== trait)
      : [...currentTraits, trait];
    handleDeepChange('personality', 'traits', newTraits);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            handleInputChange('avatarUrl', reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleAvatarMethodChange = (method: 'generate' | 'upload' | 'default') => {
    setAvatarMethod(method);
    if (method === 'generate') {
         // Clear avatar URL to ensure generation happens if they stick with this choice
         handleInputChange('avatarUrl', undefined); 
    } else if (method === 'default') {
         // Set a default immediately
         const seed = formData.name || 'default';
         const defaultUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4`;
         handleInputChange('avatarUrl', defaultUrl);
    } else if (method === 'upload') {
        handleInputChange('avatarUrl', undefined); // Clear until upload
    }
  };

  const handleSubmit = async (reuseAvatar = false) => {
    setIsGenerating(true);
    try {
      const id = crypto.randomUUID();
      const newCharacter: Character = {
        ...(formData as Character),
        id,
        createdAt: Date.now()
      };
      
      let avatarUrl = formData.avatarUrl;
      
      // If generate is selected, we always regenerate unless specifically reusing (from gallery flow)
      // Note: If avatarMethod is 'upload' or 'default', avatarUrl should already be set in formData
      if (avatarMethod === 'generate' && (!reuseAvatar || !avatarUrl)) {
          avatarUrl = await generateCharacterAvatar(newCharacter);
      } else if (!avatarUrl) {
          // Fallback if no avatar was set for upload/default
          const seed = newCharacter.name || 'random';
          avatarUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4`;
      }
      
      newCharacter.avatarUrl = avatarUrl;
      
      // Save to history
      saveCharacterToHistory(newCharacter);
      
      onComplete(newCharacter);
    } catch (error) {
      console.error("Failed to create character", error);
      setIsGenerating(false);
    }
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 0));

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-8">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            i === step ? 'bg-rose-500 text-white scale-110 shadow-lg shadow-rose-500/30' : 
            i < step ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'
          }`}>
            {i < step ? '✓' : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-16 h-1 mx-2 rounded-full transition-colors ${
              i < step ? 'bg-emerald-500' : 'bg-slate-800'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      
      {/* Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <LayoutGrid className="w-5 h-5 text-rose-500" />
                        Character Library
                    </h3>
                    <button onClick={() => setShowGallery(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {savedCharacters.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-slate-500">
                            <p>No saved characters yet. Create one to see it here!</p>
                        </div>
                    ) : (
                        savedCharacters.map((char) => (
                            <div 
                                key={char.id} 
                                onClick={() => loadCharacter(char)}
                                className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-white/5 hover:border-rose-500/50 cursor-pointer transition-all hover:scale-[1.02]"
                            >
                                <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                                
                                <div className="absolute bottom-0 left-0 w-full p-3">
                                    <p className="font-bold text-white text-sm">{char.name}</p>
                                    <p className="text-xs text-rose-300">{char.relationshipType}</p>
                                </div>

                                <button 
                                    onClick={(e) => deleteFromHistory(e, char.id)}
                                    className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-red-500/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}

      {isGenerating ? (
        <div className="text-center p-8 max-w-md w-full animate-fade-in">
          <div className="relative w-32 h-32 mx-auto mb-8">
             <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
             <div className="absolute inset-0 border-4 border-t-rose-500 border-r-violet-500 border-b-transparent border-l-transparent rounded-full animate-spin"></div>
             <Wand2 className="absolute inset-0 m-auto text-white w-10 h-10 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Bringing {formData.name} to Life</h2>
          <p className="text-slate-400">Generating unique avatar and persona using Gemini AI...</p>
        </div>
      ) : (
        <div className="w-full max-w-2xl bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 shrink-0">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white font-display">Create Character</h2>
                    <button 
                        onClick={() => setShowGallery(true)}
                        className="ml-4 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-full flex items-center gap-2 transition-colors border border-white/5"
                    >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        Library
                    </button>
                </div>
                <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Cancel</button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
                {renderStepIndicator()}
                
                <div className="min-h-[400px]">
                    {step === 0 && (
                        <div className="space-y-6 animate-fade-in">
                             <div className="flex items-center gap-2 mb-4 text-rose-400">
                                <User className="w-5 h-5" />
                                <span className="text-sm font-semibold uppercase tracking-wider">Identity</span>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm text-slate-400 font-medium">Name</label>
                                    <input 
                                        type="text" 
                                        value={formData.name} 
                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all"
                                        placeholder="e.g. Luna"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-slate-400 font-medium">Relationship</label>
                                    <select 
                                        value={formData.relationshipType} 
                                        onChange={(e) => handleInputChange('relationshipType', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none appearance-none"
                                    >
                                        <option>Girlfriend</option>
                                        <option>Boyfriend</option>
                                        <option>Best Friend</option>
                                        <option>Mentor</option>
                                        <option>Yandere</option>
                                    </select>
                                </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm text-slate-400 font-medium">Age</label>
                                        <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-lg text-sm">{formData.age}</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="18"
                                        max="60"
                                        value={formData.age} 
                                        onChange={(e) => handleInputChange('age', parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500 hover:accent-rose-400 transition-all"
                                    />
                                    <div className="flex justify-between text-xs text-slate-600 px-1">
                                        <span>18</span>
                                        <span>60</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-slate-400 font-medium">Gender</label>
                                    <div className="flex gap-4">
                                        {['Female', 'Male', 'Non-Binary'].map(g => (
                                            <button
                                                key={g}
                                                onClick={() => handleInputChange('gender', g)}
                                                className={`flex-1 py-3 rounded-xl border transition-all ${
                                                    formData.gender === g 
                                                    ? 'bg-rose-500/10 border-rose-500 text-rose-400' 
                                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                                                }`}
                                            >
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                             </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex items-center gap-2 mb-4 text-violet-400">
                                <Palette className="w-5 h-5" />
                                <span className="text-sm font-semibold uppercase tracking-wider">Appearance</span>
                             </div>

                            {/* Avatar Source Selector */}
                            <div className="mb-6 p-1 bg-slate-800/50 rounded-xl border border-white/5 flex">
                                {[
                                    { id: 'generate', label: 'AI Magic', icon: Sparkles },
                                    { id: 'upload', label: 'Upload', icon: Upload },
                                    { id: 'default', label: 'Default', icon: UserCircle }
                                ].map((m) => (
                                    <button
                                        key={m.id}
                                        onClick={() => handleAvatarMethodChange(m.id as any)}
                                        className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                                            avatarMethod === m.id
                                            ? 'bg-violet-600 text-white shadow-lg'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <m.icon className="w-4 h-4" />
                                        {m.label}
                                    </button>
                                ))}
                            </div>

                            {avatarMethod === 'generate' && (
                                <div className="space-y-2 animate-fade-in">
                                    <label className="text-sm text-slate-400 font-medium">Visual Style</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3" role="radiogroup">
                                        {['Realistic', 'Anime', 'Oil Painting', 'Cyberpunk'].map(s => (
                                            <button
                                                key={s}
                                                role="radio"
                                                aria-checked={formData.appearance?.style === s}
                                                onClick={() => handleDeepChange('appearance', 'style', s)}
                                                className={`group relative p-3 rounded-xl border text-sm transition-all flex items-center gap-3 ${
                                                    formData.appearance?.style === s 
                                                    ? 'bg-violet-500/20 border-violet-500 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]' 
                                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                                                }`}
                                            >
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                                                    formData.appearance?.style === s
                                                    ? 'border-violet-500 bg-violet-500' 
                                                    : 'border-slate-600 group-hover:border-slate-500'
                                                }`}>
                                                    {formData.appearance?.style === s && (
                                                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                                    )}
                                                </div>
                                                <span className="font-medium">{s}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {avatarMethod === 'upload' && (
                                <div className="space-y-4 animate-fade-in">
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 hover:border-violet-500 hover:text-violet-400 hover:bg-violet-500/5 transition-all cursor-pointer group h-48"
                                    >
                                        <input 
                                            ref={fileInputRef}
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={handleFileUpload}
                                        />
                                        {formData.avatarUrl ? (
                                            <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-violet-500 shadow-xl">
                                                <img src={formData.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform" />
                                                <p className="text-sm font-medium">Click to upload image</p>
                                                <p className="text-xs text-slate-500 mt-1">JPG, PNG, WebP</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {avatarMethod === 'default' && (
                                <div className="space-y-4 animate-fade-in">
                                    <label className="text-sm text-slate-400 font-medium">Choose a Style</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { name: 'Classic', url: `https://api.dicebear.com/9.x/avataaars/svg?seed=${formData.name || 'a'}&backgroundColor=b6e3f4` },
                                            { name: 'Sketch', url: `https://api.dicebear.com/9.x/lorelei/svg?seed=${formData.name || 'b'}&backgroundColor=ffdfbf` },
                                            { name: 'Pixel', url: `https://api.dicebear.com/9.x/pixel-art/svg?seed=${formData.name || 'c'}` },
                                            { name: 'Abstract', url: `https://api.dicebear.com/9.x/shapes/svg?seed=${formData.name || 'd'}&backgroundColor=c0aede` },
                                        ].map((opt) => (
                                            <button
                                                key={opt.name}
                                                onClick={() => handleInputChange('avatarUrl', opt.url)}
                                                className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-3 ${
                                                    formData.avatarUrl === opt.url
                                                    ? 'bg-violet-500/20 border-violet-500 shadow-lg'
                                                    : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                                                }`}
                                            >
                                                <img src={opt.url} alt={opt.name} className="w-16 h-16 rounded-full bg-slate-900" />
                                                <span className={`text-xs font-medium ${formData.avatarUrl === opt.url ? 'text-violet-300' : 'text-slate-400'}`}>
                                                    {opt.name}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Separator */}
                            <div className="h-px bg-white/5 my-6" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm text-slate-400 font-medium">Hair Color</label>
                                    <select
                                        value={formData.appearance?.hairColor}
                                        onChange={(e) => handleDeepChange('appearance', 'hairColor', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-violet-500 outline-none appearance-none"
                                    >
                                        {HAIR_COLORS.map(color => (
                                            <option key={color} value={color}>{color}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-slate-400 font-medium">Eye Color</label>
                                    <select
                                        value={formData.appearance?.eyeColor}
                                        onChange={(e) => handleDeepChange('appearance', 'eyeColor', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-violet-500 outline-none appearance-none"
                                    >
                                        {EYE_COLORS.map(color => (
                                            <option key={color} value={color}>{color}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm text-slate-400 font-medium">Body Type</label>
                                    <select
                                        value={formData.appearance?.physique}
                                        onChange={(e) => handleDeepChange('appearance', 'physique', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-violet-500 outline-none appearance-none"
                                    >
                                        {PHYSIQUES.map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-slate-400 font-medium">Clothing Style</label>
                                    <select
                                        value={formData.appearance?.clothingStyle}
                                        onChange={(e) => handleDeepChange('appearance', 'clothingStyle', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-violet-500 outline-none appearance-none"
                                    >
                                        {CLOTHING_STYLES.map(style => (
                                            <option key={style} value={style}>{style}</option>
                                        ))}
                                    </select>
                                </div>
                             </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex items-center gap-2 mb-4 text-indigo-400">
                                <Brain className="w-5 h-5" />
                                <span className="text-sm font-semibold uppercase tracking-wider">Personality</span>
                             </div>

                             <div className="space-y-2">
                                <label className="text-sm text-slate-400 font-medium">Traits</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Cheerful', 'Shy', 'Tsundere', 'Intellectual', 'Playful', 'Mysterious', 'Motherly', 'Sarcastic', 'Dominant', 'Submissive'].map(trait => (
                                        <button
                                            key={trait}
                                            onClick={() => handleTraitToggle(trait)}
                                            className={`px-4 py-2 rounded-full border text-sm transition-all duration-300 ${
                                                formData.personality?.traits?.includes(trait)
                                                ? 'bg-indigo-500 text-white border-indigo-400 ring-2 ring-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.5)] scale-105 font-medium'
                                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200 hover:bg-slate-900'
                                            }`}
                                        >
                                            {trait}
                                        </button>
                                    ))}
                                </div>
                             </div>

                             <div className="space-y-2">
                                <label className="text-sm text-slate-400 font-medium">Backstory & Bio</label>
                                <textarea 
                                    value={formData.personality?.bio} 
                                    onChange={(e) => handleDeepChange('personality', 'bio', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none leading-relaxed"
                                    placeholder="Tell us a bit about their history, hobbies, or how you met..."
                                />
                             </div>
                             
                             {/* Preview if avatar exists */}
                             {formData.avatarUrl && (
                                 <div className="mt-6 p-4 border border-white/10 rounded-xl bg-slate-800/50 flex items-center gap-4">
                                     <img src={formData.avatarUrl} alt="Preview" className="w-16 h-16 rounded-lg object-cover" />
                                     <div>
                                         <p className="text-sm text-slate-300 font-medium">
                                            {avatarMethod === 'generate' ? 'Existing Avatar' : 'Selected Avatar'}
                                         </p>
                                         <p className="text-xs text-slate-500">
                                            {avatarMethod === 'generate' ? 'You can reuse this look or generate a new one.' : 'Ready to use.'}
                                         </p>
                                     </div>
                                 </div>
                             )}
                        </div>
                    )}
                </div>

                <div className="flex justify-between mt-8 pt-6 border-t border-white/5 shrink-0">
                    <button 
                        onClick={prevStep}
                        disabled={step === 0}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${
                            step === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:bg-white/5'
                        }`}
                    >
                        <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    
                    {step === STEPS.length - 1 ? (
                        <div className="flex gap-3">
                            {formData.avatarUrl && avatarMethod === 'generate' && (
                                <button 
                                    onClick={() => handleSubmit(true)}
                                    disabled={!formData.name}
                                    className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white border border-slate-600 hover:border-slate-500 rounded-xl font-semibold shadow-lg hover:bg-slate-700 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ImageIcon className="w-4 h-4" /> Reuse Look
                                </button>
                            )}
                            <button 
                                onClick={() => handleSubmit(false)}
                                disabled={!formData.name || (avatarMethod === 'upload' && !formData.avatarUrl)}
                                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-rose-500 to-violet-600 rounded-xl text-white font-semibold shadow-lg hover:shadow-rose-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Sparkles className="w-4 h-4" /> 
                                {avatarMethod === 'generate' && formData.avatarUrl 
                                    ? 'Regenerate' 
                                    : avatarMethod === 'generate' 
                                        ? 'Create Partner' 
                                        : 'Finish Setup'}
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={nextStep}
                            className="flex items-center gap-2 px-8 py-3 bg-white text-slate-950 rounded-xl font-bold shadow-lg hover:bg-slate-100 transition-all hover:scale-105 active:scale-95"
                        >
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CharacterCreator;