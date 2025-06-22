import express, { Response } from 'express';
import {
  saveChat,
  createMessage,
  addMessageToChat,
  getChat,
  addParticipantToChat,
  getChatsByParticipants,
} from '../services/chat.service';
import { populateDocument } from '../utils/database.util';
import {
  CreateChatRequest,
  AddMessageRequestToChat,
  AddParticipantRequest,
  ChatIdRequest,
  GetChatByParticipantsRequest,
} from '../types/chat';
import { FakeSOSocket } from '../types/socket';

/*
 * This controller handles chat-related routes.
 * @param socket The socket instance to emit events.
 * @returns {express.Router} The router object containing the chat routes.
 * @throws {Error} Throws an error if the chat creation fails.
 */
const chatController = (socket: FakeSOSocket) => {
  const router = express.Router();

  /**
   * Validates that the request body contains all required fields for a chat.
   * @param req The incoming request containing chat data.
   * @returns `true` if the body contains valid chat fields; otherwise, `false`.
   */
  const isCreateChatRequestValid = (req: CreateChatRequest): boolean =>
    // TODO: Task 3 - Implement the isCreateChatRequestValid function.
    Array.isArray(req.body?.participants) && req.body.participants.length > 0;

  /**
   * Validates that the request body contains all required fields for a message.
   * @param req The incoming request containing message data.
   * @returns `true` if the body contains valid message fields; otherwise, `false`.
   */
  const isAddMessageRequestValid = (req: AddMessageRequestToChat): boolean =>
    // TODO: Task 3 - Implement the isAddMessageRequestValid function.
    !!req.body &&
    !!req.body.msg &&
    !!req.body.msgFrom &&
    typeof req.body.msg === 'string' &&
    typeof req.body.msgFrom === 'string';

  /**
   * Validates that the request body contains all required fields for a participant.
   * @param req The incoming request containing participant data.
   * @returns `true` if the body contains valid participant fields; otherwise, `false`.
   */
  const isAddParticipantRequestValid = (req: AddParticipantRequest): boolean =>
    // TODO: Task 3 - Implement the isAddParticipantRequestValid function.
    !!req.body &&
    !!req.params &&
    !!req.body.participantId &&
    !!req.params.chatId &&
    typeof req.body.participantId === 'string' &&
    typeof req.params.chatId === 'string';

  /**
   * Creates a new chat with the given participants (and optional initial messages).
   * @param req The request object containing the chat data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the chat is created.
   * @throws {Error} Throws an error if the chat creation fails.
   */
  const createChatRoute = async (req: CreateChatRequest, res: Response): Promise<void> => {
    // TODO: Task 3 - Implement the createChatRoute function
    // Emit a `chatUpdate` event to share the creation of a new chat
    try {
      if (!isCreateChatRequestValid(req)) {
        res.status(400).json({ error: 'Invalid request body' });
        return;
      }
      const chat = await saveChat(req.body);

      if ('error' in chat) {
        res.status(500).json({ error: chat.error });
        return;
      }

      const populatedDoc = await populateDocument(chat._id.toString(), 'chat');

      if (populatedDoc && 'error' in populatedDoc) {
        throw new Error(populatedDoc.error);
      }
      socket.emit('chatUpdate', populatedDoc);
      res.status(200).json(populatedDoc);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create chat' });
    }
  };

  /**
   * Adds a new message to an existing chat.
   * @param req The request object containing the message data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the message is added.
   * @throws {Error} Throws an error if the message addition fails.
   */
  const addMessageToChatRoute = async (
    req: AddMessageRequestToChat,
    res: Response,
  ): Promise<void> => {
    // TODO: Task 3 - Implement the addMessageToChatRoute function
    // Emit a `chatUpdate` event to share the updated chat, specifically to
    // the chat room where the message was added (hint: look into socket rooms)
    // NOTE: Make sure to define the message type to be a direct message when creating it.
    try {
      if (!isAddMessageRequestValid(req)) {
        res.status(400).json({ error: 'Invalid request body' });
        return;
      }
      const { chatId } = req.params;
      const messageData = req.body;
      // Ensure msgDateTime is always a Date
      const messagePayload = {
        ...messageData,
        msgDateTime: messageData.msgDateTime ?? new Date(),
        type: messageData.type ?? 'direct',
      };
      const message = await createMessage(messagePayload);
      if ('error' in message) {
        res.status(500).json({ error: message.error });
        return;
      }
      if (!message._id) {
        res.status(500).json({ error: 'Message ID is undefined' });
        return;
      }
      const updatedChat = await addMessageToChat(chatId, message._id.toString());
      if ('error' in updatedChat) {
        res.status(500).json({ error: updatedChat.error });
        return;
      }
      const populatedChat = await populateDocument(chatId, 'chat');
      if (populatedChat && 'error' in populatedChat) {
        throw new Error(populatedChat.error);
      }
      // Emit to the specific chat room
      socket.to(chatId).emit('chatUpdate', populatedChat);
      res.status(200).json(populatedChat);
    } catch (error) {
      res.status(500).json({ error: 'Failed to add message to chat' });
    }
  };

  /**
   * Retrieves a chat by its ID, optionally populating participants and messages.
   * @param req The request object containing the chat ID.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the chat is retrieved.
   * @throws {Error} Throws an error if the chat retrieval fails.
   */
  const getChatRoute = async (req: ChatIdRequest, res: Response): Promise<void> => {
    // TODO: Task 3 - Implement the getChatRoute function
    try {
      const { chatId } = req.params;
      if (!chatId) {
        res.status(400).json({ error: 'Chat ID is required' });
        return;
      }

      const chat = await getChat(chatId);
      if ('error' in chat) {
        res.status(500).json({ error: chat.error });
        return;
      }
      const populatedChat = await populateDocument(chat._id.toString(), 'chat');
      if (populatedChat && 'error' in populatedChat) {
        throw new Error(populatedChat.error);
      }

      res.status(200).json(populatedChat);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve chat' });
    }
  };

  /**
   * Retrieves chats for a user based on their username.
   * @param req The request object containing the username parameter in `req.params`.
   * @param res The response object to send the result, either the populated chats or an error message.
   * @returns {Promise<void>} A promise that resolves when the chats are successfully retrieved and populated.
   */
  const getChatsByUserRoute = async (
    req: GetChatByParticipantsRequest,
    res: Response,
  ): Promise<void> => {
    // TODO: Task 3 - Implement the getChatsByUserRoute function
    try {
      const { username } = req.params;
      if (!username) {
        res.status(400).json({ error: 'Username parameter is required' });
        return;
      }
      const chats = await getChatsByParticipants([username]);

      const populatedChats = await Promise.all(
        chats.map(async chat => {
          const populated = await populateDocument(chat._id.toString(), 'chat');
          if (populated && 'error' in populated) {
            throw new Error('Failed populating chats');
          }
          return populated;
        }),
      );

      res.status(200).json(populatedChats);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      res.status(500).send(`Error retrieving chat: ${errorMsg}`);
    }
  };

  /**
   * Adds a participant to an existing chat.
   * @param req The request object containing the participant data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the participant is added.
   * @throws {Error} Throws an error if the participant addition fails.
   */
  const addParticipantToChatRoute = async (
    req: AddParticipantRequest,
    res: Response,
  ): Promise<void> => {
    try {
      if (!isAddParticipantRequestValid(req)) {
        res.status(400).json({ error: 'Invalid request body' });
        return;
      }
      const { chatId } = req.params;
      const { participantId } = req.body;
      const updatedChat = await addParticipantToChat(chatId, participantId);
      if ('error' in updatedChat) {
        res.status(500).json({ error: updatedChat.error });
        return;
      }
      const populatedChat = await populateDocument(chatId, 'chat');
      if (populatedChat && 'error' in populatedChat) {
        throw new Error(populatedChat.error);
      }
      socket.to(chatId).emit('chatUpdate', populatedChat);
      res.status(200).json(updatedChat);
    } catch (error) {
      res.status(500).json({ error: 'Failed to add participant to chat' });
    }
  };

  socket.on('connection', conn => {
    // TODO: Task 3 - Implement the `joinChat` event listener on `conn`
    // The socket room will be defined to have the chat ID as the room name
    conn.on('joinChat', (chatID: string) => {
      if (chatID) {
        conn.join(chatID);
      }
    });
    // TODO: Task 3 - Implement the `leaveChat` event listener on `conn`
    // You should only leave the chat if the chat ID is provided/defined
    conn.on('leaveChat', (chatID: string | undefined) => {
      if (chatID) {
        conn.leave(chatID);
      }
    });
  });

  // Register the routes
  // TODO: Task 3 - Add appropriate HTTP verbs and endpoints to the router
  router.post('/createChat', createChatRoute);
  router.post('/:chatId/addMessage', addMessageToChatRoute);
  router.get('/:chatId', getChatRoute);
  router.get('/getChatsByUser/:username', getChatsByUserRoute);
  router.post('/:chatId/addParticipant', addParticipantToChatRoute);

  return router;
};

export default chatController;
