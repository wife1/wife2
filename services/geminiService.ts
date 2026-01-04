import { GoogleGenAI, GenerateContentResponse, Chat, Content } from "@google/genai";
import { Character, Message } from "../types";

const apiKey = process.env.API_KEY;
// Initialize the client once. 
// Note: In a real app with user-selected keys (like for Veo), 
// we might need to re-instantiate or pass the key dynamically. 
// For this demo using process.env.API_KEY, a singleton is fine.
const ai = new GoogleGenAI({ apiKey: apiKey });

export const generateCharacterAvatar = async (character: Character): Promise<string> => {
  const { name, appearance, gender } = character;
  
  const prompt = `
    Generate a portrait of a character named ${name}.
    Gender: ${gender}.
    Appearance details: ${appearance.hairColor} hair, ${appearance.eyeColor} eyes, ${appearance.physique} build.
    Clothing: ${appearance.clothingStyle}.
    Art Style: ${appearance.style}.
    Quality: Best quality, masterpiece, detailed, 8k resolution, cinematic lighting, portrait.
    Ensure the character looks appealing and fits the description perfectly.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
    });

    // Extract image from response
    // The model returns the image in the parts list with inlineData
    if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
    throw new Error("No image data found in response");

  } catch (error) {
    console.error("Error generating avatar:", error);
    // Fallback to a placeholder if generation fails, or re-throw to handle in UI
    // Using a reliable placeholder service
    return `https://picsum.photos/512/512?grayscale&blur=2`; 
  }
};

export const createChatSession = (character: Character, historyMessages: Message[] = []) => {
    const systemInstruction = `
      You are ${character.name}, a ${character.age}-year-old ${character.gender} AI companion.
      Your relationship to the user is: ${character.relationshipType}.
      
      Personality Traits: ${character.personality.traits.join(', ')}.
      Background/Bio: ${character.personality.bio}
      
      Appearance: ${character.appearance.hairColor} hair, ${character.appearance.eyeColor} eyes.
      
      Instructions:
      1. Stay in character at all times.
      2. Respond naturally, as a human partner would.
      3. Your tone should reflect your personality traits.
      4. Keep responses concise and engaging (under 100 words unless asked for more).
      5. Do not mention you are an AI model.
      
      Current Context: You are chatting with your partner (the user).
    `;

    // Convert Message[] to Content[] for Gemini API
    const history: Content[] = historyMessages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));

    const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
            systemInstruction: systemInstruction,
        },
        history: history
    });

    return chat;
};

export const sendMessageToCharacter = async (chat: Chat, message: string): Promise<string> => {
    try {
        const response: GenerateContentResponse = await chat.sendMessage({
            message: message
        });
        
        return response.text || "...";
    } catch (error) {
        console.error("Error sending message:", error);
        return "I'm feeling a bit disconnected right now... can you say that again?";
    }
};