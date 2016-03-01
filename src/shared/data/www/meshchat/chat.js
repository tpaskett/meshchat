var last_messages_update = epoch();
var call_sign = 'NOCALL';
var meshchat_id;
var peer;
var mediaConnection;
var enable_video = 0;
var messages_updating = false;
var users_updating = false;
var messages = [];
var channel_filter = '';
// Compatibility shim
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
$(function() {
    meshchat_init();
});

function epoch() {
    return Math.floor(new Date() / 1000);
}

function monitor_last_update() {
    var secs = epoch() - last_messages_update;
    $('#last-update').html('<strong>Updated</strong> ' + secs + ' seconds ago');
}

function start_chat() {
    //$('#logout').html('Logout ' + call_sign);   
    load_messages();
    load_users();
    monitor_last_update();
    setInterval(function() {
        load_messages()
    }, 5000);
    setInterval(function() {
        load_users()
    }, 10000);
    setInterval(function() {
        monitor_last_update()
    }, 2500);
}

function meshchat_init() {
    $('#message').val('');
    meshchat_id = Cookies.get('meshchat_id');
    if (meshchat_id == undefined) {
        Cookies.set('meshchat_id', make_id());
        meshchat_id = Cookies.get('meshchat_id');
    }
    //console.log(meshchat_id);    
    $('#submit-message').on('click', function(e) {
        e.preventDefault();
        if ($('#message').val().length == 0) return;

        ohSnapX();

        $(this).prop("disabled", true);
        $('#message').prop("disabled", true);
        $(this).html('<div class="loading"></div>');
        $('#download-messages').hide();

        var channel = $('#send-channel').val();

        if ($('#new-channel').val() != '') {
            channel = $('#new-channel').val();
        }

        $.ajax({
            url: '/cgi-bin/meshchat',
            type: "POST",
            tryCount : 0,
            retryLimit : 3,
            data:
            {
                action: 'send_message',
                message: $('#message').val(),
                call_sign: call_sign,
                epoch: epoch(),
                channel: channel
            },
            dataType: "json",
            context: this,
            success: function(data, textStatus, jqXHR)
            {
                if (data.status == 500) {
                    ohSnap('Error sending message: ' + data.response, 'red', {time: '30000'});  
                } else {
                    $('#message').val('');
                    ohSnap('Message sent', 'green');
                    load_messages();        
                    channel_filter = channel;      
                    $('#new-channel').val('');
                    $('#new-channel').hide();
                    $('#send-channel').show();      
                }
            },
            error: function(jqXHR, textStatus, errorThrown)
            {
                if (textStatus == 'timeout') {
                    this.tryCount++;
                    if (this.tryCount <= this.retryLimit) {
                        //try again
                        $.ajax(this);
                        return;
                    }    
                    ohSnap('Error sending message: ' + textStatus, 'red', {time: '30000'});        
                }                
            },
            complete: function(jqXHR, textStatus) {
                $(this).prop("disabled", false);
                $('#message').prop("disabled", false);
                $(this).html('Send');
                $('#download-messages').show();
            }
        });
    });
    
    $('#submit-call-sign').on('click', function(e) {
        e.preventDefault();
        if ($('#call-sign').val().length == 0) return;
        call_sign = $('#call-sign').val().toUpperCase();
        Cookies.set('meshchat_call_sign', call_sign);
        $('#call-sign-container').addClass('hidden');
        $('#chat-container').removeClass('hidden');
        start_chat();
    });    
    
    $('#download-messages').on('click', function(e) {
        e.preventDefault();
        location.href = '/cgi-bin/meshchat?action=messages_download';
    });

    $('#channels').on('change', function() {        
        channel_filter = this.value;
        process_messages();
    });

    $('#send-channel').on('change', function() {
        $('#new-channel').show();
        $(this).hide();
    });

    var cookie_call_sign = Cookies.get('meshchat_call_sign');
    if (cookie_call_sign == undefined) {
        $('#call-sign-container').removeClass('hidden');
    } else {
        $('#call-sign-container').addClass('hidden');
        $('#chat-container').removeClass('hidden');
        call_sign = cookie_call_sign;
        start_chat();
    }
}

