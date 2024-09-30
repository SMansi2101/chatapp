function getCookie(name) {
    let matches = document.cookie.match(new RegExp(
        "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
};


const userData = JSON.parse(getCookie('user'));

const sender_id = userData._id;
let receiver_id = null;
let global_group_id;
const socket = io('/user-namespace', {
    auth: {
        token: userData._id
    }
});

$(document).ready(function () {
    // Bind click event to user list items
    $('#userList').on('click', '.user-list-item', function () {
        var userId = $(this).attr('data-id'); // Get the clicked user's data-id
        receiver_id = userId; // Set receiver_id
        document.querySelector('.start-section').style.display = 'none'; // Hide the start section
        document.querySelector('.chat-section').style.display = 'flex'; // Show the chat section

        socket.emit('existsChat', { sender_id: sender_id, receiver_id: receiver_id });
    });
});


// Update user online status
socket.on('getOnlineStatus', function (data) {
    $('#' + data.user_id + '-status').text('Online');
    $('#' + data.user_id + '-status').removeClass('offline-status');
    $('#' + data.user_id + '-status').addClass('online-status');
});

// Update user offline status
socket.on('getOfflineStatus', function (data) {
    $('#' + data.user_id + '-status').text('Offline');
    $('#' + data.user_id + '-status').removeClass('online-status');
    $('#' + data.user_id + '-status').addClass('offline-status');
});

// Chat save for user
$('#chat-form').submit(function (event) {
    event.preventDefault();

    const message = $('#message').val();

    $.ajax({
        url: '/save-chat',
        type: 'POST',
        data: { sender_id: sender_id, receiver_id: receiver_id, message: message },
        success: function (response) {
            if (response.success) {
                $('#message').val('');
                let chat = response.data.message;
                let html = `
                    <div class="current-user-chat"id="`+ response.data._id + `">
                        <h5><span>`+ chat + `</span>
                            <i class="fa-solid fa-trash-can" data-id="` + response.data._id + `" data-toggle="modal" data-target="#deleteChatModal"></i>
                            <p class="editbutton" data-id="` + response.data._id + `" data-msg="` + chat + `" data-toggle="modal" data-target="#editChatModal">Edit</p>
                        </h5>
                    </div>
                `;
                $('#chat-container').append(html);
                socket.emit('newChat', response.data);

                ScrollChat();
            } else {
                alert(response.msg);
            }
        }
    });
});
socket.on('loadNewChat', function (data) {
    if (sender_id == data.receiver_id && receiver_id == data.sender_id) {
        let html = `
                   <div class="distance-user-chat" id='`+ data._id + `'>
                         <h5><span>`+ data.message + `</span></h5>
                    </div>
                 `;
        $('#chat-container').append(html);
        ScrollChat();
    }
});

//load old chats
socket.on('loadChats', function (data) {
    $('#chat-container').html('');
    const chats = data.chats;
    let html = '';

    for (let x = 0; x < chats.length; x++) {
        let addClass = '';
        if (chats[x]['sender_id'] == sender_id) {
            addClass = 'current-user-chat';
        }
        else {
            addClass = 'distance-user-chat'
        }
        html += ` 
            <div class="`+ addClass + `" id='` + chats[x]['_id'] + `'>
                <h5><span>`+ chats[x]['message'] + `</span>`;
        if (chats[x]['sender_id'] == sender_id) {
            html += `<i class="fa-solid fa-trash-can" data-id="` + chats[x]['_id'] + `" data-toggle="modal" data-target="#deleteChatModal"></i>
            <p class="editbutton" data-id="` + chats[x]['_id'] + `" data-msg="` + chats[x]['message'] + `" data-toggle="modal" data-target="#editChatModal">Edit</p>`

        }
        html += `       
            </h5>
            </div>
        `;
    }
    $('#chat-container').append(html);

    ScrollChat();
});


function ScrollChat() {
    $('#chat-container').animate({
        scrollTop: $('#chat-container').offset().top + $('#chat-container')[0].scrollHeight
    }, 0);
};

$(document).on('contextmenu', '.current-user-chat', function (event) {
    event.preventDefault();
    // Hide all trash icons and edit buttons first
    $('.fa-trash-can, .editbutton').hide();

    // Show the trash icon and edit button for the specific message that was right-clicked
    $(this).find('.fa-trash-can, .editbutton').show();
});


$(document).on('click', '.fa-trash-can', function () {
    let msg = $(this).parent().text();
    let messageId = $(this).attr('data-id');

    $('#delete-message').text(msg); // Assign the message text to the modal
    $('#delete-message-id').val(messageId); // Assign the message ID to the modal hidden input
});


$('#delete-chat-form').submit(function (event) {
    event.preventDefault();

    const id = $('#delete-message-id').val();

    $.ajax({
        url: '/delete-chat',
        type: 'POST',
        data: { id: id },
        success: function (res) {
            if (res.success === true) {
                $('#' + id).remove();
                $('#deleteChatModal').modal('hide');
                socket.emit('chatDeleted', id);
            } else {
                alert(res.msg);
            }
        }
    });
    return false;
});
socket.on('chatMessageDeleted', function (id) {
    $('#' + id).remove();
});

//update user chat functionality    
$(document).on('click', '.editbutton', function () {
    $('#edit-message-id').val($(this).attr('data-id'));
    $('#edit-message').val($(this).attr('data-msg'));
});

// When any modal is closed, hide the delete and edit icons
$('.modal').on('hidden.bs.modal', function () {
    $('.fa-trash-can, .editbutton').hide();  // Hide all trash and edit buttons when the modal is closed
});

$('#edit-chat-form').submit(function (event) {
    event.preventDefault();

    const id = $('#edit-message-id').val();
    const msg = $('#edit-message').val();

    $.ajax({
        url: '/edit-chat',
        type: 'POST',
        data: { id: id, message: msg },
        success: function (res) {
            if (res.success === true) {
                $('#editChatModal').modal('hide');
                $('#' + id).find('span').text(msg)
                $('#' + id).find('.editbutton').attr('data-msg', msg);
                socket.emit('chatEdited', { id: id, message: msg });
            } else {
                alert(res.msg);
            }
        }
    });
});


socket.on('chatMessageEdited', function (data) {
    $('#' + data.id).find('span').text(data.message);
});

$('.addMember').click(function () {
    var id = $(this).attr('data-id');
    var limit = $(this).attr('data-limit');

    $('#group_id').val(id);
    $('#limit').val(limit);

    $.ajax({
        url: '/add-member',
        type: 'POST',
        data: { group_id: id },
        success: function (res) {

            if (res.success == true) {
                let users = res.data;
                let html = '';

                for (let i = 0; i < users.length; i++) {
                    let isMemberOfGroup = users[i]['member'].length > 0 ? true : false;
                    html += `
                   <tr>
                      <td>
                       <input type="checkbox" `+ (isMemberOfGroup ? 'checked' : '') + ` name="members[]" value="${users[i]['_id']}" />
                      </td>
                      <td>${users[i]['name']}</td>
                   </tr>
                `;
                }
                $('.addMemberTable').html(html);
            }
            else {
                alert(res.msg);
            }
        }
    });
});
//save member form submit code

$('#add-member-form').submit(function (event) {
    event.preventDefault();

    var formData = $(this).serialize();

    $.ajax({
        url: "/save-member",
        type: "POST",
        data: formData,
        success: function (res) {
            if (res.success) {
                alert(res.msg);
                $('#addMemberModal').modal('hide');
                $('#add-member-form')[0].reset();
            }
            else {
                alert(res.msg);
            }
        }
    });
});

//delete chat group

$('.deleteGroup').click(function () {
    $('#delete_group_id').val($(this).attr('data-id'));
    $('#delete_group_name').text($(this).attr('data-name'));
});

$('#deleteGroupForm').submit(function (event) {
    event.preventDefault();

    var formData = $(this).serialize();

    $.ajax({
        url: "/delete-chat-group",
        type: 'POST',
        data: formData,
        success: function (res) {
            alert(res.msg);
            if (res.success) {
                location.reload();
            }
        }
    });
})

$(document).ready(function () {
    // Initialize all tooltips
    $('[data-toggle="tooltip"]').tooltip({
        trigger: 'manual' // We will control when to show/hide
    });

    // Handle "Copy" button click
    $('.copy').click(function () {
        var group_id = $(this).attr('data-id');
        var $this = $(this);

        const url = `${window.location.protocol}//${window.location.host}/share-group/${group_id}`;

        // Attempt to copy the URL to clipboard
        if (navigator.clipboard && window.isSecureContext) {

            navigator.clipboard.writeText(url).then(function () {
                $this.attr('data-original-title', 'Copied!').tooltip('show');

                setTimeout(function () {
                    $this.tooltip('hide');
                }, 2000);
            }, function (err) {
                console.error('Could not copy text: ', err);
                $this.attr('data-original-title', 'Failed to copy!').tooltip('show');
                setTimeout(function () {
                    $this.tooltip('hide');
                }, 2000);
            });
        } else {

            var temp = $('<input>');
            $("body").append(temp);
            temp.val(url).select();
            var successful = document.execCommand("copy");
            temp.remove();

            if (successful) {
                $this.attr('data-original-title', 'Copied!').tooltip('show');
            } else {
                $this.attr('data-original-title', 'Failed to copy!').tooltip('show');
            }

            setTimeout(function () {
                $this.tooltip('hide');
            }, 2000);
        }
    });
});

$('.join-now').click(function () {
    var $button = $(this);
    $button.text('wait...');
    $button.attr('disabled', 'disabled');

    var group_id = $button.attr('data-id');

    $.ajax({
        url: '/join-group',
        method: 'POST',
        data: { group_id: group_id },
        success: function (res) {

            showNotification(res.msg, res.success ? 'bg-green-500' : 'bg-red-500');

            if (res.success) {
                setTimeout(function () {
                    location.reload();
                }, 1500);
            }
            else {
                $button.text('Join Group').removeAttr('disabled');
            }
        },
        error: function () {
            showNotification('Something went wrong! Please try again.', 'bg-red-500');
            $button.text('Join Group').removeAttr('disabled');
        }
    });
});

// Function to show notification with animation
function showNotification(message, colorClass) {
    var $notification = $('#notification');
    $notification.removeClass().addClass(`fixed bottom-5 right-5 ${colorClass} text-white text-center py-3 px-6 rounded-lg shadow-lg opacity-0 pointer-events-none transition duration-500 ease-in-out z-50`);


    $('#notification-message').text(message);
    $notification.removeClass('opacity-0 pointer-events-none').addClass('opacity-100 translate-y-0');

    setTimeout(function () {
        $notification.addClass('opacity-0 pointer-events-none');
    }, 3000);
}

function ScrollGroupChat() {
    $('#group-chat-container').animate({
        scrollTop: $('#group-chat-container').offset().top + $('#group-chat-container')[0].scrollHeight
    }, 0);
};


$(document).ready(function () {

    $('#groupList').on('click', '.group-list-item', function () {

        document.querySelector('.group-start-section').style.display = 'none';
        document.querySelector('.group-chat-section').style.display = 'flex';

        global_group_id = $(this).attr('data-id');

        loadGroupChats();

    });
});

$('#group-chat-form').submit(function (event) {
    event.preventDefault();

    const message = $('#group-message').val();

    $.ajax({
        url: '/group-chat-save',
        type: 'POST',
        data: { sender_id: sender_id, group_id: global_group_id, message: message },
        success: function (response) {
            if (response.success) {
                $('#group-message').val('');
                let message = response.chat.message;
                let html = `
                    <div class="current-user-chat"id="`+ response.chat._id + `">
                        <h5>
                           <span>`+ message + `</span> 
                            <i class="fa-solid fa-trash-can deletegroupchat" data-id="` + response.chat._id + `" data-toggle="modal" data-target="#deleteGroupChatModal"></i>
                        </h5>
                    </div>
                `;
                $('#group-chat-container').append(html);
                socket.emit('newgroupChat', response.data);

                ScrollGroupChat();
            } else {
                alert(response.msg);
            }
        }
    });
});
socket.on('loadNewGroupChat', function (data) {
    if (global_group_id == data.group_id) {
        let html = `
        <div class="distance-user-chat"id="`+ data._id + `">
            <h5>
               <span>`+ data.message + `</span> 
               
            </h5>
        </div>
    `;
        $('#group-chat-container').append(html);


        ScrollGroupChat();
    }
});

function loadGroupChats() {
    $.ajax({
        url: '/load-group-chat',
        type: 'POST',
        data: { group_id: global_group_id },
        success: function (response) {
            if (response.success) {
                const chats = response.chats;
                let html = '';
                for (let i = 0; i < chats.length; i++) {
                    let className = 'distance-user-chat';
                    if (chats[i].sender_id == sender_id) {
                        className = 'current-user-chat';
                    }
                    html += `
                        <div class="${className}" id="${chats[i]._id}">
                            <h5>
                         <span>${chats[i].message}</span>`
                    if (chats[i].sender_id == sender_id) {
                       html+=` <i class="fa-solid fa-trash-can deletegroupchat"
                          data-id="${chats[i]._id}" data-toggle="modal" 
                          data-target="#deleteGroupChatModal"></i>`;
                    }
                    html+=`
                      </h5 >
                     </div >
                            `;
                }
                $('#group-chat-container').html(html);

                ScrollGroupChat();
            } else {
                alert(response.msg);
            }
        }
    });
};

$(document).on('click','.deletegroupchat',function(){
    var msg = $(this).parent().find('span').text();

    $('#group-delete-message').text(msg);
    $('#group-delete-message-id').val($(this).attr('data-id'));
})

$('#delete-group-chat-form').submit(function(e){
    e.preventDefault();

    var id = $('#group-delete-message-id').val();

    $.ajax({
        url:"/delete-group-chat",
        type:'POST',
        data:{id:id},
        success:function(response){
            if(response.success){
              $('#'+id).remove();
              $('#deleteGroupChatModal').modal('hide');
              socket.emit('groupChatDeleted',id);
            }else{
                alert(response.msg);
            }
        }
    })
})

socket.on('groupChatMsgDeleted',function(id){
    $('#'+id).remove();
});