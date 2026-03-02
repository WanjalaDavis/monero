from django.urls import path
from django.contrib.auth import views as auth_views
from django.conf import settings
from django.conf.urls.static import static
from . import views

app_name = 'XMR'

urlpatterns = [
    # ==================== PUBLIC PAGES ====================
    path('', views.index, name='index'),
    path('about/', views.about, name='about'),
    
    # ==================== AUTHENTICATION ====================
    path('signup/', views.signupin, name='signupin'),
    path('signup-with-ref/', views.signup_with_ref, name='signup_with_ref'),
    path('login/', views.signupin, name='login'),
    path('logout/', views.logout_view, name='logout'),
    
    # ==================== USER DASHBOARD ====================
    path('dashboard/', views.account, name='dashboard'),  # Redirects to account
    path('trade/', views.account, name='trade'),  # Legacy route - redirects to account
    
    # ==================== ACCOUNT MANAGEMENT ====================
    path('account/', views.account, name='account'),
    
    # ==================== INVESTMENT ROUTES ====================
    path('investments/', views.investments, name='investments'),
    path('investment/<int:token_id>/', views.investment_detail, name='investment_detail'),
    path('investment/<int:token_id>/buy/', views.buy_investment, name='buy_investment'),
    
    # ==================== DEPOSIT ROUTES ====================
    path('deposit/create/', views.create_deposit, name='create_deposit'),
    
    # ==================== WITHDRAWAL ROUTES ====================
    path('withdrawal/create/', views.create_withdrawal, name='create_withdrawal'),
    path('withdrawal/<int:withdrawal_id>/cancel/', views.cancel_withdrawal, name='cancel_withdrawal'),
    
    # ==================== ADMIN ROUTES ====================
    path('admin-panel/', views.myadmin, name='myadmin'),
    path('custom-admin/api/', views.admin_api, name='admin_api'),
    
    # ==================== WALLET MANAGEMENT ====================
    path('manage/fix-wallets/', views.fix_all_wallets, name='fix_all_wallets'),
    path('manage/debug-wallet/', views.debug_wallet, name='debug_wallet'),
    path('manage/debug-wallet/<int:user_id>/', views.debug_wallet, name='debug_wallet_user'),
    
    # ==================== ADMIN PAYOUT MANAGEMENT ====================
    path('manage/trigger-payout/', views.admin_trigger_payout, name='admin_trigger_payout'),
    path('manage/check-expired/', views.admin_check_expired, name='admin_check_expired'),
    path('manage/payout-stats/', views.admin_payout_stats, name='admin_payout_stats'),
    
    # ==================== ADMIN CATCH-UP PAYOUT ROUTES ====================
    path('manage/catch-up-payouts/', views.admin_catch_up_payouts, name='admin_catch_up_payouts'),
    path('manage/fix-investment/<int:investment_id>/', views.fix_investment_payouts, name='fix_investment_payouts'),
    
    # ==================== ADMIN INVESTMENT MANAGEMENT ====================
    path('manage/investment/<int:investment_id>/force-complete/', 
         views.admin_force_complete_investment, 
         name='admin_force_complete_investment'),
    path('manage/investment/<int:investment_id>/force-payout/', 
         views.admin_force_payout, 
         name='admin_force_payout'),
    
    # ==================== ADMIN USER MANAGEMENT ====================
    path('manage/user/<int:user_id>/', views.admin_user_detail, name='admin_user_detail'),
    
    # ==================== ADMIN SYSTEM MANAGEMENT ====================
    path('manage/system-status/', views.admin_system_status, name='admin_system_status'),
    
    # ==================== EXPORT ROUTES ====================
    path('export/transactions/', views.export_transactions_csv, name='export_transactions_csv'),
    path('export/users/', views.export_users_csv, name='export_users_csv'),
    path('export/deposits/', views.export_deposits_csv, name='export_deposits_csv'),
    path('export/withdrawals/', views.export_withdrawals_csv, name='export_withdrawals_csv'),
    path('export/investments/', views.export_investments_csv, name='export_investments_csv'),
    path('export/tokens/', views.export_tokens_csv, name='export_tokens_csv'),
    path('export/kyc/', views.export_kyc_csv, name='export_kyc_csv'),
    path('export/logs/', views.export_logs_csv, name='export_logs_csv'),
    
    # ==================== API ROUTES ====================
    path('api/wallet/balance/', views.api_wallet_balance, name='api_wallet_balance'),
    path('api/investment/stats/', views.api_investment_stats, name='api_investment_stats'),
    
    # ==================== ADMIN API ROUTES ====================
    path('manage/api/check-investment-payouts/<int:investment_id>/', 
         views.check_investment_payouts_api, 
         name='check_investment_payouts'),
    path('manage/api/process-payout/<int:investment_id>/', 
         views.process_payout_api, 
         name='process_payout_api'),
    path('manage/api/pending-payouts/', 
         views.get_pending_payouts, 
         name='get_pending_payouts'),
    path('manage/api/recent-payouts/', 
         views.get_recent_payouts, 
         name='get_recent_payouts'),
    
    # ==================== SYSTEM ROUTES ====================
    path('health/', views.health_check, name='health_check'),
    path('initialize/', views.initialize_system, name='initialize_system'),
    
    # ==================== PASSWORD RESET ROUTES ====================
    path('password-reset/', 
         auth_views.PasswordResetView.as_view(
             template_name='password_reset.html',
             email_template_name='password_reset_email.html',
             subject_template_name='password_reset_subject.txt'
         ),
         name='password_reset'),
    path('password-reset/done/',
         auth_views.PasswordResetDoneView.as_view(
             template_name='password_reset_done.html'
         ),
         name='password_reset_done'),
    path('password-reset/<uidb64>/<token>/',
         auth_views.PasswordResetConfirmView.as_view(
             template_name='password_reset_confirm.html'
         ),
         name='password_reset_confirm'),
    path('password-reset/complete/',
         auth_views.PasswordResetCompleteView.as_view(
             template_name='password_reset_complete.html'
         ),
         name='password_reset_complete'),

    # =========================================================================
    # CHAT SYSTEM - COMPLETE ROUTES
    # =========================================================================
    
    # ----- MAIN CHAT PAGES -----
    path('chat/', 
         views.chat_room, 
         name='chat_room'),
           
    path('chat/create/', 
         views.create_chat_room, 
         name='create_chat_room'),
    
    path('chat/<slug:room_slug>/', 
         views.chat_room, 
         name='chat_room_detail'),  
     
    
    path('chat/manage/', 
         views.create_chat_room, 
         {'action': 'manage'},  # Default to manage view
         name='manage_rooms'),  # Manage all rooms
    
    path('chat/manage/<slug:room_slug>/', 
         views.create_chat_room, 
         name='manage_room'),  # Manage specific room
    
    # ----- ROOM ACTIONS -----
    path('chat/<slug:room_slug>/join/', 
         views.chat_room_join, 
         name='chat_room_join'),  # Join password-protected room

    # =========================================================================
    # CHAT API ENDPOINTS - VERSION 1
    # =========================================================================
    
    # ----- MESSAGES API -----
    path('api/v1/chat/messages/send/', 
         views.chat_send_message, 
         name='api_chat_send_message'),
    
    path('api/v1/chat/messages/<uuid:message_id>/edit/', 
         views.chat_edit_message, 
         name='api_chat_edit_message'),
    
    path('api/v1/chat/messages/<uuid:message_id>/delete/', 
         views.chat_delete_message, 
         name='api_chat_delete_message'),
    
    path('api/v1/chat/messages/<uuid:message_id>/pin/', 
         views.chat_pin_message, 
         name='api_chat_pin_message'),
    
    path('api/v1/chat/messages/<uuid:message_id>/react/', 
         views.chat_add_reaction, 
         name='api_chat_add_reaction'),
    
    path('api/v1/chat/rooms/<slug:room_slug>/messages/', 
         views.chat_room_messages, 
         name='api_chat_room_messages'),
    
    # ----- ROOMS API -----
    path('api/v1/chat/rooms/<slug:room_slug>/join/', 
         views.chat_join_room, 
         name='api_chat_join_room'),
    
    path('api/v1/chat/rooms/<slug:room_slug>/leave/', 
         views.chat_leave_room, 
         name='api_chat_leave_room'),
    
    path('api/v1/chat/rooms/<slug:room_slug>/users/', 
         views.chat_room_users, 
         name='api_chat_room_users'),
    
    path('api/v1/chat/rooms/<slug:room_slug>/typing/', 
         views.chat_typing_indicator, 
         name='api_chat_typing_indicator'),
    
    # ----- SEARCH API -----
    path('api/v1/chat/search/', 
         views.chat_search, 
         name='api_chat_search'),
    
    path('api/v1/chat/rooms/<slug:room_slug>/search/', 
         views.chat_room_search, 
         name='api_chat_room_search'),
    
    # ----- FILE UPLOAD API -----
    path('api/v1/chat/upload/file/', 
         views.chat_upload_file, 
         name='api_chat_upload_file'),
    
    path('api/v1/chat/upload/image/', 
         views.chat_upload_image, 
         name='api_chat_upload_image'),
    
    # ----- USER PRESENCE API -----
    path('api/v1/chat/users/status/', 
         views.chat_user_status, 
         name='api_chat_user_status'),
    
    # ----- NOTIFICATIONS API -----
    path('api/v1/chat/notifications/', 
         views.chat_notifications, 
         name='api_chat_notifications'),
    
    path('api/v1/chat/notifications/mark-read/', 
         views.chat_mark_notifications_read, 
         name='api_chat_notifications_mark_read'),
    
    # =========================================================================
    # LEGACY CHAT API ROUTES (for backward compatibility)
    # =========================================================================
    path('api/chat/messages/send/', views.chat_send_message, name='chat_send_message'),
    path('api/chat/messages/<uuid:message_id>/edit/', views.chat_edit_message, name='chat_edit_message'),
    path('api/chat/messages/<uuid:message_id>/delete/', views.chat_delete_message, name='chat_delete_message'),
    path('api/chat/messages/<uuid:message_id>/pin/', views.chat_pin_message, name='chat_pin_message'),
    path('api/chat/messages/<uuid:message_id>/react/', views.chat_add_reaction, name='chat_add_reaction'),
    path('api/chat/rooms/<slug:room_slug>/messages/', views.chat_room_messages, name='chat_room_messages'),
    path('api/chat/rooms/<slug:room_slug>/join/', views.chat_join_room, name='chat_join_room'),
    path('api/chat/rooms/<slug:room_slug>/leave/', views.chat_leave_room, name='chat_leave_room'),
    path('api/chat/rooms/<slug:room_slug>/users/', views.chat_room_users, name='chat_room_users'),
    path('api/chat/rooms/<slug:room_slug>/typing/', views.chat_typing_indicator, name='chat_typing_indicator'),
    path('api/chat/search/', views.chat_search, name='chat_search'),
    path('api/chat/rooms/<slug:room_slug>/search/', views.chat_room_search, name='chat_room_search'),
    path('api/chat/upload/file/', views.chat_upload_file, name='chat_upload_file'),
    path('api/chat/upload/image/', views.chat_upload_image, name='chat_upload_image'),
    path('api/chat/users/status/', views.chat_user_status, name='chat_user_status'),
    path('api/chat/notifications/', views.chat_notifications, name='chat_notifications'),
    path('api/chat/notifications/mark-read/', views.chat_mark_notifications_read, name='chat_mark_notifications_read'),
]

# ==================== SERVE MEDIA FILES IN DEVELOPMENT ====================
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)