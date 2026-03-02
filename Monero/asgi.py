"""
ASGI config for Monero project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application

# 1. Set environment variables first
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Monero.settings')

# 2. Initialize Django ASGI application early to load models/apps
django_asgi_app = get_asgi_application()

# 3. Import Channels components AFTER get_asgi_application
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
import XMR.routing

# 4. Define the final application that handles both HTTP and WebSockets
application = ProtocolTypeRouter({
    # Traditional HTTP requests
    "http": django_asgi_app,
    
    # WebSocket chat requests
    "websocket": AuthMiddlewareStack(
        URLRouter(
            XMR.routing.websocket_urlpatterns
        )
    ),
})

