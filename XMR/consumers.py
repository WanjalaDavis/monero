import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import ChatRoom, ChatMessage, UserProfile  # Updated imports
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            # Use room_slug from URL (as defined in routing)
            self.room_slug = self.scope['url_route']['kwargs']['room_slug']
            self.room_group_name = f'chat_{self.room_slug}'

            # Validate room exists (using slug)
            if not await self.room_exists(self.room_slug):
                await self.close(code=4004)
                return

            # Authentication check
            if not self.scope["user"].is_authenticated:
                await self.close(code=4001)
                return

            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )

            await self.accept()

            # Update user online status
            await self.set_user_online(True)

            # Send room history
            await self.send_room_history()

            # Notify others that user joined
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_joined',
                    'user': self.scope["user"].username,
                    'timestamp': str(timezone.now())
                }
            )

        except Exception as e:
            logger.error(f"WebSocket connection error: {e}")
            await self.close(code=4000)

    async def disconnect(self, close_code):
        try:
            # Update user online status
            await self.set_user_online(False)

            # Leave room group
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

            # Notify others that user left
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_left',
                    'user': self.scope["user"].username,
                    'timestamp': str(timezone.now())
                }
            )

        except Exception as e:
            logger.error(f"WebSocket disconnect error: {e}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type', 'message')

            if message_type == 'message':
                await self.handle_chat_message(data)
            elif message_type == 'typing':
                await self.handle_typing_indicator(data)
            elif message_type == 'read_receipt':
                await self.handle_read_receipt(data)

        except json.JSONDecodeError:
            logger.error("Invalid JSON received")
        except Exception as e:
            logger.error(f"Error processing message: {e}")

    async def handle_chat_message(self, data):
        message = data['message']
        user = self.scope["user"]

        # Validate message
        if not message or len(message) > 1000:
            return

        # Save to database
        saved_message = await self.save_message(user, self.room_slug, message)

        # Broadcast to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'user': user.username,
                'user_id': user.id,
                'timestamp': str(saved_message.created_at),  # Note: ChatMessage uses created_at
                'message_id': str(saved_message.message_id)  # Use UUID as string
            }
        )

    async def handle_typing_indicator(self, data):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_indicator',
                'user': self.scope["user"].username,
                'is_typing': data.get('is_typing', False)
            }
        )

    async def handle_read_receipt(self, data):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'read_receipt',
                'user': self.scope["user"].username,
                'message_id': data.get('message_id')
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': event['message'],
            'user': event['user'],
            'user_id': event['user_id'],
            'timestamp': event['timestamp'],
            'message_id': event['message_id']
        }))

    async def user_joined(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_joined',
            'user': event['user'],
            'timestamp': event['timestamp']
        }))

    async def user_left(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_left',
            'user': event['user'],
            'timestamp': event['timestamp']
        }))

    async def typing_indicator(self, event):
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'user': event['user'],
            'is_typing': event['is_typing']
        }))

    async def read_receipt(self, event):
        await self.send(text_data=json.dumps({
            'type': 'read_receipt',
            'user': event['user'],
            'message_id': event['message_id']
        }))

    async def send_room_history(self):
        messages = await self.get_recent_messages(self.room_slug)
        await self.send(text_data=json.dumps({
            'type': 'history',
            'messages': messages
        }))

    @database_sync_to_async
    def room_exists(self, room_slug):
        return ChatRoom.objects.filter(slug=room_slug, is_active=True).exists()

    @database_sync_to_async
    def save_message(self, user, room_slug, content):
        room = ChatRoom.objects.get(slug=room_slug)
        return ChatMessage.objects.create(
            user=user,
            room=room,
            content=content,
            message_type='TEXT'
        )

    @database_sync_to_async
    def get_recent_messages(self, room_slug, limit=50):
        try:
            room = ChatRoom.objects.get(slug=room_slug)
            messages = ChatMessage.objects.filter(
                room=room,
                is_deleted=False
            ).select_related('user').order_by('-created_at')[:limit]

            # Return in chronological order for history
            return [{
                'id': str(msg.message_id),
                'message': msg.content,
                'user': msg.user.username if msg.user else 'System',
                'user_id': msg.user.id if msg.user else None,
                'timestamp': str(msg.created_at),
                'is_edited': msg.is_edited
            } for msg in reversed(messages)]  # Reverse to show oldest first
        except ChatRoom.DoesNotExist:
            return []

    @database_sync_to_async
    def set_user_online(self, status):
        try:
            profile, created = UserProfile.objects.get_or_create(
                user=self.scope["user"]
            )
            profile.online_status = status
            profile.last_seen = timezone.now()
            profile.save()
        except Exception as e:
            logger.error(f"Error updating online status: {e}")