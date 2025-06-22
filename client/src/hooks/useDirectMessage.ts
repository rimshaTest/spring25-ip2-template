import { useEffect, useState } from 'react';
import { Chat, ChatUpdatePayload, Message, User } from '../types';
import useUserContext from './useUserContext';
import { createChat, getChatById, getChatsByUser, sendMessage } from '../services/chatService';

/**
 * useDirectMessage is a custom hook that provides state and functions for direct messaging between users.
 * It includes a selected user, messages, and a new message state.
 */

const useDirectMessage = () => {
  const { user, socket } = useUserContext();
  const [showCreatePanel, setShowCreatePanel] = useState<boolean>(false);
  const [chatToCreate, setChatToCreate] = useState<string>('');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const handleJoinChat = (chatID: string) => {
    // TODO: Task 3 - Emit a 'joinChat' event to the socket with the chat ID function argument.
    socket.emit('joinChat', chatID);
  };

  const handleSendMessage = async () => {
    // TODO: Task 3 - Implement the send message handler function.
    // Whitespace-only messages should not be sent, and the current chat to send this message to
    // should be defined. Use the appropriate service function to make an API call, and update the
    // states accordingly.
    if (!newMessage.trim() || !selectedChat || !selectedChat._id || !user._id) return;
    const messagePayload = {
      chat: selectedChat._id as string,
      msgFrom: user._id as string,
      msg: newMessage.trim(),
      msgDateTime: new Date(),
    };
    const message: Message = await sendMessage(messagePayload, selectedChat._id);
    setSelectedChat({
      ...selectedChat,
      messages: [
        ...selectedChat.messages,
        {
          ...message,
          user: {
            _id: user._id,
            username: user.username,
          },
        },
      ],
    });
    setNewMessage('');
  };

  const handleChatSelect = async (chatID: string | undefined) => {
    // TODO: Task 3 - Implement the chat selection handler function.
    // If the chat ID is defined, fetch the chat details using the appropriate service function,
    // and update the appropriate state variables. Make sure the client emits a socket event to
    // subscribe to the chat room.
    if (!chatID) return;
    const chat = await getChatById(chatID);
    setSelectedChat(chat);
    handleJoinChat(chatID);
  };

  const handleUserSelect = (selectedUser: User) => {
    setChatToCreate(selectedUser.username);
  };

  const handleCreateChat = async () => {
    // TODO: Task 3 - Implement the create chat handler function.
    // If the username to create a chat is defined, use the appropriate service function to create a new chat
    // between the current user and the chosen user. Update the appropriate state variables and emit a socket
    // event to join the chat room. Hide the create panel after creating the chat.
    if (!chatToCreate.trim() || !user._id) return;
    const newChat: Chat = await createChat([user._id, chatToCreate.trim()]);
    setChats(prevChats => [...prevChats, newChat]);
    setSelectedChat(newChat);
    if (newChat._id) {
      handleJoinChat(newChat._id);
    }
    setShowCreatePanel(false);
    setChatToCreate('');
  };

  useEffect(() => {
    const fetchChats = async () => {
      // TODO: Task 3 - Fetch all the chats with the current user and update the state variable.
      if (!user._id) return;
      const userChats = await getChatsByUser(user._id);
      setChats(userChats);
    };

    const handleChatUpdate = (chatUpdate: ChatUpdatePayload) => {
      // TODO: Task 3 - Implement the chat update handler function.
      // This function is responsible for updating the state variables based on the
      // socket events received. The function should handle the following cases:
      // - A new chat is created (add the chat to the current list of chats)
      // - A new message is received (update the selected chat with the new message)
      // - Throw an error for an invalid chatUpdate type
      // NOTE: For new messages, the user will only receive the update if they are
      // currently subscribed to the chat room.
      if (chatUpdate.type === 'created') {
        setChats(prevChats => [...prevChats, chatUpdate.chat]);
      } else if (chatUpdate.type === 'newMessage') {
        if (selectedChat && selectedChat._id === chatUpdate.chat._id) {
          setSelectedChat({
            ...selectedChat,
            messages: [...selectedChat.messages, chatUpdate.chat.messages[0]],
          });
        }
      }
    };
    fetchChats();

    // TODO: Task 3 - Register the 'chatUpdate' event listener
    socket.on('chatUpdate', handleChatUpdate);

    return () => {
      // TODO: Task 3 - Unsubscribe from the socket event
      // TODO: Task 3 - Emit a socket event to leave the particular chat room
      // they are currently in when the component unmounts.
      socket.off('chatUpdate', handleChatUpdate);
      if (selectedChat && selectedChat._id) {
        socket.emit('leaveChat', selectedChat._id);
      }
    };
  }, [user.username, user._id, socket, selectedChat, selectedChat?._id]);

  return {
    selectedChat,
    chatToCreate,
    chats,
    newMessage,
    setNewMessage,
    showCreatePanel,
    setShowCreatePanel,
    handleSendMessage,
    handleChatSelect,
    handleUserSelect,
    handleCreateChat,
  };
};

export default useDirectMessage;
