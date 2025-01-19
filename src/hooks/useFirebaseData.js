/**
 * File: src/hooks/useFirebaseData.js
 * Path: /doc-summarizer/src/hooks/useFirebaseData.js
 * Description: Custom hooks for Firebase data management
 */

import { useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import {
  getUserDocuments,
  uploadDocument,
  deleteDocument,
  getUserChats,
  saveChat,
  deleteChat,
  updateChatMessages
} from '../firebase/firebaseService';

export const useDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDocuments = async () => {
      if (!auth.currentUser) return;
      
      try {
        const docs = await getUserDocuments(auth.currentUser.uid);
        setDocuments(docs);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Error loading documents:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, []);

  const addDocument = async (file, onProgress) => {
    try {
      const newDoc = await uploadDocument(auth.currentUser.uid, file, onProgress);
      setDocuments(prev => [...prev, newDoc]);
      return newDoc;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const removeDocument = async (documentId) => {
    try {
      await deleteDocument(auth.currentUser.uid, documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    documents,
    setDocuments,
    loading,
    error,
    addDocument,
    removeDocument
  };
};

export const useChats = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadChats = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userChats = await getUserChats(auth.currentUser.uid);
        setChats(userChats);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Error loading chats:', err);
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  }, []);

  const addChat = async (chatData) => {
    try {
      const chatId = await saveChat(auth.currentUser.uid, chatData);
      const newChat = { id: chatId, ...chatData };
      setChats(prev => [newChat, ...prev]);
      return chatId;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const removeChat = async (chatId) => {
    try {
      await deleteChat(auth.currentUser.uid, chatId);
      setChats(prev => prev.filter(chat => chat.id !== chatId));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateChat = async (chatId, messages, lastMessage) => {
    try {
      await updateChatMessages(chatId, messages, lastMessage);
      setChats(prev => 
        prev.map(chat => 
          chat.id === chatId 
            ? { ...chat, messages, lastMessage }
            : chat
        )
      );
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    chats,
    loading,
    error,
    addChat,
    removeChat,
    updateChat
  };
};