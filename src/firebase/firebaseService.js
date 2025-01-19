/**
 * File: src/firebase/firebaseService.js
 * Path: /doc-summarizer/src/firebase/firebaseService.js
 * Description: Firebase service functions for documents and chats
 */

import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  deleteDoc, 
  doc, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  uploadBytesResumable,
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from './config';

// Document Operations
export const getUserDocuments = async (userId) => {
  try {
    const q = query(collection(db, 'documents'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting documents:', error);
    throw error;
  }
};

export const uploadDocument = async (userId, file, onProgress) => {
  try {
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const storagePath = `documents/${userId}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    // Create upload task
    const uploadTask = uploadBytesResumable(storageRef, file);

    // Return a promise that tracks progress and resolves when complete
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Add document metadata to Firestore
            const docRef = await addDoc(collection(db, 'documents'), {
              userId,
              name: file.name,
              type: file.type,
              size: file.size,
              url: downloadURL,
              storagePath,
              createdAt: serverTimestamp()
            });

            resolve({
              id: docRef.id,
              name: file.name,
              type: file.type,
              size: file.size,
              url: downloadURL,
              createdAt: new Date()
            });
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

export const deleteDocument = async (userId, documentId) => {
  try {
    // Get document reference
    const documentRef = doc(db, 'documents', documentId);
    const documentSnap = await getDoc(documentRef);

    if (documentSnap.exists() && documentSnap.data().userId === userId) {
      // Get storage path from document data
      const { storagePath } = documentSnap.data();
      
      if (storagePath) {
        // Delete from Storage
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
      }

      // Delete from Firestore
      await deleteDoc(documentRef);
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error; // Propagate the error up the call stack
  }
};

// Chat Operations
export const getUserChats = async (userId) => {
  try {
    const q = query(collection(db, 'chats'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting chats:', error);
    throw error;
  }
};

export const saveChat = async (userId, chatData) => {
  try {
    const chatRef = await addDoc(collection(db, 'chats'), {
      userId,
      documentId: chatData.documentId,
      documentName: chatData.documentName,
      messages: chatData.messages,
      lastMessage: chatData.lastMessage,
      createdAt: serverTimestamp()
    });

    return chatRef.id;
  } catch (error) {
    console.error('Error saving chat:', error);
    throw error;
  }
};

export const deleteChat = async (userId, chatId) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await deleteDoc(chatRef);
  } catch (error) {
    console.error('Error deleting chat:', error);
    throw error;
  }
};

export const updateChatMessages = async (chatId, messages, lastMessage) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      messages,
      lastMessage,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating chat:', error);
    throw error;
  }
};