

        let currentRoom = '{{ room.slug|default:"" }}';
        let messagePolling = null;
        let typingTimeout = null;
        let pendingMsgs = new Set();
        let currentReplyTo = null;
        let lastMessageId = '';
        let currentImageUrl = '';
        let currentImageName = '';
        let allMembers = [];
        let emojiPickerInstance = null;

        // ==================== THEME ====================
        function toggleTheme() {
            let body = document.body;
            let currentTheme = body.getAttribute('data-theme');
            let newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            body.setAttribute('data-theme', newTheme);
            localStorage.setItem('chat_theme', newTheme);
            let icon = document.querySelector('.icon-btn .fa-moon, .icon-btn .fa-sun');
            if(icon) {
                icon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
            }
        }

        // Load saved theme
        let savedTheme = localStorage.getItem('chat_theme') || 'dark';
        document.body.setAttribute('data-theme', savedTheme);

        // ==================== UI HELPERS ====================
        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('show');
        }

        function toggleMembersSidebar() {
            let sidebar = document.getElementById('membersSidebar');
            sidebar.classList.toggle('show');
            if(sidebar.classList.contains('show') && allMembers.length === 0) {
                loadMembers();
            }
        }

        function autoResize(textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        }

        function scrollToBottom(smooth = true) {
            let container = document.getElementById('messagesContainer');
            if(container) {
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: smooth ? 'smooth' : 'auto'
                });
            }
        }

        function openChat(roomSlug) {
            showLoading();
            window.location.href = `/chat/${roomSlug}/`;
        }

        function joinRoom(roomSlug) {
            showLoading();
            window.location.href = `/chat/join/${roomSlug}/`;
        }

        function openRoomInfo() {
            Swal.fire({
                title: '{{ room.name }}',
                html: `
                    <div style="text-align: left;">
                        <p><strong>Description:</strong> {{ room.description|default:"No description" }}</p>
                        <p><strong>Type:</strong> {{ room.room_type }}</p>
                        <p><strong>Members:</strong> {{ total_participants }}</p>
                        <p><strong>Created:</strong> {{ room.created_at|date:"F j, Y" }}</p>
                    </div>
                `,
                icon: 'info',
                confirmButtonText: 'Close',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                customClass: {
                    popup: 'rounded-4'
                }
            });
        }

        function openUserProfile() {
            Swal.fire({
                title: '{{ request.user.username }}',
                html: `
                    <div style="text-align: left;">
                        <p><strong>Email:</strong> {{ request.user.email }}</p>
                        <p><strong>Joined:</strong> {{ request.user.date_joined|date:"F j, Y" }}</p>
                        <p><strong>Wallet Balance:</strong> {{ request.user.wallet.balance }} KSH</p>
                    </div>
                `,
                icon: 'info',
                confirmButtonText: 'Close'
            });
        }

        function showLoading() {
            document.getElementById('loadingOverlay').style.display = 'flex';
        }

        function hideLoading() {
            document.getElementById('loadingOverlay').style.display = 'none';
        }

        // ==================== MEMBERS MANAGEMENT ====================
        function loadMembers() {
            fetch(`/api/chat/rooms/${currentRoom}/users/`)
                .then(r => r.json())
                .then(data => {
                    if(data.success) {
                        allMembers = data.users;
                        renderMembers(allMembers);
                    }
                })
                .catch(e => console.log('Error loading members:', e));
        }

        function renderMembers(members) {
            let container = document.getElementById('membersList');
            if(!container) return;

            if(members.length === 0) {
                container.innerHTML = '<div class="text-center p-4 text-secondary">No members found</div>';
                return;
            }

            let onlineCount = members.filter(m => m.is_online).length;
            document.getElementById('roomStatus').innerHTML = onlineCount > 0 ?
                `<span class="online-dot" style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #25D366; margin-right: 4px;"></span> ${onlineCount} online, ${members.length} members` :
                `${members.length} members`;

            container.innerHTML = members.map(member => `
                <div class="member-item" onclick="viewMemberProfile(${member.id}, '${escapeHtml(member.username)}')">
                    <div class="member-avatar">
                        ${member.username.charAt(0).toUpperCase()}
                        ${member.is_online ? '<div class="member-online-dot"></div>' : ''}
                    </div>
                    <div class="member-info">
                        <div class="member-name">${escapeHtml(member.username)}</div>
                        <div class="member-role">${member.is_moderator ? 'Moderator' : 'Member'}</div>
                        <div class="member-status">${member.is_online ? 'Online' : 'Offline'}</div>
                    </div>
                </div>
            `).join('');
        }

        function filterMembers(query) {
            if(!query) {
                renderMembers(allMembers);
                return;
            }
            let filtered = allMembers.filter(m =>
                m.username.toLowerCase().includes(query.toLowerCase())
            );
            renderMembers(filtered);
        }

        function viewMemberProfile(userId, username) {
            Swal.fire({
                title: username,
                html: `
                    <div style="text-align: center;">
                        <div class="avatar" style="width: 80px; height: 80px; font-size: 2rem; margin: 0 auto 1rem;">${username.charAt(0).toUpperCase()}</div>
                        <p><strong>Username:</strong> ${escapeHtml(username)}</p>
                        <p><strong>User ID:</strong> ${userId}</p>
                    </div>
                `,
                icon: 'info',
                confirmButtonText: 'Close'
            });
        }

        // ==================== IMAGE PREVIEW ====================
        function viewImage(url, name) {
            currentImageUrl = url;
            currentImageName = name;
            let modal = document.getElementById('imagePreviewModal');
            let img = document.getElementById('previewImage');
            img.src = url;
            modal.classList.add('show');
        }

        function closeImagePreview() {
            document.getElementById('imagePreviewModal').classList.remove('show');
            setTimeout(() => {
                document.getElementById('previewImage').src = '';
            }, 300);
        }

        function downloadCurrentImage() {
            if(currentImageUrl) {
                downloadFile(currentImageUrl, currentImageName || 'image.jpg');
            }
        }

        function downloadFile(url, filename) {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }

        // ==================== SEARCH IN CHAT ====================
        function searchInChat() {
            Swal.fire({
                title: 'Search Messages',
                input: 'text',
                inputPlaceholder: 'Search...',
                showCancelButton: true,
                confirmButtonText: 'Search',
                cancelButtonText: 'Cancel',
                preConfirm: (query) => {
                    if(query && query.length >= 2) {
                        fetch(`/api/chat/rooms/${currentRoom}/messages/?search=${encodeURIComponent(query)}`)
                            .then(r => r.json())
                            .then(data => {
                                if(data.success && data.messages && data.messages.length) {
                                    let container = document.getElementById('messagesContainer');
                                    container.innerHTML = '';
                                    appendMessages(data.messages);
                                    scrollToBottom();
                                    Swal.fire('Found', `${data.messages.length} messages found`, 'success');
                                } else {
                                    Swal.fire('Not Found', 'No messages match your search', 'info');
                                }
                            });
                    }
                    return false;
                }
            });
        }

        // ==================== MESSAGE FUNCTIONS ====================
        function initChat() {
            scrollToBottom(false);
            startMessagePolling();
            setupTypingIndicator();
            setupEmojiPicker();
            setupContextMenu();

            // Search chats
            document.getElementById('searchChats')?.addEventListener('input', function(e) {
                let query = e.target.value.toLowerCase();
                document.querySelectorAll('.chat-item').forEach(item => {
                    let name = item.querySelector('.chat-name')?.innerText.toLowerCase();
                    if(name && name.includes(query)) {
                        item.style.display = 'flex';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        }

        function startMessagePolling() {
            messagePolling = setInterval(() => {
                if(!currentRoom) return;
                let url = `/api/chat/rooms/${currentRoom}/messages/`;
                if(lastMessageId) url += `?after=${lastMessageId}`;

                fetch(url)
                    .then(r => r.json())
                    .then(data => {
                        if(data.success && data.messages && data.messages.length) {
                            let newMsgs = data.messages.filter(m => !pendingMsgs.has(m.id) && !document.getElementById(`message-${m.id}`));
                            if(newMsgs.length) {
                                appendMessages(newMsgs);
                                lastMessageId = newMsgs[newMsgs.length - 1].id;
                            }
                        }
                    })
                    .catch(e => console.log('Polling error:', e));
            }, 2000);
        }

        function appendMessages(messages) {
            let container = document.getElementById('messagesContainer');
            let emptyState = document.getElementById('emptyState');
            if(emptyState) emptyState.remove();

            messages.forEach(msg => {
                if(msg.type === 'SYSTEM') {
                    container.insertAdjacentHTML('beforeend', `
                        <div class="system-message">
                            <span>${escapeHtml(msg.content)}</span>
                        </div>
                    `);
                } else {
                    let isOwn = msg.user === '{{ request.user.username }}';
                    let time = moment(msg.timestamp).format('h:mm A');
                    let date = moment(msg.timestamp).format('YYYY-MM-DD');
                    let lastDate = localStorage.getItem('lastMsgDate');

                    if(lastDate !== date) {
                        container.insertAdjacentHTML('beforeend', `
                            <div class="date-divider">
                                <span>${moment(msg.timestamp).format('MMMM D, YYYY')}</span>
                            </div>
                        `);
                        localStorage.setItem('lastMsgDate', date);
                    }

                    let reactionsHtml = '';
                    if(msg.reactions && msg.reactions.length) {
                        reactionsHtml = `<div class="message-reactions" id="reactions-${msg.id}">
                            ${msg.reactions.map(r => `<span class="reaction-badge" onclick="toggleReaction('${msg.id}', '${escapeHtml(r.emoji)}')">${escapeHtml(r.emoji)} ${r.count}</span>`).join('')}
                        </div>`;
                    }

                    let contentHtml = '';
                    if(msg.type === 'TEXT') {
                        contentHtml = `<div class="message-text">${escapeHtml(msg.content || '').replace(/\n/g, '<br>')}</div>`;
                    } else if(msg.type === 'IMAGE' && msg.image_url) {
                        contentHtml = `
                            <div class="message-media" onclick="viewImage('${msg.image_url}', 'Image')">
                                <img src="${msg.image_url}" alt="Image" loading="lazy">
                            </div>
                            ${msg.content ? `<div class="message-text mt-1">${escapeHtml(msg.content).replace(/\n/g, '<br>')}</div>` : ''}
                        `;
                    } else if(msg.type === 'FILE') {
                        contentHtml = `
                            <div class="message-file" onclick="downloadFile('${msg.file_url}', '${escapeHtml(msg.file_name)}')">
                                <i class="fas fa-file-alt fa-2x"></i>
                                <div style="flex:1;">
                                    <div style="font-weight:500;">${escapeHtml(msg.file_name)}</div>
                                    <div style="font-size:0.7rem;">${msg.file_size ? formatFileSize(msg.file_size) : ''}</div>
                                </div>
                                <i class="fas fa-download"></i>
                            </div>
                            ${msg.content ? `<div class="message-text mt-1">${escapeHtml(msg.content).replace(/\n/g, '<br>')}</div>` : ''}
                        `;
                    }

                    let messageHtml = `
                        <div class="message-wrapper ${isOwn ? 'own' : ''}" id="message-${msg.id}" data-message-id="${msg.id}" data-message-user="${escapeHtml(msg.user)}">
                            <div class="message-bubble">
                                <div class="message-content">
                                    ${contentHtml}
                                    <div class="message-meta">
                                        <span class="message-time">${time}</span>
                                        ${msg.is_edited ? '<span class="message-status"><i class="fas fa-edit"></i></span>' : ''}
                                        ${isOwn ? '<span class="message-status"><i class="fas fa-check-double"></i></span>' : ''}
                                    </div>
                                </div>
                                ${reactionsHtml}
                                <div class="message-actions">
                                    <button class="action-btn" onclick="showReactionPicker('${msg.id}')" title="React"><i class="far fa-smile"></i></button>
                                    <button class="action-btn" onclick="replyToMessage('${msg.id}', '${escapeHtml(msg.user)}')" title="Reply"><i class="fas fa-reply"></i></button>
                                    ${isOwn ? `<button class="action-btn" onclick="editMessage('${msg.id}', \`${escapeHtml(msg.content || '').replace(/`/g, '\\`')}\`)" title="Edit"><i class="fas fa-edit"></i></button>` : ''}
                                    <button class="action-btn delete" onclick="deleteMessage('${msg.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                                </div>
                            </div>
                        </div>
                    `;

                    container.insertAdjacentHTML('beforeend', messageHtml);
                }
            });

            let nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
            if(nearBottom) scrollToBottom(true);
        }

        function escapeHtml(text) {
            if(!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function formatFileSize(bytes) {
            if(bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        function sendMessage(e) {
            e.preventDefault();
            let input = document.getElementById('messageInput');
            let content = input.value.trim();
            if(!content) return;

            let btn = document.getElementById('sendBtn');
            if(btn.disabled) return;

            let tempId = 'temp-' + Date.now();
            pendingMsgs.add(tempId);
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            let tempMsg = {
                id: tempId,
                user: '{{ request.user.username }}',
                content: content,
                timestamp: new Date().toISOString(),
                type: 'TEXT'
            };
            appendMessages([tempMsg]);

            input.value = '';
            autoResize(input);

            let formData = new URLSearchParams({
                'room': currentRoom,
                'content': content
            });
            if(currentReplyTo) {
                formData.append('reply_to', currentReplyTo.messageId);
            }

            fetch('/api/chat/messages/send/', {
                method: 'POST',
                headers: {'X-CSRFToken': '{{ csrf_token }}', 'Content-Type': 'application/x-www-form-urlencoded'},
                body: formData
            })
            .then(r => r.json())
            .then(data => {
                if(data.success) {
                    let tempEl = document.getElementById(`message-${tempId}`);
                    if(tempEl) tempEl.remove();
                    pendingMsgs.delete(tempId);
                    if(data.message && !document.getElementById(`message-${data.message.id}`)) {
                        appendMessages([data.message]);
                    }
                    cancelReply();
                } else {
                    let tempEl = document.getElementById(`message-${tempId}`);
                    if(tempEl) tempEl.remove();
                    Swal.fire({icon: 'error', title: 'Error', text: data.error || 'Failed to send message'});
                }
            })
            .catch(err => {
                console.log(err);
                let tempEl = document.getElementById(`message-${tempId}`);
                if(tempEl) tempEl.remove();
            })
            .finally(() => {
                setTimeout(() => {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-paper-plane"></i>';
                }, 300);
            });
        }

        function editMessage(messageId, currentContent) {
            Swal.fire({
                title: 'Edit Message',
                input: 'textarea',
                inputValue: currentContent,
                showCancelButton: true,
                confirmButtonText: 'Save',
                cancelButtonText: 'Cancel',
                inputAttributes: { maxlength: 5000, rows: 3 },
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                preConfirm: (newContent) => {
                    if(!newContent || newContent === currentContent) return false;
                    return fetch(`/api/chat/messages/${messageId}/edit/`, {
                        method: 'POST',
                        headers: {'X-CSRFToken': '{{ csrf_token }}'},
                        body: new URLSearchParams({'content': newContent})
                    }).then(r => r.json());
                }
            }).then(result => {
                if(result.value && result.value.success) {
                    let msgEl = document.getElementById(`message-${messageId}`);
                    if(msgEl) {
                        let textEl = msgEl.querySelector('.message-text');
                        if(textEl) textEl.innerHTML = escapeHtml(result.value.content || '').replace(/\n/g, '<br>');
                        let meta = msgEl.querySelector('.message-meta');
                        if(meta && !meta.innerHTML.includes('fa-edit')) {
                            meta.insertAdjacentHTML('beforeend', '<span class="message-status"><i class="fas fa-edit"></i></span>');
                        }
                        Swal.fire('Updated', 'Message has been edited', 'success');
                    }
                }
            });
        }

        function deleteMessage(messageId) {
            Swal.fire({
                title: 'Delete Message?',
                text: "This action cannot be undone!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Yes, delete it!',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)'
            }).then(result => {
                if(result.isConfirmed) {
                    fetch(`/api/chat/messages/${messageId}/delete/`, {
                        method: 'POST',
                        headers: {'X-CSRFToken': '{{ csrf_token }}'}
                    }).then(r => r.json()).then(data => {
                        if(data.success) {
                            let msgEl = document.getElementById(`message-${messageId}`);
                            if(msgEl) msgEl.remove();
                            let container = document.getElementById('messagesContainer');
                            if(container.children.length === 0 || (container.children.length === 1 && container.children[0].classList.contains('typing-indicator'))) {
                                container.innerHTML = '<div class="empty-state" id="emptyState"><div class="empty-icon"><i class="fas fa-comment-dots"></i></div><div class="h5">No messages yet</div><div class="small text-secondary mt-2">Send a message to start the conversation</div></div>';
                            }
                            Swal.fire('Deleted!', 'Message has been deleted.', 'success');
                        }
                    });
                }
            });
        }

        function togglePinMessage(messageId) {
            fetch(`/api/chat/messages/${messageId}/pin/`, {
                method: 'POST',
                headers: {'X-CSRFToken': '{{ csrf_token }}'}
            }).then(r => r.json()).then(data => {
                if(data.success) {
                    let btn = document.querySelector(`#message-${messageId} .action-btn .fa-thumbtack`)?.parentElement;
                    if(btn) {
                        if(data.is_pinned) {
                            btn.classList.add('pinned');
                            btn.title = 'Unpin';
                        } else {
                            btn.classList.remove('pinned');
                            btn.title = 'Pin';
                        }
                    }
                    Swal.fire('Success', data.is_pinned ? 'Message pinned!' : 'Message unpinned!', 'success');
                }
            });
        }

        function replyToMessage(messageId, username) {
            currentReplyTo = { messageId: messageId, username: username };
            let msgEl = document.getElementById(`message-${messageId}`);
            let previewText = '';
            if(msgEl) {
                let textEl = msgEl.querySelector('.message-text');
                if(textEl) previewText = textEl.innerText.substring(0, 100);
            }
            document.getElementById('replyPreview').style.display = 'flex';
            document.getElementById('replyToUser').innerText = username;
            document.getElementById('replyPreviewText').innerText = previewText + (previewText.length >= 100 ? '...' : '');
            document.getElementById('messageInput').focus();
        }

        function cancelReply() {
            currentReplyTo = null;
            document.getElementById('replyPreview').style.display = 'none';
        }

        // ==================== REACTIONS (One Per Person) ====================
        function toggleReaction(messageId, emoji) {
            fetch(`/api/chat/messages/${messageId}/react/`, {
                method: 'POST',
                headers: {'X-CSRFToken': '{{ csrf_token }}'},
                body: new URLSearchParams({'emoji': emoji})
            }).then(r => r.json()).then(data => {
                if(data.success) {
                    let reactionsDiv = document.getElementById(`reactions-${messageId}`);
                    if(reactionsDiv) {
                        reactionsDiv.innerHTML = data.reactions.map(r =>
                            `<span class="reaction-badge ${r.user_reacted ? 'active' : ''}" onclick="toggleReaction('${messageId}', '${escapeHtml(r.emoji)}')">${escapeHtml(r.emoji)} ${r.count}</span>`
                        ).join('');
                    }
                }
            });
        }

        let currentReactionMessage = null;

        function showReactionPicker(messageId) {
            currentReactionMessage = messageId;
            let picker = document.getElementById('reactionPicker');
            if(!picker) {
                picker = document.createElement('div');
                picker.id = 'reactionPicker';
                picker.className = 'emoji-picker-container';
                picker.style.display = 'block';
                picker.style.position = 'fixed';
                picker.style.bottom = 'auto';
                picker.style.top = '50%';
                picker.style.left = '50%';
                picker.style.transform = 'translate(-50%, -50%)';
                picker.style.zIndex = '10000';
                picker.style.background = 'var(--bg-primary)';
                picker.style.borderRadius = '24px';
                picker.style.padding = '1rem';
                picker.style.boxShadow = 'var(--shadow-xl)';
                picker.style.maxWidth = '400px';
                document.body.appendChild(picker);

                let reactions = ['👍', '❤️', '😂', '😮', '😢', '👏', '🎉', '🔥', '💯', '❓', '😍', '🥰', '😎', '🤔', '🙏', '💪', '👎'];
                picker.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.5rem;">
                        ${reactions.map(r => `<span style="cursor:pointer; font-size: 2rem; text-align: center; padding: 0.5rem; border-radius: 12px; transition: all 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" onclick="selectReaction('${r}')">${r}</span>`).join('')}
                    </div>
                `;
            }
            picker.style.display = 'block';
            setTimeout(() => {
                document.addEventListener('click', function closePicker(e) {
                    if(!picker.contains(e.target)) {
                        picker.style.display = 'none';
                        document.removeEventListener('click', closePicker);
                    }
                });
            }, 100);
        }

        function selectReaction(emoji) {
            if(currentReactionMessage) {
                toggleReaction(currentReactionMessage, emoji);
                let picker = document.getElementById('reactionPicker');
                if(picker) picker.style.display = 'none';
                currentReactionMessage = null;
            }
        }

        // ==================== TYPING INDICATOR ====================
        function handleKeyDown(e) {
            if(e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('messageForm').dispatchEvent(new Event('submit'));
            } else {
                triggerTyping();
            }
        }

        function triggerTyping() {
            if(!currentRoom) return;
            fetch('/api/chat/rooms/' + currentRoom + '/typing/', {
                method: 'POST',
                headers: {'X-CSRFToken': '{{ csrf_token }}'},
                body: new URLSearchParams({'typing': 'true'})
            }).catch(e => console.log);
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                fetch('/api/chat/rooms/' + currentRoom + '/typing/', {
                    method: 'POST',
                    headers: {'X-CSRFToken': '{{ csrf_token }}'},
                    body: new URLSearchParams({'typing': 'false'})
                }).catch(e => console.log);
            }, 3000);
        }

        function setupTypingIndicator() {
            if(!currentRoom) return;
            setInterval(() => {
                fetch(`/api/chat/rooms/${currentRoom}/typing/`)
                    .then(r => r.json())
                    .then(data => {
                        let ind = document.getElementById('typingIndicator');
                        if(data.success && data.typing_users && data.typing_users.length) {
                            let names = data.typing_users.map(u => u.username).join(', ');
                            document.getElementById('typingText').innerHTML = `${escapeHtml(names)} ${data.typing_users.length > 1 ? 'are' : 'is'} typing...`;
                            if(ind.style.display === 'none') ind.style.display = 'flex';
                        } else {
                            if(ind.style.display !== 'none') ind.style.display = 'none';
                        }
                    })
                    .catch(e => console.log);
            }, 2000);
        }

        // ==================== FILE UPLOADS ====================
        function triggerFileUpload() { document.getElementById('fileInput').click(); }
        function triggerImageUpload() { document.getElementById('imageInput').click(); }

        function uploadFile(input) {
            let file = input.files[0];
            if(!file) return;
            if(file.size > 10485760) {
                Swal.fire({icon: 'error', title: 'File Too Large', text: 'Max 10MB'});
                return;
            }
            let fd = new FormData();
            fd.append('room', currentRoom);
            fd.append('file', file);
            fd.append('csrfmiddlewaretoken', '{{ csrf_token }}');

            Swal.fire({title: 'Uploading...', allowOutsideClick: false, showConfirmButton: false, willOpen: () => Swal.showLoading()});
            fetch('/api/chat/upload/file/', {method: 'POST', body: fd})
                .then(r => r.json())
                .then(data => {
                    Swal.close();
                    if(data.success) {
                        appendMessages([data.message]);
                    } else {
                        Swal.fire({icon: 'error', title: 'Upload Failed', text: data.error});
                    }
                })
                .finally(() => input.value = '');
        }

        function uploadImage(input) {
            let file = input.files[0];
            if(!file || !file.type.startsWith('image/')) {
                Swal.fire({icon: 'error', title: 'Invalid File', text: 'Please select an image'});
                return;
            }
            if(file.size > 5242880) {
                Swal.fire({icon: 'error', title: 'Image Too Large', text: 'Max 5MB'});
                return;
            }
            let fd = new FormData();
            fd.append('room', currentRoom);
            fd.append('image', file);
            fd.append('csrfmiddlewaretoken', '{{ csrf_token }}');

            Swal.fire({title: 'Uploading...', allowOutsideClick: false, showConfirmButton: false, willOpen: () => Swal.showLoading()});
            fetch('/api/chat/upload/image/', {method: 'POST', body: fd})
                .then(r => r.json())
                .then(data => {
                    Swal.close();
                    if(data.success) {
                        appendMessages([data.message]);
                    } else {
                        Swal.fire({icon: 'error', title: 'Upload Failed', text: data.error});
                    }
                })
                .finally(() => input.value = '');
        }

        // ==================== EMOJI PICKER ====================
        function toggleEmojiPicker() {
            let container = document.getElementById('emojiPickerContainer');
            if(container.classList.contains('show')) {
                container.classList.remove('show');
                if(emojiPickerInstance) emojiPickerInstance = null;
                return;
            }

            container.classList.add('show');
            if(!emojiPickerInstance && typeof EmojiMart !== 'undefined') {
                const { Picker } = EmojiMart;
                emojiPickerInstance = new Picker({
                    data: async () => {
                        const response = await fetch('https://cdn.jsdelivr.net/npm/emoji-mart@5.5.2/data/all.json');
                        return response.json();
                    },
                    onEmojiSelect: (emoji) => {
                        insertEmoji(emoji.native);
                        container.classList.remove('show');
                    },
                    theme: document.body.getAttribute('data-theme'),
                    set: 'apple',
                    showPreview: false,
                    showSkinTones: false,
                    emojiSize: 24
                });
                container.innerHTML = '';
                container.appendChild(emojiPickerInstance);
            } else {
                // Fallback emoji picker
                let emojis = ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','👍','👎','👊','✊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','💪','❤️','💔','💕','💖','💗','💙','💚','💛','🧡','💜','🖤','💯','🔥','✨','⭐','🌟','💫','⚡','🌈','🎉','🎊','🎈','🎁','🏆','💎'];
                container.innerHTML = `<div style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 0.5rem; max-width: 320px; max-height: 300px; overflow-y: auto; padding: 0.5rem;">${emojis.map(e => `<span style="cursor: pointer; font-size: 1.5rem; text-align: center; padding: 0.25rem; border-radius: 8px;" onclick="insertEmoji('${e}')">${e}</span>`).join('')}</div>`;
            }
        }

        function insertEmoji(emoji) {
            let input = document.getElementById('messageInput');
            let start = input.selectionStart;
            let end = input.selectionEnd;
            let text = input.value;
            input.value = text.substring(0, start) + emoji + text.substring(end);
            input.selectionStart = input.selectionEnd = start + emoji.length;
            input.focus();
            autoResize(input);
            document.getElementById('emojiPickerContainer').classList.remove('show');
        }

        // ==================== CONTEXT MENU ====================
        function setupContextMenu() {
            document.getElementById('messagesContainer')?.addEventListener('contextmenu', function(e) {
                let msgWrapper = e.target.closest('.message-wrapper');
                if(!msgWrapper) return;
                e.preventDefault();

                let existingMenu = document.querySelector('.context-menu');
                if(existingMenu) existingMenu.remove();

                let messageId = msgWrapper.dataset.messageId;
                let messageUser = msgWrapper.dataset.messageUser;
                let isOwn = messageUser === '{{ request.user.username }}';
                let isMod = {{ is_moderator|yesno:"true,false" }};
                let isAdmin = {{ is_admin|yesno:"true,false" }};

                let menu = document.createElement('div');
                menu.className = 'context-menu';
                menu.style.left = e.pageX + 'px';
                menu.style.top = e.pageY + 'px';

                let items = [
                    { icon: 'far fa-smile', text: 'React', action: () => showReactionPicker(messageId) },
                    { icon: 'fas fa-reply', text: 'Reply', action: () => replyToMessage(messageId, messageUser) }
                ];

                if(isOwn || isMod || isAdmin) {
                    items.push({ icon: 'fas fa-edit', text: 'Edit', action: () => editMessage(messageId, '') });
                }
                if(isMod || isAdmin) {
                    items.push({ icon: 'fas fa-thumbtack', text: 'Pin/Unpin', action: () => togglePinMessage(messageId) });
                }
                if(isOwn || isMod || isAdmin) {
                    items.push({ icon: 'fas fa-trash', text: 'Delete', action: () => deleteMessage(messageId), danger: true });
                }

                items.forEach(item => {
                    let div = document.createElement('div');
                    div.className = 'context-menu-item' + (item.danger ? ' danger' : '');
                    div.innerHTML = `<i class="${item.icon}"></i> <span>${item.text}</span>`;
                    div.onclick = () => { item.action(); menu.remove(); };
                    menu.appendChild(div);
                });

                document.body.appendChild(menu);

                setTimeout(() => {
                    document.addEventListener('click', function removeMenu() {
                        if(document.body.contains(menu)) menu.remove();
                        document.removeEventListener('click', removeMenu);
                    });
                }, 100);
            });
        }

        // ==================== CLEANUP ====================
        window.addEventListener('beforeunload', () => {
            if(messagePolling) clearInterval(messagePolling);
            if(currentRoom) {
                fetch('/api/chat/rooms/' + currentRoom + '/typing/', {
                    method: 'POST',
                    headers: {'X-CSRFToken': '{{ csrf_token }}'},
                    body: new URLSearchParams({'typing': 'false'}),
                    keepalive: true
                });
            }
        });9

        // Initialize if in chat mode
        {% if mode == 'chat' %}
        initChat();
        {% endif %}