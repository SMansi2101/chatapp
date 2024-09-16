function getCookie(name) {
	let matches = document.cookie.match(new RegExp(
		"(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
	));
	return matches ? decodeURIComponent(matches[1]) : undefined;
};


const userData = JSON.parse(getCookie('user'));

const sender_id = userData._id;
let receiver_id = null;
const socket = io('/user-namespace', {
    auth: {
        token: userData._id
    }
});

$(document).ready(function() {
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

$('.addMember').click(function(){
    var id  = $(this).attr('data-id');
    var limit  = $(this).attr('data-limit');

    $('#group_id').val(id);
    $('#limit').val(limit);

    $.ajax({
        url:'/add-member',
        type:'POST',
        data:{group_id:id},
        success:function(res){
             if(res.success == true){
                let users = res.data;
                let html = '';

                for(let i=0 ;i< users.length;i++){
                html +=`
                   <tr>
                      <td>
                        <input type="checkbox" name="members[]" value="`+users[i]['_id']+`"/>
                      </td>
                      <td>`+users[i]['name']+`</td>
                   </tr>
                `;
                }
                $('.addMemberTable').html(html);
             }
             else{
                alert(res.msg);
             }
        }
    });
});