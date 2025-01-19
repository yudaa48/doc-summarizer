/**
 * File: src/components/Dashboard.jsx
 * Path: /doc-summarizer/src/components/Dashboard.jsx
 */

import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useDocuments, useChats } from '../hooks/useFirebaseData';
import { Alert, AlertDescription } from './ui/alert';
import { 
  LogOut, Send, Upload, User, X, Settings, FileText, 
  Trash2, Save, MessageSquare
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  uploadDocument 
} from '../firebase/firebaseService';
import { db } from '../firebase/config';
import { uploadBytesResumable } from 'firebase/storage';
import ProgressBar from './ProgressBar';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('documents');
  const [newMessage, setNewMessage] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentMessages, setCurrentMessages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    documentId: null,
    documentName: ''
  });
  const [uploadProgress, setUploadProgress] = useState(0);



  // Get user profile from auth
  const userProfile = {
    displayName: auth.currentUser?.displayName || 'User',
    email: auth.currentUser?.email || '',
    photoURL: auth.currentUser?.photoURL || null
  };

  // Use custom hooks for documents and chats
  const { 
    documents, 
    loading: documentsLoading, 
    error: documentsError, 
    addDocument, 
    removeDocument,
    setDocuments
  } = useDocuments();

  const { 
    chats, 
    loading: chatsLoading, 
    error: chatsError, 
    addChat, 
    removeChat,
    updateChat 
  } = useChats();

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    setUploading(true);
    setError('');
    setUploadProgress(0);
  
    try {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size should be less than 5MB');
      }
  
      // Check file type
      const allowedTypes = [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
  
      if (!allowedTypes.includes(file.type)) {
        throw new Error('File type not supported. Please upload PDF, TXT, or DOC files.');
      }
  
      // Use addDocument from useDocuments hook
      await addDocument(file, (progress) => {
        setUploadProgress(progress);
      });
  
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || 'Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteDocument = (docId) => {
    const docToDelete = documents.find(doc => doc.id === docId);
    //console.log('Found document:', docToDelete); // Add this line
    
    if (docToDelete) {
      setDeleteModal({
        isOpen: true,
        documentId: docToDelete.id,
        documentName: docToDelete.name
      });
    }
  };

  const confirmDelete = async () => {
    try {
      await removeDocument(deleteModal.documentId);
      if (selectedDocument === deleteModal.documentId) {
        setSelectedDocument(null);
        setCurrentMessages([]);
      }
      setDeleteModal({ isOpen: false, documentId: null, documentName: '' });
    } catch (error) {
      setError('Failed to delete document. Please try again.');
    }
  };

  const handleSaveChat = async () => {
    if (!currentMessages.length || !selectedDocument) return;

    const selectedDoc = documents.find(d => d.id === selectedDocument);
    if (!selectedDoc) return;

    try {
      const chatData = {
        documentId: selectedDocument,
        documentName: selectedDoc.name,
        title: `Chat about ${selectedDoc.name}`,
        messages: currentMessages,
        lastMessage: currentMessages[currentMessages.length - 1].text,
        timestamp: new Date().toISOString()
      };

      await addChat(chatData);
    } catch (error) {
      setError('Failed to save chat. Please try again.');
    }
  };

  const handleLoadChat = async (chat) => {
    setSelectedDocument(chat.documentId);
    setCurrentMessages(chat.messages);
    setActiveTab('documents');
  };

  const handleDeleteChat = async (chatId) => {
    try {
      await removeChat(chatId);
    } catch (error) {
      setError('Failed to delete chat. Please try again.');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedDocument) return;

    const newMessageObj = {
      text: newMessage,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setCurrentMessages(prev => [...prev, newMessageObj]);
    setNewMessage('');

    // Here you would integrate with Gemini API for responses
    // For now, we'll just simulate a response
    const simulatedResponse = {
      text: 'This is a simulated response. Integrate Gemini API here.',
      sender: 'bot',
      timestamp: new Date().toISOString()
    };

    setTimeout(() => {
      setCurrentMessages(prev => [...prev, simulatedResponse]);
    }, 1000);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      setError('Failed to sign out. Please try again.');
    }
  };

  // Render functions for different sections
  const renderDocumentsList = () => (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Your Documents</h3>
        {documentsLoading ? (
          <div className="text-center py-4">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No documents uploaded yet
          </div>
        ) : (
          <div className="space-y-2">
          {documents.map((doc) => {
            console.log('Document data:', doc); // Add this line
            return (
              <div
                key={doc.id}
                className={`flex items-center p-2 rounded-lg cursor-pointer ${
                  selectedDocument === doc.id ? 'bg-indigo-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedDocument(doc.id)}
              >
                <FileText className="w-5 h-5 text-gray-400 mr-2" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {doc.name}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteDocument(doc.id); // Just pass the ID, we'll look up the full doc info
                  }}
                  className="p-1 hover:bg-gray-200 rounded-full"
                >
                  <Trash2 className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );

  const renderChatsList = () => (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Saved Chats</h3>
        {chatsLoading ? (
          <div className="text-center py-4">Loading chats...</div>
        ) : chats.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No saved chats yet
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className="flex items-center p-2 rounded-lg cursor-pointer hover:bg-gray-50"
                onClick={() => handleLoadChat(chat)}
              >
                <MessageSquare className="w-5 h-5 text-gray-400 mr-2" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {chat.documentName}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {chat.lastMessage}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChat(chat.id);
                  }}
                  className="p-1 hover:bg-gray-200 rounded-full"
                >
                  <Trash2 className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* User Profile Button */}
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center space-x-3 w-full p-2 hover:bg-gray-100 rounded-lg"
            >
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                {userProfile.photoURL ? (
                  <img
                    src={userProfile.photoURL}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div className="flex-1 truncate text-left">
                <div className="font-medium truncate">
                  {userProfile.displayName || 'User'}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {userProfile.email}
                </div>
              </div>
              <Settings className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            <button
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activeTab === 'documents'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('documents')}
            >
              Documents
            </button>
            <button
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activeTab === 'chats'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('chats')}
            >
              Saved Chats
            </button>
          </div>

          {/* Add error display here */}
          {error && (
            <Alert variant="destructive" className="mx-4 mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Upload Button (only show in documents tab) */}
          {activeTab === 'documents' && (
            <div className="p-4">
              <label className="flex flex-col space-y-2">
                <div className="flex items-center justify-center w-full p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400">
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.txt"
                    disabled={uploading}
                  />
                  <Upload className="w-6 h-6 mr-2" />
                  <span>{uploading ? 'Uploading...' : 'Upload Document'}</span>
                </div>
                {uploading && (
                  <div className="space-y-2">
                    <ProgressBar progress={uploadProgress} />
                    <p className="text-sm text-gray-500 text-center">
                      {Math.round(uploadProgress)}%
                    </p>
                  </div>
                )}
              </label>
            </div>
          )}

          {/* Content based on active tab */}
          {activeTab === 'documents' ? (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Your Documents</h3>
                {documentsLoading ? (
                  <div className="text-center py-4">Loading documents...</div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No documents uploaded yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className={`flex items-center p-2 rounded-lg cursor-pointer ${
                          selectedDocument === doc.id ? 'bg-indigo-50' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedDocument(doc.id)}
                      >
                        <FileText className="w-5 h-5 text-gray-400 mr-2" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {doc.name}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDocument(doc.id);
                          }}
                          className="p-1 hover:bg-gray-200 rounded-full"
                        >
                          <Trash2 className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Saved Chats</h3>
                {chatsLoading ? (
                  <div className="text-center py-4">Loading chats...</div>
                ) : chats.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No saved chats yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {chats.map((chat) => (
                      <div
                        key={chat.id}
                        className="flex items-center p-2 rounded-lg cursor-pointer hover:bg-gray-50"
                        onClick={() => handleLoadChat(chat)}
                      >
                        <MessageSquare className="w-5 h-5 text-gray-400 mr-2" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {chat.documentName}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {chat.lastMessage}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChat(chat.id);
                          }}
                          className="p-1 hover:bg-gray-200 rounded-full"
                        >
                          <Trash2 className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sign Out Button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {currentMessages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-3xl px-4 py-2 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}
          {currentMessages.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-500">
              {selectedDocument 
                ? "Ask a question about your document" 
                : "Select or upload a document to start chatting"
              }
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-4">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                selectedDocument
                  ? "Ask a question about your document..."
                  : "Select a document to start asking questions"
              }
              disabled={!selectedDocument}
              className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || !selectedDocument}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-indigo-400 flex items-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Profile Settings</h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                  {userProfile.photoURL ? (
                    <img
                      src={userProfile.photoURL}
                      alt="Profile"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-gray-400" />
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <div className="mt-1">
                    <input
                      type="text"
                      value={userProfile.displayName}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <div className="mt-1">
                    <input
                      type="email"
                      value={userProfile.email}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Delete Document</h2>
              <p className="mt-2 text-sm text-gray-500">
                Are you sure you want to delete "{deleteModal.documentName}"? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center space-x-3 justify-end">
              <button
                onClick={() => setDeleteModal({ isOpen: false, documentId: null, documentName: '' })}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;