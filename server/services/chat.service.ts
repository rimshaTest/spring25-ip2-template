import ChatModel from '../models/chat.model';
import MessageModel from '../models/messages.model';
// import UserModel from '../models/users.model';
import { Chat, ChatResponse, CreateChatPayload } from '../types/chat';
import { Message, MessageResponse } from '../types/message';

/**
 * Creates and saves a new chat document in the database, saving messages dynamically.
 *
 * @param chat - The chat object to be saved, including full message objects.
 * @returns {Promise<ChatResponse>} - Resolves with the saved chat or an error message.
 */
export const saveChat = async (chatPayload: CreateChatPayload): Promise<ChatResponse> => {
  // TODO: Task 3 - Implement the saveChat function. Refer to other service files for guidance.
  try {
    // Save messages first if provided
    let messageIds: string[] = [];
    if (chatPayload.messages && chatPayload.messages.length > 0) {
      const savedMessages = await MessageModel.insertMany(chatPayload.messages);
      messageIds = savedMessages.map(msg => msg._id.toString());
    }
    // Create chat with participants and message IDs
    const chatDoc = new ChatModel({
      participants: chatPayload.participants,
      messages: messageIds,
    });
    const savedChat = await chatDoc.save();

    return savedChat;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save chat';
    return { error: errorMessage };
  }
};

/**
 * Creates and saves a new message document in the database.
 * @param messageData - The message data to be created.
 * @returns {Promise<MessageResponse>} - Resolves with the created message or an error message.
 */
export const createMessage = async (messageData: Message): Promise<MessageResponse> =>
  // TODO: Task 3 - Implement the createMessage function. Refer to other service files for guidance.
  {
    try {
      const messageDoc = new MessageModel(messageData);
      const savedMessage = await messageDoc.save();
      return savedMessage;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create message';
      return { error: errorMessage };
    }
  };

/**
 * Adds a message ID to an existing chat.
 * @param chatId - The ID of the chat to update.
 * @param messageId - The ID of the message to add to the chat.
 * @returns {Promise<ChatResponse>} - Resolves with the updated chat object or an error message.
 */
export const addMessageToChat = async (chatId: string, messageId: string): Promise<ChatResponse> =>
  // TODO: Task 3 - Implement the addMessageToChat function. Refer to other service files for guidance.
  {
    try {
      const updatedChat = await ChatModel.findByIdAndUpdate(
        chatId,
        { $push: { messages: messageId } },
        { new: true },
      );
      if (!updatedChat) {
        return { error: 'Chat not found' };
      }
      return updatedChat;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add message to chat';
      return { error: errorMessage };
    }
  };

/**
 * Retrieves a chat document by its ID.
 * @param chatId - The ID of the chat to retrieve.
 * @returns {Promise<ChatResponse>} - Resolves with the found chat object or an error message.
 */
export const getChat = async (chatId: string): Promise<ChatResponse> =>
  // TODO: Task 3 - Implement the getChat function. Refer to other service files for guidance.
  {
    try {
      const chat = await ChatModel.findById(chatId);
      if (!chat) {
        return { error: 'Chat not found' };
      }
      return chat;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve chat';
      return { error: errorMessage };
    }
  };

/**
 * Retrieves chats that include all the provided participants.
 * @param p An array of participant usernames to match in the chat's participants.
 * @returns {Promise<Chat[]>} A promise that resolves to an array of chats where the participants match.
 * If no chats are found or an error occurs, the promise resolves to an empty array.
 */
export const getChatsByParticipants = async (p: string[]): Promise<Chat[]> => {
  // TODO: Task 3 - Implement the getChatsByParticipants function. Refer to other service files for guidance.
  try {
    const chats = await ChatModel.find({
      participants: { $all: p },
    }).lean();

    if (!chats || !Array.isArray(chats) || chats.length === 0) {
      return [];
    }
    return chats;
  } catch (error) {
    return [];
  }
};

/**
 * Adds a participant to an existing chat.
 *
 * @param chatId - The ID of the chat to update.
 * @param userId - The ID of the user to add to the chat.
 * @returns {Promise<ChatResponse>} - Resolves with the updated chat object or an error message.
 */
export const addParticipantToChat = async (
  chatId: string,
  userId: string,
): Promise<ChatResponse> => {
  try {
    const updatedChat = await ChatModel.findByIdAndUpdate(
      chatId,
      { $addToSet: { participants: userId } },
      { new: true },
    );
    if (!updatedChat) {
      return { error: 'Chat not found' };
    }
    return { ...updatedChat.toObject(), _id: updatedChat._id.toString() };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update chat';
    return { error: errorMessage };
  }
};