function load_messages() {
    if (messages_updating == true) return;

    messages_updating = true;

    $.ajax({
        url: '/cgi-bin/meshchat?action=messages&call_sign=' + call_sign + '&id=' + meshchat_id + '&epoch=' + epoch(),
        type: "GET",
        dataType: "json",
        context: this,
        success: function(data, textStatus, jqXHR)
        {            
            if (data == null) return;

            messages = data;

            process_messages();
            last_messages_update = epoch();
        },
        complete: function(jqXHR, textStatus) {
            //console.log( "messages complete" );
            messages_updating = false;
        }
    });
}

function process_messages() {
    var html = '';

    $('#send-channel')
    .find('option')
    .remove()
    .end();

    $('#channels')
    .find('option')
    .remove()
    .end();

    var channels = {};

    for (var i = 0; i < messages.length; i++) {
        var row = '';        
        var date = new Date(0);
        date.setUTCSeconds(messages[i].epoch);
        var message = messages[i].message;
        message = message.replace(/(\r\n|\n|\r)/g, "<br/>");
        row += '<tr>';
        row += '<td>' + format_date(date) + '</td>';
        row += '<td>' + message + '</td>';
        row += '<td>' + messages[i].call_sign + '</td>';
        row += '<td>' + messages[i].channel + '</td>';
        if (messages[i].platform == 'node') {
            row += '<td><a href="http://' + messages[i].node + ':8080">' + messages[i].node + '</a></td>';
        } else {
            row += '<td>' + messages[i].node + '</td>';
        }
        row += '</tr>';

        if (messages[i].channel != "" && !channels.hasOwnProperty(messages[i].channel)) {
            channels[messages[i].channel] = 1;
        }

        if (channel_filter != '') {
            if (channel_filter == messages[i].channel) html += row;
        } else {
            html += row;
        }
    }

    $('#message-table').html(html);           

    $('#send-channel')
    .append($("<option></option>")
    .attr("value", "")
    .text("Everything")); 

    $('#send-channel')
    .append($("<option></option>")
    .attr("value", "Add New Channel")
    .text("Add New Channel")); 

    $('#channels')
    .append($("<option></option>")
    .attr("value", "")
    .text("Everything")); 

    for (var property in channels) {
        if (channels.hasOwnProperty(property)) {
            $('#send-channel')
            .append($("<option></option>")
            .attr("value", property)
            .text(property)); 

            $('#channels')
            .append($("<option></option>")
            .attr("value", property)
            .text(property));
        }
    }

    $("#channels").val(channel_filter);
    $("#send-channel").val(channel_filter);
}

function load_users() {
    if (users_updating == true) return;

    users_updating = true;

    $.ajax({
        url: '/cgi-bin/meshchat?action=users&call_sign=' + call_sign + '&id=' + meshchat_id,
        type: "GET",
        dataType: "json",
        context: this,
        success: function(data, textStatus, jqXHR)
        {
            var html = '';
            if (data == null) return;
            for (var i = 0; i < data.length; i++) {
                var date = new Date(0);
                date.setUTCSeconds(data[i].epoch);
                if ((epoch() - data[i].epoch) > 240) continue;
                if ((epoch() - data[i].epoch) > 120) {
                    html += '<tr class="grey-background">';
                } else {
                    html += '<tr>';
                }
                if (enable_video == 0) {
                    html += '<td>' + data[i].call_sign + '</td>';
                } else {
                    html += '<td><a href="' + data[i].id + '" onclick="start_video(\'' + data[i].id + '\');return false;">' + data[i].call_sign + '</td>';
                }
                if (data[i].platform == 'node') {
                    html += '<td><a href="http://' + data[i].node + ':8080">' + data[i].node + '</a></td>';
                } else {
                    html += '<td>' + data[i].node + '</td>';
                }
                html += '<td>' + format_date(date) + '</td>';
                html += '</tr>';
            }
            $('#users-table').html(html);
        },
        complete: function(jqXHR, textStatus) {
            //console.log( "users complete" );
            users_updating = false;
        }
    });
}
